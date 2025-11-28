/**
 * MORALE AGENT — Tier 2 Enemy AI Agent
 * Handles group morale, fear propagation, surrender logic
 * JSON-driven, deterministic, fair AI
 */

export interface MoraleState {
  entityId: string;
  baseMorale: number;      // 0-100
  currentMorale: number;   // 0-100
  fearLevel: number;       // 0-100
  panicThreshold: number;  // When to flee
  surrenderThreshold: number; // When to surrender
  modifiers: MoraleModifier[];
}

export interface MoraleModifier {
  id: string;
  source: string;
  value: number;
  duration: number;  // seconds, -1 = permanent
  stackable: boolean;
}

export interface MoraleEvent {
  type: MoraleEventType;
  sourceId?: string;
  targetId: string;
  magnitude: number;
  radius?: number;  // For area effects
}

export type MoraleEventType =
  | 'ally_killed'
  | 'ally_wounded'
  | 'leader_killed'
  | 'enemy_killed'
  | 'took_damage'
  | 'near_miss'
  | 'outnumbered'
  | 'reinforcements'
  | 'explosion_nearby'
  | 'suppressed'
  | 'flanked'
  | 'ambushed'
  | 'victory'
  | 'retreat_order';

export interface MoraleBehavior {
  shouldFlee: boolean;
  shouldSurrender: boolean;
  shouldPanic: boolean;
  shouldRally: boolean;
  combatEffectiveness: number; // 0-1 multiplier
}

// Morale impact values (balanced for fair gameplay)
const MORALE_IMPACTS: Record<MoraleEventType, number> = {
  ally_killed: -15,
  ally_wounded: -8,
  leader_killed: -30,
  enemy_killed: +20,
  took_damage: -5,
  near_miss: -3,
  outnumbered: -10,
  reinforcements: +25,
  explosion_nearby: -12,
  suppressed: -8,
  flanked: -15,
  ambushed: -20,
  victory: +30,
  retreat_order: -10
};

// Fear propagation settings
const FEAR_PROPAGATION = {
  radius: 20,           // meters
  falloff: 0.5,         // multiplier per 10m
  maxSpread: 0.7,       // max fear transfer
  recoveryRate: 2,      // per second
  panicSpreadChance: 0.3
};

export class MoraleAgent {
  private states: Map<string, MoraleState> = new Map();
  private groups: Map<string, Set<string>> = new Map(); // groupId -> entityIds
  private leaders: Map<string, string> = new Map(); // groupId -> leaderId

  // === STATE MANAGEMENT ===

  registerEntity(
    entityId: string,
    baseMorale: number = 70,
    panicThreshold: number = 25,
    surrenderThreshold: number = 10
  ): void {
    this.states.set(entityId, {
      entityId,
      baseMorale,
      currentMorale: baseMorale,
      fearLevel: 0,
      panicThreshold,
      surrenderThreshold,
      modifiers: []
    });
  }

  removeEntity(entityId: string): void {
    this.states.delete(entityId);
    
    // Remove from groups
    for (const [groupId, members] of this.groups) {
      members.delete(entityId);
      if (this.leaders.get(groupId) === entityId) {
        this.leaders.delete(groupId);
        // Trigger leader killed event for remaining members
        for (const memberId of members) {
          this.processEvent({ type: 'leader_killed', targetId: memberId, magnitude: 1 });
        }
      }
    }
  }

  getState(entityId: string): MoraleState | undefined {
    return this.states.get(entityId);
  }

  // === GROUP MANAGEMENT ===

  createGroup(groupId: string, memberIds: string[], leaderId?: string): void {
    this.groups.set(groupId, new Set(memberIds));
    if (leaderId && memberIds.includes(leaderId)) {
      this.leaders.set(groupId, leaderId);
    }
  }

  addToGroup(groupId: string, entityId: string): void {
    if (!this.groups.has(groupId)) {
      this.groups.set(groupId, new Set());
    }
    this.groups.get(groupId)!.add(entityId);
  }

  getGroupMembers(groupId: string): string[] {
    return Array.from(this.groups.get(groupId) || []);
  }

  getGroupMorale(groupId: string): number {
    const members = this.groups.get(groupId);
    if (!members || members.size === 0) return 0;

    let totalMorale = 0;
    for (const memberId of members) {
      const state = this.states.get(memberId);
      if (state) totalMorale += state.currentMorale;
    }
    return totalMorale / members.size;
  }

  // === EVENT PROCESSING ===

  processEvent(event: MoraleEvent): void {
    const impact = MORALE_IMPACTS[event.type] * event.magnitude;
    const targetState = this.states.get(event.targetId);
    
    if (!targetState) return;

    // Apply direct impact
    this.applyMoraleChange(event.targetId, impact);

    // Propagate fear for negative events
    if (impact < 0 && event.radius) {
      this.propagateFear(event.targetId, Math.abs(impact), event.radius);
    }

    // Special handling for group events
    if (event.type === 'ally_killed' || event.type === 'leader_killed') {
      this.handleGroupCasualty(event.targetId, event.type === 'leader_killed');
    }
  }

  private applyMoraleChange(entityId: string, change: number): void {
    const state = this.states.get(entityId);
    if (!state) return;

    state.currentMorale = Math.max(0, Math.min(100, state.currentMorale + change));

    // Update fear based on morale
    if (change < 0) {
      state.fearLevel = Math.min(100, state.fearLevel + Math.abs(change) * 0.5);
    }
  }

  private propagateFear(sourceId: string, baseFear: number, radius: number): void {
    const sourceState = this.states.get(sourceId);
    if (!sourceState) return;

    // Find group members within radius
    for (const [groupId, members] of this.groups) {
      if (!members.has(sourceId)) continue;

      for (const memberId of members) {
        if (memberId === sourceId) continue;

        // Calculate fear transfer (simplified - would use actual positions)
        const distance = Math.random() * radius; // Placeholder
        const falloff = Math.pow(FEAR_PROPAGATION.falloff, distance / 10);
        const fearTransfer = baseFear * falloff * FEAR_PROPAGATION.maxSpread;

        const memberState = this.states.get(memberId);
        if (memberState) {
          memberState.fearLevel = Math.min(100, memberState.fearLevel + fearTransfer);
          
          // Chance to spread panic
          if (memberState.fearLevel > memberState.panicThreshold && 
              Math.random() < FEAR_PROPAGATION.panicSpreadChance) {
            this.applyMoraleChange(memberId, -10);
          }
        }
      }
    }
  }

  private handleGroupCasualty(witnessId: string, wasLeader: boolean): void {
    // Find witness's group
    for (const [groupId, members] of this.groups) {
      if (!members.has(witnessId)) continue;

      // Apply morale penalty to all group members
      for (const memberId of members) {
        if (memberId === witnessId) continue;
        
        const penalty = wasLeader ? -20 : -10;
        this.applyMoraleChange(memberId, penalty);
      }
    }
  }

  // === BEHAVIOR EVALUATION ===

  evaluateBehavior(entityId: string): MoraleBehavior {
    const state = this.states.get(entityId);
    
    if (!state) {
      return {
        shouldFlee: false,
        shouldSurrender: false,
        shouldPanic: false,
        shouldRally: false,
        combatEffectiveness: 1.0
      };
    }

    const effectiveMorale = state.currentMorale - state.fearLevel * 0.3;

    return {
      shouldFlee: effectiveMorale < state.panicThreshold,
      shouldSurrender: effectiveMorale < state.surrenderThreshold,
      shouldPanic: state.fearLevel > 80,
      shouldRally: state.currentMorale > 70 && state.fearLevel < 30,
      combatEffectiveness: this.calculateEffectiveness(state)
    };
  }

  private calculateEffectiveness(state: MoraleState): number {
    // Combat effectiveness scales with morale
    // Low morale = worse accuracy, slower reactions
    const moraleEffect = state.currentMorale / 100;
    const fearEffect = 1 - (state.fearLevel / 200); // Fear has half impact
    
    return Math.max(0.3, Math.min(1.0, moraleEffect * fearEffect));
  }

  // === RECOVERY ===

  update(deltaTime: number): void {
    for (const state of this.states.values()) {
      // Natural morale recovery towards base
      if (state.currentMorale < state.baseMorale) {
        state.currentMorale = Math.min(
          state.baseMorale,
          state.currentMorale + deltaTime * 1
        );
      }

      // Fear decay
      if (state.fearLevel > 0) {
        state.fearLevel = Math.max(
          0,
          state.fearLevel - deltaTime * FEAR_PROPAGATION.recoveryRate
        );
      }

      // Update modifier durations
      state.modifiers = state.modifiers.filter(mod => {
        if (mod.duration === -1) return true;
        mod.duration -= deltaTime;
        return mod.duration > 0;
      });
    }
  }

  // === MODIFIERS ===

  applyModifier(entityId: string, modifier: MoraleModifier): void {
    const state = this.states.get(entityId);
    if (!state) return;

    // Check if stackable
    if (!modifier.stackable) {
      const existing = state.modifiers.find(m => m.source === modifier.source);
      if (existing) {
        existing.value = modifier.value;
        existing.duration = modifier.duration;
        return;
      }
    }

    state.modifiers.push(modifier);
    this.applyMoraleChange(entityId, modifier.value);
  }

  removeModifier(entityId: string, modifierId: string): void {
    const state = this.states.get(entityId);
    if (!state) return;

    const index = state.modifiers.findIndex(m => m.id === modifierId);
    if (index >= 0) {
      const mod = state.modifiers[index];
      this.applyMoraleChange(entityId, -mod.value);
      state.modifiers.splice(index, 1);
    }
  }

  // === RALLY SYSTEM ===

  attemptRally(leaderId: string, groupId: string): { success: boolean; affected: number } {
    const leaderState = this.states.get(leaderId);
    if (!leaderState || leaderState.currentMorale < 50) {
      return { success: false, affected: 0 };
    }

    const members = this.groups.get(groupId);
    if (!members) return { success: false, affected: 0 };

    let affected = 0;
    const rallyBonus = leaderState.currentMorale * 0.3;

    for (const memberId of members) {
      if (memberId === leaderId) continue;

      const memberState = this.states.get(memberId);
      if (memberState && memberState.currentMorale < 60) {
        this.applyMoraleChange(memberId, rallyBonus);
        memberState.fearLevel = Math.max(0, memberState.fearLevel - 20);
        affected++;
      }
    }

    return { success: affected > 0, affected };
  }

  // === SERIALIZATION ===

  serialize(): object {
    return {
      states: Array.from(this.states.entries()),
      groups: Array.from(this.groups.entries()).map(([id, members]) => ({
        id,
        members: Array.from(members)
      })),
      leaders: Array.from(this.leaders.entries())
    };
  }

  static deserialize(data: any): MoraleAgent {
    const agent = new MoraleAgent();
    
    for (const [id, state] of data.states) {
      agent.states.set(id, state);
    }
    
    for (const { id, members } of data.groups) {
      agent.groups.set(id, new Set(members));
    }
    
    for (const [groupId, leaderId] of data.leaders) {
      agent.leaders.set(groupId, leaderId);
    }
    
    return agent;
  }
}

export default MoraleAgent;
