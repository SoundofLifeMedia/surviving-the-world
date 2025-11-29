# Implementation Plan: Enterprise 100% AAA Parity

## Phase 1: Cover System Core

- [x] 1. Implement CoverSystem foundation
  - [x] 1.1 Create CoverSystem.ts with CoverPoint and CoverState interfaces
    - Define all interfaces from design document
    - Create CoverSystem class with state management
    - Implement cover point registration and lookup
    - _Requirements: 1.1, 1.2_
  - [ ]* 1.2 Write property test for cover damage reduction
    - **Property 1: Cover Damage Reduction**
    - **Validates: Requirements 1.2**
  - [x] 1.3 Implement enterCover and exitCover methods
    - Snap player to cover position
    - Update player state to inCover
    - Handle cover side (left/right) based on approach angle
    - _Requirements: 1.1_
  - [x] 1.4 Implement peek and stopPeek methods
    - Transition to peek state exposing player
    - Return to full cover on stopPeek
    - _Requirements: 1.3, 1.4_
  - [ ]* 1.5 Write property test for peek state transitions
    - **Property 2: Peek State Transitions**
    - **Validates: Requirements 1.3, 1.4**

- [x] 2. Implement cover combat mechanics
  - [x] 2.1 Implement blindFire method with accuracy penalty
    - Apply 50% accuracy reduction
    - Integrate with WeaponSystemGTA
    - _Requirements: 1.5_
  - [ ]* 2.2 Write property test for blind fire accuracy
    - **Property 3: Blind Fire Accuracy Penalty**
    - **Validates: Requirements 1.5**
  - [x] 2.3 Implement calculateDamageReduction method
    - 50% for soft cover, 90% for hard cover
    - Check damage direction against cover normal
    - _Requirements: 1.2_
  - [x] 2.4 Implement destructible cover with damageCover method
    - Track cover health
    - Destroy cover at 0 health
    - Force player exit on destruction
    - _Requirements: 1.6_
  - [ ]* 2.5 Write property test for cover destruction
    - **Property 4: Cover Destruction Forces Exit**
    - **Validates: Requirements 1.6**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Cover-to-Cover Movement

- [x] 4. Implement cover transitions
  - [x] 4.1 Implement findNearestCover spatial query
    - Search within maxDistance radius
    - Return closest valid cover point
    - _Requirements: 2.1_
  - [x] 4.2 Implement getValidTransitionTargets
    - Find cover points within 10m in aim direction
    - Filter by line-of-sight validity
    - _Requirements: 2.1, 2.2_
  - [x] 4.3 Implement initiateTransition method
    - Start cover-to-cover movement
    - Track transition progress
    - Apply 25% damage reduction during transition
    - _Requirements: 2.2, 2.3_
  - [ ]* 4.4 Write property test for transition damage reduction
    - **Property 5: Cover Transition Damage Reduction**
    - **Validates: Requirements 2.3**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Advanced Movement - Slide

- [x] 6. Implement slide mechanics
  - [x] 6.1 Create AdvancedMovementSystem.ts with interfaces
    - Define MovementState and Obstacle interfaces
    - Create AdvancedMovementSystem class
    - _Requirements: 3.1_
  - [x] 6.2 Implement canSlide stamina check
    - Return false if stamina < 20%
    - _Requirements: 3.5_
  - [ ]* 6.3 Write property test for slide stamina gate
    - **Property 7: Slide Stamina Gate**
    - **Validates: Requirements 3.5**
  - [x] 6.4 Implement initiateSlide method
    - Set slide velocity to 80% of sprint velocity
    - Start 0.8 second slide timer
    - _Requirements: 3.1, 3.2_
  - [ ]* 6.5 Write property test for slide velocity
    - **Property 6: Slide Velocity Conservation**
    - **Validates: Requirements 3.2**
  - [x] 6.6 Implement updateSlide with deceleration
    - Gradual velocity reduction over slide duration
    - Transition to crouch at end
    - Auto-enter cover if near cover point
    - _Requirements: 3.3, 3.4_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Advanced Movement - Vault/Mantle

- [x] 8. Implement vault and mantle mechanics
  - [x] 8.1 Implement detectObstacle method
    - Raycast forward to detect obstacles
    - Measure obstacle height
    - _Requirements: 4.1_
  - [x] 8.2 Implement canVault and canMantle classification
    - Vault: 0.5m - 1.2m height
    - Mantle: 1.2m - 2.0m height
    - Impassable: > 2.0m
    - _Requirements: 4.1, 4.4, 4.5_
  - [ ]* 8.3 Write property test for obstacle classification
    - **Property 8: Obstacle Traversal Classification**
    - **Validates: Requirements 4.1, 4.4, 4.5**
  - [x] 8.4 Implement initiateVault (0.5s duration)
    - Set vaulting state
    - Player vulnerable during vault
    - _Requirements: 4.2, 4.3_
  - [x] 8.5 Implement initiateMantle (1.0s duration)
    - Set mantling state
    - Player vulnerable during mantle
    - _Requirements: 4.4_
  - [ ]* 8.6 Write property test for vault vulnerability
    - **Property 9: Vault Vulnerability**
    - **Validates: Requirements 4.3**

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Pursuit AI Core

- [x] 10. Implement PursuitAI foundation
  - [x] 10.1 Create PursuitAI.ts with interfaces
    - Define PursuitVehicle, Roadblock, PursuitState interfaces
    - Create PursuitAI class
    - _Requirements: 5.1_
  - [x] 10.2 Implement spawnPursuitVehicle by wanted level
    - Level 2: patrol cars
    - Level 3: interceptors
    - Level 4+: SWAT vehicles
    - _Requirements: 5.1, 5.2_
  - [ ]* 10.3 Write property test for pursuit escalation
    - **Property 10: Pursuit Escalation Thresholds**
    - **Validates: Requirements 5.1, 5.2, 6.1**
  - [x] 10.4 Integrate with WantedSystem5Star
    - Listen for wanted level changes
    - Trigger appropriate spawns
    - _Requirements: 5.1_

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Pursuit Tactics

- [x] 12. Implement pursuit tactical behaviors
  - [x] 12.1 Implement attemptPIT method
    - Check distance (within 5m)
    - 30% success rate
    - Apply spin-out physics on success
    - _Requirements: 5.3_
  - [ ]* 12.2 Write property test for PIT distance gate
    - **Property 11: PIT Maneuver Distance Gate**
    - **Validates: Requirements 5.3**
  - [x] 12.3 Implement spawnRoadblock method
    - Predict player path
    - Position vehicles to block
    - _Requirements: 5.2_
  - [x] 12.4 Implement handleVehicleDisabled
    - Officers exit vehicles
    - Switch to on-foot pursuit
    - _Requirements: 5.4_
  - [x] 12.5 Implement handleLOSBreak with search timer
    - Track time out of sight
    - Transition to search after 10 seconds
    - _Requirements: 5.5_
  - [ ]* 12.6 Write property test for LOS break search
    - **Property 12: LOS Break Search Transition**
    - **Validates: Requirements 5.5**

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 7: Helicopter Pursuit

- [x] 14. Implement helicopter pursuit
  - [x] 14.1 Implement spawnHelicopter method
    - Spawn at wanted level 4+
    - Position above player
    - _Requirements: 6.1_
  - [x] 14.2 Implement updateHelicopterTracking
    - Track player position
    - Relay to ground units
    - _Requirements: 6.2_
  - [x] 14.3 Implement tracking loss in covered areas
    - Detect tunnel/parking structure
    - Disable tracking while inside
    - _Requirements: 6.3_
  - [ ]* 14.4 Write property test for helicopter tracking loss
    - **Property 13: Helicopter Tracking Loss in Cover**
    - **Validates: Requirements 6.3**
  - [x] 14.5 Implement helicopter retreat on damage
    - Track helicopter health
    - Force retreat at low health
    - _Requirements: 6.4_

- [x] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 8: Serialization & Integration

- [x] 16. Implement serialization
  - [x] 16.1 Implement CoverSystem serialize/deserialize
    - Save all cover point states
    - Save destruction status
    - _Requirements: 7.1, 7.2_
  - [ ]* 16.2 Write property test for serialization round-trip
    - **Property 14: Cover System Serialization Round-Trip**
    - **Validates: Requirements 7.1, 7.2, 7.3**
  - [x] 16.3 Integrate with SaveLoadSystem
    - Add cover state to save data
    - Add pursuit state to save data
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 17. System integration
  - [x] 17.1 Wire CoverSystem to PlayerSystem
    - Add cover state to player
    - Handle cover input actions
  - [x] 17.2 Wire AdvancedMovementSystem to PlayerSystem
    - Add movement state to player
    - Handle slide/vault inputs
  - [x] 17.3 Wire PursuitAI to WantedSystem5Star
    - Trigger pursuits on wanted level changes
    - Coordinate with existing heat system
  - [x] 17.4 Wire CoverSystem to CombatSystem
    - Apply damage reduction in combat calculations
    - Handle blind fire accuracy

- [x] 18. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
