# Implementation Plan: GTA-Style AAA Upgrade

## Phase 1: Core Shooting Mechanics

- [ ] 1. Implement Weapon System
  - [ ] 1.1 Create WeaponSystem.ts with weapon database and fire mechanics
    - Define Weapon interface with all properties (damage, fireRate, spread, recoil)
    - Implement fire() method with hit detection and damage calculation
    - Implement reload() with timing and animation states
    - _Requirements: 2.1, 2.2, 2.4_
  - [ ]* 1.2 Write property test for weapon damage bounds
    - **Property 1: Weapon Damage Bounds**
    - **Validates: Requirements 2.3**
  - [ ] 1.3 Implement hit location damage multipliers
    - Head = 3x, Torso = 1x, Limbs = 0.5x damage
    - _Requirements: 2.3_
  - [ ]* 1.4 Write property test for hit location multipliers
    - **Property 12: Hit Location Damage Multipliers**
    - **Validates: Requirements 2.3**
  - [ ] 1.5 Implement recoil system with weapon-specific patterns
    - Apply recoil vector after each shot
    - Reset recoil over time when not firing
    - _Requirements: 2.1_

- [ ] 2. Implement Cover System
  - [ ] 2.1 Create CoverSystem.ts with cover point detection
    - Define CoverPoint interface (position, normal, height, destructible)
    - Implement findNearestCover() using spatial queries
    - _Requirements: 2.6_
  - [ ] 2.2 Implement cover entry/exit mechanics
    - Snap player to cover position
    - Handle peek and blind fire states
    - _Requirements: 2.6_
  - [ ]* 2.3 Write property test for cover damage reduction
    - **Property 7: Cover Damage Reduction**
    - **Validates: Requirements 2.6**

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Vehicle System

- [ ] 4. Implement Vehicle Physics
  - [ ] 4.1 Create VehicleSystem.ts with vehicle database
    - Define Vehicle interface (mass, enginePower, maxSpeed, handling)
    - Implement vehicle spawning and registration
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 4.2 Implement vehicle physics simulation
    - Acceleration based on power-to-weight ratio
    - Ackermann steering geometry
    - Friction and drag forces
    - _Requirements: 3.2, 3.3_
  - [ ]* 4.3 Write property test for vehicle physics conservation
    - **Property 2: Vehicle Physics Conservation**
    - **Validates: Requirements 3.4**
  - [ ] 4.4 Implement vehicle damage system
    - Collision damage calculation
    - Performance degradation based on damage
    - Explosion at 0 health
    - _Requirements: 3.4, 3.5_
  - [ ] 4.5 Implement vehicle entry/exit
    - Player transition animations
    - Ragdoll on exit from moving vehicle
    - _Requirements: 3.1, 3.6_
  - [ ]* 4.6 Write property test for vehicle entry timing
    - **Property 8: Vehicle Entry/Exit Timing**
    - **Validates: Requirements 3.1**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Wanted System (5-Star)

- [ ] 6. Implement 5-Star Wanted System
  - [ ] 6.1 Create WantedSystem5Star.ts extending existing HeatSystem
    - Define WantedLevel type (0-5)
    - Define CrimeType with heat values
    - Define PoliceResponse per level
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 6.2 Write property test for wanted level bounds
    - **Property 3: Wanted Level Bounds**
    - **Validates: Requirements 4.1, 4.2**
  - [ ] 6.3 Implement police response spawning
    - Spawn patrol units at level 1-2
    - Add helicopters and roadblocks at level 3
    - Add SWAT and military at level 4-5
    - _Requirements: 4.2, 4.3, 4.4_
  - [ ]* 6.4 Write property test for police response scaling
    - **Property 4: Police Response Scaling**
    - **Validates: Requirements 4.2, 4.3, 4.4**
  - [ ] 6.5 Implement evasion mechanics
    - Track time out of sight
    - Reduce wanted level after N*60 seconds
    - _Requirements: 4.5_
  - [ ]* 6.6 Write property test for evasion timer scaling
    - **Property 11: Evasion Timer Scaling**
    - **Validates: Requirements 4.5**

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Open World Population

- [ ] 8. Implement NPC Traffic System
  - [ ] 8.1 Create NPCTrafficSystem.ts for pedestrian spawning
    - Define Pedestrian interface with personality and schedule
    - Implement spawn/despawn based on player distance
    - Maintain 50-100 NPCs in populated areas
    - _Requirements: 5.1, 5.4_
  - [ ]* 8.2 Write property test for NPC population bounds
    - **Property 5: NPC Population Bounds**
    - **Validates: Requirements 5.1**
  - [ ] 8.3 Implement traffic vehicle spawning
    - Spawn vehicles on roads following traffic rules
    - Implement basic traffic AI (stop at lights, avoid collisions)
    - _Requirements: 5.2_
  - [ ] 8.4 Implement NPC reactions
    - Witness system for crimes
    - Flee, cower, or fight responses based on personality
    - _Requirements: 5.3, 5.5_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Weapon Arsenal & Combat Polish

- [ ] 10. Expand Weapon Arsenal
  - [ ] 10.1 Add all 15+ weapons to database
    - 3 pistols, 2 SMGs, 3 rifles, 2 shotguns, 2 snipers, 3 explosives
    - _Requirements: 6.1_
  - [ ] 10.2 Implement weapon switching
    - Category-based weapon slots
    - 500ms switch animation
    - _Requirements: 6.2_
  - [ ]* 10.3 Write property test for weapon switch timing
    - **Property 6: Weapon Switch Timing**
    - **Validates: Requirements 6.2**
  - [ ] 10.4 Implement explosive weapons
    - Area damage with distance falloff
    - Destructible environment interaction
    - _Requirements: 6.3_
  - [ ] 10.5 Implement melee combat
    - Light attack, heavy attack, counter mechanics
    - _Requirements: 6.4_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Player Controller & Camera

- [ ] 12. Implement Third-Person Controller
  - [ ] 12.1 Create PlayerController3D.ts
    - 8-directional movement with acceleration/deceleration
    - Sprint with stamina consumption
    - Jump with physics arc
    - _Requirements: 1.1, 1.2, 1.5_
  - [ ] 12.2 Implement camera system
    - Third-person follow camera
    - Over-the-shoulder aim mode (200ms transition)
    - Cinematic idle rotation
    - _Requirements: 1.3, 1.4_
  - [ ] 12.3 Implement state machine
    - States: onFoot, inVehicle, aiming, cover, ragdoll, swimming
    - Smooth transitions between states
    - _Requirements: 1.1-1.5_

## Phase 7: Mission System

- [ ] 13. Implement GTA-Style Missions
  - [ ] 13.1 Create MissionSystem.ts with mission structure
    - Mission triggers, objectives, checkpoints
    - Briefing and HUD integration
    - _Requirements: 8.1, 8.2_
  - [ ] 13.2 Implement mission flow
    - Objective tracking and completion
    - Checkpoint save/restore on failure
    - _Requirements: 8.2, 8.3_
  - [ ] 13.3 Implement rewards system
    - Money, XP, and unlock grants on completion
    - _Requirements: 8.4_

## Phase 8: Audio & Polish

- [ ] 14. Implement Audio System
  - [ ] 14.1 Create AudioSystem.ts with 3D positional audio
    - Weapon sounds with distance falloff
    - Vehicle engine sounds
    - _Requirements: 9.2_
  - [ ] 14.2 Implement radio system
    - Selectable stations in vehicles
    - _Requirements: 9.1_
  - [ ] 14.3 Implement ambient audio
    - Location-based soundscapes
    - NPC voice lines
    - _Requirements: 9.3, 9.4_

## Phase 9: Save/Load & Serialization

- [ ] 15. Upgrade Save System
  - [ ] 15.1 Extend SaveLoadSystem for new systems
    - Serialize weapon inventory and ammo
    - Serialize vehicle states
    - Serialize wanted level and police state
    - _Requirements: 10.1, 10.2_
  - [ ]* 15.2 Write property test for save/load round-trip
    - **Property 10: Save/Load Round-Trip**
    - **Validates: Requirements 10.3**

- [ ] 16. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 10: Integration & Demo

- [ ] 17. Create Playable Demo
  - [ ] 17.1 Create demo scene with all systems integrated
    - Small city block with NPCs and traffic
    - Weapon pickups and vehicles
    - 3-star wanted level scenario
  - [ ] 17.2 Create demo mission
    - Bank heist with getaway vehicle
    - Police chase sequence
    - Multiple objectives and checkpoints
  - [ ] 17.3 Performance optimization pass
    - Ensure 60 FPS with full population
    - Memory profiling and leak fixes
