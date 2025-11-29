# Design Document: Combat Feel MVP

## Overview

Combat Feel MVP implements AAA-quality gunplay matching GTA V and Modern Warfare standards. The system is fully data-driven with JSON configs, hot-reloadable, and instrumented for telemetry.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INPUT LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Fire       │  │   Movement   │  │   Stance     │      │
│  │   Input      │  │   Input      │  │   Input      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  COMBAT FEEL LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Recoil     │  │   Spread     │  │   Handling   │      │
│  │   System     │  │   System     │  │   System     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Camera     │  │   Damage     │  │   Impact     │      │
│  │   System     │  │   System     │  │   System     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  TRAVERSAL LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Sprint     │  │   Slide      │  │   Vault      │      │
│  │   System     │  │   System     │  │   System     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │   Lean       │  │   Stamina    │                        │
│  │   System     │  │   System     │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    AUDIO LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Footstep   │  │   Weapon     │  │   Occlusion  │      │
│  │   System     │  │   Audio      │  │   System     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. RecoilSystem

```typescript
interface RecoilConfig {
  pattern: Vector2[];           // Recoil curve points
  patternScale: number;         // Overall magnitude
  randomness: number;           // Per-shot variance (0-1)
  recoveryRate: number;         // Decay speed when not firing
  adsMultiplier: number;        // ADS reduction (0.6-0.8)
  crouchMultiplier: number;     // Crouch reduction (0.85)
  proneMultiplier: number;      // Prone reduction (0.7)
}

interface RecoilState {
  patternIndex: number;
  accumulated: Vector2;
  lastFireTime: number;
}

class RecoilSystem {
  applyRecoil(weapon: WeaponConfig, state: RecoilState, stance: Stance, isAds: boolean): Vector2;
  decayRecoil(state: RecoilState, deltaTime: number): void;
  resetRecoil(state: RecoilState): void;
}
```

### 2. SpreadSystem

```typescript
interface SpreadConfig {
  baseSpread: number;           // Hip fire cone (radians)
  adsSpread: number;            // ADS cone (radians)
  movementPenalty: number;      // Per m/s velocity
  crouchMultiplier: number;     // Crouch reduction
  proneMultiplier: number;      // Prone reduction
  firstShotMultiplier: number;  // First shot accuracy bonus
  sustainedFirePenalty: number; // Per-shot spread increase
  maxSpread: number;            // Cap on spread
}

class SpreadSystem {
  calculateSpread(config: SpreadConfig, stance: Stance, velocity: number, isAds: boolean, shotCount: number): number;
  applySpread(direction: Vector3, spread: number, rng: SeededRng): Vector3;
}
```

### 3. HandlingSystem

```typescript
interface HandlingConfig {
  switchTime: number;           // Weapon switch (ms)
  tacticalReloadTime: number;   // Reload with rounds
  emptyReloadTime: number;      // Reload from empty
  adsTime: number;              // ADS raise time
  sprintOutTime: number;        // Sprint to fire delay
  readyTime: number;            // Equip ready time
}

type HandlingState = 'ready' | 'switching' | 'reloading' | 'ads_in' | 'ads_out' | 'sprint_out';

class HandlingSystem {
  canFire(state: HandlingState): boolean;
  startSwitch(from: WeaponConfig, to: WeaponConfig): number;
  startReload(weapon: WeaponConfig, isEmpty: boolean): number;
  startAds(weapon: WeaponConfig): number;
  endAds(weapon: WeaponConfig): number;
  getProgress(state: HandlingState, startTime: number, duration: number): number;
}
```

### 4. CameraSystem

```typescript
interface CameraConfig {
  kickStrength: number;         // Recoil camera kick
  kickRecovery: number;         // Kick decay rate
  flinchStrength: number;       // Damage flinch magnitude
  flinchDuration: number;       // Flinch duration (ms)
  suppressionShake: number;     // Near-miss shake
  springStiffness: number;      // Camera spring constant
  springDamping: number;        // Camera spring damping
}

interface CameraState {
  kickOffset: Vector2;
  flinchOffset: Vector2;
  shakeIntensity: number;
  velocity: Vector2;
}

class CameraSystem {
  applyKick(state: CameraState, recoil: Vector2, config: CameraConfig): void;
  applyFlinch(state: CameraState, damage: number, hitLocation: HitLocation, config: CameraConfig): void;
  applySuppression(state: CameraState, distance: number, config: CameraConfig): void;
  update(state: CameraState, deltaTime: number, config: CameraConfig): Vector2;
}
```

### 5. TraversalSystem

```typescript
interface TraversalConfig {
  sprintMultiplier: number;     // Sprint speed boost
  sprintStaminaCost: number;    // Stamina drain/s
  slideDuration: number;        // Slide time (ms)
  slideSpeed: number;           // Slide velocity
  slideCooldown: number;        // Slide cooldown (ms)
  diveDuration: number;         // Dive time (ms)
  diveDistance: number;         // Dive distance
  diveIframes: number;          // Invulnerability (ms)
  vaultTime: number;            // Vault animation (ms)
  mantleTime: number;           // Mantle animation (ms)
  maxMantleHeight: number;      // Max mantle height
  leanAngle: number;            // Lean tilt (degrees)
  leanAccuracyPenalty: number;  // Lean spread increase
}

type TraversalState = 'idle' | 'sprinting' | 'sliding' | 'diving' | 'vaulting' | 'mantling' | 'leaning_left' | 'leaning_right';

class TraversalSystem {
  canSprint(stamina: number): boolean;
  startSlide(velocity: Vector3, config: TraversalConfig): SlideResult;
  startDive(direction: Vector3, config: TraversalConfig): DiveResult;
  startVault(obstacleHeight: number, config: TraversalConfig): VaultResult;
  startMantle(obstacleHeight: number, config: TraversalConfig): MantleResult;
  startLean(direction: 'left' | 'right', config: TraversalConfig): LeanResult;
  update(state: TraversalState, deltaTime: number): TraversalState;
}
```

### 6. AudioSystem

```typescript
interface AudioConfig {
  footstepVolume: number;
  footstepInterval: number;     // ms between steps
  crouchVolumeMultiplier: number;
  indoorReverbMix: number;
  outdoorTailLength: number;
  occlusionStrength: number;
  distanceRolloff: number;
}

interface SurfaceAudio {
  concrete: string[];
  metal: string[];
  grass: string[];
  water: string[];
  wood: string[];
}

class AudioSystem {
  playFootstep(surface: SurfaceType, stance: Stance, config: AudioConfig): void;
  playWeaponFire(weapon: WeaponConfig, isIndoor: boolean, config: AudioConfig): void;
  playImpact(surface: SurfaceType, position: Vector3): void;
  playKillConfirm(isHeadshot: boolean): void;
  calculateOcclusion(source: Vector3, listener: Vector3, walls: Wall[]): number;
}
```

## Data Models

### Weapon Config (JSON)

```json
{
  "schemaVersion": 2,
  "id": "rifle_m4",
  "name": "M4 Carbine",
  "category": "rifle",
  "damage": {
    "base": 32,
    "headMultiplier": 3.0,
    "torsoMultiplier": 1.0,
    "limbMultiplier": 0.5,
    "range": 180,
    "falloffStart": 50,
    "falloffEnd": 150
  },
  "recoil": {
    "pattern": [
      {"x": 0.05, "y": 0.6},
      {"x": -0.05, "y": 0.55},
      {"x": 0.08, "y": 0.5},
      {"x": -0.03, "y": 0.45}
    ],
    "patternScale": 1.0,
    "randomness": 0.15,
    "recoveryRate": 8.0,
    "adsMultiplier": 0.7,
    "crouchMultiplier": 0.85,
    "proneMultiplier": 0.7
  },
  "spread": {
    "baseSpread": 0.04,
    "adsSpread": 0.008,
    "movementPenalty": 0.02,
    "crouchMultiplier": 0.8,
    "proneMultiplier": 0.6,
    "firstShotMultiplier": 0.5,
    "sustainedFirePenalty": 0.005,
    "maxSpread": 0.15
  },
  "handling": {
    "switchTime": 500,
    "tacticalReloadTime": 2100,
    "emptyReloadTime": 2800,
    "adsTime": 250,
    "sprintOutTime": 200,
    "readyTime": 400
  },
  "magazine": {
    "size": 30,
    "reserveMax": 180
  },
  "fireRate": 700,
  "automatic": true
}
```

### Traversal Config (JSON)

```json
{
  "schemaVersion": 1,
  "sprint": {
    "speedMultiplier": 1.5,
    "staminaCostPerSecond": 15,
    "minStaminaToStart": 20,
    "recoveryDelay": 500
  },
  "slide": {
    "duration": 600,
    "speedMultiplier": 1.8,
    "cooldown": 1500,
    "staminaCost": 10
  },
  "dive": {
    "duration": 400,
    "distance": 3.0,
    "iframeDuration": 150,
    "cooldown": 2000,
    "staminaCost": 25
  },
  "vault": {
    "maxHeight": 1.0,
    "duration": 400,
    "speedThreshold": 3.0
  },
  "mantle": {
    "maxHeight": 2.0,
    "duration": 800,
    "staminaCost": 15
  },
  "lean": {
    "angle": 15,
    "transitionTime": 150,
    "accuracyPenalty": 0.1
  },
  "stamina": {
    "max": 100,
    "regenRate": 20,
    "regenDelay": 1000
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Recoil bounds
*For any* weapon and fire sequence, accumulated recoil magnitude SHALL never exceed weapon.recoil.patternScale * pattern.length * 2
**Validates: Requirements 1.1, 1.2**

### Property 2: Recoil decay convergence
*For any* recoil state, if no shots are fired for recoveryTime seconds, accumulated recoil SHALL be within 0.01 of zero
**Validates: Requirements 1.3**

### Property 3: ADS recoil reduction
*For any* weapon, recoil when ADS SHALL be exactly recoil * adsMultiplier (within floating point tolerance)
**Validates: Requirements 1.4**

### Property 4: Spread bounds
*For any* weapon and stance combination, spread SHALL be in range [0, maxSpread]
**Validates: Requirements 2.1-2.5**

### Property 5: ADS spread reduction
*For any* weapon, ADS spread SHALL be less than hip spread
**Validates: Requirements 2.2**

### Property 6: Handling state validity
*For any* handling state machine, state SHALL always be one of valid states and transitions SHALL follow defined rules
**Validates: Requirements 3.1-3.5**

### Property 7: Reload time ordering
*For any* weapon, emptyReloadTime SHALL be greater than tacticalReloadTime
**Validates: Requirements 3.2, 3.3**

### Property 8: Camera effect bounds
*For any* camera state, total offset magnitude SHALL never exceed maxCameraOffset
**Validates: Requirements 4.1-4.5**

### Property 9: Damage multiplier ordering
*For any* damage calculation, headMultiplier > torsoMultiplier > limbMultiplier
**Validates: Requirements 5.1-5.3**

### Property 10: Stamina bounds
*For any* stamina state, value SHALL be in range [0, maxStamina]
**Validates: Requirements 7.2-7.4**

### Property 11: Slide/dive cooldown enforcement
*For any* slide or dive attempt during cooldown, attempt SHALL be rejected
**Validates: Requirements 8.5**

### Property 12: Vault height validation
*For any* vault attempt, obstacle height SHALL be validated against maxVaultHeight before allowing
**Validates: Requirements 9.5**

### Property 13: Lean accuracy penalty
*For any* lean state, accuracy SHALL be reduced by exactly leanAccuracyPenalty
**Validates: Requirements 10.2**

### Property 14: Audio occlusion bounds
*For any* occlusion calculation, result SHALL be in range [0, 1]
**Validates: Requirements 13.1-13.5**

## Error Handling

- Invalid weapon config: Log error, use fallback defaults
- NaN in calculations: Clamp to valid range, emit telemetry warning
- Missing audio samples: Play fallback sound, log warning
- Obstacle detection failure: Reject traversal, play feedback

## Testing Strategy

### Unit Tests
- Each system component in isolation
- Config loading and validation
- State machine transitions

### Property-Based Tests (fast-check)
- All 14 correctness properties with 100+ iterations
- Bounds checking for all numeric values
- State machine validity

### Integration Tests
- Full fire sequence (input → recoil → spread → damage → audio)
- Traversal sequences (sprint → slide → vault)
- Camera effect stacking

### Performance Tests
- Recoil calculation: <0.1ms per shot
- Spread calculation: <0.05ms per shot
- Audio occlusion: <1ms per source
