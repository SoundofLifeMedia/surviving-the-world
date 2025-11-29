/**
 * SuppressionSystem.ts - AI Suppression & Pinning Mechanics
 * Provides: Suppression states, accuracy penalties, morale drain, movement restrictions
 * Target: AAA tactical combat feel
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type SuppressionLevel = 'none' | 'light' | 'medium' | 'heavy' | 'pinned';

export interface SuppressionState {
  entityId: string;
  level: SuppressionLevel;
  intensity: number; // 0-1
  sources: SuppressionSource[];
  lastUpdateTick: number;
  accumulatedSuppression: number;
  effects: SuppressionEffects;
  isPinned: boolean;
  pinnedDuration: number; // Ticks pinned
  canReturn: boolean; // Can return fire
}

export interface SuppressionSource {
  sourceId: string;
  position: Vector3;
  weaponClass: string;
  roundsPerSecond: number;
  startTick: number;
  lastShotTick: number;
}

export interface SuppressionEffects {
  accuracyPenalty: number; // 0-1, how much worse accuracy is
  movementPenalty: number; // 0-1, how much slower movement is
  moraleDrain: number; // Per tick morale loss
  visionPenalty: number; // 0-1, tunnel vision effect
  canADS: boolean; // Can aim down sights
  canSprint: boolean; // Can sprint
  canVault: boolean; // Can vault/mantle
}

export interface SuppressionConfig {
  // Thresholds for suppression levels
  lightThreshold: number;
  mediumThreshold: number;
  heavyThreshold: number;
  pinnedThreshold: number;

  // Decay
  decayRate: number; // Per tick when not being shot at
  sustainedFireBonus: number; // Multiplier for continuous fire

  // Effects per level
  effectsPerLevel: Record<SuppressionLevel, SuppressionEffects>;

  // Weapon suppression values
  weaponSuppressionValues: Record<string, number>;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_SUPPRESSION_CONFIG: SuppressionConfig = {
  lightThreshold: 0.2,
  mediumThreshold: 0.4,
  heavyThreshold: 0.65,
  pinnedThreshold: 0.85,

  decayRate: 0.02, // 2% per tick
  sustainedFireBonus: 1.5,

  effectsPerLevel: {
    none: {
      accuracyPenalty: 0,
      movementPenalty: 0,
      moraleDrain: 0,
      visionPenalty: 0,
      canADS: true,
      canSprint: true,
      canVault: true
    },
    light: {
      accuracyPenalty: 0.15,
      movementPenalty: 0.1,
      moraleDrain: 0.5,
      visionPenalty: 0.1,
      canADS: true,
      canSprint: true,
      canVault: true
    },
    medium: {
      accuracyPenalty: 0.35,
      movementPenalty: 0.25,
      moraleDrain: 1.5,
      visionPenalty: 0.25,
      canADS: true,
      canSprint: false,
      canVault: true
    },
    heavy: {
      accuracyPenalty: 0.55,
      movementPenalty: 0.5,
      moraleDrain: 3,
      visionPenalty: 0.4,
      canADS: false,
      canSprint: false,
      canVault: false
    },
    pinned: {
      accuracyPenalty: 0.8,
      movementPenalty: 0.9,
      moraleDrain: 5,
      visionPenalty: 0.6,
      canADS: false,
      canSprint: false,
      canVault: false
    }
  },

  weaponSuppressionValues: {
    pistol: 0.05,
    smg: 0.08,
    rifle: 0.12,
    shotgun: 0.15,
    sniper: 0.2, // High suppression per shot
    lmg: 0.1, // Lower per shot but high volume
    explosive: 0.4
  }
};

// ============================================================================
// SUPPRESSION SYSTEM
// ============================================================================

export class SuppressionSystem {
  private states: Map<string, SuppressionState> = new Map();
  private config: SuppressionConfig;
  private ticksPerSecond = 20;

  constructor(config: Partial<SuppressionConfig> = {}) {
    this.config = { ...DEFAULT_SUPPRESSION_CONFIG, ...config };
  }

  // ============================================================================
  // ENTITY MANAGEMENT
  // ============================================================================

  registerEntity(entityId: string): SuppressionState {
    const state: SuppressionState = {
      entityId,
      level: 'none',
      intensity: 0,
      sources: [],
      lastUpdateTick: 0,
      accumulatedSuppression: 0,
      effects: { ...this.config.effectsPerLevel.none },
      isPinned: false,
      pinnedDuration: 0,
      canReturn: true
    };
    this.states.set(entityId, state);
    return state;
  }

  unregisterEntity(entityId: string): void {
    this.states.delete(entityId);
  }

  getState(entityId: string): SuppressionState | undefined {
    return this.states.get(entityId);
  }

  // ============================================================================
  // CORE UPDATE
  // ============================================================================

  update(entityId: string, currentTick: number): SuppressionState {
    let state = this.states.get(entityId);
    if (!state) {
      state = this.registerEntity(entityId);
    }

    // Clean up stale sources (no shots in last 0.5 seconds)
    const staleThreshold = 10; // ticks
    state.sources = state.sources.filter(
      source => currentTick - source.lastShotTick < staleThreshold
    );

    // Calculate suppression from active sources
    let incomingSuppression = 0;
    for (const source of state.sources) {
      const weaponValue = this.config.weaponSuppressionValues[source.weaponClass] || 0.1;
      const sustainedBonus = currentTick - source.startTick > 20 ? this.config.sustainedFireBonus : 1;
      incomingSuppression += weaponValue * source.roundsPerSecond * sustainedBonus;
    }

    // Apply incoming or decay
    if (incomingSuppression > 0) {
      state.accumulatedSuppression = Math.min(1, state.accumulatedSuppression + incomingSuppression * 0.1);
    } else {
      state.accumulatedSuppression = Math.max(0, state.accumulatedSuppression - this.config.decayRate);
    }

    // Update intensity (smooth towards accumulated)
    const targetIntensity = state.accumulatedSuppression;
    state.intensity += (targetIntensity - state.intensity) * 0.2;

    // Determine suppression level
    state.level = this.calculateLevel(state.intensity);
    state.effects = { ...this.config.effectsPerLevel[state.level] };

    // Update pinned status
    if (state.level === 'pinned') {
      state.isPinned = true;
      state.pinnedDuration++;
      state.canReturn = state.pinnedDuration < 40; // Can try to return fire after 2 seconds
    } else {
      state.isPinned = false;
      state.pinnedDuration = 0;
      state.canReturn = true;
    }

    state.lastUpdateTick = currentTick;
    return state;
  }

  private calculateLevel(intensity: number): SuppressionLevel {
    if (intensity >= this.config.pinnedThreshold) return 'pinned';
    if (intensity >= this.config.heavyThreshold) return 'heavy';
    if (intensity >= this.config.mediumThreshold) return 'medium';
    if (intensity >= this.config.lightThreshold) return 'light';
    return 'none';
  }

  // ============================================================================
  // INCOMING FIRE
  // ============================================================================

  onIncomingFire(
    targetId: string,
    sourceId: string,
    sourcePosition: Vector3,
    weaponClass: string,
    currentTick: number
  ): void {
    let state = this.states.get(targetId);
    if (!state) {
      state = this.registerEntity(targetId);
    }

    // Find or create source
    let source = state.sources.find(s => s.sourceId === sourceId);
    if (!source) {
      source = {
        sourceId,
        position: sourcePosition,
        weaponClass,
        roundsPerSecond: 0,
        startTick: currentTick,
        lastShotTick: currentTick
      };
      state.sources.push(source);
    }

    // Update source
    source.position = sourcePosition;
    source.weaponClass = weaponClass;
    source.lastShotTick = currentTick;

    // Calculate rounds per second
    const elapsed = Math.max(1, currentTick - source.startTick) / this.ticksPerSecond;
    source.roundsPerSecond = 1 / elapsed; // Simplified - real RPS would track actual shots

    // Immediate suppression spike on near miss
    const weaponValue = this.config.weaponSuppressionValues[weaponClass] || 0.1;
    state.accumulatedSuppression = Math.min(1, state.accumulatedSuppression + weaponValue);
  }

  onNearMiss(
    targetId: string,
    sourcePosition: Vector3,
    missDistance: number,
    weaponClass: string,
    currentTick: number
  ): void {
    let state = this.states.get(targetId);
    if (!state) {
      state = this.registerEntity(targetId);
    }

    // Closer misses = more suppression
    const distanceFactor = Math.max(0, 1 - (missDistance / 5)); // Max effect within 5 meters
    const weaponValue = this.config.weaponSuppressionValues[weaponClass] || 0.1;
    const suppressionAdd = weaponValue * distanceFactor * 1.5;

    state.accumulatedSuppression = Math.min(1, state.accumulatedSuppression + suppressionAdd);
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  isSuppressed(entityId: string): boolean {
    const state = this.states.get(entityId);
    return state ? state.level !== 'none' : false;
  }

  isPinned(entityId: string): boolean {
    const state = this.states.get(entityId);
    return state?.isPinned ?? false;
  }

  getSuppressionLevel(entityId: string): SuppressionLevel {
    return this.states.get(entityId)?.level ?? 'none';
  }

  getSuppressionIntensity(entityId: string): number {
    return this.states.get(entityId)?.intensity ?? 0;
  }

  getEffects(entityId: string): SuppressionEffects {
    const state = this.states.get(entityId);
    return state?.effects ?? { ...this.config.effectsPerLevel.none };
  }

  canReturnFire(entityId: string): boolean {
    const state = this.states.get(entityId);
    return state?.canReturn ?? true;
  }

  getAccuracyModifier(entityId: string): number {
    const effects = this.getEffects(entityId);
    return 1 - effects.accuracyPenalty;
  }

  getMovementModifier(entityId: string): number {
    const effects = this.getEffects(entityId);
    return 1 - effects.movementPenalty;
  }

  getMoraleDrain(entityId: string): number {
    const effects = this.getEffects(entityId);
    return effects.moraleDrain;
  }

  // ============================================================================
  // SUPPRESSIVE FIRE CALCULATION
  // ============================================================================

  calculateSuppressiveFireCoverage(
    shooterPosition: Vector3,
    targetArea: { center: Vector3; radius: number },
    weaponClass: string,
    burstDuration: number // ticks
  ): { entitiesInArea: string[]; estimatedSuppressionLevel: SuppressionLevel } {
    const entitiesInArea: string[] = [];

    // Find all entities in the target area
    for (const [entityId, state] of this.states) {
      // Would need entity positions - simplified for now
      entitiesInArea.push(entityId);
    }

    // Estimate suppression level based on weapon and duration
    const weaponValue = this.config.weaponSuppressionValues[weaponClass] || 0.1;
    const estimatedIntensity = Math.min(1, weaponValue * burstDuration * 0.5);
    const estimatedLevel = this.calculateLevel(estimatedIntensity);

    return { entitiesInArea, estimatedSuppressionLevel: estimatedLevel };
  }

  // ============================================================================
  // COVER INTERACTION
  // ============================================================================

  applySuppressionWithCover(
    entityId: string,
    inCover: boolean,
    coverQuality: number // 0-1, how good the cover is
  ): void {
    const state = this.states.get(entityId);
    if (!state) return;

    if (inCover) {
      // Good cover reduces suppression accumulation
      const reduction = coverQuality * 0.5;
      state.accumulatedSuppression *= (1 - reduction);

      // Also reduces intensity more quickly when in cover
      state.effects.moraleDrain *= (1 - coverQuality * 0.3);
    }
  }

  // ============================================================================
  // SQUAD COORDINATION
  // ============================================================================

  getSquadSuppressionStatus(entityIds: string[]): {
    totalSuppressed: number;
    pinned: string[];
    canAdvance: boolean;
  } {
    let totalSuppressed = 0;
    const pinned: string[] = [];

    for (const id of entityIds) {
      const state = this.states.get(id);
      if (state) {
        if (state.level !== 'none') totalSuppressed++;
        if (state.isPinned) pinned.push(id);
      }
    }

    // Squad can advance if less than half are suppressed and none are pinned
    const canAdvance = pinned.length === 0 && totalSuppressed < entityIds.length / 2;

    return {
      totalSuppressed,
      pinned,
      canAdvance
    };
  }

  // ============================================================================
  // SERIALIZATION
  // ============================================================================

  serialize(): object {
    return {
      states: Array.from(this.states.entries()),
      config: this.config
    };
  }

  static deserialize(data: any): SuppressionSystem {
    const system = new SuppressionSystem(data.config);
    for (const [id, state] of data.states || []) {
      system.states.set(id, state);
    }
    return system;
  }
}

export default SuppressionSystem;
