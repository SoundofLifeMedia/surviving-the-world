/**
 * Faction Heat System - GTA-style escalation tracking
 * Feature: surviving-the-world, Property 20: Heat level increases on hostile actions
 * Feature: surviving-the-world, Property 21: Escalation tier transitions at thresholds
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

export type EscalationTier = 'calm' | 'alert' | 'hunting' | 'war';

export interface FactionHeatState {
  factionId: string;
  heatLevel: number; // 0-100
  escalationTier: EscalationTier;
  lastHostileAction: number;
  cooldownRate: number;
  revengeTargets: string[];
  activeResponses: string[];
}

export interface HeatConfig {
  escalationThresholds: { alert: number; hunting: number; war: number };
  cooldownRate: number;
  hostileActionWeights: Record<string, number>;
  escalationResponses: Record<EscalationTier, string[]>;
  revengeMemoryDuration: number;
}

const DEFAULT_CONFIG: HeatConfig = {
  escalationThresholds: { alert: 25, hunting: 50, war: 80 },
  cooldownRate: 0.5,
  hostileActionWeights: {
    kill_guard: 15,
    kill_civilian: 10,
    steal: 5,
    trespass: 2,
    assault: 10,
    destroy_property: 8,
    help_enemy: 20
  },
  escalationResponses: {
    calm: [],
    alert: ['increased_patrols', 'wanted_posters'],
    hunting: ['bounty_hunters', 'checkpoint_searches', 'informant_network'],
    war: ['army_deployment', 'ally_notification', 'scorched_earth']
  },
  revengeMemoryDuration: 168 // hours
};


export class HeatSystem {
  private factionHeat: Map<string, FactionHeatState> = new Map();
  private configs: Map<string, HeatConfig> = new Map();
  private listeners: ((factionId: string, tier: EscalationTier, responses: string[]) => void)[] = [];

  initializeFaction(factionId: string, config: Partial<HeatConfig> = {}): FactionHeatState {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    this.configs.set(factionId, fullConfig);

    const state: FactionHeatState = {
      factionId,
      heatLevel: 0,
      escalationTier: 'calm',
      lastHostileAction: 0,
      cooldownRate: fullConfig.cooldownRate,
      revengeTargets: [],
      activeResponses: []
    };

    this.factionHeat.set(factionId, state);
    return state;
  }

  getHeatState(factionId: string): FactionHeatState | undefined {
    return this.factionHeat.get(factionId);
  }

  increaseHeat(factionId: string, actionType: string, targetId?: string): number {
    let state = this.factionHeat.get(factionId);
    if (!state) {
      state = this.initializeFaction(factionId);
    }

    const config = this.configs.get(factionId) || DEFAULT_CONFIG;
    const heatAmount = config.hostileActionWeights[actionType] || 5;

    state.heatLevel = Math.min(100, state.heatLevel + heatAmount);
    state.lastHostileAction = Date.now();

    if (targetId && !state.revengeTargets.includes(targetId)) {
      state.revengeTargets.push(targetId);
    }

    this.checkEscalation(factionId);
    return state.heatLevel;
  }

  decreaseHeat(factionId: string, deltaHours: number): number {
    const state = this.factionHeat.get(factionId);
    if (!state) return 0;

    const timeSinceHostile = (Date.now() - state.lastHostileAction) / (1000 * 60 * 60);
    
    // Only cool down if enough time has passed
    if (timeSinceHostile > 1) {
      state.heatLevel = Math.max(0, state.heatLevel - state.cooldownRate * deltaHours);
      this.checkEscalation(factionId);
    }

    return state.heatLevel;
  }

  private checkEscalation(factionId: string): void {
    const state = this.factionHeat.get(factionId);
    const config = this.configs.get(factionId);
    if (!state || !config) return;

    const oldTier = state.escalationTier;
    let newTier: EscalationTier = 'calm';

    if (state.heatLevel >= config.escalationThresholds.war) {
      newTier = 'war';
    } else if (state.heatLevel >= config.escalationThresholds.hunting) {
      newTier = 'hunting';
    } else if (state.heatLevel >= config.escalationThresholds.alert) {
      newTier = 'alert';
    }

    if (newTier !== oldTier) {
      state.escalationTier = newTier;
      state.activeResponses = config.escalationResponses[newTier];
      this.triggerEscalation(factionId, newTier);
    }
  }

  private triggerEscalation(factionId: string, tier: EscalationTier): void {
    const state = this.factionHeat.get(factionId);
    if (!state) return;

    for (const listener of this.listeners) {
      listener(factionId, tier, state.activeResponses);
    }
  }

  onEscalation(callback: (factionId: string, tier: EscalationTier, responses: string[]) => void): void {
    this.listeners.push(callback);
  }

  getEscalationTier(factionId: string): EscalationTier {
    return this.factionHeat.get(factionId)?.escalationTier || 'calm';
  }

  getActiveResponses(factionId: string): string[] {
    return this.factionHeat.get(factionId)?.activeResponses || [];
  }

  planRevengeAction(factionId: string): { type: string; targets: string[] } | null {
    const state = this.factionHeat.get(factionId);
    if (!state || state.escalationTier === 'calm' || state.revengeTargets.length === 0) {
      return null;
    }

    const revengeTypes: Record<EscalationTier, string> = {
      calm: 'none',
      alert: 'bounty',
      hunting: 'assassination',
      war: 'raid'
    };

    return {
      type: revengeTypes[state.escalationTier],
      targets: state.revengeTargets.slice(0, 3)
    };
  }

  updatePatrolIntensity(factionId: string): number {
    const state = this.factionHeat.get(factionId);
    if (!state) return 1.0;

    // Patrol intensity scales with heat level
    return 1.0 + (state.heatLevel / 100) * 2.0; // 1x to 3x
  }

  clearRevengeTarget(factionId: string, targetId: string): void {
    const state = this.factionHeat.get(factionId);
    if (state) {
      state.revengeTargets = state.revengeTargets.filter(t => t !== targetId);
    }
  }

  resetHeat(factionId: string): void {
    const state = this.factionHeat.get(factionId);
    if (state) {
      state.heatLevel = 0;
      state.escalationTier = 'calm';
      state.revengeTargets = [];
      state.activeResponses = [];
    }
  }

  // Alliance effects
  applyAllianceBonus(factionId: string, alliedPlayerId: string): void {
    const state = this.factionHeat.get(factionId);
    if (state) {
      // Allied factions have reduced heat
      state.heatLevel = Math.max(0, state.heatLevel - 20);
      this.checkEscalation(factionId);
    }
  }

  // Serialize for save/load
  serialize(): string {
    const data: Record<string, FactionHeatState> = {};
    for (const [id, state] of Array.from(this.factionHeat.entries())) {
      data[id] = state;
    }
    return JSON.stringify(data);
  }

  deserialize(json: string): void {
    const data = JSON.parse(json);
    for (const [id, state] of Object.entries(data)) {
      this.factionHeat.set(id, state as FactionHeatState);
    }
  }
}
