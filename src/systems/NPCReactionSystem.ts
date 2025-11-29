/**
 * NPCReactionSystem.ts - NPC Crime & Threat Reactions
 * Provides: Fleeing, cowering, guard calling, mob formation, witness behavior
 * Target: AAA-grade civilian AI reactions
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type NPCReactionType =
  | 'ignore'
  | 'observe'
  | 'flee'
  | 'cower'
  | 'call_guards'
  | 'attack'
  | 'report_later'
  | 'join_mob'
  | 'surrender'
  | 'beg';

export type NPCPersonality =
  | 'brave'
  | 'coward'
  | 'loyal'
  | 'opportunist'
  | 'neutral'
  | 'aggressive';

export type CrimeType =
  | 'theft'
  | 'assault'
  | 'murder'
  | 'trespass'
  | 'vandalism'
  | 'brandishing'
  | 'contraband'
  | 'heresy';

export interface NPCState {
  id: string;
  position: Vector3;
  personality: NPCPersonality;
  faction: string;
  isWitness: boolean;
  witnessedCrimes: WitnessedCrime[];
  currentReaction: NPCReactionType;
  fearLevel: number; // 0-100
  fleeTarget: Vector3 | null;
  guardCallDelay: number; // Ticks until guards called
  isCowering: boolean;
  isInMob: boolean;
  mobId: string | null;
  loyaltyToPlayer: number; // -100 to 100
}

export interface WitnessedCrime {
  crimeType: CrimeType;
  perpetratorId: string;
  victimId: string | null;
  location: Vector3;
  tick: number;
  reportedToGuards: boolean;
  canIdentify: boolean; // Did they see clearly?
}

export interface ThreatEvent {
  type: 'weapon_drawn' | 'shot_fired' | 'explosion' | 'crime_witnessed' | 'body_found';
  position: Vector3;
  perpetratorId?: string;
  intensity: number; // 0-1
  tick: number;
}

export interface GuardCall {
  id: string;
  callerId: string;
  callerPosition: Vector3;
  crimeType: CrimeType;
  suspectDescription: string;
  tick: number;
  responded: boolean;
}

export interface Mob {
  id: string;
  members: string[];
  targetId: string;
  formationTick: number;
  aggression: number; // 0-1
}

export interface SafeZone {
  id: string;
  position: Vector3;
  radius: number;
  type: 'building' | 'guard_post' | 'church' | 'faction_hq';
  faction?: string;
}

export interface NPCReactionConfig {
  fleeDistance: number;
  guardCallDelay: number; // Base ticks before calling guards
  cowersThreshold: number; // Fear level to cower
  mobFormationThreshold: number; // Players with this many witnessed crimes trigger mob
  mobMinMembers: number;
  bribeBaseCost: number;
  intimidationThreshold: number; // Player reputation needed to intimidate
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_NPC_REACTION_CONFIG: NPCReactionConfig = {
  fleeDistance: 30,
  guardCallDelay: 60, // 3 seconds
  cowersThreshold: 70,
  mobFormationThreshold: 5,
  mobMinMembers: 3,
  bribeBaseCost: 100,
  intimidationThreshold: -30
};

// ============================================================================
// NPC REACTION SYSTEM
// ============================================================================

export class NPCReactionSystem {
  private npcs: Map<string, NPCState> = new Map();
  private guardCalls: Map<string, GuardCall> = new Map();
  private mobs: Map<string, Mob> = new Map();
  private safeZones: SafeZone[] = [];
  private config: NPCReactionConfig;
  private idCounter = 0;

  constructor(config: Partial<NPCReactionConfig> = {}) {
    this.config = { ...DEFAULT_NPC_REACTION_CONFIG, ...config };
  }

  // ============================================================================
  // NPC REGISTRATION
  // ============================================================================

  registerNPC(
    id: string,
    position: Vector3,
    personality: NPCPersonality,
    faction: string
  ): NPCState {
    const state: NPCState = {
      id,
      position: { ...position },
      personality,
      faction,
      isWitness: false,
      witnessedCrimes: [],
      currentReaction: 'ignore',
      fearLevel: 0,
      fleeTarget: null,
      guardCallDelay: 0,
      isCowering: false,
      isInMob: false,
      mobId: null,
      loyaltyToPlayer: 0
    };
    this.npcs.set(id, state);
    return state;
  }

  unregisterNPC(id: string): void {
    this.npcs.delete(id);
  }

  getNPC(id: string): NPCState | undefined {
    return this.npcs.get(id);
  }

  // ============================================================================
  // THREAT PROCESSING
  // ============================================================================

  processThreatEvent(event: ThreatEvent, currentTick: number): void {
    for (const npc of this.npcs.values()) {
      const distance = this.distance(npc.position, event.position);
      const hearingRange = this.getHearingRange(event.type);

      if (distance > hearingRange) continue;

      // Calculate fear increase
      const distanceFactor = 1 - (distance / hearingRange);
      const fearIncrease = event.intensity * distanceFactor * 30;

      npc.fearLevel = Math.min(100, npc.fearLevel + fearIncrease);

      // Determine reaction
      this.determineReaction(npc, event, currentTick);
    }
  }

  private getHearingRange(eventType: ThreatEvent['type']): number {
    switch (eventType) {
      case 'explosion': return 100;
      case 'shot_fired': return 50;
      case 'weapon_drawn': return 15;
      case 'crime_witnessed': return 20;
      case 'body_found': return 25;
      default: return 20;
    }
  }

  // ============================================================================
  // REACTION DETERMINATION
  // ============================================================================

  private determineReaction(npc: NPCState, event: ThreatEvent, currentTick: number): void {
    const personalityModifiers = this.getPersonalityModifiers(npc.personality);

    // High fear = flee or cower
    if (npc.fearLevel >= this.config.cowersThreshold) {
      if (personalityModifiers.fleeChance > Math.random()) {
        npc.currentReaction = 'flee';
        npc.fleeTarget = this.findNearestSafeZone(npc.position);
      } else {
        npc.currentReaction = 'cower';
        npc.isCowering = true;
      }
      return;
    }

    // Brave personalities might attack
    if (npc.personality === 'brave' || npc.personality === 'aggressive') {
      if (event.type === 'crime_witnessed' && personalityModifiers.attackChance > Math.random()) {
        npc.currentReaction = 'attack';
        return;
      }
    }

    // Most NPCs will call guards or report later
    if (event.perpetratorId && event.type === 'crime_witnessed') {
      if (personalityModifiers.reportChance > Math.random()) {
        npc.currentReaction = 'call_guards';
        npc.guardCallDelay = this.config.guardCallDelay * personalityModifiers.reportDelay;
      } else {
        npc.currentReaction = 'report_later';
      }
    } else {
      npc.currentReaction = 'observe';
    }
  }

  private getPersonalityModifiers(personality: NPCPersonality): {
    fleeChance: number;
    attackChance: number;
    reportChance: number;
    reportDelay: number;
  } {
    switch (personality) {
      case 'brave':
        return { fleeChance: 0.2, attackChance: 0.4, reportChance: 0.9, reportDelay: 0.5 };
      case 'coward':
        return { fleeChance: 0.9, attackChance: 0, reportChance: 0.3, reportDelay: 2 };
      case 'loyal':
        return { fleeChance: 0.4, attackChance: 0.2, reportChance: 1, reportDelay: 0.3 };
      case 'opportunist':
        return { fleeChance: 0.6, attackChance: 0.1, reportChance: 0.5, reportDelay: 1.5 };
      case 'aggressive':
        return { fleeChance: 0.1, attackChance: 0.6, reportChance: 0.7, reportDelay: 0.7 };
      case 'neutral':
      default:
        return { fleeChance: 0.5, attackChance: 0.1, reportChance: 0.7, reportDelay: 1 };
    }
  }

  // ============================================================================
  // CRIME WITNESSING
  // ============================================================================

  witnessedCrime(
    npcId: string,
    crimeType: CrimeType,
    perpetratorId: string,
    victimId: string | null,
    location: Vector3,
    currentTick: number,
    canIdentify: boolean = true
  ): void {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    const crime: WitnessedCrime = {
      crimeType,
      perpetratorId,
      victimId,
      location: { ...location },
      tick: currentTick,
      reportedToGuards: false,
      canIdentify
    };

    npc.witnessedCrimes.push(crime);
    npc.isWitness = true;

    // Trigger threat event
    this.processThreatEvent({
      type: 'crime_witnessed',
      position: location,
      perpetratorId,
      intensity: this.getCrimeSeverity(crimeType),
      tick: currentTick
    }, currentTick);

    // Check for mob formation
    this.checkMobFormation(perpetratorId, currentTick);
  }

  private getCrimeSeverity(crimeType: CrimeType): number {
    switch (crimeType) {
      case 'murder': return 1.0;
      case 'assault': return 0.7;
      case 'theft': return 0.3;
      case 'trespass': return 0.2;
      case 'vandalism': return 0.25;
      case 'brandishing': return 0.5;
      case 'contraband': return 0.4;
      case 'heresy': return 0.8;
      default: return 0.3;
    }
  }

  // ============================================================================
  // GUARD CALLING
  // ============================================================================

  update(currentTick: number): void {
    // Process guard call delays
    for (const npc of this.npcs.values()) {
      // Decay fear over time
      npc.fearLevel = Math.max(0, npc.fearLevel - 0.5);

      // Process guard calling
      if (npc.currentReaction === 'call_guards' && npc.guardCallDelay > 0) {
        npc.guardCallDelay--;

        if (npc.guardCallDelay <= 0) {
          // Create guard call
          const unreportedCrime = npc.witnessedCrimes.find(c => !c.reportedToGuards);
          if (unreportedCrime) {
            this.createGuardCall(npc, unreportedCrime, currentTick);
            unreportedCrime.reportedToGuards = true;
          }
        }
      }

      // Reset cowering after fear drops
      if (npc.isCowering && npc.fearLevel < this.config.cowersThreshold * 0.5) {
        npc.isCowering = false;
        npc.currentReaction = 'ignore';
      }
    }
  }

  private createGuardCall(npc: NPCState, crime: WitnessedCrime, currentTick: number): GuardCall {
    const id = `call_${++this.idCounter}`;
    const call: GuardCall = {
      id,
      callerId: npc.id,
      callerPosition: { ...npc.position },
      crimeType: crime.crimeType,
      suspectDescription: crime.canIdentify ? crime.perpetratorId : 'unknown',
      tick: currentTick,
      responded: false
    };

    this.guardCalls.set(id, call);
    return call;
  }

  getPendingGuardCalls(): GuardCall[] {
    return Array.from(this.guardCalls.values()).filter(c => !c.responded);
  }

  markGuardCallResponded(callId: string): void {
    const call = this.guardCalls.get(callId);
    if (call) call.responded = true;
  }

  // ============================================================================
  // MOB FORMATION
  // ============================================================================

  private checkMobFormation(targetId: string, currentTick: number): void {
    // Count nearby NPCs who have witnessed crimes by this target
    const witnessNPCs: NPCState[] = [];

    for (const npc of this.npcs.values()) {
      if (npc.isInMob) continue;

      const crimesByTarget = npc.witnessedCrimes.filter(c => c.perpetratorId === targetId);
      if (crimesByTarget.length >= 2) { // Witnessed at least 2 crimes
        witnessNPCs.push(npc);
      }
    }

    // Check if we have enough angry NPCs nearby each other
    if (witnessNPCs.length >= this.config.mobMinMembers) {
      // Check if they're close enough
      const center = this.calculateCenter(witnessNPCs.map(n => n.position));
      const nearbyWitnesses = witnessNPCs.filter(
        n => this.distance(n.position, center) < 20
      );

      if (nearbyWitnesses.length >= this.config.mobMinMembers) {
        this.formMob(nearbyWitnesses, targetId, currentTick);
      }
    }
  }

  private formMob(members: NPCState[], targetId: string, currentTick: number): Mob {
    const id = `mob_${++this.idCounter}`;
    const mob: Mob = {
      id,
      members: members.map(m => m.id),
      targetId,
      formationTick: currentTick,
      aggression: 0.5
    };

    for (const member of members) {
      member.isInMob = true;
      member.mobId = id;
      member.currentReaction = 'join_mob';
    }

    this.mobs.set(id, mob);
    return mob;
  }

  getMob(mobId: string): Mob | undefined {
    return this.mobs.get(mobId);
  }

  getActiveMobs(): Mob[] {
    return Array.from(this.mobs.values());
  }

  // ============================================================================
  // WITNESS INTERACTION
  // ============================================================================

  tryIntimidateWitness(npcId: string, playerReputation: number): {
    success: boolean;
    npcFlees: boolean;
    forgotCrimes: boolean;
  } {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.isWitness) {
      return { success: false, npcFlees: false, forgotCrimes: false };
    }

    const intimidationSuccess = playerReputation <= this.config.intimidationThreshold ||
      (npc.personality === 'coward' && playerReputation <= 0);

    if (intimidationSuccess) {
      npc.fearLevel = Math.min(100, npc.fearLevel + 50);

      if (npc.personality === 'coward') {
        // Coward forgets and flees
        npc.witnessedCrimes = [];
        npc.isWitness = false;
        npc.currentReaction = 'flee';
        npc.fleeTarget = this.findNearestSafeZone(npc.position);
        return { success: true, npcFlees: true, forgotCrimes: true };
      } else {
        // Others just won't report
        npc.witnessedCrimes.forEach(c => c.reportedToGuards = true); // Mark as "dealt with"
        return { success: true, npcFlees: false, forgotCrimes: false };
      }
    }

    return { success: false, npcFlees: false, forgotCrimes: false };
  }

  tryBribeWitness(npcId: string, goldOffered: number): {
    success: boolean;
    cost: number;
    forgotCrimes: boolean;
  } {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.isWitness) {
      return { success: false, cost: 0, forgotCrimes: false };
    }

    // Calculate bribe cost based on crimes witnessed
    const totalSeverity = npc.witnessedCrimes.reduce(
      (sum, c) => sum + this.getCrimeSeverity(c.crimeType), 0
    );
    const bribeCost = Math.floor(this.config.bribeBaseCost * (1 + totalSeverity));

    // Personality affects bribe acceptance
    let acceptanceChance = 0.5;
    if (npc.personality === 'opportunist') acceptanceChance = 0.9;
    if (npc.personality === 'loyal') acceptanceChance = 0.1;
    if (npc.personality === 'brave') acceptanceChance = 0.2;

    if (goldOffered >= bribeCost && Math.random() < acceptanceChance) {
      npc.witnessedCrimes = [];
      npc.isWitness = false;
      npc.currentReaction = 'ignore';
      return { success: true, cost: bribeCost, forgotCrimes: true };
    }

    return { success: false, cost: bribeCost, forgotCrimes: false };
  }

  // ============================================================================
  // SAFE ZONES
  // ============================================================================

  registerSafeZone(zone: SafeZone): void {
    this.safeZones.push(zone);
  }

  private findNearestSafeZone(position: Vector3): Vector3 | null {
    let nearest: SafeZone | null = null;
    let nearestDist = Infinity;

    for (const zone of this.safeZones) {
      const dist = this.distance(position, zone.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = zone;
      }
    }

    return nearest?.position ?? null;
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  getWitnesses(perpetratorId: string): NPCState[] {
    return Array.from(this.npcs.values()).filter(
      npc => npc.witnessedCrimes.some(c => c.perpetratorId === perpetratorId)
    );
  }

  getNPCsInReactionState(reaction: NPCReactionType): NPCState[] {
    return Array.from(this.npcs.values()).filter(npc => npc.currentReaction === reaction);
  }

  getFleeingNPCs(): NPCState[] {
    return this.getNPCsInReactionState('flee');
  }

  getCoweringNPCs(): NPCState[] {
    return this.getNPCsInReactionState('cower');
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  private distance(a: Vector3, b: Vector3): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private calculateCenter(positions: Vector3[]): Vector3 {
    if (positions.length === 0) return { x: 0, y: 0, z: 0 };

    const sum = positions.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }),
      { x: 0, y: 0, z: 0 }
    );

    return {
      x: sum.x / positions.length,
      y: sum.y / positions.length,
      z: sum.z / positions.length
    };
  }

  // ============================================================================
  // SERIALIZATION
  // ============================================================================

  serialize(): object {
    return {
      npcs: Array.from(this.npcs.entries()),
      guardCalls: Array.from(this.guardCalls.entries()),
      mobs: Array.from(this.mobs.entries()),
      safeZones: this.safeZones,
      config: this.config,
      idCounter: this.idCounter
    };
  }

  static deserialize(data: any): NPCReactionSystem {
    const system = new NPCReactionSystem(data.config);
    system.idCounter = data.idCounter || 0;
    system.safeZones = data.safeZones || [];
    for (const [id, npc] of data.npcs || []) {
      system.npcs.set(id, npc);
    }
    for (const [id, call] of data.guardCalls || []) {
      system.guardCalls.set(id, call);
    }
    for (const [id, mob] of data.mobs || []) {
      system.mobs.set(id, mob);
    }
    return system;
  }
}

export default NPCReactionSystem;
