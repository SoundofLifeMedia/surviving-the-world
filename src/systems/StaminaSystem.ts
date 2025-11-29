/**
 * StaminaSystem.ts - Player Stamina Management
 * Handles: Drain, Regeneration, Exhaustion States
 */

export interface StaminaConfig {
  maxStamina: number;
  baseRegenRate: number; // Per second
  regenDelay: number; // Seconds after drain before regen starts
  exhaustionThreshold: number; // Below this, penalties apply
  exhaustionRegenPenalty: number; // Multiplier when exhausted
  crouchRegenBonus: number; // Multiplier when crouching
  proneRegenBonus: number; // Multiplier when prone
  standingIdleRegenBonus: number; // Multiplier when standing still
}

export interface StaminaState {
  entityId: string;
  current: number;
  max: number;
  lastDrainTick: number;
  isExhausted: boolean;
  regenMultiplier: number;
}

export interface StaminaResult {
  current: number;
  isExhausted: boolean;
  canSprint: boolean;
  canSlide: boolean;
  canVault: boolean;
  canDive: boolean;
  regenActive: boolean;
}

export const DEFAULT_STAMINA_CONFIG: StaminaConfig = {
  maxStamina: 100,
  baseRegenRate: 15, // 15 stamina per second
  regenDelay: 1.5, // 1.5 seconds
  exhaustionThreshold: 15,
  exhaustionRegenPenalty: 0.5,
  crouchRegenBonus: 1.3,
  proneRegenBonus: 1.5,
  standingIdleRegenBonus: 1.2
};

export class StaminaSystem {
  private states: Map<string, StaminaState> = new Map();
  private config: StaminaConfig;
  private ticksPerSecond: number = 20;

  constructor(config: Partial<StaminaConfig> = {}) {
    this.config = { ...DEFAULT_STAMINA_CONFIG, ...config };
  }

  // ============================================================================
  // ENTITY MANAGEMENT
  // ============================================================================

  registerEntity(entityId: string, initialStamina?: number): StaminaState {
    const state: StaminaState = {
      entityId,
      current: initialStamina ?? this.config.maxStamina,
      max: this.config.maxStamina,
      lastDrainTick: 0,
      isExhausted: false,
      regenMultiplier: 1.0
    };
    this.states.set(entityId, state);
    return state;
  }

  unregisterEntity(entityId: string): void {
    this.states.delete(entityId);
  }

  getState(entityId: string): StaminaState | undefined {
    return this.states.get(entityId);
  }

  getStamina(entityId: string): number {
    return this.states.get(entityId)?.current ?? 0;
  }

  // ============================================================================
  // CORE UPDATE
  // ============================================================================

  update(
    entityId: string,
    drain: number,
    stance: 'standing' | 'crouching' | 'prone' | string,
    isMoving: boolean,
    currentTick: number
  ): StaminaResult {
    const state = this.states.get(entityId);
    if (!state) {
      throw new Error(`Entity ${entityId} not registered in StaminaSystem`);
    }

    const tickDelta = 1 / this.ticksPerSecond;

    // Apply drain
    if (drain > 0) {
      state.current = Math.max(0, state.current - drain);
      state.lastDrainTick = currentTick;
    }

    // Calculate regen multiplier based on stance and movement
    let regenMult = 1.0;
    if (!isMoving) {
      switch (stance) {
        case 'crouching':
          regenMult = this.config.crouchRegenBonus;
          break;
        case 'prone':
          regenMult = this.config.proneRegenBonus;
          break;
        case 'standing':
          regenMult = this.config.standingIdleRegenBonus;
          break;
      }
    }

    // Check exhaustion
    if (state.current <= this.config.exhaustionThreshold) {
      state.isExhausted = true;
      regenMult *= this.config.exhaustionRegenPenalty;
    } else if (state.current > this.config.exhaustionThreshold * 2) {
      // Only recover from exhaustion when well above threshold
      state.isExhausted = false;
    }

    state.regenMultiplier = regenMult;

    // Apply regeneration if enough time has passed since last drain
    const ticksSinceLastDrain = currentTick - state.lastDrainTick;
    const regenDelayTicks = this.config.regenDelay * this.ticksPerSecond;
    const regenActive = ticksSinceLastDrain >= regenDelayTicks && state.current < state.max;

    if (regenActive && drain === 0) {
      const regenAmount = this.config.baseRegenRate * regenMult * tickDelta;
      state.current = Math.min(state.max, state.current + regenAmount);
    }

    return {
      current: state.current,
      isExhausted: state.isExhausted,
      canSprint: this.canSprint(entityId),
      canSlide: this.canSlide(entityId),
      canVault: this.canVault(entityId),
      canDive: this.canDive(entityId),
      regenActive
    };
  }

  // ============================================================================
  // ACTION COSTS
  // ============================================================================

  // These values align with MovementSystem costs
  private readonly ACTION_COSTS = {
    sprint: 8, // Per second
    slide: 15, // One-time
    vault: 10, // One-time
    dive: 20, // One-time
    melee: 12, // Per attack
    heavyAttack: 20
  };

  canSprint(entityId: string): boolean {
    const state = this.states.get(entityId);
    if (!state) return false;
    return !state.isExhausted && state.current > 10;
  }

  canSlide(entityId: string): boolean {
    const state = this.states.get(entityId);
    if (!state) return false;
    return state.current >= this.ACTION_COSTS.slide;
  }

  canVault(entityId: string): boolean {
    const state = this.states.get(entityId);
    if (!state) return false;
    return state.current >= this.ACTION_COSTS.vault;
  }

  canDive(entityId: string): boolean {
    const state = this.states.get(entityId);
    if (!state) return false;
    return state.current >= this.ACTION_COSTS.dive;
  }

  canMelee(entityId: string): boolean {
    const state = this.states.get(entityId);
    if (!state) return false;
    return state.current >= this.ACTION_COSTS.melee;
  }

  // ============================================================================
  // DIRECT MANIPULATION
  // ============================================================================

  drain(entityId: string, amount: number, currentTick: number): number {
    const state = this.states.get(entityId);
    if (!state) return 0;

    const actualDrain = Math.min(state.current, amount);
    state.current -= actualDrain;
    state.lastDrainTick = currentTick;

    if (state.current <= this.config.exhaustionThreshold) {
      state.isExhausted = true;
    }

    return actualDrain;
  }

  restore(entityId: string, amount: number): number {
    const state = this.states.get(entityId);
    if (!state) return 0;

    const actualRestore = Math.min(state.max - state.current, amount);
    state.current += actualRestore;

    return actualRestore;
  }

  setMax(entityId: string, newMax: number): void {
    const state = this.states.get(entityId);
    if (!state) return;

    state.max = Math.max(1, newMax);
    state.current = Math.min(state.current, state.max);
  }

  // ============================================================================
  // BUFF/DEBUFF MODIFIERS
  // ============================================================================

  applyRegenModifier(entityId: string, multiplier: number): void {
    const state = this.states.get(entityId);
    if (!state) return;
    state.regenMultiplier *= multiplier;
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  getPercentage(entityId: string): number {
    const state = this.states.get(entityId);
    if (!state) return 0;
    return (state.current / state.max) * 100;
  }

  isExhausted(entityId: string): boolean {
    return this.states.get(entityId)?.isExhausted ?? false;
  }

  // ============================================================================
  // SERIALIZATION
  // ============================================================================

  serialize(): object {
    return {
      config: this.config,
      states: Array.from(this.states.entries())
    };
  }

  static deserialize(data: any): StaminaSystem {
    const system = new StaminaSystem(data.config);
    for (const [id, state] of data.states) {
      system.states.set(id, state);
    }
    return system;
  }
}

export default StaminaSystem;
