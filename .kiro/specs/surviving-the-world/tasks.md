# Implementation Plan: Surviving The World™

**Architecture:** Lightweight 3D Hybrid (Valheim + Project Zomboid style)
**Priority:** Simulation depth over photorealism — enables 500+ NPCs, 10-year lifespan, mod-friendly

**Note:** This plan implements the GTA-grade Enemy AI Stack, Agentic NPC Intelligence, Faction Heat Systems, Player Progression, and Replayability Engine optimized for the lightweight 3D approach.

## Phase 1: Core Foundation (3-5 weeks)

- [ ] 1. Project setup and data infrastructure
  - [ ] 1.1 Initialize TypeScript project with build system
    - Set up webpack/rollup, ESLint, Prettier
    - Create directory structure: `/src/core`, `/src/ai`, `/src/systems`, `/src/data`
    - Install Jest and fast-check for testing
    - _Requirements: 1.1, 1.2_

  - [ ] 1.2 Implement DataLoader with JSON parsing and validation
    - Create era data schema with required fields
    - Implement hot reload support
    - Add detailed error messages for invalid data
    - _Requirements: 1.2, 1.4, 1.5_

  - [ ]* 1.3 Write property test for era data loading
    - **Property 2: Era data loading integrity**
    - **Validates: Requirements 1.2**

- [ ] 2. World State Manager implementation
  - [ ] 2.1 Create WorldState data structure
    - Implement time advancement (0-24 hours, day count)
    - Add weather system with state transitions
    - Create region management with faction territories
    - _Requirements: 6.2, 14.3_

  - [ ]* 2.2 Write property test for region streaming
    - **Property 15: Region streaming consistency**
    - **Validates: Requirements 6.1**

- [ ] 3. Player survival systems
  - [ ] 3.1 Implement PlayerStats with decay system
    - Track health, stamina, hunger, thirst, temperature, infection, morale
    - Implement configurable decay rates
    - Add threshold penalties
    - _Requirements: 14.1, 14.2_

  - [ ]* 3.2 Write property test for stat decay
    - **Property 30: Stat decay over time**
    - **Validates: Requirements 14.2**

- [ ] 4. Inventory system
  - [ ] 4.1 Implement inventory with weight and durability
    - Create item stacking for resources
    - Add encumbrance calculation and penalties
    - Implement durability tracking
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [ ]* 4.2 Write property tests for inventory
    - **Property 34: Encumbrance penalty application**
    - **Property 35: Durability reduction on use**
    - **Validates: Requirements 16.2, 16.3**

- [ ] 5. Checkpoint - Core systems functional
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Enemy AI Core (6-8 weeks)

- [ ] 6. Perception Layer implementation
  - [ ] 6.1 Create PerceptionLayer class
    - Implement sight cone and hearing radius
    - Add memory of last known positions
    - Create detection probability calculation
    - _Requirements: 2.1, 2.4, 2.5_

  - [ ] 6.2 Implement perception modifiers
    - Add weather effects on detection (fog, rain)
    - Add time of day effects on sight
    - Add player noise level tracking
    - _Requirements: 2.2, 2.3_

  - [ ]* 6.3 Write property tests for perception
    - **Property 3: Perception state initialization**
    - **Property 4: Weather affects perception**
    - **Property 5: Time of day affects sight**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ] 7. Enemy Behavior Tree implementation
  - [ ] 7.1 Create EnemyBehaviorTree class
    - Implement state machine: Idle → Aware → Engage → Retreat → Surrender
    - Add engage sub-states: Cover, Flank, Suppress
    - Create state transition logic
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 7.2 Implement morale-based transitions
    - Add morale threshold checking
    - Implement retreat and surrender logic
    - Add faction doctrine influence
    - _Requirements: 3.4, 3.5_

  - [ ]* 7.3 Write property tests for behavior tree
    - **Property 6: Behavior tree state validity**
    - **Property 7: Detection triggers state transition**
    - **Property 8: Morale threshold triggers retreat**
    - **Validates: Requirements 3.1, 3.2, 3.4**

- [ ] 8. Basic combat system
  - [ ] 8.1 Implement CombatSystem class
    - Create melee combat (light/heavy attacks, blocks, dodges)
    - Add ranged combat (bows, firearms, thrown)
    - Implement damage calculation with injuries
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ]* 8.2 Write property test for combat
    - **Property 29: Damage calculation produces valid injuries**
    - **Validates: Requirements 13.3**

- [ ] 9. Checkpoint - Enemy AI basics functional
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Agentic Intelligence (8-10 weeks)

- [ ] 10. Micro-Agent System implementation
  - [ ] 10.1 Create MicroAgentSystem class
    - Implement Aggression Agent with context evaluation
    - Implement Tactics Agent with behavior selection
    - Implement Perception Agent
    - Implement Morale Agent with panic/surrender logic
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 10.2 Implement conflict resolution
    - Create weighted priority resolution
    - Add combat context influence
    - _Requirements: 4.5_

  - [ ]* 10.3 Write property tests for micro-agents
    - **Property 9: Micro-agent initialization completeness**
    - **Property 10: Aggression agent context sensitivity**
    - **Property 11: Micro-agent conflict resolution determinism**
    - **Validates: Requirements 4.1, 4.2, 4.5**

- [ ] 11. Enemy Coordinator Agent (ECA) implementation
  - [ ] 11.1 Create EnemyCoordinatorAgent class
    - Implement squad creation and role assignment
    - Add player skill assessment
    - Create difficulty adaptation
    - _Requirements: 5.1, 5.2_

  - [ ] 11.2 Implement squad tactics
    - Create flanking route planning
    - Add friendly fire avoidance
    - Implement reinforcement calling
    - _Requirements: 5.3, 5.4_

  - [ ] 11.3 Implement player prediction
    - Track player tactics history
    - Create counter-strategy selection
    - _Requirements: 5.5_

  - [ ]* 11.4 Write property tests for ECA
    - **Property 12: Squad role assignment completeness**
    - **Property 13: Difficulty adaptation responsiveness**
    - **Property 14: Flanking route safety**
    - **Validates: Requirements 5.1, 5.2, 5.4**

- [ ] 12. Agentic NPC System implementation
  - [ ] 12.1 Create AgenticNPCSystem class
    - Implement Needs Engine
    - Implement Utility Decision Engine
    - Implement Memory Engine
    - _Requirements: 7.1, 7.2_

  - [ ] 12.2 Implement Social Intelligence
    - Create rumor spreading system
    - Add trust evaluation
    - Implement collective decision participation
    - _Requirements: 7.3, 7.4, 7.5_

  - [ ]* 12.3 Write property tests for NPC intelligence
    - **Property 17: NPC intelligence engine initialization**
    - **Property 18: Interaction memory recording**
    - **Property 19: Rumor propagation through networks**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [ ] 13. Checkpoint - Agentic AI functional
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Faction AI Expansion (6-8 weeks)

- [ ] 14. Faction Heat System implementation
  - [ ] 14.1 Create FactionHeatSystem class
    - Implement heat level tracking
    - Add escalation tier transitions
    - Create cooldown mechanics
    - _Requirements: 8.1, 8.2_

  - [ ] 14.2 Implement escalation responses
    - Add patrol intensity adjustment
    - Create bounty hunter spawning
    - Implement revenge mission planning
    - _Requirements: 8.2_

  - [ ]* 14.3 Write property tests for heat system
    - **Property 20: Heat level increases on hostile actions**
    - **Property 21: Escalation tier transitions at thresholds**
    - **Validates: Requirements 8.1, 8.2**

- [ ] 15. Faction GOAP System enhancement
  - [ ] 15.1 Enhance FactionGOAPSystem
    - Implement army raising
    - Add raid launching
    - Create diplomacy execution
    - _Requirements: 8.4_

  - [ ] 15.2 Implement faction alliance effects
    - Add automatic guard defense for allies
    - Create enemy prioritization of allied players
    - Implement trade route value shifts
    - _Requirements: 8.3, 8.5_


## Phase 5: Dynamic World & Quests (6-8 weeks)

- [ ] 16. Player Progression System
  - [ ] 16.1 Create PlayerProgressionSystem class
    - Implement stat gain from actions (running, hunting, trading, crafting)
    - Add unlock threshold checking
    - Create progression bonuses application
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 16.2 Write property tests for progression
    - **Property 22: Stat gains from actions**
    - **Property 23: Unlock triggers at thresholds**
    - **Validates: Requirements 9.1, 9.5**

- [ ] 17. Economy Triangle System
  - [ ] 17.1 Create EconomyTriangleSystem class
    - Implement crafting impact on village wealth
    - Add supply/demand calculation
    - Create price calculation with trust factor
    - _Requirements: 10.1, 10.3, 10.4_

  - [ ] 17.2 Implement building and trade effects
    - Add building bonuses (tech unlock, stat bonuses)
    - Create trade route management
    - Implement faction war price impacts
    - _Requirements: 10.2, 10.5_

  - [ ]* 17.3 Write property tests for economy
    - **Property 24: Crafting affects economy**
    - **Property 25: Price reflects supply and demand**
    - **Validates: Requirements 10.1, 10.3**

- [ ] 18. World-Generated Quest System
  - [ ] 18.1 Create WorldQuestGenerator class
    - Implement quest trigger evaluation
    - Add quest generation from templates
    - Create quest outcome application
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 18.2 Write property test for quest generation
    - **Property 26: Quest generation from world conditions**
    - **Validates: Requirements 11.1**

- [ ] 19. World Streaming System
  - [ ] 19.1 Create WorldStreamingSystem class
    - Implement region loading/unloading
    - Add faction territory management
    - Create patrol route and ambush point data
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 19.2 Write property test for territories
    - **Property 16: Faction territory integrity**
    - **Validates: Requirements 6.2**

- [ ] 20. Checkpoint - Dynamic world functional
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Replayability Engine (4-6 weeks)

- [ ] 21. Replayability Engine implementation
  - [ ] 21.1 Create ReplayabilityEngine class
    - Implement world seed generation
    - Add procedural squad generation
    - Create player pattern tracking
    - _Requirements: 12.1, 12.4_

  - [ ] 21.2 Implement enemy evolution
    - Add tactical adaptation based on patterns
    - Create counter-strategy selection
    - Implement difficulty progression
    - _Requirements: 12.2, 12.3_

  - [ ] 21.3 Implement world modifiers
    - Add daily/weekly/seasonal modifiers
    - Create modifier effect application
    - _Requirements: 12.3_

  - [ ]* 21.4 Write property tests for replayability
    - **Property 27: Procedural squad generation validity**
    - **Property 28: Enemy evolution from player patterns**
    - **Validates: Requirements 12.1, 12.2**

- [ ] 22. Save System with persistence
  - [ ] 22.1 Implement comprehensive save system
    - Serialize all game state (world, player, factions, NPCs, quests)
    - Add faction memory persistence
    - Create player-impact history tracking
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 22.2 Write property tests for save system
    - **Property 32: Save/load round-trip integrity**
    - **Property 33: Faction memory persistence**
    - **Validates: Requirements 15.1, 15.3**

- [ ] 23. Modding support
  - [ ] 23.1 Implement mod loading system
    - Create mod data pack structure
    - Add mod validation and conflict detection
    - Implement mod data merging
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [ ]* 23.2 Write property test for mod loading
    - **Property 36: Mod data loading and merging**
    - **Validates: Requirements 19.1**

- [ ] 24. Checkpoint - Replayability functional
  - Ensure all tests pass, ask the user if questions arise.

## Phase 7: Integration & Polish

- [ ] 25. Full system integration
  - [ ] 25.1 Wire all systems in main game loop
    - Implement update order: Environment → NPCs → Enemies → Player → Factions → World State
    - Create event bus for cross-system communication
    - Add performance monitoring
    - _Requirements: 1.1_

  - [ ]* 25.2 Write property test for game loop
    - **Property 1: Game loop phase ordering**
    - **Validates: Requirements 1.1**

- [ ] 26. Weather effects integration
  - [ ] 26.1 Implement weather system effects
    - Connect weather to perception modifiers
    - Add weather effects on survival stats
    - Create weather-based enemy behavior changes
    - _Requirements: 14.3, 14.4_

  - [ ]* 26.2 Write property test for weather
    - **Property 31: Weather effects application**
    - **Validates: Requirements 14.3**

- [ ] 27. Tech tree system
  - [ ] 27.1 Implement TechTreeSystem
    - Create tech dependencies and unlocks
    - Add recipe and building unlocks
    - Implement faction capability updates
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 28. Create Late Medieval era content
  - Define 3 factions with heat configurations
  - Create 50+ items with traits
  - Define 20+ crafting recipes
  - Create 10+ NPC templates with agentic intelligence
  - Define enemy AI configurations for each faction
  - Create 5+ quest templates with world triggers
  - _Requirements: All content requirements_

- [ ] 29. Final checkpoint - All systems integrated
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 30. End-to-end gameplay validation
  - Test Day 1-5 survival phase
  - Test Day 5-10 faction contact phase
  - Test Day 10-20 trade and quest phase
  - Test Day 20-40 world reaction phase
  - Test Day 40+ sandbox simulation
  - Verify enemy AI adapts to player tactics
  - Verify faction heat escalation works
  - Verify replayability produces unique runs
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [ ] 31. Performance optimization (Lightweight 3D Hybrid)
  - Implement aggressive AI LOD for 500+ NPC support
  - Add spatial partitioning (quadtree) for efficient queries
  - Optimize behavior tree evaluation with caching
  - Add object pooling for NPCs, enemies, projectiles
  - Implement simulation budget allocation (60% AI, 25% world, 15% render)
  - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [ ] 32. Multiplayer foundation
  - Implement dedicated server architecture
  - Add state synchronization for 32+ players
  - Create client-side prediction
  - Implement authoritative server validation
  - _Requirements: 18.5_

- [ ] 33. Modding system completion
  - Create mod workshop integration
  - Implement Lua scripting sandbox
  - Add asset override system
  - Create mod conflict resolution
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 34. Final checkpoint - Production ready
  - All 36 property tests passing
  - Performance targets met (60 FPS, 500+ NPCs)
  - Dedicated server tested with 32 players
  - Save/load verified
  - Mod loading verified
  - Ensure all tests pass, ask the user if questions arise.

