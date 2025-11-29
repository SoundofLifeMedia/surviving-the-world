/**
 * CombatFeedbackSystem.ts - AAA Combat Feel
 * Provides: Screen Shake, Hit Markers, Blood/Impact FX, Audio Cues
 * Target: GTA5/Modern Warfare punch and feedback
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

export type HitType = 'hit' | 'headshot' | 'kill' | 'armor_break' | 'critical';
export type SurfaceType = 'flesh' | 'metal' | 'concrete' | 'wood' | 'glass' | 'dirt' | 'water';
export type WeaponClass = 'pistol' | 'smg' | 'rifle' | 'shotgun' | 'sniper' | 'lmg' | 'melee' | 'explosive';

export interface ScreenShake {
  id: string;
  intensity: number; // 0-1
  duration: number; // Ticks
  decay: number; // Per tick
  direction: Vector2; // Shake direction bias
  startTick: number;
  pattern: 'recoil' | 'impact' | 'explosion' | 'random';
}

export interface HitMarker {
  id: string;
  type: HitType;
  position: Vector2; // Screen position
  duration: number; // Ticks
  startTick: number;
  damage: number;
  color: string;
}

export interface BloodSplatter {
  id: string;
  worldPosition: Vector3;
  direction: Vector3;
  intensity: number; // 0-1
  startTick: number;
  duration: number;
}

export interface ImpactDecal {
  id: string;
  position: Vector3;
  normal: Vector3;
  surface: SurfaceType;
  size: number;
  lifetime: number; // Ticks until fade
  startTick: number;
}

export interface MuzzleFlash {
  id: string;
  position: Vector3;
  direction: Vector3;
  intensity: number;
  weaponClass: WeaponClass;
  duration: number;
  startTick: number;
}

export interface ShellCasing {
  id: string;
  position: Vector3;
  velocity: Vector3;
  caliber: string;
  startTick: number;
}

export interface AudioCue {
  id: string;
  type: 'hit' | 'headshot' | 'kill' | 'armor' | 'reload_start' | 'reload_end' | 'empty_click';
  position?: Vector3;
  volume: number;
  pitch: number;
  startTick: number;
}

export interface CameraEffect {
  id: string;
  type: 'slowmo' | 'zoom' | 'blur' | 'color_shift';
  intensity: number;
  duration: number;
  startTick: number;
}

export interface WeaponRecoilPattern {
  weaponId: string;
  pattern: Vector2[]; // Sequence of recoil offsets
  resetTime: number; // Ticks to reset pattern
  hipSpread: number;
  adsSpread: number;
  adsSpreadReduction: number;
  cameraKick: number; // Per shot
  recoveryRate: number; // How fast crosshair returns
}

export interface RecoilState {
  entityId: string;
  weaponId: string;
  patternIndex: number;
  accumulatedRecoil: Vector2;
  lastFireTick: number;
  shotsInBurst: number;
}

// ============================================================================
// DEFAULT WEAPON RECOIL PATTERNS
// ============================================================================

export const WEAPON_RECOIL_PATTERNS: Record<string, WeaponRecoilPattern> = {
  pistol: {
    weaponId: 'pistol',
    pattern: [
      { x: 0, y: 2 }, { x: 0.5, y: 1.5 }, { x: -0.3, y: 1.8 }, { x: 0.2, y: 2 }
    ],
    resetTime: 8,
    hipSpread: 3,
    adsSpread: 1,
    adsSpreadReduction: 0.6,
    cameraKick: 2.5,
    recoveryRate: 0.3
  },
  smg: {
    weaponId: 'smg',
    pattern: [
      { x: 0, y: 1.2 }, { x: 0.8, y: 1.5 }, { x: 1.2, y: 1.3 }, { x: 0.5, y: 1.8 },
      { x: -0.3, y: 2 }, { x: -0.8, y: 1.5 }, { x: -0.5, y: 1.7 }, { x: 0.2, y: 1.4 }
    ],
    resetTime: 6,
    hipSpread: 5,
    adsSpread: 2,
    adsSpreadReduction: 0.55,
    cameraKick: 1.5,
    recoveryRate: 0.25
  },
  rifle: {
    weaponId: 'rifle',
    pattern: [
      { x: 0, y: 2.5 }, { x: 0.5, y: 2.8 }, { x: 1.0, y: 2.2 }, { x: 0.8, y: 3.0 },
      { x: 0.3, y: 2.5 }, { x: -0.4, y: 2.8 }, { x: -0.8, y: 2.3 }, { x: -1.0, y: 2.6 },
      { x: -0.5, y: 2.8 }, { x: 0.2, y: 2.4 }
    ],
    resetTime: 10,
    hipSpread: 6,
    adsSpread: 1.5,
    adsSpreadReduction: 0.5,
    cameraKick: 3.0,
    recoveryRate: 0.2
  },
  shotgun: {
    weaponId: 'shotgun',
    pattern: [
      { x: 0, y: 8 }
    ],
    resetTime: 20,
    hipSpread: 12,
    adsSpread: 8,
    adsSpreadReduction: 0.3,
    cameraKick: 8.0,
    recoveryRate: 0.15
  },
  sniper: {
    weaponId: 'sniper',
    pattern: [
      { x: 0, y: 15 }
    ],
    resetTime: 30,
    hipSpread: 15,
    adsSpread: 0.5,
    adsSpreadReduction: 0.95,
    cameraKick: 12.0,
    recoveryRate: 0.1
  },
  lmg: {
    weaponId: 'lmg',
    pattern: [
      { x: 0, y: 1.8 }, { x: 0.6, y: 2.0 }, { x: 1.2, y: 1.5 }, { x: 0.8, y: 2.2 },
      { x: 0.3, y: 1.8 }, { x: -0.5, y: 2.0 }, { x: -1.0, y: 1.6 }, { x: -0.7, y: 2.3 },
      { x: -0.2, y: 1.9 }, { x: 0.4, y: 2.1 }, { x: 0.9, y: 1.7 }, { x: 0.5, y: 2.4 }
    ],
    resetTime: 8,
    hipSpread: 8,
    adsSpread: 3,
    adsSpreadReduction: 0.45,
    cameraKick: 2.0,
    recoveryRate: 0.18
  }
};

// ============================================================================
// COMBAT FEEDBACK SYSTEM
// ============================================================================

export class CombatFeedbackSystem {
  private screenShakes: Map<string, ScreenShake> = new Map();
  private hitMarkers: Map<string, HitMarker> = new Map();
  private bloodSplatters: Map<string, BloodSplatter> = new Map();
  private impactDecals: Map<string, ImpactDecal> = new Map();
  private muzzleFlashes: Map<string, MuzzleFlash> = new Map();
  private shellCasings: Map<string, ShellCasing> = new Map();
  private audioCues: AudioCue[] = [];
  private cameraEffects: Map<string, CameraEffect> = new Map();
  private recoilStates: Map<string, RecoilState> = new Map();

  private idCounter = 0;
  private ticksPerSecond = 20;

  // ============================================================================
  // SCREEN SHAKE
  // ============================================================================

  addScreenShake(
    intensity: number,
    duration: number,
    pattern: ScreenShake['pattern'],
    direction: Vector2 = { x: 0, y: 1 },
    currentTick: number
  ): string {
    const id = `shake_${++this.idCounter}`;
    this.screenShakes.set(id, {
      id,
      intensity: Math.min(1, Math.max(0, intensity)),
      duration,
      decay: intensity / duration,
      direction,
      startTick: currentTick,
      pattern
    });
    return id;
  }

  getScreenShakeOffset(currentTick: number): Vector2 {
    let totalX = 0;
    let totalY = 0;

    for (const shake of this.screenShakes.values()) {
      const elapsed = currentTick - shake.startTick;
      if (elapsed >= shake.duration) {
        this.screenShakes.delete(shake.id);
        continue;
      }

      const remaining = shake.intensity - (shake.decay * elapsed);
      if (remaining <= 0) continue;

      let offsetX = 0;
      let offsetY = 0;

      switch (shake.pattern) {
        case 'recoil':
          offsetY = remaining * shake.direction.y;
          offsetX = remaining * shake.direction.x * 0.3;
          break;
        case 'impact':
          offsetX = (Math.random() - 0.5) * remaining * 2;
          offsetY = (Math.random() - 0.5) * remaining * 2;
          break;
        case 'explosion':
          const frequency = 0.5;
          offsetX = Math.sin(elapsed * frequency) * remaining;
          offsetY = Math.cos(elapsed * frequency * 1.3) * remaining;
          break;
        case 'random':
          offsetX = (Math.random() - 0.5) * remaining;
          offsetY = (Math.random() - 0.5) * remaining;
          break;
      }

      totalX += offsetX;
      totalY += offsetY;
    }

    return { x: totalX, y: totalY };
  }

  // ============================================================================
  // HIT MARKERS
  // ============================================================================

  addHitMarker(
    type: HitType,
    damage: number,
    screenPosition: Vector2,
    currentTick: number
  ): string {
    const id = `hit_${++this.idCounter}`;

    const colors: Record<HitType, string> = {
      hit: '#FFFFFF',
      headshot: '#FF0000',
      kill: '#FFD700',
      armor_break: '#00BFFF',
      critical: '#FF4500'
    };

    const durations: Record<HitType, number> = {
      hit: 6,
      headshot: 12,
      kill: 15,
      armor_break: 10,
      critical: 10
    };

    this.hitMarkers.set(id, {
      id,
      type,
      position: screenPosition,
      duration: durations[type],
      startTick: currentTick,
      damage,
      color: colors[type]
    });

    // Add audio cue
    this.addAudioCue(type === 'headshot' ? 'headshot' : type === 'kill' ? 'kill' : 'hit', currentTick);

    // Add camera effect for special hits
    if (type === 'headshot' || type === 'kill') {
      this.addCameraEffect('slowmo', 0.3, 5, currentTick);
    }

    return id;
  }

  getActiveHitMarkers(currentTick: number): HitMarker[] {
    const active: HitMarker[] = [];
    for (const marker of this.hitMarkers.values()) {
      const elapsed = currentTick - marker.startTick;
      if (elapsed >= marker.duration) {
        this.hitMarkers.delete(marker.id);
      } else {
        active.push(marker);
      }
    }
    return active;
  }

  // ============================================================================
  // BLOOD & IMPACT EFFECTS
  // ============================================================================

  addBloodSplatter(
    position: Vector3,
    direction: Vector3,
    intensity: number,
    currentTick: number
  ): string {
    const id = `blood_${++this.idCounter}`;
    this.bloodSplatters.set(id, {
      id,
      worldPosition: position,
      direction,
      intensity: Math.min(1, intensity),
      startTick: currentTick,
      duration: 60 // 3 seconds
    });
    return id;
  }

  addImpactDecal(
    position: Vector3,
    normal: Vector3,
    surface: SurfaceType,
    currentTick: number
  ): string {
    const id = `decal_${++this.idCounter}`;

    const sizes: Record<SurfaceType, number> = {
      flesh: 0.3,
      metal: 0.1,
      concrete: 0.15,
      wood: 0.2,
      glass: 0.25,
      dirt: 0.3,
      water: 0.4
    };

    this.impactDecals.set(id, {
      id,
      position,
      normal,
      surface,
      size: sizes[surface],
      lifetime: 600, // 30 seconds
      startTick: currentTick
    });

    return id;
  }

  // ============================================================================
  // MUZZLE FLASH & SHELL CASINGS
  // ============================================================================

  addMuzzleFlash(
    position: Vector3,
    direction: Vector3,
    weaponClass: WeaponClass,
    currentTick: number
  ): string {
    const id = `flash_${++this.idCounter}`;

    const intensities: Record<WeaponClass, number> = {
      pistol: 0.6,
      smg: 0.5,
      rifle: 0.8,
      shotgun: 1.0,
      sniper: 0.9,
      lmg: 0.7,
      melee: 0,
      explosive: 1.0
    };

    this.muzzleFlashes.set(id, {
      id,
      position,
      direction,
      intensity: intensities[weaponClass],
      weaponClass,
      duration: 2, // Very short
      startTick: currentTick
    });

    return id;
  }

  addShellCasing(
    position: Vector3,
    velocity: Vector3,
    caliber: string,
    currentTick: number
  ): string {
    const id = `shell_${++this.idCounter}`;
    this.shellCasings.set(id, {
      id,
      position,
      velocity,
      caliber,
      startTick: currentTick
    });
    return id;
  }

  // ============================================================================
  // AUDIO CUES
  // ============================================================================

  addAudioCue(
    type: AudioCue['type'],
    currentTick: number,
    position?: Vector3,
    volume: number = 1.0,
    pitch: number = 1.0
  ): void {
    this.audioCues.push({
      id: `audio_${++this.idCounter}`,
      type,
      position,
      volume,
      pitch,
      startTick: currentTick
    });
  }

  getAndClearAudioCues(): AudioCue[] {
    const cues = [...this.audioCues];
    this.audioCues = [];
    return cues;
  }

  // ============================================================================
  // CAMERA EFFECTS
  // ============================================================================

  addCameraEffect(
    type: CameraEffect['type'],
    intensity: number,
    duration: number,
    currentTick: number
  ): string {
    const id = `cam_${++this.idCounter}`;
    this.cameraEffects.set(id, {
      id,
      type,
      intensity,
      duration,
      startTick: currentTick
    });
    return id;
  }

  getActiveCameraEffects(currentTick: number): CameraEffect[] {
    const active: CameraEffect[] = [];
    for (const effect of this.cameraEffects.values()) {
      const elapsed = currentTick - effect.startTick;
      if (elapsed >= effect.duration) {
        this.cameraEffects.delete(effect.id);
      } else {
        active.push(effect);
      }
    }
    return active;
  }

  // ============================================================================
  // RECOIL SYSTEM
  // ============================================================================

  initRecoilState(entityId: string, weaponId: string): void {
    this.recoilStates.set(entityId, {
      entityId,
      weaponId,
      patternIndex: 0,
      accumulatedRecoil: { x: 0, y: 0 },
      lastFireTick: 0,
      shotsInBurst: 0
    });
  }

  applyRecoil(entityId: string, weaponClass: WeaponClass, isADS: boolean, currentTick: number): Vector2 {
    let state = this.recoilStates.get(entityId);
    const pattern = WEAPON_RECOIL_PATTERNS[weaponClass];

    if (!pattern) {
      return { x: 0, y: 0 };
    }

    if (!state || state.weaponId !== weaponClass) {
      this.initRecoilState(entityId, weaponClass);
      state = this.recoilStates.get(entityId)!;
    }

    // Check for pattern reset
    const ticksSinceLastFire = currentTick - state.lastFireTick;
    if (ticksSinceLastFire > pattern.resetTime) {
      state.patternIndex = 0;
      state.shotsInBurst = 0;
      state.accumulatedRecoil = { x: 0, y: 0 };
    }

    // Get recoil offset from pattern
    const recoilOffset = pattern.pattern[state.patternIndex % pattern.pattern.length];

    // Apply ADS reduction
    const adsMult = isADS ? (1 - pattern.adsSpreadReduction) : 1;

    const finalRecoil: Vector2 = {
      x: recoilOffset.x * adsMult,
      y: recoilOffset.y * adsMult
    };

    // Accumulate recoil
    state.accumulatedRecoil.x += finalRecoil.x;
    state.accumulatedRecoil.y += finalRecoil.y;
    state.patternIndex++;
    state.shotsInBurst++;
    state.lastFireTick = currentTick;

    // Add screen shake for camera kick
    this.addScreenShake(
      pattern.cameraKick * 0.01 * adsMult,
      3,
      'recoil',
      { x: finalRecoil.x * 0.5, y: 1 },
      currentTick
    );

    return finalRecoil;
  }

  updateRecoilRecovery(entityId: string, currentTick: number): Vector2 {
    const state = this.recoilStates.get(entityId);
    if (!state) return { x: 0, y: 0 };

    const pattern = WEAPON_RECOIL_PATTERNS[state.weaponId];
    if (!pattern) return { x: 0, y: 0 };

    // Recover toward center
    const recoveryAmount = pattern.recoveryRate;
    state.accumulatedRecoil.x *= (1 - recoveryAmount);
    state.accumulatedRecoil.y *= (1 - recoveryAmount);

    return { ...state.accumulatedRecoil };
  }

  getSpread(entityId: string, weaponClass: WeaponClass, isADS: boolean, isMoving: boolean, momentum: number): number {
    const pattern = WEAPON_RECOIL_PATTERNS[weaponClass];
    if (!pattern) return 5;

    let spread = isADS ? pattern.adsSpread : pattern.hipSpread;

    // Movement penalty
    if (isMoving) {
      spread *= 1.5;
    }

    // Momentum penalty
    spread *= (1 + momentum * 0.3);

    return spread;
  }

  // ============================================================================
  // WEAPON FIRE EVENT
  // ============================================================================

  onWeaponFire(
    entityId: string,
    weaponClass: WeaponClass,
    position: Vector3,
    direction: Vector3,
    isADS: boolean,
    currentTick: number
  ): { recoil: Vector2; spread: number } {
    // Muzzle flash
    this.addMuzzleFlash(position, direction, weaponClass, currentTick);

    // Shell casing (eject to the right)
    const rightDir: Vector3 = {
      x: -direction.z,
      y: 0.5,
      z: direction.x
    };
    this.addShellCasing(
      position,
      { x: rightDir.x * 2, y: rightDir.y * 3, z: rightDir.z * 2 },
      weaponClass,
      currentTick
    );

    // Apply recoil
    const recoil = this.applyRecoil(entityId, weaponClass, isADS, currentTick);

    // Calculate spread
    const state = this.recoilStates.get(entityId);
    const spread = this.getSpread(entityId, weaponClass, isADS, false, state?.shotsInBurst ?? 0);

    return { recoil, spread };
  }

  // ============================================================================
  // HIT EVENT
  // ============================================================================

  onHit(
    targetPosition: Vector3,
    hitDirection: Vector3,
    surface: SurfaceType,
    damage: number,
    isHeadshot: boolean,
    isKill: boolean,
    currentTick: number
  ): void {
    // Determine hit type
    let hitType: HitType = 'hit';
    if (isKill) hitType = 'kill';
    else if (isHeadshot) hitType = 'headshot';
    else if (damage > 50) hitType = 'critical';

    // Hit marker at center of screen
    this.addHitMarker(hitType, damage, { x: 0.5, y: 0.5 }, currentTick);

    // Blood splatter
    if (surface === 'flesh') {
      this.addBloodSplatter(
        targetPosition,
        hitDirection,
        Math.min(1, damage / 100),
        currentTick
      );
    }

    // Impact decal
    this.addImpactDecal(targetPosition, hitDirection, surface, currentTick);

    // Headshot special effects
    if (isHeadshot) {
      this.addScreenShake(0.3, 8, 'impact', { x: 0, y: 1 }, currentTick);
    }

    // Kill special effects
    if (isKill) {
      this.addCameraEffect('slowmo', 0.5, 10, currentTick);
      this.addCameraEffect('zoom', 0.1, 8, currentTick);
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  cleanup(currentTick: number): void {
    // Clean up expired effects
    for (const [id, splatter] of this.bloodSplatters) {
      if (currentTick - splatter.startTick > splatter.duration) {
        this.bloodSplatters.delete(id);
      }
    }

    for (const [id, decal] of this.impactDecals) {
      if (currentTick - decal.startTick > decal.lifetime) {
        this.impactDecals.delete(id);
      }
    }

    for (const [id, flash] of this.muzzleFlashes) {
      if (currentTick - flash.startTick > flash.duration) {
        this.muzzleFlashes.delete(id);
      }
    }

    // Shell casings cleaned up after 5 seconds
    for (const [id, shell] of this.shellCasings) {
      if (currentTick - shell.startTick > 100) {
        this.shellCasings.delete(id);
      }
    }
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  getActiveBloodSplatters(): BloodSplatter[] {
    return Array.from(this.bloodSplatters.values());
  }

  getActiveDecals(): ImpactDecal[] {
    return Array.from(this.impactDecals.values());
  }

  getActiveMuzzleFlashes(currentTick: number): MuzzleFlash[] {
    return Array.from(this.muzzleFlashes.values()).filter(
      f => currentTick - f.startTick < f.duration
    );
  }

  getShellCasings(): ShellCasing[] {
    return Array.from(this.shellCasings.values());
  }

  // ============================================================================
  // SERIALIZATION
  // ============================================================================

  serialize(): object {
    return {
      screenShakes: Array.from(this.screenShakes.entries()),
      hitMarkers: Array.from(this.hitMarkers.entries()),
      bloodSplatters: Array.from(this.bloodSplatters.entries()),
      impactDecals: Array.from(this.impactDecals.entries()),
      recoilStates: Array.from(this.recoilStates.entries()),
      idCounter: this.idCounter
    };
  }

  static deserialize(data: any): CombatFeedbackSystem {
    const system = new CombatFeedbackSystem();
    system.idCounter = data.idCounter || 0;
    for (const [id, state] of data.recoilStates || []) {
      system.recoilStates.set(id, state);
    }
    return system;
  }
}

export default CombatFeedbackSystem;
