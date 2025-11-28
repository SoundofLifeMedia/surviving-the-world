# Requirements Document: Surviving The World™

## Introduction

Surviving The World™ (STW) is a **lightweight 3D hybrid survival simulation** (Valheim + Project Zomboid + RimWorld AI style) featuring GTA-grade enemy intelligence, agentic NPC behavior, and deep simulation systems. The game prioritizes **simulation depth over photorealism**, enabling 500+ active NPCs, 10-year content lifespan through modding, and massive replayability.

Built in TypeScript as a fully modular simulation engine, STW delivers living world simulation where every enemy, NPC, and faction operates with autonomous intelligence. The lightweight 3D approach enables complex AI systems that would choke photorealistic engines.

This document defines the canonical requirements for the STW engine, incorporating GTA V-level enemy combat logic, agentic micro-agent AI, procedural world generation, seamless co-op multiplayer, and long-term replayability systems.

## Glossary

- **Era**: A distinct time period (e.g., Late Medieval, Cyberpunk) defined by data configurations
- **Faction**: An organized group with resources, goals, AI personality, and GOAP-driven behavior
- **World State**: Global simulation state including time, weather, factions, regions, threat levels, and heat systems
- **NPC Agent**: AI-driven character with needs, memory, personality, social intelligence, and micro-agent decision-making
- **Enemy AI Stack**: Four-layer intelligence system (Perception, Behavior Tree, Micro-agents, Enemy Coordinator)
- **Micro-agent**: Internal AI component (Aggression, Tactics, Perception, Morale) that produces adaptive behavior
- **Enemy Coordinator Agent (ECA)**: Squad-level brain that coordinates tactics, assigns roles, and adapts difficulty
- **GOAP (Goal-Oriented Action Planning)**: AI planning system for faction and NPC decision-making
- **Utility AI**: AI system that evaluates and selects actions based on weighted utility scores
- **Heat System**: GTA-style escalation tracking for faction response to player actions
- **Perception Layer**: Enemy awareness system tracking sight, sound, memory, and last known positions
- **Behavior Tree**: Hierarchical decision structure for enemy combat states
- **Condition System**: Unified system for periodic effects (weather, disease, buffs, debuffs)
- **Dynamic Quest**: Template-driven quest generated based on world state and context
- **Replayability Engine**: System ensuring procedural variation, enemy evolution, and unique playthroughs
- **Player Progression Stats**: RPG-lite stats that increase through gameplay actions

## Requirements

### Requirement 1: Core Game Loop and Data System

**User Story:** As a game designer, I want a data-driven game loop that loads eras from JSON, so that new content can be added without code changes.

#### Acceptance Criteria

1. WHEN the game initializes THEN the Engine SHALL execute the loop: LOAD → INIT → SIMULATE (world, npc, factions, player) → RENDER → SAVE → LOOP
2. WHEN an era is loaded THEN the Engine SHALL read all configuration from JSON era packs including factions, items, NPCs, and events
3. WHEN the game runs THEN the Engine SHALL support modular NPC behavior trees, faction GOAP, survival stats, crafting, weather, and building systems
4. WHEN data files are modified THEN the Engine SHALL support hot reload without restarting the game
5. WHEN validating data THEN the Engine SHALL check for required fields, valid references, and provide detailed error messages

### Requirement 2: Enemy AI Stack - Layer 1: Perception System

**User Story:** As a player, I want enemies that perceive the world realistically through sight, sound, and memory, so that stealth and tactics matter.

#### Acceptance Criteria

1. WHEN an enemy exists THEN the Perception Layer SHALL track sight cone, hearing radius, and memory of last known player positions
2. WHEN weather conditions change THEN the Perception Layer SHALL modify detection ranges (fog reduces sight, rain masks sound)
3. WHEN time of day changes THEN the Perception Layer SHALL adjust sight ranges (night reduces visibility)
4. WHEN the player makes noise THEN the Perception Layer SHALL alert enemies within hearing radius based on noise level
5. WHEN an enemy loses sight of the player THEN the Perception Layer SHALL store last known position and search behavior duration

### Requirement 3: Enemy AI Stack - Layer 2: Behavior Tree Combat System

**User Story:** As a player, I want enemies that transition through realistic combat states, so that encounters feel dynamic and challenging.

#### Acceptance Criteria

1. WHEN an enemy is created THEN the Behavior Tree SHALL initialize with states: Idle → Aware → Engage (Cover/Flank/Suppress) → Retreat → Surrender
2. WHEN an enemy detects the player THEN the Behavior Tree SHALL transition from Idle to Aware with investigation behavior
3. WHEN an enemy confirms threat THEN the Behavior Tree SHALL transition to Engage and select tactical sub-state (Cover, Flank, or Suppress)
4. WHEN enemy morale drops below threshold THEN the Behavior Tree SHALL transition to Retreat or Surrender based on faction doctrine
5. WHEN the player disengages THEN the Behavior Tree SHALL return enemy to Aware state with heightened alertness timer

### Requirement 4: Enemy AI Stack - Layer 3: Micro-Agent Intelligence

**User Story:** As a player, I want enemies with internal decision-making agents, so that each enemy behaves adaptively and unpredictably.

#### Acceptance Criteria

1. WHEN an enemy is created THEN the system SHALL initialize four micro-agents: Aggression Agent, Tactics Agent, Perception Agent, and Morale Agent
2. WHEN the Aggression Agent evaluates THEN the enemy SHALL adjust attack frequency and risk-taking based on health, allies, and player threat level
3. WHEN the Tactics Agent evaluates THEN the enemy SHALL select behaviors: flanking, coordinated pushes, suppressive fire, or defensive positioning
4. WHEN the Morale Agent evaluates THEN the enemy SHALL produce panic states, retreats, or surrender based on casualties and combat duration
5. WHEN micro-agents conflict THEN the system SHALL resolve using weighted priority based on current combat context

### Requirement 5: Enemy AI Stack - Layer 4: Enemy Coordinator Agent (ECA)

**User Story:** As a player, I want enemy squads that coordinate tactically, so that group encounters feel intelligent and challenging.

#### Acceptance Criteria

1. WHEN multiple enemies form a squad THEN the ECA SHALL assign combat roles (pointman, flanker, suppressor, medic)
2. WHEN combat begins THEN the ECA SHALL read player skill level and adapt squad difficulty dynamically
3. WHEN the squad needs reinforcements THEN the ECA SHALL call nearby allies and coordinate arrival timing
4. WHEN planning attacks THEN the ECA SHALL coordinate flanking routes and avoid friendly fire
5. WHEN the player uses repeated tactics THEN the ECA SHALL predict player behavior and counter with appropriate responses

### Requirement 6: GTA-Grade Open World System

**User Story:** As a player, I want a dynamic open world that streams content and reacts to my presence, so that exploration feels seamless and alive.

#### Acceptance Criteria

1. WHEN the player moves through the world THEN the Engine SHALL stream terrain, buildings, and NPCs dynamically without loading screens
2. WHEN regions are defined THEN the Engine SHALL support faction territories with distinct control, patrols, and ambush points
3. WHEN time passes THEN the Engine SHALL update NPC population density and behavior patterns based on time of day
4. WHEN weather changes THEN the Engine SHALL modify enemy behavior (snow slows enemies, fog enables stealth ambushes)
5. WHEN the player's reputation changes THEN the Engine SHALL adjust NPC reactions, patrol intensity, and danger zone boundaries

### Requirement 7: Agentic NPC Intelligence System

**User Story:** As a player, I want NPCs with autonomous intelligence that remember, learn, and socialize, so that the world feels genuinely alive.

#### Acceptance Criteria

1. WHEN an NPC is created THEN the system SHALL initialize: Needs Engine, Utility Decision Engine, Memory Engine, Social Intelligence Engine, and Reputation-based behavior
2. WHEN the player interacts with an NPC THEN the Memory Engine SHALL record the interaction and influence future behavior
3. WHEN NPCs observe player actions THEN the Social Intelligence Engine SHALL spread information through NPC networks (rumors)
4. WHEN faction allegiance changes THEN NPCs SHALL update their behavior based on new faction relationships
5. WHEN village decisions occur THEN NPCs SHALL participate in collective decision-making based on personality and faction loyalty

### Requirement 8: Enhanced Faction AI with Heat System

**User Story:** As a player, I want factions that escalate responses based on my actions, so that consequences feel proportional and realistic.

#### Acceptance Criteria

1. WHEN the player commits hostile acts against a faction THEN the Heat System SHALL increase faction alert level progressively
2. WHEN heat level rises THEN the Faction AI SHALL escalate responses: increased patrols → active hunting → revenge missions
3. WHEN the player allies with a faction THEN guards SHALL defend the player automatically and enemies SHALL prioritize attacking the player
4. WHEN factions conflict THEN the GOAP system SHALL execute: raise armies, launch raids, engage diplomacy, adjust taxes, enforce patrol routes
5. WHEN the player's faction standing changes THEN trade routes SHALL shift value and prices SHALL adjust dynamically

### Requirement 9: Player Progression System (RPG-Lite)

**User Story:** As a player, I want my character to improve through actions, so that gameplay feels rewarding and progression is natural.

#### Acceptance Criteria

1. WHEN the player runs THEN the system SHALL increase stamina stat over time
2. WHEN the player hunts THEN the system SHALL increase accuracy stat over time
3. WHEN the player trades THEN the system SHALL increase charisma stat over time
4. WHEN the player crafts THEN the system SHALL increase craftsmanship stat over time
5. WHEN stats increase THEN the system SHALL unlock: better crafting recipes, higher stamina, lower hunger decay, improved health regen, better diplomacy options, and improved faction reputation gains

### Requirement 10: Crafting, Economy, and Building Triangle

**User Story:** As a player, I want interconnected crafting, economy, and building systems, so that my actions have cascading effects on the world.

#### Acceptance Criteria

1. WHEN the player crafts items THEN the system SHALL affect village wealth, local food supply, player equipment, and faction diplomacy
2. WHEN buildings are constructed THEN the system SHALL unlock tech, provide stat bonuses, enable NPC jobs, and expand simulation scope
3. WHEN economy updates THEN the system SHALL calculate real supply/demand, faction war impacts on prices, trade route availability, and weather effects on crop yields
4. WHEN merchants trade THEN the system SHALL adjust prices based on trust level, faction standing, and regional scarcity
5. WHEN the player intervenes in economy THEN the system SHALL reflect changes in regional supply, demand, and faction relationships

### Requirement 11: World-Generated Quest System

**User Story:** As a player, I want quests that emerge from world conditions, so that objectives feel organic and contextually relevant.

#### Acceptance Criteria

1. WHEN hunger levels are critical in a region THEN the Quest System SHALL generate food-related quests
2. WHEN faction war occurs THEN the Quest System SHALL generate conflict-related quests (supply runs, sabotage, diplomacy)
3. WHEN disease outbreaks occur THEN the Quest System SHALL generate medical and quarantine quests
4. WHEN bandit threats increase THEN the Quest System SHALL generate protection and elimination quests
5. WHEN player reputation reaches thresholds THEN the Quest System SHALL unlock faction-specific quest lines

### Requirement 12: Replayability Engine

**User Story:** As a player, I want each playthrough to feel unique, so that the game has long-term replay value.

#### Acceptance Criteria

1. WHEN a new game starts THEN the Replayability Engine SHALL generate procedural enemy squad compositions
2. WHEN playthroughs complete THEN the system SHALL evolve enemy tactics between runs based on player behavior patterns
3. WHEN the world initializes THEN the system SHALL apply daily/weekly world modifiers that change gameplay conditions
4. WHEN enemies encounter the player THEN predictive enemy agents SHALL adapt based on player's historical tactics
5. WHEN saves are created THEN faction memory of player actions SHALL persist, ensuring no two runs feel identical

### Requirement 13: Combat System with Injuries and Morale

**User Story:** As a player, I want tactical combat with realistic injuries and morale effects, so that encounters have weight and consequence.

#### Acceptance Criteria

1. WHEN the player attacks THEN the Combat System SHALL support light attacks, heavy attacks, blocks, and dodges for melee combat
2. WHEN using ranged weapons THEN the Combat System SHALL support bows, early firearms, and thrown weapons based on era
3. WHEN damage is dealt THEN the Combat System SHALL calculate stagger, injuries, bleeding, and limb damage
4. WHEN AI morale drops THEN enemies SHALL retreat or surrender based on faction doctrine and numbers advantage
5. WHEN combat ends THEN the system SHALL update faction relationships, NPC memories, and world state

### Requirement 14: Survival Needs and Environmental Effects

**User Story:** As a player, I want survival needs affected by environment, so that moment-to-moment gameplay is engaging and immersive.

#### Acceptance Criteria

1. WHEN the game runs THEN the system SHALL track player stats: health, stamina, hunger, thirst, body temperature, infection, and morale
2. WHEN time passes THEN the system SHALL apply decay rates based on activity, weather, and active conditions
3. WHEN weather changes THEN the system SHALL apply effects (rain reduces visibility, snow causes cold damage, fog enables stealth)
4. WHEN the player is sheltered THEN the system SHALL reduce environmental effect severity based on shelter quality
5. WHEN biomes differ THEN the system SHALL apply biome-specific threats (wildlife, disease, bandits, temperature extremes)

### Requirement 15: Save System with World Persistence

**User Story:** As a player, I want comprehensive saves that preserve the entire world state, so that I can continue my unique playthrough.

#### Acceptance Criteria

1. WHEN the player saves THEN the system SHALL serialize: world state, player data, all faction states, all NPC states, quest progress, and player choice history
2. WHEN the player loads THEN the system SHALL restore all game state without data loss or state corruption
3. WHEN saves include faction memory THEN the system SHALL preserve faction knowledge of player actions across sessions
4. WHEN saves include player-impact history THEN the system SHALL track cumulative world changes caused by player
5. WHEN autosave triggers THEN the system SHALL save automatically at configurable intervals without gameplay interruption

### Requirement 16: Inventory and Item Management

**User Story:** As a player, I want meaningful inventory management with weight and durability, so that resource decisions matter.

#### Acceptance Criteria

1. WHEN the player picks up items THEN the Inventory System SHALL add items with proper stacking for resources
2. WHEN inventory weight exceeds limit THEN the system SHALL apply movement penalties proportional to overencumbrance
3. WHEN items are used THEN the system SHALL reduce durability and remove items at zero durability
4. WHEN items have traits THEN the system SHALL store and apply trait effects (sharp, waterproof, blessed, cursed)
5. WHEN equipment is upgraded THEN the system SHALL improve item stats based on craftsmanship level and materials

### Requirement 17: Tech Tree and Progression Unlocks

**User Story:** As a player, I want technology progression that expands my capabilities, so that advancement feels rewarding.

#### Acceptance Criteria

1. WHEN tech is defined THEN the system SHALL include era-specific and global technologies with dependencies
2. WHEN the player meets unlock conditions THEN the system SHALL make technologies available for research
3. WHEN tech is unlocked THEN the system SHALL enable new recipes, buildings, items, and faction capabilities
4. WHEN displaying tech tree THEN the system SHALL show dependencies, current progress, and unlock requirements
5. WHEN tech advances THEN the system SHALL update faction capabilities and available world interactions

### Requirement 18: Performance and Streaming (Lightweight 3D Hybrid)

**User Story:** As a player, I want smooth performance with 500+ NPCs and streaming world, so that deep simulation is possible.

#### Acceptance Criteria

1. WHEN the game runs THEN the system SHALL maintain 60 FPS on mid-tier PC hardware with 500+ active NPCs using lightweight 3D rendering
2. WHEN NPCs are distant THEN the system SHALL use aggressive LOD and reduced AI update frequency to maximize NPC count
3. WHEN regions stream THEN the system SHALL load procedural terrain chunks without noticeable hitches
4. WHEN 10+ factions track state THEN the system SHALL prioritize simulation budget over rendering budget
5. WHEN dedicated servers run THEN the system SHALL support 32+ concurrent players with full AI simulation

### Requirement 19: Modding and Data Pack Support

**User Story:** As a modder, I want to create new eras and content through data files, so that the community can extend the game.

#### Acceptance Criteria

1. WHEN mods are loaded THEN the system SHALL read new data packs without requiring engine changes
2. WHEN mod data is defined THEN the system SHALL support new eras, factions, items, NPCs, quests, and enemy behaviors
3. WHEN mods conflict THEN the system SHALL detect conflicts and provide clear error messages with resolution suggestions
4. WHEN mods are enabled THEN the system SHALL merge mod data with base game data using defined priority rules
5. WHEN mods are disabled THEN the system SHALL revert to base game configuration without corruption

### Requirement 20: Gameplay Loop Progression

**User Story:** As a player, I want a structured progression through survival phases, so that gameplay evolves meaningfully over time.

#### Acceptance Criteria

1. WHEN days 1-5 occur THEN the game SHALL focus on survival mechanics and local threats
2. WHEN days 5-10 occur THEN the game SHALL introduce faction contact and relationship building
3. WHEN days 10-20 occur THEN the game SHALL enable trade networks, quests, and faction raids
4. WHEN days 20-40 occur THEN the world SHALL react dynamically to accumulated player actions
5. WHEN days 40+ occur THEN the game SHALL transition to sandbox emergent simulation with full system interaction

