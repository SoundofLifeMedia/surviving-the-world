/**
 * Perception Layer - Enemy AI Stack Layer 1
 * Tracks sight, sound, memory, and environmental modifiers
 * Feature: surviving-the-world, Property 3: Perception state initialization
 * Feature: surviving-the-world, Property 4: Weather affects perception
 * Feature: surviving-the-world, Property 5: Time of day affects sight
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PerceptionState {
  sightRange: number;
  sightConeAngle: number;
  hearingRadius: number;
  lastKnownPlayerPosition: Vector3 | null;
  lastSeenTimestamp: number;
  alertLevel: number; // 0-1
  memoryDuration: number;
  searchBehaviorDuration: number;
}

export interface PerceptionModifiers {
  weather: WeatherEffect;
  timeOfDay: number; // 0-24
  lighting: number; // 0-1
  playerNoise: number; // 0-1
  playerStance: 'standing' | 'crouching' | 'prone';
}

export type WeatherEffect = 'clear' | 'fog' | 'rain' | 'snow' | 'storm';

export interface PerceptionConfig {
  baseSightRange: number;
  sightConeAngle: number;
  baseHearingRadius: number;
  memoryDuration: number;
  weatherModifiers: Record<WeatherEffect, { sightMultiplier: number; hearingMultiplier: number }>;
  timeModifiers: { day: number; dusk: number; night: number; dawn: number };
  stanceModifiers: Record<string, number>;
}

const DEFAULT_CONFIG: PerceptionConfig = {
  baseSightRange: 30,
  sightConeAngle: 120,
  baseHearingRadius: 20,
  memoryDuration: 60,
  weatherModifiers: {
    clear: { sightMultiplier: 1.0, hearingMultiplier: 1.0 },
    fog: { sightMultiplier: 0.4, hearingMultiplier: 1.0 },
    rain: { sightMultiplier: 0.7, hearingMultiplier: 0.6 },
    snow: { sightMultiplier: 0.6, hearingMultiplier: 0.8 },
    storm: { sightMultiplier: 0.3, hearingMultiplier: 0.4 }
  },
  timeModifiers: { day: 1.0, dusk: 0.7, night: 0.4, dawn: 0.7 },
  stanceModifiers: { standing: 1.0, crouching: 0.6, prone: 0.3 }
};


export class PerceptionLayer {
  private states: Map<string, PerceptionState> = new Map();
  private config: PerceptionConfig;

  constructor(config: Partial<PerceptionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  initializePerception(enemyId: string): PerceptionState {
    const state: PerceptionState = {
      sightRange: this.config.baseSightRange,
      sightConeAngle: this.config.sightConeAngle,
      hearingRadius: this.config.baseHearingRadius,
      lastKnownPlayerPosition: null,
      lastSeenTimestamp: 0,
      alertLevel: 0,
      memoryDuration: this.config.memoryDuration,
      searchBehaviorDuration: 30
    };
    this.states.set(enemyId, state);
    return state;
  }

  getState(enemyId: string): PerceptionState | undefined {
    return this.states.get(enemyId);
  }

  updatePerception(enemyId: string, modifiers: PerceptionModifiers): PerceptionState {
    let state = this.states.get(enemyId);
    if (!state) state = this.initializePerception(enemyId);

    // Apply weather modifiers
    const weatherMod = this.config.weatherModifiers[modifiers.weather] || { sightMultiplier: 1, hearingMultiplier: 1 };
    
    // Apply time of day modifiers
    const timeMod = this.getTimeModifier(modifiers.timeOfDay);
    
    // Apply lighting modifier
    const lightMod = 0.5 + modifiers.lighting * 0.5;

    // Calculate effective ranges
    state.sightRange = this.config.baseSightRange * weatherMod.sightMultiplier * timeMod * lightMod;
    state.hearingRadius = this.config.baseHearingRadius * weatherMod.hearingMultiplier;

    return state;
  }

  private getTimeModifier(timeOfDay: number): number {
    if (timeOfDay >= 6 && timeOfDay < 18) return this.config.timeModifiers.day;
    if (timeOfDay >= 18 && timeOfDay < 20) return this.config.timeModifiers.dusk;
    if (timeOfDay >= 20 || timeOfDay < 5) return this.config.timeModifiers.night;
    return this.config.timeModifiers.dawn;
  }

  canSeeTarget(enemyId: string, enemyPos: Vector3, targetPos: Vector3, enemyFacing: Vector3): boolean {
    const state = this.states.get(enemyId);
    if (!state) return false;

    const distance = this.calculateDistance(enemyPos, targetPos);
    if (distance > state.sightRange) return false;

    const angle = this.calculateAngle(enemyPos, targetPos, enemyFacing);
    return Math.abs(angle) <= state.sightConeAngle / 2;
  }

  canHearTarget(enemyId: string, enemyPos: Vector3, targetPos: Vector3, noiseLevel: number): boolean {
    const state = this.states.get(enemyId);
    if (!state) return false;

    const distance = this.calculateDistance(enemyPos, targetPos);
    const effectiveRadius = state.hearingRadius * noiseLevel;
    return distance <= effectiveRadius;
  }

  calculateDetectionProbability(
    enemyId: string,
    enemyPos: Vector3,
    targetPos: Vector3,
    modifiers: PerceptionModifiers
  ): number {
    const state = this.states.get(enemyId);
    if (!state) return 0;

    const distance = this.calculateDistance(enemyPos, targetPos);
    const stanceMod = this.config.stanceModifiers[modifiers.playerStance] || 1;
    
    // Base probability decreases with distance
    let probability = Math.max(0, 1 - distance / state.sightRange);
    
    // Apply stance modifier
    probability *= stanceMod;
    
    // Apply noise bonus
    probability += modifiers.playerNoise * 0.3;
    
    // Apply alert level bonus
    probability += state.alertLevel * 0.2;

    return Math.min(1, Math.max(0, probability));
  }

  setLastKnownPosition(enemyId: string, position: Vector3): void {
    const state = this.states.get(enemyId);
    if (state) {
      state.lastKnownPlayerPosition = { ...position };
      state.lastSeenTimestamp = Date.now();
      state.alertLevel = Math.min(1, state.alertLevel + 0.3);
    }
  }

  getLastKnownPosition(enemyId: string): Vector3 | null {
    return this.states.get(enemyId)?.lastKnownPlayerPosition || null;
  }

  decayMemory(enemyId: string, deltaTime: number): void {
    const state = this.states.get(enemyId);
    if (!state) return;

    const timeSinceSeen = (Date.now() - state.lastSeenTimestamp) / 1000;
    if (timeSinceSeen > state.memoryDuration) {
      state.lastKnownPlayerPosition = null;
    }

    // Decay alert level
    state.alertLevel = Math.max(0, state.alertLevel - deltaTime * 0.01);
  }

  alertEnemy(enemyId: string, alertAmount: number): void {
    const state = this.states.get(enemyId);
    if (state) {
      state.alertLevel = Math.min(1, state.alertLevel + alertAmount);
    }
  }

  private calculateDistance(a: Vector3, b: Vector3): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
  }

  private calculateAngle(from: Vector3, to: Vector3, facing: Vector3): number {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const targetAngle = Math.atan2(dz, dx) * (180 / Math.PI);
    const facingAngle = Math.atan2(facing.z, facing.x) * (180 / Math.PI);
    let diff = targetAngle - facingAngle;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return diff;
  }

  clearState(enemyId: string): void {
    this.states.delete(enemyId);
  }
}
