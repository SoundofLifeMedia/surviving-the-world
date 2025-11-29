# Requirements Document: Combat Feel MVP

## Introduction

Combat Feel MVP delivers AAA-quality gunplay and traversal mechanics matching GTA V and Modern Warfare standards. This spec covers recoil systems, hit clarity, traversal mechanics, and audio feedback - the core "game feel" that makes combat satisfying.

## Glossary

- **Recoil Curve**: Per-weapon pattern of camera/aim displacement during sustained fire
- **ADS**: Aim Down Sights - precision aiming mode with reduced spread
- **Hip Fire**: Firing without ADS - faster but less accurate
- **Sway**: Subtle aim drift when ADS, affected by stamina and stance
- **Handling Time**: Weapon raise/lower/switch timing
- **TTK**: Time To Kill - frames/seconds to eliminate target
- **Stagger**: Brief movement/aim interruption on hit
- **Flinch**: Camera shake/displacement when taking damage
- **Mantle**: Climbing over waist-high obstacles
- **Vault**: Quick hop over low obstacles while sprinting
- **Lean/Peek**: Exposing minimal body while aiming from cover

## Requirements

### Requirement 1: Per-Weapon Recoil System

**User Story:** As a player, I want each weapon to have unique recoil behavior, so that mastering weapons feels rewarding and combat has depth.

#### Acceptance Criteria

1. WHEN a weapon fires THEN the RecoilSystem SHALL apply vertical and horizontal displacement according to the weapon's recoil curve data
2. WHEN sustained fire occurs THEN the RecoilSystem SHALL progress through the weapon's recoil pattern array sequentially
3. WHEN the player stops firing THEN the RecoilSystem SHALL decay accumulated recoil toward zero at a configurable rate
4. WHEN ADS is active THEN the RecoilSystem SHALL reduce recoil magnitude by the weapon's adsRecoilMultiplier (typically 0.6-0.8)
5. WHEN the player is crouched THEN the RecoilSystem SHALL reduce recoil by stanceCrouchMultiplier (typically 0.85)

### Requirement 2: Spread and Accuracy System

**User Story:** As a player, I want accuracy to depend on my stance and aiming mode, so that positioning and aim discipline matter.

#### Acceptance Criteria

1. WHEN hip firing THEN the SpreadSystem SHALL apply base spread cone from weapon config
2. WHEN ADS THEN the SpreadSystem SHALL reduce spread by adsSpreadMultiplier (typically 0.3-0.5)
3. WHEN moving THEN the SpreadSystem SHALL increase spread by movementSpreadPenalty proportional to velocity
4. WHEN crouched THEN the SpreadSystem SHALL reduce spread by stanceCrouchMultiplier
5. WHEN prone THEN the SpreadSystem SHALL reduce spread by stanceProneMultiplier (maximum accuracy)

### Requirement 3: Weapon Handling Times

**User Story:** As a player, I want weapon switching and reloading to have realistic timing, so that loadout choices have tactical weight.

#### Acceptance Criteria

1. WHEN switching weapons THEN the HandlingSystem SHALL block firing for switchTime milliseconds from weapon config
2. WHEN reloading with rounds remaining THEN the HandlingSystem SHALL use tacticalReloadTime
3. WHEN reloading from empty THEN the HandlingSystem SHALL use emptyReloadTime (longer)
4. WHEN raising weapon from sprint THEN the HandlingSystem SHALL apply sprintOutTime delay
5. WHEN ADS THEN the HandlingSystem SHALL apply adsTime for scope raise animation

### Requirement 4: Camera Kick and Flinch

**User Story:** As a player, I want visual feedback when firing and taking damage, so that combat feels impactful.

#### Acceptance Criteria

1. WHEN firing THEN the CameraSystem SHALL apply kick displacement matching recoil curve
2. WHEN taking damage THEN the CameraSystem SHALL apply flinch shake scaled by damage amount
3. WHEN hit location is head THEN the CameraSystem SHALL apply enhanced flinch with screen flash
4. WHEN suppressed (near misses) THEN the CameraSystem SHALL apply subtle screen shake
5. WHEN camera effects occur THEN the CameraSystem SHALL blend smoothly using configurable spring constants

### Requirement 5: Locational Damage and Stagger

**User Story:** As a player, I want headshots to be rewarding and body shots to have tactical implications, so that aim skill matters.

#### Acceptance Criteria

1. WHEN hitting head THEN the DamageSystem SHALL apply headMultiplier (3.0x) and trigger kill confirm audio
2. WHEN hitting torso THEN the DamageSystem SHALL apply torsoMultiplier (1.0x)
3. WHEN hitting limbs THEN the DamageSystem SHALL apply limbMultiplier (0.5x) and chance of accuracy debuff
4. WHEN damage exceeds staggerThreshold THEN the DamageSystem SHALL interrupt target's current action
5. WHEN armor breaks THEN the DamageSystem SHALL play armor break audio and visual effect

### Requirement 6: Impact Effects and Audio

**User Story:** As a player, I want hits to produce satisfying visual and audio feedback, so that combat feels visceral.

#### Acceptance Criteria

1. WHEN bullet impacts surface THEN the ImpactSystem SHALL spawn material-appropriate decal and particle
2. WHEN bullet impacts flesh THEN the ImpactSystem SHALL spawn blood effect scaled by damage
3. WHEN bullet impacts metal THEN the ImpactSystem SHALL spawn spark effect and ricochet audio
4. WHEN kill occurs THEN the ImpactSystem SHALL play kill confirm stinger audio
5. WHEN headshot kill occurs THEN the ImpactSystem SHALL play enhanced headshot stinger

### Requirement 7: Sprint and Stamina

**User Story:** As a player, I want sprinting to be fast but limited, so that positioning requires planning.

#### Acceptance Criteria

1. WHEN sprint input is held THEN the MovementSystem SHALL increase speed by sprintMultiplier (typically 1.5x)
2. WHEN sprinting THEN the MovementSystem SHALL drain stamina at sprintStaminaCost per second
3. WHEN stamina reaches zero THEN the MovementSystem SHALL force walk speed until staminaRecoveryThreshold
4. WHEN not sprinting THEN the MovementSystem SHALL regenerate stamina at staminaRegenRate
5. WHEN sprinting THEN the MovementSystem SHALL prevent firing until sprintOutTime elapses

### Requirement 8: Slide and Dive

**User Story:** As a player, I want to slide into cover and dive to avoid fire, so that movement is dynamic.

#### Acceptance Criteria

1. WHEN crouch input during sprint THEN the MovementSystem SHALL initiate slide with slideDuration and slideSpeed
2. WHEN slide ends THEN the MovementSystem SHALL transition to crouch stance
3. WHEN dive input THEN the MovementSystem SHALL launch player in aim direction with diveDistance
4. WHEN diving THEN the MovementSystem SHALL apply brief invulnerability window (iframes)
5. WHEN slide/dive on cooldown THEN the MovementSystem SHALL reject input until cooldown expires

### Requirement 9: Vault and Mantle

**User Story:** As a player, I want to fluidly traverse obstacles, so that movement feels smooth.

#### Acceptance Criteria

1. WHEN approaching waist-high obstacle while sprinting THEN the MovementSystem SHALL auto-vault with vaultTime
2. WHEN approaching chest-high obstacle THEN the MovementSystem SHALL prompt mantle with mantleTime
3. WHEN mantling THEN the MovementSystem SHALL block firing until animation completes
4. WHEN vault/mantle fails (blocked) THEN the MovementSystem SHALL play rejection feedback
5. WHEN obstacle height exceeds maxMantleHeight THEN the MovementSystem SHALL reject mantle attempt

### Requirement 10: Lean and Peek

**User Story:** As a player, I want to peek around corners with minimal exposure, so that cover is tactically useful.

#### Acceptance Criteria

1. WHEN lean input while stationary THEN the CoverSystem SHALL tilt camera and hitbox by leanAngle
2. WHEN leaning THEN the CoverSystem SHALL reduce accuracy by leanAccuracyPenalty
3. WHEN near cover edge THEN the CoverSystem SHALL enable contextual peek prompt
4. WHEN peeking THEN the CoverSystem SHALL expose only head and weapon arm hitboxes
5. WHEN taking damage while leaning THEN the CoverSystem SHALL force return to neutral stance

### Requirement 11: Per-Surface Footsteps

**User Story:** As a player, I want footsteps to sound different on different surfaces, so that audio provides tactical information.

#### Acceptance Criteria

1. WHEN walking on concrete THEN the AudioSystem SHALL play concrete footstep samples
2. WHEN walking on metal THEN the AudioSystem SHALL play metal footstep samples with higher volume
3. WHEN walking on grass/dirt THEN the AudioSystem SHALL play soft footstep samples
4. WHEN walking on water THEN the AudioSystem SHALL play splash samples
5. WHEN crouched THEN the AudioSystem SHALL reduce footstep volume by crouchVolumeMultiplier

### Requirement 12: Weapon Audio with Environment

**User Story:** As a player, I want weapons to sound different indoors vs outdoors, so that audio feels realistic.

#### Acceptance Criteria

1. WHEN firing indoors THEN the AudioSystem SHALL apply indoor reverb and reflection
2. WHEN firing outdoors THEN the AudioSystem SHALL apply outdoor tail with distance falloff
3. WHEN firing in enclosed space THEN the AudioSystem SHALL boost low frequencies
4. WHEN distant gunfire occurs THEN the AudioSystem SHALL apply distance filtering and delay
5. WHEN suppressor equipped THEN the AudioSystem SHALL use suppressed audio samples

### Requirement 13: Audio Occlusion

**User Story:** As a player, I want sounds to be muffled through walls, so that audio provides spatial awareness.

#### Acceptance Criteria

1. WHEN sound source is behind wall THEN the AudioSystem SHALL apply occlusion filter
2. WHEN sound source is around corner THEN the AudioSystem SHALL apply partial occlusion
3. WHEN line of sight is clear THEN the AudioSystem SHALL play unoccluded audio
4. WHEN multiple walls between source and listener THEN the AudioSystem SHALL stack occlusion
5. WHEN door is open vs closed THEN the AudioSystem SHALL adjust occlusion accordingly
