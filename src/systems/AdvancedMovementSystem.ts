/**
 * AdvancedMovementSystem - Slide, Vault, Mantle mechanics for AAA movement
 * Feature: enterprise-100-percent
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { Vector3 } from './CoverSystem';

export interface Obstacle {
  id: string;
  position: Vector3;
  height: number;
  width: number;
}

export interface MovementState {
  isSliding: boolean;
  slideStartTime: number;
  slideVelocity: Vector3;
  slideInitialSpeed: number;
  isVaulting: boolean;
  vaultStartTime: number;
  vaultTarget: Obstacle | null;
  isMantling: boolean;
  mantleStartTime: number;
  mantleTarget: Obstacle | null;
}

export interface PlayerMovementInfo {
  position: Vector3;
  velocity: Vector3;
  isSprinting: boolean;
  stamina: number;
  maxStamina: number;
  sprintSpeed: number;
}

export class AdvancedMovementSystem {
  private playerStates: Map<string, MovementState> = new Map();
  private obstacles: Map<string, Obstacle> = new Map();
  
  // Constants
  static readonly SLIDE_DURATION = 0.8;
  static readonly SLIDE_VELOCITY_FACTOR = 0.8;
  static readonly SLIDE_STAMINA_THRESHOLD = 0.2;
  static readonly VAULT_DURATION = 0.5;
  static readonly MANTLE_DURATION = 1.0;
  static readonly VAULT_MIN_HEIGHT = 0.5;
  static readonly VAULT_MAX_HEIGHT = 1.2;
  static readonly MANTLE_MAX_HEIGHT = 2.0;
  static readonly OBSTACLE_DETECT_RANGE = 2.0;

  constructor() {}

  // Obstacle management
  registerObstacle(obstacle: Obstacle): void {
    this.obstacles.set(obstacle.id, { ...obstacle });
  }

  getObstacle(id: string): Obstacle | null {
    return this.obstacles.get(id) || null;
  }

  // Player state management
  getMovementState(playerId: string): MovementState {
    if (!this.playerStates.has(playerId)) {
      this.playerStates.set(playerId, this.createDefaultState());
    }
    return this.playerStates.get(playerId)!;
  }

  private createDefaultState(): MovementState {
    return {
      isSliding: false,
      slideStartTime: 0,
      slideVelocity: { x: 0, y: 0, z: 0 },
      slideInitialSpeed: 0,
      isVaulting: false,
      vaultStartTime: 0,
      vaultTarget: null,
      isMantling: false,
      mantleStartTime: 0,
      mantleTarget: null
    };
  }

  // Slide mechanics
  canSlide(playerInfo: PlayerMovementInfo): boolean {
    const staminaPercent = playerInfo.stamina / playerInfo.maxStamina;
    return playerInfo.isSprinting && staminaPercent >= AdvancedMovementSystem.SLIDE_STAMINA_THRESHOLD;
  }

  initiateSlide(playerId: string, playerInfo: PlayerMovementInfo, currentTime: number): boolean {
    if (!this.canSlide(playerInfo)) return false;
    
    const state = this.getMovementState(playerId);
    if (state.isSliding || state.isVaulting || state.isMantling) return false;
    
    // Calculate slide velocity (80% of sprint velocity)
    const speed = this.vectorLength(playerInfo.velocity);
    const direction = this.normalize(playerInfo.velocity);
    const slideSpeed = speed * AdvancedMovementSystem.SLIDE_VELOCITY_FACTOR;
    
    state.isSliding = true;
    state.slideStartTime = currentTime;
    state.slideInitialSpeed = slideSpeed;
    state.slideVelocity = {
      x: direction.x * slideSpeed,
      y: direction.y * slideSpeed,
      z: direction.z * slideSpeed
    };
    
    return true;
  }

  updateSlide(playerId: string, currentTime: number): { velocity: Vector3; completed: boolean; shouldCrouch: boolean } {
    const state = this.getMovementState(playerId);
    if (!state.isSliding) {
      return { velocity: { x: 0, y: 0, z: 0 }, completed: false, shouldCrouch: false };
    }
    
    const elapsed = currentTime - state.slideStartTime;
    const progress = elapsed / AdvancedMovementSystem.SLIDE_DURATION;
    
    if (progress >= 1) {
      // Slide complete - transition to crouch
      state.isSliding = false;
      state.slideVelocity = { x: 0, y: 0, z: 0 };
      return { velocity: { x: 0, y: 0, z: 0 }, completed: true, shouldCrouch: true };
    }
    
    // Decelerate over slide duration
    const speedFactor = 1 - (progress * 0.5); // Decelerate to 50% by end
    const currentSpeed = state.slideInitialSpeed * speedFactor;
    const direction = this.normalize(state.slideVelocity);
    
    return {
      velocity: {
        x: direction.x * currentSpeed,
        y: direction.y * currentSpeed,
        z: direction.z * currentSpeed
      },
      completed: false,
      shouldCrouch: false
    };
  }

  cancelSlide(playerId: string): void {
    const state = this.getMovementState(playerId);
    state.isSliding = false;
    state.slideVelocity = { x: 0, y: 0, z: 0 };
  }

  // Obstacle detection
  detectObstacle(position: Vector3, direction: Vector3): Obstacle | null {
    let nearest: Obstacle | null = null;
    let nearestDist = AdvancedMovementSystem.OBSTACLE_DETECT_RANGE;
    
    this.obstacles.forEach(obstacle => {
      const toObstacle = {
        x: obstacle.position.x - position.x,
        y: obstacle.position.y - position.y,
        z: obstacle.position.z - position.z
      };
      
      // Check if obstacle is in front
      const dot = this.dotProduct(direction, this.normalize(toObstacle));
      if (dot < 0.7) return; // Not in front
      
      const dist = this.vectorLength(toObstacle);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = obstacle;
      }
    });
    
    return nearest;
  }

  // Vault/Mantle classification
  canVault(obstacle: Obstacle): boolean {
    return obstacle.height >= AdvancedMovementSystem.VAULT_MIN_HEIGHT &&
           obstacle.height <= AdvancedMovementSystem.VAULT_MAX_HEIGHT;
  }

  canMantle(obstacle: Obstacle): boolean {
    return obstacle.height > AdvancedMovementSystem.VAULT_MAX_HEIGHT &&
           obstacle.height <= AdvancedMovementSystem.MANTLE_MAX_HEIGHT;
  }

  classifyObstacle(obstacle: Obstacle): 'vault' | 'mantle' | 'impassable' {
    if (this.canVault(obstacle)) return 'vault';
    if (this.canMantle(obstacle)) return 'mantle';
    return 'impassable';
  }

  // Vault mechanics
  initiateVault(playerId: string, obstacle: Obstacle, currentTime: number): boolean {
    if (!this.canVault(obstacle)) return false;
    
    const state = this.getMovementState(playerId);
    if (state.isSliding || state.isVaulting || state.isMantling) return false;
    
    state.isVaulting = true;
    state.vaultStartTime = currentTime;
    state.vaultTarget = obstacle;
    
    return true;
  }

  updateVault(playerId: string, currentTime: number): { progress: number; completed: boolean } {
    const state = this.getMovementState(playerId);
    if (!state.isVaulting) {
      return { progress: 0, completed: false };
    }
    
    const elapsed = currentTime - state.vaultStartTime;
    const progress = elapsed / AdvancedMovementSystem.VAULT_DURATION;
    
    if (progress >= 1) {
      state.isVaulting = false;
      state.vaultTarget = null;
      return { progress: 1, completed: true };
    }
    
    return { progress, completed: false };
  }

  // Mantle mechanics
  initiateMantle(playerId: string, obstacle: Obstacle, currentTime: number): boolean {
    if (!this.canMantle(obstacle)) return false;
    
    const state = this.getMovementState(playerId);
    if (state.isSliding || state.isVaulting || state.isMantling) return false;
    
    state.isMantling = true;
    state.mantleStartTime = currentTime;
    state.mantleTarget = obstacle;
    
    return true;
  }

  updateMantle(playerId: string, currentTime: number): { progress: number; completed: boolean } {
    const state = this.getMovementState(playerId);
    if (!state.isMantling) {
      return { progress: 0, completed: false };
    }
    
    const elapsed = currentTime - state.mantleStartTime;
    const progress = elapsed / AdvancedMovementSystem.MANTLE_DURATION;
    
    if (progress >= 1) {
      state.isMantling = false;
      state.mantleTarget = null;
      return { progress: 1, completed: true };
    }
    
    return { progress, completed: false };
  }

  // Vulnerability check (for damage calculations)
  isVulnerable(playerId: string): boolean {
    const state = this.getMovementState(playerId);
    return state.isVaulting || state.isMantling;
  }

  isInMovementAction(playerId: string): boolean {
    const state = this.getMovementState(playerId);
    return state.isSliding || state.isVaulting || state.isMantling;
  }

  // Utility functions
  private vectorLength(v: Vector3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  private normalize(v: Vector3): Vector3 {
    const len = this.vectorLength(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  private dotProduct(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }
}
