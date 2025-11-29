/**
 * MovementSystem.ts - AAA-Grade Traversal System
 * Provides: Sprint, Slide, Vault, Crouch, Prone, Lean/Peek
 * Target: GTA5/Modern Warfare parity
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export type MovementStance =
  | 'standing'
  | 'crouching'
  | 'prone'
  | 'sliding'
  | 'vaulting'
  | 'mantling'
  | 'diving';

export type LeanDirection = 'none' | 'left' | 'right';

export interface MovementState {
  entityId: string;
  position: Vector3;
  velocity: Vector3;
  facing: Vector2; // Normalized direction
  stance: MovementStance;
  leanDirection: LeanDirection;
  isMoving: boolean;
  isSprinting: boolean;
  isAiming: boolean;
  momentum: number; // 0-1, affects accuracy and transitions
  groundedTime: number; // Ticks since last grounded
  lastStanceChange: number; // Tick when stance changed
  slideStartTick: number;
  vaultProgress: number; // 0-1
  staminaDrain: number; // Per-tick drain rate
}

export interface MovementConfig {
  // Base speeds (units per second)
  walkSpeed: number;
  sprintSpeed: number;
  crouchSpeed: number;
  proneSpeed: number;
  slideSpeed: number;

  // Stamina costs
  sprintStaminaDrain: number; // Per second
  slideStaminaCost: number; // One-time
  vaultStaminaCost: number;
  diveStaminaCost: number;

  // Timing (in seconds)
  slideDuration: number;
  vaultDuration: number;
  mantleDuration: number;
  diveDuration: number;
  stanceTransitionTime: number;

  // Accuracy modifiers
  standingAccuracy: number;
  crouchingAccuracy: number;
  proneAccuracy: number;
  movingAccuracyPenalty: number;
  sprintingAccuracyPenalty: number;
  slidingAccuracyPenalty: number;

  // Visibility modifiers
  standingVisibility: number;
  crouchingVisibility: number;
  proneVisibility: number;

  // Lean configuration
  leanAngle: number; // Degrees
  leanExposure: number; // 0-1, how much of body exposed
  leanAccuracyBonus: number;
}

export interface VaultableObject {
  id: string;
  position: Vector3;
  height: number; // 0-2 meters
  width: number;
  canMantle: boolean; // Can climb on top vs vault over
}

export interface MovementInput {
  moveDirection: Vector2; // -1 to 1 for each axis
  lookDirection: Vector2;
  sprint: boolean;
  crouch: boolean;
  prone: boolean;
  slide: boolean;
  vault: boolean;
  dive: boolean;
  leanLeft: boolean;
  leanRight: boolean;
  aim: boolean;
}

export interface MovementResult {
  newPosition: Vector3;
  newVelocity: Vector3;
  newStance: MovementStance;
  staminaCost: number;
  accuracyModifier: number;
  visibilityModifier: number;
  noiseLevel: number; // 0-1 stealth noise emitted this tick
  canFire: boolean;
  isTransitioning: boolean;
  transitionProgress: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_MOVEMENT_CONFIG: MovementConfig = {
  // Speeds (m/s)
  walkSpeed: 4.0,
  sprintSpeed: 7.5,
  crouchSpeed: 2.0,
  proneSpeed: 0.8,
  slideSpeed: 9.0,

  // Stamina
  sprintStaminaDrain: 8.0,
  slideStaminaCost: 15.0,
  vaultStaminaCost: 10.0,
  diveStaminaCost: 20.0,

  // Timing
  slideDuration: 0.8,
  vaultDuration: 0.5,
  mantleDuration: 1.2,
  diveDuration: 0.6,
  stanceTransitionTime: 0.25,

  // Accuracy (1.0 = baseline)
  standingAccuracy: 1.0,
  crouchingAccuracy: 1.15, // 15% better
  proneAccuracy: 1.3, // 30% better
  movingAccuracyPenalty: 0.7, // 30% worse
  sprintingAccuracyPenalty: 0.3, // 70% worse
  slidingAccuracyPenalty: 0.25, // 75% worse

  // Visibility (1.0 = full visibility)
  standingVisibility: 1.0,
  crouchingVisibility: 0.6,
  proneVisibility: 0.3,

  // Lean
  leanAngle: 15,
  leanExposure: 0.3,
  leanAccuracyBonus: 1.1
};

// ============================================================================
// MOVEMENT SYSTEM
// ============================================================================

export class MovementSystem {
  private states: Map<string, MovementState> = new Map();
  private config: MovementConfig;
  private vaultableObjects: Map<string, VaultableObject> = new Map();
  private ticksPerSecond: number = 20;

  constructor(config: Partial<MovementConfig> = {}) {
    this.config = { ...DEFAULT_MOVEMENT_CONFIG, ...config };
  }

  // ============================================================================
  // ENTITY MANAGEMENT
  // ============================================================================

  registerEntity(entityId: string, initialPosition: Vector3): MovementState {
    const state: MovementState = {
      entityId,
      position: { ...initialPosition },
      velocity: { x: 0, y: 0, z: 0 },
      facing: { x: 0, y: 1 },
      stance: 'standing',
      leanDirection: 'none',
      isMoving: false,
      isSprinting: false,
      isAiming: false,
      momentum: 0,
      groundedTime: 0,
      lastStanceChange: 0,
      slideStartTick: 0,
      vaultProgress: 0,
      staminaDrain: 0
    };
    this.states.set(entityId, state);
    return state;
  }

  unregisterEntity(entityId: string): void {
    this.states.delete(entityId);
  }

  getState(entityId: string): MovementState | undefined {
    return this.states.get(entityId);
  }

  // ============================================================================
  // VAULTABLE OBJECTS
  // ============================================================================

  registerVaultable(obj: VaultableObject): void {
    this.vaultableObjects.set(obj.id, obj);
  }

  findNearbyVaultable(position: Vector3, facing: Vector2, maxDistance: number = 2): VaultableObject | null {
    let nearest: VaultableObject | null = null;
    let nearestDist = maxDistance;

    for (const obj of this.vaultableObjects.values()) {
      const dx = obj.position.x - position.x;
      const dz = obj.position.z - position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < nearestDist) {
        // Check if facing toward object
        const toObj = { x: dx / dist, y: dz / dist };
        const dot = facing.x * toObj.x + facing.y * toObj.y;
        if (dot > 0.5) { // Within ~60 degree cone
          nearest = obj;
          nearestDist = dist;
        }
      }
    }

    return nearest;
  }

  // ============================================================================
  // CORE UPDATE
  // ============================================================================

  update(entityId: string, input: MovementInput, stamina: number, currentTick: number): MovementResult {
    const state = this.states.get(entityId);
    if (!state) {
      throw new Error(`Entity ${entityId} not registered in MovementSystem`);
    }

    // Initialize result
    let staminaCost = 0;
    let canFire = true;
    let isTransitioning = false;
    let transitionProgress = 0;

    // Update aiming state
    state.isAiming = input.aim;

    // Handle stance transitions and special movements
    const tickDelta = 1 / this.ticksPerSecond;

    // Priority: Active transitions > New actions > Movement
    if (this.isInActiveTransition(state, currentTick)) {
      // Currently in a transition (slide, vault, mantle, dive)
      const result = this.updateActiveTransition(state, currentTick);
      isTransitioning = true;
      transitionProgress = result.progress;
      canFire = result.canFire;
    } else {
      // Check for new special movements
      if (input.slide && state.isSprinting && stamina >= this.config.slideStaminaCost) {
        this.initiateSlide(state, currentTick);
        staminaCost += this.config.slideStaminaCost;
        canFire = false;
      } else if (input.vault) {
        const vaultable = this.findNearbyVaultable(state.position, state.facing);
        if (vaultable && stamina >= this.config.vaultStaminaCost) {
          this.initiateVault(state, vaultable, currentTick);
          staminaCost += this.config.vaultStaminaCost;
          canFire = false;
        }
      } else if (input.dive && state.isSprinting && stamina >= this.config.diveStaminaCost) {
        this.initiateDive(state, currentTick);
        staminaCost += this.config.diveStaminaCost;
        canFire = false;
      } else {
        // Normal movement
        this.updateNormalMovement(state, input, currentTick);
      }
    }

    // Update lean (only when not transitioning)
    if (!isTransitioning) {
      this.updateLean(state, input);
    }

    // Calculate velocity and position
    const speed = this.calculateSpeed(state);
    if (input.moveDirection.x !== 0 || input.moveDirection.y !== 0) {
      const mag = Math.sqrt(input.moveDirection.x ** 2 + input.moveDirection.y ** 2);
      state.velocity.x = (input.moveDirection.x / mag) * speed;
      state.velocity.z = (input.moveDirection.y / mag) * speed;
      state.isMoving = true;
    } else {
      state.velocity.x *= 0.8; // Deceleration
      state.velocity.z *= 0.8;
      state.isMoving = Math.abs(state.velocity.x) > 0.1 || Math.abs(state.velocity.z) > 0.1;
    }

    // Apply velocity
    state.position.x += state.velocity.x * tickDelta;
    state.position.z += state.velocity.z * tickDelta;

    // Update facing direction
    if (input.lookDirection.x !== 0 || input.lookDirection.y !== 0) {
      const mag = Math.sqrt(input.lookDirection.x ** 2 + input.lookDirection.y ** 2);
      state.facing.x = input.lookDirection.x / mag;
      state.facing.y = input.lookDirection.y / mag;
    }

    // Update momentum (0-1 scale based on recent movement)
    if (state.isMoving || state.isSprinting) {
      state.momentum = Math.min(1, state.momentum + 0.1);
    } else {
      state.momentum = Math.max(0, state.momentum - 0.05);
    }

    // Sprint stamina drain
    if (state.isSprinting) {
      staminaCost += this.config.sprintStaminaDrain * tickDelta;
    }

    // Calculate modifiers
    const accuracyModifier = this.calculateAccuracyModifier(state);
    const visibilityModifier = this.calculateVisibilityModifier(state);
    const noiseLevel = this.calculateNoiseLevel(state);

    return {
      newPosition: { ...state.position },
      newVelocity: { ...state.velocity },
      newStance: state.stance,
      staminaCost,
      accuracyModifier,
      visibilityModifier,
      noiseLevel,
      canFire,
      isTransitioning,
      transitionProgress
    };
  }

  // ============================================================================
  // MOVEMENT HELPERS
  // ============================================================================

  private isInActiveTransition(state: MovementState, currentTick: number): boolean {
    return state.stance === 'sliding' ||
           state.stance === 'vaulting' ||
           state.stance === 'mantling' ||
           state.stance === 'diving';
  }

  private updateActiveTransition(state: MovementState, currentTick: number): { progress: number; canFire: boolean } {
    const tickDelta = 1 / this.ticksPerSecond;
    let progress = 0;
    let canFire = false;

    switch (state.stance) {
      case 'sliding': {
        const elapsed = (currentTick - state.slideStartTick) / this.ticksPerSecond;
        progress = elapsed / this.config.slideDuration;
        if (progress >= 1) {
          state.stance = 'crouching';
          state.isSprinting = false;
          progress = 1;
        } else {
          // Slide velocity boost
          state.velocity.x = state.facing.x * this.config.slideSpeed * (1 - progress * 0.5);
          state.velocity.z = state.facing.y * this.config.slideSpeed * (1 - progress * 0.5);
        }
        canFire = progress > 0.3; // Can fire after 30% of slide
        break;
      }

      case 'vaulting': {
        state.vaultProgress += tickDelta / this.config.vaultDuration;
        progress = state.vaultProgress;
        if (progress >= 1) {
          state.stance = 'standing';
          state.vaultProgress = 0;
          // Teleport past obstacle
          state.position.x += state.facing.x * 2;
          state.position.z += state.facing.y * 2;
        }
        break;
      }

      case 'mantling': {
        state.vaultProgress += tickDelta / this.config.mantleDuration;
        progress = state.vaultProgress;
        if (progress >= 1) {
          state.stance = 'standing';
          state.vaultProgress = 0;
          // Raise position
          state.position.y += 1.5;
          state.position.x += state.facing.x * 1;
          state.position.z += state.facing.y * 1;
        }
        break;
      }

      case 'diving': {
        state.vaultProgress += tickDelta / this.config.diveDuration;
        progress = state.vaultProgress;
        // Dive forward
        state.velocity.x = state.facing.x * this.config.slideSpeed * 1.2;
        state.velocity.z = state.facing.y * this.config.slideSpeed * 1.2;
        if (progress >= 1) {
          state.stance = 'prone';
          state.vaultProgress = 0;
          state.isSprinting = false;
        }
        break;
      }
    }

    return { progress, canFire };
  }

  private initiateSlide(state: MovementState, currentTick: number): void {
    state.stance = 'sliding';
    state.slideStartTick = currentTick;
    state.leanDirection = 'none';
  }

  private initiateVault(state: MovementState, vaultable: VaultableObject, currentTick: number): void {
    if (vaultable.canMantle && vaultable.height > 1.0) {
      state.stance = 'mantling';
    } else {
      state.stance = 'vaulting';
    }
    state.vaultProgress = 0;
    state.lastStanceChange = currentTick;
    state.leanDirection = 'none';
  }

  private initiateDive(state: MovementState, currentTick: number): void {
    state.stance = 'diving';
    state.vaultProgress = 0;
    state.lastStanceChange = currentTick;
    state.leanDirection = 'none';
  }

  private updateNormalMovement(state: MovementState, input: MovementInput, currentTick: number): void {
    // Handle stance changes
    if (input.prone && state.stance !== 'prone') {
      state.stance = 'prone';
      state.lastStanceChange = currentTick;
      state.isSprinting = false;
    } else if (input.crouch && state.stance === 'standing') {
      state.stance = 'crouching';
      state.lastStanceChange = currentTick;
      state.isSprinting = false;
    } else if (!input.crouch && !input.prone && state.stance !== 'standing') {
      state.stance = 'standing';
      state.lastStanceChange = currentTick;
    }

    // Handle sprint
    if (input.sprint && state.stance === 'standing' && state.isMoving) {
      state.isSprinting = true;
    } else if (!input.sprint || state.stance !== 'standing') {
      state.isSprinting = false;
    }
  }

  private updateLean(state: MovementState, input: MovementInput): void {
    if (input.leanLeft && !input.leanRight) {
      state.leanDirection = 'left';
    } else if (input.leanRight && !input.leanLeft) {
      state.leanDirection = 'right';
    } else {
      state.leanDirection = 'none';
    }
  }

  private calculateSpeed(state: MovementState): number {
    switch (state.stance) {
      case 'standing':
        return state.isSprinting ? this.config.sprintSpeed : this.config.walkSpeed;
      case 'crouching':
        return this.config.crouchSpeed;
      case 'prone':
        return this.config.proneSpeed;
      case 'sliding':
        return this.config.slideSpeed;
      default:
        return 0; // No manual movement during vault/mantle/dive
    }
  }

  // ============================================================================
  // MODIFIER CALCULATIONS
  // ============================================================================

  calculateAccuracyModifier(state: MovementState): number {
    let modifier = 1.0;

    // Stance modifier
    switch (state.stance) {
      case 'standing':
        modifier *= this.config.standingAccuracy;
        break;
      case 'crouching':
        modifier *= this.config.crouchingAccuracy;
        break;
      case 'prone':
        modifier *= this.config.proneAccuracy;
        break;
      case 'sliding':
        modifier *= this.config.slidingAccuracyPenalty;
        break;
      default:
        modifier *= 0.1; // Terrible accuracy during transitions
    }

    // Movement penalty
    if (state.isSprinting) {
      modifier *= this.config.sprintingAccuracyPenalty;
    } else if (state.isMoving) {
      modifier *= this.config.movingAccuracyPenalty;
    }

    // Momentum penalty (recent movement)
    modifier *= (1 - state.momentum * 0.2);

    // Lean bonus (when stationary behind cover)
    if (state.leanDirection !== 'none' && !state.isMoving) {
      modifier *= this.config.leanAccuracyBonus;
    }

    // Aiming bonus
    if (state.isAiming) {
      modifier *= 1.5;
    }

    return modifier;
  }

  calculateVisibilityModifier(state: MovementState): number {
    switch (state.stance) {
      case 'standing':
        return this.config.standingVisibility;
      case 'crouching':
        return this.config.crouchingVisibility;
      case 'prone':
        return this.config.proneVisibility;
      case 'sliding':
        return this.config.crouchingVisibility * 0.8; // Slightly less visible
      default:
        return 0.5; // Transitioning - moderate visibility
    }
  }

  private calculateNoiseLevel(state: MovementState): number {
    let noise = 0.1;

    switch (state.stance) {
      case 'prone':
        noise = 0.05;
        break;
      case 'crouching':
        noise = 0.1;
        break;
      case 'standing':
        noise = 0.15;
        break;
      case 'sliding':
        noise = 0.4;
        break;
      case 'vaulting':
      case 'mantling':
      case 'diving':
        noise = 0.35;
        break;
    }

    const speed = Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2);
    noise += Math.min(0.5, speed / (this.config.sprintSpeed * 1.2));

    if (state.isSprinting) {
      noise += 0.15;
    }

    return Math.max(0, Math.min(1, noise));
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  canSprint(entityId: string, stamina: number): boolean {
    const state = this.states.get(entityId);
    if (!state) return false;
    return state.stance === 'standing' && stamina > 10;
  }

  canSlide(entityId: string, stamina: number): boolean {
    const state = this.states.get(entityId);
    if (!state) return false;
    return state.isSprinting && stamina >= this.config.slideStaminaCost;
  }

  canVault(entityId: string, stamina: number): boolean {
    const state = this.states.get(entityId);
    if (!state) return false;
    const vaultable = this.findNearbyVaultable(state.position, state.facing);
    return vaultable !== null && stamina >= this.config.vaultStaminaCost;
  }

  canDive(entityId: string, stamina: number): boolean {
    const state = this.states.get(entityId);
    if (!state) return false;
    return state.isSprinting && stamina >= this.config.diveStaminaCost;
  }

  isInCover(entityId: string): boolean {
    const state = this.states.get(entityId);
    if (!state) return false;
    return state.leanDirection !== 'none';
  }

  getLeanExposure(entityId: string): number {
    const state = this.states.get(entityId);
    if (!state || state.leanDirection === 'none') return 1.0;
    return this.config.leanExposure;
  }

  // ============================================================================
  // SERIALIZATION
  // ============================================================================

  serialize(): object {
    return {
      config: this.config,
      states: Array.from(this.states.entries()),
      vaultables: Array.from(this.vaultableObjects.entries())
    };
  }

  static deserialize(data: any): MovementSystem {
    const system = new MovementSystem(data.config);
    for (const [id, state] of data.states) {
      system.states.set(id, state);
    }
    for (const [id, obj] of data.vaultables) {
      system.vaultableObjects.set(id, obj);
    }
    return system;
  }
}

export default MovementSystem;
