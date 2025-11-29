/**
 * CoverSystem - Tactical cover mechanics for AAA combat
 * Feature: enterprise-100-percent
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 7.1, 7.2, 7.3
 * Enhanced: LOS checking, penetration resistance, flanking detection
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type CoverMaterial = 'wood' | 'metal' | 'concrete' | 'brick' | 'glass' | 'sandbag' | 'vehicle';

export interface CoverPoint {
  id: string;
  position: Vector3;
  normal: Vector3;
  height: 'low' | 'high' | 'full';
  type: 'soft' | 'hard';
  material: CoverMaterial;
  destructible: boolean;
  health: number;
  maxHealth: number;
  width: number;
  penetrationResistance: number; // 0-1
  isFlanked: boolean;
}

export interface LOSCheckResult {
  blocked: boolean;
  blockingCover: CoverPoint | null;
  penetrationDamageMultiplier: number;
  hitPosition: Vector3 | null;
}

export const COVER_MATERIAL_PROPERTIES: Record<CoverMaterial, {
  health: number;
  penetrationResistance: number;
}> = {
  wood: { health: 50, penetrationResistance: 0.3 },
  metal: { health: 200, penetrationResistance: 0.8 },
  concrete: { health: 500, penetrationResistance: 0.95 },
  brick: { health: 300, penetrationResistance: 0.85 },
  glass: { health: 10, penetrationResistance: 0.1 },
  sandbag: { health: 100, penetrationResistance: 0.7 },
  vehicle: { health: 150, penetrationResistance: 0.6 }
};

export interface CoverState {
  inCover: boolean;
  currentCover: CoverPoint | null;
  coverSide: 'left' | 'right';
  isPeeking: boolean;
  isBlindFiring: boolean;
  transitionTarget: CoverPoint | null;
  transitionProgress: number;
}

export interface DamageInfo {
  amount: number;
  direction: Vector3;
  source: string;
}

export class CoverSystem {
  private coverPoints: Map<string, CoverPoint> = new Map();
  private playerStates: Map<string, CoverState> = new Map();
  
  // Damage reduction constants
  static readonly SOFT_COVER_REDUCTION = 0.5;
  static readonly HARD_COVER_REDUCTION = 0.9;
  static readonly TRANSITION_REDUCTION = 0.25;
  static readonly BLIND_FIRE_ACCURACY_PENALTY = 0.5;
  static readonly MAX_TRANSITION_DISTANCE = 10;

  constructor() {}

  // Cover point management
  registerCoverPoint(point: CoverPoint): void {
    this.coverPoints.set(point.id, { ...point });
  }

  getCoverPoint(id: string): CoverPoint | null {
    return this.coverPoints.get(id) || null;
  }

  getAllCoverPoints(): CoverPoint[] {
    return Array.from(this.coverPoints.values());
  }

  // Player state management
  getPlayerState(playerId: string): CoverState {
    if (!this.playerStates.has(playerId)) {
      this.playerStates.set(playerId, this.createDefaultState());
    }
    return this.playerStates.get(playerId)!;
  }

  private createDefaultState(): CoverState {
    return {
      inCover: false,
      currentCover: null,
      coverSide: 'right',
      isPeeking: false,
      isBlindFiring: false,
      transitionTarget: null,
      transitionProgress: 0
    };
  }

  // Core cover operations
  enterCover(playerId: string, coverPointId: string, approachAngle: number = 0): boolean {
    const coverPoint = this.coverPoints.get(coverPointId);
    if (!coverPoint || coverPoint.health <= 0) return false;

    const state = this.getPlayerState(playerId);
    state.inCover = true;
    state.currentCover = coverPoint;
    state.coverSide = approachAngle > 0 ? 'right' : 'left';
    state.isPeeking = false;
    state.isBlindFiring = false;
    state.transitionTarget = null;
    state.transitionProgress = 0;
    
    return true;
  }

  exitCover(playerId: string): void {
    const state = this.getPlayerState(playerId);
    state.inCover = false;
    state.currentCover = null;
    state.isPeeking = false;
    state.isBlindFiring = false;
    state.transitionTarget = null;
    state.transitionProgress = 0;
  }

  peek(playerId: string): boolean {
    const state = this.getPlayerState(playerId);
    if (!state.inCover || !state.currentCover) return false;
    
    state.isPeeking = true;
    state.isBlindFiring = false;
    return true;
  }

  stopPeek(playerId: string): void {
    const state = this.getPlayerState(playerId);
    state.isPeeking = false;
  }

  blindFire(playerId: string): boolean {
    const state = this.getPlayerState(playerId);
    if (!state.inCover || !state.currentCover) return false;
    
    state.isBlindFiring = true;
    state.isPeeking = false;
    return true;
  }

  stopBlindFire(playerId: string): void {
    const state = this.getPlayerState(playerId);
    state.isBlindFiring = false;
  }

  // Damage calculation
  calculateDamageReduction(playerId: string, damageDirection: Vector3): number {
    const state = this.getPlayerState(playerId);
    
    // No cover = no reduction
    if (!state.inCover || !state.currentCover) return 0;
    
    // Peeking = exposed, no reduction
    if (state.isPeeking) return 0;
    
    // Transitioning = partial reduction
    if (state.transitionTarget) return CoverSystem.TRANSITION_REDUCTION;
    
    // Check if damage is from covered direction
    const cover = state.currentCover;
    const dot = this.dotProduct(damageDirection, cover.normal);
    
    // Damage from behind cover (dot > 0 means same direction as normal = from front)
    if (dot <= 0) return 0; // Damage from behind, no protection
    
    // Apply cover type reduction
    return cover.type === 'hard' 
      ? CoverSystem.HARD_COVER_REDUCTION 
      : CoverSystem.SOFT_COVER_REDUCTION;
  }

  applyDamage(playerId: string, damage: DamageInfo): number {
    const reduction = this.calculateDamageReduction(playerId, damage.direction);
    return damage.amount * (1 - reduction);
  }

  // Blind fire accuracy
  getAccuracyModifier(playerId: string): number {
    const state = this.getPlayerState(playerId);
    if (state.isBlindFiring) {
      return 1 - CoverSystem.BLIND_FIRE_ACCURACY_PENALTY;
    }
    return 1;
  }

  // Cover destruction
  damageCover(coverPointId: string, damage: number): boolean {
    const cover = this.coverPoints.get(coverPointId);
    if (!cover || !cover.destructible) return false;
    
    cover.health = Math.max(0, cover.health - damage);
    
    if (cover.health <= 0) {
      // Force all players out of this cover
      this.playerStates.forEach((state, playerId) => {
        if (state.currentCover?.id === coverPointId) {
          this.exitCover(playerId);
        }
      });
      return true; // Cover destroyed
    }
    return false;
  }

  isCoverDestroyed(coverPointId: string): boolean {
    const cover = this.coverPoints.get(coverPointId);
    return cover ? cover.health <= 0 : true;
  }


  // Cover-to-cover transitions
  findNearestCover(position: Vector3, maxDistance: number): CoverPoint | null {
    let nearest: CoverPoint | null = null;
    let nearestDist = maxDistance;
    
    this.coverPoints.forEach(cover => {
      if (cover.health <= 0) return;
      const dist = this.distance(position, cover.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = cover;
      }
    });
    
    return nearest;
  }

  getValidTransitionTargets(playerId: string, aimDirection: Vector3): CoverPoint[] {
    const state = this.getPlayerState(playerId);
    if (!state.inCover || !state.currentCover) return [];
    
    const currentPos = state.currentCover.position;
    const targets: CoverPoint[] = [];
    
    this.coverPoints.forEach(cover => {
      if (cover.id === state.currentCover?.id) return;
      if (cover.health <= 0) return;
      
      const dist = this.distance(currentPos, cover.position);
      if (dist > CoverSystem.MAX_TRANSITION_DISTANCE) return;
      
      // Check if cover is in aim direction
      const toTarget = this.normalize({
        x: cover.position.x - currentPos.x,
        y: cover.position.y - currentPos.y,
        z: cover.position.z - currentPos.z
      });
      
      const dot = this.dotProduct(aimDirection, toTarget);
      if (dot > 0.5) { // Within ~60 degree cone
        targets.push(cover);
      }
    });
    
    return targets.sort((a, b) => 
      this.distance(currentPos, a.position) - this.distance(currentPos, b.position)
    );
  }

  initiateTransition(playerId: string, targetCoverPointId: string): boolean {
    const state = this.getPlayerState(playerId);
    if (!state.inCover || !state.currentCover) return false;
    
    const target = this.coverPoints.get(targetCoverPointId);
    if (!target || target.health <= 0) return false;
    
    const dist = this.distance(state.currentCover.position, target.position);
    if (dist > CoverSystem.MAX_TRANSITION_DISTANCE) return false;
    
    state.transitionTarget = target;
    state.transitionProgress = 0;
    state.isPeeking = false;
    state.isBlindFiring = false;
    
    return true;
  }

  updateTransition(playerId: string, deltaTime: number): boolean {
    const state = this.getPlayerState(playerId);
    if (!state.transitionTarget) return false;
    
    // Transition takes ~0.5 seconds
    state.transitionProgress += deltaTime / 0.5;
    
    if (state.transitionProgress >= 1) {
      // Complete transition
      state.currentCover = state.transitionTarget;
      state.transitionTarget = null;
      state.transitionProgress = 0;
      return true; // Transition complete
    }
    
    return false; // Still transitioning
  }

  isTransitioning(playerId: string): boolean {
    const state = this.getPlayerState(playerId);
    return state.transitionTarget !== null;
  }

  // Serialization
  serialize(): string {
    const data = {
      coverPoints: Array.from(this.coverPoints.entries()),
      playerStates: Array.from(this.playerStates.entries()).map(([id, state]) => [
        id,
        {
          ...state,
          currentCover: state.currentCover?.id || null,
          transitionTarget: state.transitionTarget?.id || null
        }
      ])
    };
    return JSON.stringify(data);
  }

  deserialize(json: string): void {
    const data = JSON.parse(json);
    
    this.coverPoints = new Map(data.coverPoints);
    
    this.playerStates = new Map();
    for (const [id, stateData] of data.playerStates) {
      const state: CoverState = {
        inCover: stateData.inCover,
        currentCover: stateData.currentCover ? this.coverPoints.get(stateData.currentCover) || null : null,
        coverSide: stateData.coverSide,
        isPeeking: stateData.isPeeking,
        isBlindFiring: stateData.isBlindFiring,
        transitionTarget: stateData.transitionTarget ? this.coverPoints.get(stateData.transitionTarget) || null : null,
        transitionProgress: stateData.transitionProgress
      };
      this.playerStates.set(id, state);
    }
  }

  // Utility functions
  private distance(a: Vector3, b: Vector3): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private dotProduct(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  private normalize(v: Vector3): Vector3 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  // ============================================================================
  // LINE OF SIGHT CHECKING
  // ============================================================================

  checkLOS(from: Vector3, to: Vector3): LOSCheckResult {
    const direction = {
      x: to.x - from.x,
      y: to.y - from.y,
      z: to.z - from.z
    };
    const dist = this.distance(from, to);
    const normalizedDir = this.normalize(direction);

    for (const point of this.coverPoints.values()) {
      if (point.health <= 0) continue;

      // Calculate closest point on ray to cover
      const toPoint = {
        x: point.position.x - from.x,
        y: point.position.y - from.y,
        z: point.position.z - from.z
      };

      const t = this.dotProduct(toPoint, normalizedDir);
      if (t < 0 || t > dist) continue;

      const closestPoint = {
        x: from.x + normalizedDir.x * t,
        y: from.y + normalizedDir.y * t,
        z: from.z + normalizedDir.z * t
      };

      const distToCover = this.distance(closestPoint, point.position);
      const coverWidth = point.width || 1.5;

      if (distToCover < coverWidth / 2) {
        // Check height
        const shotHeight = from.y + normalizedDir.y * t;
        const coverHeight = point.height === 'full' ? 2.0 : point.height === 'high' ? 1.4 : 0.8;

        if (shotHeight < coverHeight) {
          return {
            blocked: true,
            blockingCover: point,
            penetrationDamageMultiplier: 1 - (point.penetrationResistance || 0.5),
            hitPosition: closestPoint
          };
        }
      }
    }

    return {
      blocked: false,
      blockingCover: null,
      penetrationDamageMultiplier: 1,
      hitPosition: null
    };
  }

  // ============================================================================
  // FLANKING DETECTION
  // ============================================================================

  updateFlankStatus(coverPointId: string, threatPositions: Vector3[]): void {
    const point = this.coverPoints.get(coverPointId);
    if (!point) return;

    point.isFlanked = false;

    for (const threatPos of threatPositions) {
      const toThreat = {
        x: threatPos.x - point.position.x,
        y: 0,
        z: threatPos.z - point.position.z
      };
      const dist = Math.sqrt(toThreat.x * toThreat.x + toThreat.z * toThreat.z);
      if (dist > 20) continue;

      const dot = (toThreat.x / dist) * point.normal.x + (toThreat.z / dist) * point.normal.z;

      // Threat is behind or beside cover (> -0.3 = ~70 degrees from front)
      if (dot > -0.3) {
        point.isFlanked = true;
        return;
      }
    }
  }

  // ============================================================================
  // COVER FROM THREAT FINDING
  // ============================================================================

  findCoverFromThreat(position: Vector3, threatPosition: Vector3, maxDistance: number = 15): CoverPoint | null {
    const threatDir = this.normalize({
      x: threatPosition.x - position.x,
      y: threatPosition.y - position.y,
      z: threatPosition.z - position.z
    });

    let bestCover: CoverPoint | null = null;
    let bestScore = -Infinity;

    for (const point of this.coverPoints.values()) {
      if (point.health <= 0) continue;

      const dist = this.distance(position, point.position);
      if (dist > maxDistance) continue;

      // Score: closer + faces threat + higher = better
      const distScore = 1 - (dist / maxDistance);
      const facingScore = -(point.normal.x * threatDir.x + point.normal.z * threatDir.z);
      const heightScore = point.height === 'full' ? 1 : point.height === 'high' ? 0.7 : 0.4;

      const totalScore = distScore * 0.4 + facingScore * 0.4 + heightScore * 0.2;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestCover = point;
      }
    }

    return bestCover;
  }

  // ============================================================================
  // COVER CREATION HELPER
  // ============================================================================

  createCoverPoint(
    id: string,
    position: Vector3,
    normal: Vector3,
    height: 'low' | 'high' | 'full',
    material: CoverMaterial,
    width: number = 1.5
  ): CoverPoint {
    const props = COVER_MATERIAL_PROPERTIES[material];
    const point: CoverPoint = {
      id,
      position: { ...position },
      normal: this.normalize(normal),
      height,
      type: props.penetrationResistance > 0.6 ? 'hard' : 'soft',
      material,
      destructible: true,
      health: props.health,
      maxHealth: props.health,
      width,
      penetrationResistance: props.penetrationResistance,
      isFlanked: false
    };
    this.coverPoints.set(id, point);
    return point;
  }
}
