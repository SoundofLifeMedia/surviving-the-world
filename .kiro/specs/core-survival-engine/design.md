# Core Survival Engine - Design Document

## Overview

The Core Survival Engine is a modular, data-driven system that powers Surviving The World™. It provides era-agnostic survival mechanics, AI-driven NPC behavior, faction dynamics, and consequence propagation across all historical scenarios. The architecture separates core game logic from era-specific content, enabling rapid development of new historical periods while maintaining consistent gameplay quality.

The Black Death (1347) serves as the MVP implementation, validating all core systems before expansion to additional eras.

### Design Principles

1. **Era Agnostic**: Core systems never reference specific eras, weapons, or events directly
2. **Data-Driven**: All era content lives in configuration files, not code
3. **Multiplayer Ready**: State management designed for future networked gameplay
4. **AI-First**: NPCs are autonomous agents with needs, memory, and decision-making
5. **Consequence Propagation**: Every action ripples through interconnected systems
6. **Performance Scalable**: Efficient algorithms supporting 100+ active NPCs
7. **Mod-Friendly**: Clear separation between engine and content for creator tools

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Game Client Layer                        │
│  (Rendering, Input, UI, Audio, Network Client)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Core Survival Engine                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Survival   │  │   AI Agent   │  │   Faction    │     │
│  │   Systems    │  │   System     │  │   System     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Consequence │  │  World State │  │   Combat     │     │
│  │   Engine     │  │   Manager    │  │   System     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Inventory & │  │  Environment │  │   Choice     │     │
│  │   Crafting   │  │   Hazards    │  │   System     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Era Data Layer                            │
│  (JSON/YAML configs: weapons, diseases, factions, events)   │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
Player Action → Input Handler → Core System → World State Update
                                      ↓
                              Consequence Engine
                                      ↓
                    ┌─────────────────┼─────────────────┐
                    ↓                 ↓                 ↓
              Faction System    NPC Agents      Environment
                    ↓                 ↓                 ↓
              Reputation Update  Behavior Change  Hazard Trigger
                    ↓                 ↓                 ↓
                    └─────────────────┴─────────────────┘
                                      ↓
                            World State Propagation
                                      ↓
                              Client Rendering
```

## Components and Interfaces

### 1. Survival Systems Component

Manages player vital statistics and survival mechanics.

```typescript
interface SurvivalStats {
  health: number;        // 0-100
  hunger: number;        // 0-100
  thirst: number;        // 0-100
  stamina: number;       // 0-100
  morale: number;        // 0-100
  diseases: DiseaseStatus[];
}

interface DiseaseStatus {
  diseaseId: string;
  severity: number;      // 0-100
  progressionRate: number;
  symptomsActive: string[];
  timeInfected: number;
}

interface SurvivalSystem {
  updateStats(deltaTime: number, environment: EnvironmentState): void;
  applyConsumable(item: ConsumableItem): void;
  contractDisease(diseaseId: string, exposureLevel: number): boolean;
  treatDisease(diseaseId: string, treatment: MedicalItem): void;
  calculateMovementPenalty(): number;
  getStatusEffects(): StatusEffect[];
}
```

### 2. AI Agent System

Autonomous NPC behavior driven by needs and memory.

```typescript
interface NPCAgent {
  id: string;
  name: string;
  factionId: string;
  needs: NPCNeeds;
  personality: PersonalityTraits;
  memory: MemoryEntry[];
  currentGoal: Goal;
  inventory: Item[];
  location: Vector3;
}

interface NPCNeeds {
  hunger: number;        // 0-100
  fear: number;          // 0-100
  loyalty: number;       // 0-100 (to faction)
  safety: number;        // 0-100
}

interface PersonalityTraits {
  aggression: number;    // 0-1
  compassion: number;    // 0-1
  greed: number;         // 0-1
  courage: number;       // 0-1
}

interface MemoryEntry {
  timestamp: number;
  eventType: string;
  involvedEntities: string[];
  emotionalImpact: number;  // -1 to 1
  importance: number;       // 0-1
  details: Record<string, any>;
}

interface Goal {
  type: string;          // "find_food", "flee_danger", "protect_ally"
  priority: number;
  targetLocation?: Vector3;
  targetEntity?: string;
  completionCondition: () => boolean;
}

interface AIAgentSystem {
  updateAgent(agent: NPCAgent, deltaTime: number, worldState: WorldState): void;
  evaluateNeeds(agent: NPCAgent): void;
  selectGoal(agent: NPCAgent, worldState: WorldState): Goal;
  executeGoal(agent: NPCAgent, goal: Goal, deltaTime: number): void;
  addMemory(agent: NPCAgent, memory: MemoryEntry): void;
  recallMemories(agent: NPCAgent, context: string): MemoryEntry[];
  decayMemories(agent: NPCAgent, deltaTime: number): void;
}
```

### 3. Faction System

Manages faction relationships, territories, and reputation.

```typescript
interface Faction {
  id: string;
  name: string;
  description: string;
  territories: string[];
  resources: Record<string, number>;
  relationships: Map<string, number>;  // factionId -> relationship (-100 to 100)
  goals: FactionGoal[];
  strength: number;
}

interface FactionGoal {
  type: string;
  priority: number;
  targetTerritory?: string;
  targetFaction?: string;
  conditions: Record<string, any>;
}

interface PlayerReputation {
  factionId: string;
  reputation: number;    // -100 to 100
  reputationTier: string; // "hostile", "unfriendly", "neutral", "friendly", "allied"
  unlockedInteractions: string[];
}

interface FactionSystem {
  initializeFactions(eraData: EraData): void;
  modifyReputation(playerId: string, factionId: string, delta: number, reason: string): void;
  getReputation(playerId: string, factionId: string): PlayerReputation;
  updateFactionRelationships(worldState: WorldState): void;
  resolveFactionConflict(faction1: string, faction2: string): ConflictResult;
  getFactionBehavior(factionId: string, worldState: WorldState): FactionBehavior;
}
```

### 4. Consequence Engine

Tracks player choices and propagates effects through the world.

```typescript
interface Choice {
  id: string;
  description: string;
  options: ChoiceOption[];
  prerequisites: Condition[];
  context: Record<string, any>;
}

interface ChoiceOption {
  id: string;
  text: string;
  immediateEffects: Effect[];
  consequenceRules: ConsequenceRule[];
  predictedOutcome?: string;
}

interface Effect {
  type: string;          // "modify_stat", "change_reputation", "trigger_event"
  target: string;
  value: any;
  delay?: number;
}

interface ConsequenceRule {
  condition: Condition;
  effects: Effect[];
  cascadeRules?: ConsequenceRule[];
}

interface ChoiceRecord {
  choiceId: string;
  optionSelected: string;
  timestamp: number;
  context: Record<string, any>;
  immediateEffects: Effect[];
  cascadingEffects: Effect[];
}

interface ConsequenceEngine {
  presentChoice(choice: Choice, player: Player): void;
  recordChoice(playerId: string, choiceId: string, optionId: string): void;
  applyImmediateEffects(effects: Effect[], worldState: WorldState): void;
  evaluateConsequenceRules(rules: ConsequenceRule[], worldState: WorldState): Effect[];
  propagateCascadingEffects(effects: Effect[], worldState: WorldState): void;
  getChoiceHistory(playerId: string): ChoiceRecord[];
}
```

### 5. World State Manager

Central authority for all world variables and state synchronization.

```typescript
interface WorldState {
  eraId: string;
  timeElapsed: number;
  dayNightCycle: number;  // 0-24
  variables: Map<string, number>;  // "plague_spread", "order_level", "resource_scarcity"
  activeEvents: GameEvent[];
  factionStates: Map<string, Faction>;
  npcAgents: Map<string, NPCAgent>;
  environmentalHazards: Hazard[];
  playerStates: Map<string, PlayerState>;
}

interface GameEvent {
  id: string;
  type: string;
  startTime: number;
  duration: number;
  affectedArea: BoundingBox;
  effects: Effect[];
  triggerConditions: Condition[];
}

interface WorldStateManager {
  initialize(eraData: EraData): WorldState;
  updateWorldState(deltaTime: number): void;
  modifyVariable(variableName: string, delta: number): void;
  getVariable(variableName: string): number;
  checkThresholds(): TriggeredEvent[];
  triggerEvent(event: GameEvent): void;
  serialize(): SerializedWorldState;
  deserialize(data: SerializedWorldState): void;
}
```

### 6. Combat System

Handles all combat interactions with era-appropriate weapons.

```typescript
interface Weapon {
  id: string;
  name: string;
  damageRange: [number, number];
  range: number;
  staminaCost: number;
  attackSpeed: number;
  weaponType: string;    // "melee", "ranged", "thrown"
  requirements: Record<string, number>;
}

interface CombatAction {
  attackerId: string;
  targetId: string;
  weapon: Weapon;
  attackType: string;    // "light", "heavy", "block", "dodge"
  timestamp: number;
}

interface CombatResult {
  hit: boolean;
  damage: number;
  statusEffects: StatusEffect[];
  staminaConsumed: number;
  reputationChanges: Map<string, number>;
}

interface CombatSystem {
  executeAttack(action: CombatAction, worldState: WorldState): CombatResult;
  calculateHitProbability(attacker: Entity, target: Entity, weapon: Weapon): number;
  calculateDamage(weapon: Weapon, attacker: Entity, target: Entity): number;
  applyDamage(target: Entity, damage: number): void;
  notifyFactions(combatResult: CombatResult): void;
}
```

### 7. Inventory and Crafting System

Manages items, recipes, and resource transformation.

```typescript
interface Item {
  id: string;
  name: string;
  type: string;          // "weapon", "consumable", "material", "medical"
  properties: Record<string, any>;
  stackSize: number;
  weight: number;
}

interface Recipe {
  id: string;
  resultItem: string;
  resultQuantity: number;
  requiredMaterials: Map<string, number>;
  requiredTools: string[];
  craftingTime: number;
  skillRequirements: Record<string, number>;
}

interface Inventory {
  items: Map<string, number>;  // itemId -> quantity
  maxWeight: number;
  currentWeight: number;
}

interface CraftingSystem {
  getAvailableRecipes(inventory: Inventory, eraData: EraData): Recipe[];
  craftItem(recipe: Recipe, inventory: Inventory): boolean;
  scavenge(location: Location, worldState: WorldState): Item[];
  trade(trader: NPCAgent, player: Player, offer: TradeOffer): boolean;
}
```

### 8. Environment and Hazards System

Manages time, weather, and environmental dangers.

```typescript
interface EnvironmentState {
  timeOfDay: number;     // 0-24
  weather: WeatherCondition;
  temperature: number;
  visibility: number;    // 0-1
  activeHazards: Hazard[];
}

interface WeatherCondition {
  type: string;          // "clear", "rain", "fog", "storm"
  intensity: number;     // 0-1
  duration: number;
}

interface Hazard {
  id: string;
  type: string;          // "fire", "plague_zone", "collapse", "flood"
  location: BoundingBox;
  intensity: number;
  damagePerSecond: number;
  statusEffects: StatusEffect[];
  duration: number;
}

interface EnvironmentSystem {
  updateEnvironment(deltaTime: number, worldState: WorldState): void;
  applyEnvironmentalEffects(entity: Entity, environment: EnvironmentState): void;
  checkShelter(entity: Entity, location: Vector3): boolean;
  spawnHazard(hazard: Hazard): void;
  updateHazards(deltaTime: number): void;
}
```

### 9. Choice System

Presents narrative choices and manages branching paths.

```typescript
interface ChoiceNode {
  id: string;
  title: string;
  description: string;
  options: ChoiceOption[];
  prerequisites: Condition[];
  location?: Vector3;
  triggerType: string;   // "location", "time", "event", "npc_interaction"
}

interface Condition {
  type: string;          // "reputation", "item", "variable", "time"
  target: string;
  operator: string;      // ">=", "<=", "==", "contains"
  value: any;
}

interface ChoiceSystem {
  evaluateChoiceNodes(player: Player, worldState: WorldState): ChoiceNode[];
  presentChoice(choiceNode: ChoiceNode, player: Player): void;
  validateChoice(choiceNode: ChoiceNode, optionId: string, player: Player): boolean;
  executeChoice(choiceNode: ChoiceNode, optionId: string, player: Player): void;
}
```

## Data Models

### Era Data Structure

All era-specific content is defined in JSON/YAML configuration files:

```json
{
  "eraId": "black_death_1347",
  "name": "The Black Death",
  "startYear": 1347,
  "description": "Survive the deadliest pandemic in human history",
  
  "factions": [
    {
      "id": "city_guard",
      "name": "City Guard",
      "description": "Maintains order and enforces quarantine",
      "startingTerritories": ["city_center", "gates"],
      "startingResources": {"food": 500, "weapons": 200},
      "goals": [
        {"type": "maintain_order", "priority": 10},
        {"type": "enforce_quarantine", "priority": 8}
      ]
    }
  ],
  
  "diseases": [
    {
      "id": "bubonic_plague",
      "name": "Bubonic Plague",
      "transmissionRate": 0.3,
      "progressionRate": 0.05,
      "symptoms": ["fever", "weakness", "buboes"],
      "treatments": ["herbal_remedy", "rest"],
      "mortalityRate": 0.6
    }
  ],
  
  "weapons": [
    {
      "id": "sword_medieval",
      "name": "Medieval Sword",
      "damageRange": [20, 35],
      "range": 2.0,
      "staminaCost": 15,
      "attackSpeed": 1.2,
      "weaponType": "melee"
    }
  ],
  
  "items": [
    {
      "id": "bread",
      "name": "Bread",
      "type": "consumable",
      "properties": {"hunger_restore": 30},
      "stackSize": 10,
      "weight": 0.5
    }
  ],
  
  "recipes": [
    {
      "id": "craft_bandage",
      "resultItem": "bandage",
      "resultQuantity": 1,
      "requiredMaterials": {"cloth": 2},
      "craftingTime": 5
    }
  ],
  
  "locations": [
    {
      "id": "city_center",
      "name": "City Center",
      "type": "urban",
      "lootTables": ["urban_common", "urban_rare"],
      "factionControl": "city_guard",
      "hazards": ["plague_zone"]
    }
  ],
  
  "choiceNodes": [
    {
      "id": "infected_family",
      "title": "Infected Family",
      "description": "You discover a family showing plague symptoms",
      "options": [
        {
          "id": "help",
          "text": "Help them despite the risk",
          "immediateEffects": [
            {"type": "modify_reputation", "target": "peasantry", "value": 20},
            {"type": "disease_exposure", "target": "player", "value": 0.4}
          ]
        },
        {
          "id": "report",
          "text": "Report them to the City Guard",
          "immediateEffects": [
            {"type": "modify_reputation", "target": "city_guard", "value": 10},
            {"type": "modify_reputation", "target": "peasantry", "value": -15}
          ]
        }
      ]
    }
  ],
  
  "worldStateVariables": {
    "plague_spread": {"initial": 20, "min": 0, "max": 100},
    "order_level": {"initial": 60, "min": 0, "max": 100},
    "resource_scarcity": {"initial": 40, "min": 0, "max": 100},
    "population": {"initial": 10000, "min": 0, "max": 10000}
  },
  
  "events": [
    {
      "id": "mass_panic",
      "type": "social_collapse",
      "triggerConditions": [
        {"type": "variable", "target": "plague_spread", "operator": ">=", "value": 70}
      ],
      "effects": [
        {"type": "modify_variable", "target": "order_level", "value": -30},
        {"type": "spawn_faction", "target": "raiders"}
      ]
    }
  ]
}
```

### Save Data Structure

```json
{
  "version": "1.0.0",
  "timestamp": 1234567890,
  "eraId": "black_death_1347",
  "playerId": "player_123",
  
  "playerState": {
    "survivalStats": {},
    "inventory": {},
    "location": {"x": 100, "y": 0, "z": 200},
    "reputations": {}
  },
  
  "worldState": {
    "timeElapsed": 3600,
    "variables": {},
    "factionStates": {},
    "npcAgents": {},
    "activeEvents": []
  },
  
  "choiceHistory": []
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Era-agnostic initialization integrity
*For any* era data configuration, when the engine initializes an era, all required systems (factions, NPCs, world state variables, items, diseases, weapons) should be initialized with values matching the era data, and all required fields should be present and valid.
**Validates: Requirements 1.1, 7.1, 9.1, 11.1, 13.1**

### Property 2: Survival stat bounds preservation
*For any* player state and any sequence of actions (consumption, environmental exposure, combat), all survival stats (health, hunger, thirst, stamina, morale) should remain within their valid ranges (0-100), and invalid values should never be stored.
**Validates: Requirements 1.1**

### Property 3: Environmental effect application
*For any* environmental condition and era configuration, when environmental effects are applied to player survival stats, the stat changes should match the formulas and values defined in the era data configuration.
**Validates: Requirements 1.2, 6.3**

### Property 4: Consumable effect correctness
*For any* consumable item with defined properties, when the player consumes the item, survival stats should change by exactly the amounts specified in the item's properties from era data.
**Validates: Requirements 1.3**

### Property 5: Threshold-triggered effects
*For any* survival stat and defined threshold, when the stat crosses the threshold value, the corresponding status effects should be triggered, and when the stat returns above the threshold, the effects should be removed.
**Validates: Requirements 1.4**

### Property 6: Death analytics completeness
*For any* player death event, the analytics record should contain the cause of death, survival duration, location, active diseases, and relevant world state at time of death.
**Validates: Requirements 1.5**

### Property 7: Disease transmission probability
*For any* disease exposure scenario with defined exposure duration and protection factors, the calculated infection probability should follow the disease's transmission rate formula from era data, and repeated exposures should increase cumulative infection risk.
**Validates: Requirements 2.1**

### Property 8: Disease progression consistency
*For any* contracted disease, the disease severity should progress over time according to the progression rate defined in era data, and symptoms should activate when severity crosses symptom thresholds.
**Validates: Requirements 2.2, 2.4**

### Property 9: Treatment effectiveness
*For any* disease and applicable treatment, applying the treatment should reduce disease progression rate or severity according to the treatment's effectiveness value in era data.
**Validates: Requirements 2.3**

### Property 10: Disease spread through populations
*For any* NPC population and active disease, disease spread through the population should follow the transmission model based on proximity, interaction frequency, and hygiene factors, with infection rates matching the disease configuration.
**Validates: Requirements 2.5, 12.3**

### Property 11: Movement stamina consumption
*For any* movement action (walk, run, crouch, climb), stamina should be consumed at the rate specified for that movement type, and stamina should regenerate when not moving.
**Validates: Requirements 3.1**

### Property 12: Stealth mode effects
*For any* player state, entering stealth mode should reduce detection radius by the configured percentage and modify movement speed by the configured multiplier.
**Validates: Requirements 3.2**

### Property 13: Detection probability calculation
*For any* NPC with line of sight to the player, the detection probability should be calculated based on distance, lighting level, noise level, and player stance according to the detection formula, with closer distance and higher visibility increasing detection chance.
**Validates: Requirements 3.3**

### Property 14: Stat-based movement penalties
*For any* player state with degraded survival stats, movement speed and stamina regeneration should be reduced proportionally to the stat degradation, with lower stats producing greater penalties.
**Validates: Requirements 3.4**

### Property 15: Hazard movement restrictions
*For any* environmental hazard with movement restrictions, when the player is in the hazard area, the specified movement options should be disabled or modified according to the hazard configuration.
**Validates: Requirements 3.5**

### Property 16: Weapon configuration loading
*For any* weapon defined in era data, when the player equips the weapon, all combat parameters (damage range, range, stamina cost, attack speed) should match the values in the weapon configuration.
**Validates: Requirements 4.1**

### Property 17: Combat calculation correctness
*For any* combat action, hit probability and damage should be calculated using the weapon stats, attacker condition (health, stamina), and target armor according to the combat formulas, with better conditions and weapons producing higher hit chances and damage.
**Validates: Requirements 4.2**

### Property 18: Damage and injury persistence
*For any* damage received, health should be reduced by the damage amount, injury effects should be applied, and injuries should persist until treated with appropriate medical items.
**Validates: Requirements 4.3**

### Property 19: Combat resource consumption
*For any* combat action, stamina should be consumed according to the action's stamina cost, and morale should change based on combat outcome (victory increases morale, defeat decreases it).
**Validates: Requirements 4.4**

### Property 20: Combat-faction integration
*For any* NPC killed by the player, the faction system should be notified, and the player's reputation with the NPC's faction should decrease by the configured amount.
**Validates: Requirements 4.5**

### Property 21: Loot generation rules
*For any* location search, generated loot should match the location's loot table from era data, with quantities and rarity affected by world state scarcity factors.
**Validates: Requirements 5.1**

### Property 22: Recipe availability logic
*For any* player inventory state, available crafting recipes should be exactly those recipes where the player has all required materials in sufficient quantities.
**Validates: Requirements 5.2**

### Property 23: Crafting material conservation
*For any* crafting action, the materials consumed should exactly match the recipe requirements, and the crafted item should be added to inventory with the quantity specified in the recipe.
**Validates: Requirements 5.3**

### Property 24: Trade availability filtering
*For any* NPC trader, available trade items should be filtered based on the NPC's faction, current inventory, and the player's reputation with that faction, with higher reputation unlocking more items.
**Validates: Requirements 5.4**

### Property 25: Trade inventory conservation
*For any* completed trade, the total items and currency before trade should equal the total items and currency after trade, with items and currency redistributed between player and NPC.
**Validates: Requirements 5.5**

### Property 26: Time progression effects
*For any* time advancement, the day-night cycle should progress, lighting should update to match time of day, temperature should follow the daily temperature curve, and NPC behavior patterns should shift according to time-based schedules.
**Validates: Requirements 6.1**

### Property 27: Hazard damage application
*For any* entity (player or NPC) within an active environmental hazard area, damage should be applied at the rate specified in the hazard configuration, and status effects should be applied according to the hazard type.
**Validates: Requirements 6.2**

### Property 28: Shelter protection mechanics
*For any* player in shelter, environmental hazard effects should be reduced by the shelter's protection factor, with higher quality shelters providing greater protection.
**Validates: Requirements 6.4**

### Property 29: Event scheduling and triggering
*For any* scheduled event, the event should trigger when game time reaches the scheduled time, and world state should be updated according to the event's effects.
**Validates: Requirements 6.5**

### Property 30: NPC need progression
*For any* NPC agent, as game time progresses, NPC needs (hunger, fear, safety) should change based on environmental conditions and resource availability, with hostile environments increasing fear and resource scarcity increasing hunger.
**Validates: Requirements 7.2**

### Property 31: Need-driven behavior changes
*For any* NPC with critical needs, behavior priorities should shift to address the critical need, with starving NPCs prioritizing food-seeking and frightened NPCs prioritizing safety.
**Validates: Requirements 7.3**

### Property 32: NPC decision-making consistency
*For any* NPC decision point, the selected action should be consistent with the NPC's current needs, personality traits, faction goals, and relevant memories, with higher-priority needs dominating decision-making.
**Validates: Requirements 7.4**

### Property 33: Reactive goal re-evaluation
*For any* significant environmental or social change, NPCs should re-evaluate their current goals, and goals should change if the new conditions make the current goal obsolete or a different goal more urgent.
**Validates: Requirements 7.5**

### Property 34: Memory recording completeness
*For any* player-NPC interaction, a memory entry should be created in the NPC's memory containing the interaction type, outcome, context, and emotional impact.
**Validates: Requirements 8.1**

### Property 35: Memory propagation radius
*For any* observable player action, all NPCs within perception range should record a memory of the action, and NPCs outside perception range should not record the action.
**Validates: Requirements 8.2**

### Property 36: Memory-based behavior modification
*For any* NPC with memories of previous player interactions, when encountering the player again, the NPC's dialogue options and behavior should reflect those memories, with positive memories enabling friendly interactions and negative memories restricting them.
**Validates: Requirements 8.3**

### Property 37: Faction-wide reputation propagation
*For any* change to player reputation with a faction, all NPC agents affiliated with that faction should update their relationship values with the player, and the magnitude of the relationship change should match the reputation change.
**Validates: Requirements 8.4, 9.2**

### Property 38: Memory decay mechanics
*For any* NPC memory, as time passes, the memory's importance should decay according to the decay rate, with critical memories (marked as important) decaying slower than mundane memories.
**Validates: Requirements 8.5**

### Property 39: Reputation threshold effects
*For any* faction reputation value, when reputation crosses a defined threshold, faction-specific interactions, quests, and trading options should be unlocked (for positive thresholds) or restricted (for negative thresholds).
**Validates: Requirements 9.3**

### Property 40: Faction conflict resolution
*For any* faction-to-faction interaction, conflict outcomes should be determined by comparing faction strength, resources, and relationship values, with stronger, better-resourced factions winning conflicts.
**Validates: Requirements 9.4**

### Property 41: Faction reactive behavior
*For any* world state change that affects faction goals, factions should update their behaviors according to their priorities defined in era data, with high-priority goals driving faction actions.
**Validates: Requirements 9.5**

### Property 42: Choice prerequisite filtering
*For any* choice node encountered, only options where all prerequisites are satisfied should be presented to the player, and options with unsatisfied prerequisites should be hidden or disabled.
**Validates: Requirements 10.1**

### Property 43: Choice logging completeness
*For any* player choice, a complete choice record should be created containing the choice ID, selected option, timestamp, context, and all affected entities.
**Validates: Requirements 10.2**

### Property 44: Cascading consequence propagation
*For any* choice made, immediate effects should be applied first, then consequence rules should be evaluated, and cascading effects should propagate through the world state according to the consequence rules defined in era data, with each cascade potentially triggering additional cascades.
**Validates: Requirements 10.3, 10.4**

### Property 45: Consequence persistence
*For any* choice with lasting effects, when the player revisits affected locations or NPCs, the world should reflect the previous choice through environmental changes, modified NPC dialogue, and altered available interactions.
**Validates: Requirements 10.5**

### Property 46: World state update correctness
*For any* action with defined world state impact, relevant world state variables should be updated by the impact values specified in the action configuration.
**Validates: Requirements 11.2**

### Property 47: Threshold-based event triggering
*For any* world state variable with defined thresholds, when the variable crosses a threshold value, the associated events and environmental changes should trigger according to era data.
**Validates: Requirements 11.3**

### Property 48: Natural world progression
*For any* world state variable with natural progression rules, as time advances, the variable should change according to the progression rate defined in era data (e.g., disease spreads, resources deplete).
**Validates: Requirements 11.4**

### Property 49: Save/load round-trip integrity
*For any* game state, saving and then immediately loading should restore the exact same state, including player stats, world state variables, all NPC states, faction data, and choice history.
**Validates: Requirements 11.5, 16.1, 16.2**

### Property 50: Save corruption handling
*For any* corrupted or invalid save data, the engine should detect the corruption, display a clear error message to the player, and fail gracefully without crashing.
**Validates: Requirements 16.3**

### Property 51: Save slot isolation
*For any* multiple save files, each save should be completely isolated, with separate save files, and each save should have correct metadata (timestamp, era, survival time, location).
**Validates: Requirements 16.4**

### Property 52: Save migration or compatibility detection
*For any* save file from a previous game version, the engine should either successfully migrate the save to the new version or clearly indicate that the save is incompatible with the current version.
**Validates: Requirements 16.5**

### Property 53: Era data validation and error reporting
*For any* era data with invalid or missing required fields, the engine should log detailed error messages specifying which fields are invalid or missing, and should fail gracefully without crashing.
**Validates: Requirements 13.4**

### Property 54: Era switching correctness
*For any* era switch operation, the engine should unload the current era's data and load the new era's data, with all systems reflecting the new era's configuration.
**Validates: Requirements 13.5**

### Property 55: Event-driven state updates
*For any* world state change, an event should be emitted containing the change type, affected entities, and new values, enabling event-driven architectures for future multiplayer.
**Validates: Requirements 14.3**

### Property 56: Deterministic simulation
*For any* game scenario with a fixed random seed, running the simulation multiple times should produce identical outcomes, ensuring deterministic behavior for future multiplayer synchronization.
**Validates: Requirements 14.4**

### Property 57: Action analytics logging
*For any* significant player action, an analytics event should be logged containing the action type, timestamp, context, and relevant state variables.
**Validates: Requirements 15.1**

### Property 58: Choice analytics completeness
*For any* player choice, the analytics record should contain all options presented, the option selected, immediate outcomes, and cascading effects.
**Validates: Requirements 15.2**

### Property 59: Session summary generation
*For any* completed game session, a session summary should be generated containing survival time, all choices made, factions affected, and cause of death or completion.
**Validates: Requirements 15.3**

### Property 60: Milestone logging
*For any* world state reaching a notable condition (defined in era data), a milestone event should be logged with the milestone type, timestamp, and world state snapshot.
**Validates: Requirements 15.4**

### Property 61: Analytics data format compliance
*For any* analytics data collected, the data should conform to the defined schema, with all required fields present and properly typed.
**Validates: Requirements 15.5**

### Property 62: AI LOD (Level of Detail) optimization
*For any* NPC agent, when the distance from the player exceeds the LOD threshold, the AI update frequency should be reduced according to the LOD configuration, and when the NPC comes within range, update frequency should return to normal.
**Validates: Requirements 17.2**

### Property 63: Memory management and asset unloading
*For any* memory usage exceeding the defined threshold, the engine should unload distant assets and inactive NPCs, and memory usage should decrease below the threshold.
**Validates: Requirements 17.4**

### Property 64: Dynamic asset streaming
*For any* player movement through the world, terrain, buildings, and NPCs should be loaded ahead of the player's direction and unloaded behind the player, maintaining a consistent loaded area around the player.
**Validates: Requirements 17.5**

### Property 65: Mod content loading and validation
*For any* user-created era data, the engine should validate the data against the era schema, and if valid, load the custom content alongside official content.
**Validates: Requirements 18.2**

### Property 66: Asset override functionality
*For any* mod providing override assets (textures, models, audio), the engine should load the override assets in place of default assets, and removing the mod should restore default assets.
**Validates: Requirements 18.3**

### Property 67: Mod isolation and independence
*For any* installed mod, the mod's content should be isolated from core game files, and enabling/disabling the mod should not modify or corrupt core game files.
**Validates: Requirements 18.5**

## Error Handling

### Error Categories

1. **Data Validation Errors**
   - Invalid era data format
   - Missing required fields
   - Out-of-range values
   - Circular dependencies in consequence rules

2. **Runtime Errors**
   - NPC pathfinding failures
   - Combat calculation edge cases (divide by zero)
   - Memory allocation failures
   - Asset loading failures

3. **State Corruption Errors**
   - Save file corruption
   - Desynchronized world state
   - Invalid NPC memory references
   - Orphaned faction relationships

### Error Handling Strategy

```typescript
interface ErrorHandler {
  handleError(error: GameError): ErrorResolution;
  logError(error: GameError, context: Record<string, any>): void;
  attemptRecovery(error: GameError): boolean;
  notifyPlayer(error: GameError): void;
}

interface GameError {
  type: ErrorType;
  severity: ErrorSeverity;  // "critical", "warning", "info"
  message: string;
  context: Record<string, any>;
  stackTrace?: string;
  recoverable: boolean;
}

interface ErrorResolution {
  resolved: boolean;
  fallbackAction?: string;
  playerNotification?: string;
}
```

### Recovery Strategies

1. **Graceful Degradation**: If an NPC AI fails, fall back to simple behavior
2. **State Rollback**: If world state becomes corrupted, roll back to last valid checkpoint
3. **Default Values**: If era data is missing optional fields, use sensible defaults
4. **Player Notification**: For critical errors, inform player and offer options (reload, continue with degraded functionality)

## Testing Strategy

### Unit Testing

We will use **Jest** (for TypeScript/JavaScript) or **pytest** (for Python) for unit testing, depending on the implementation language.

**Unit test coverage:**
- Individual system components (SurvivalSystem, AIAgentSystem, FactionSystem, etc.)
- Data validation functions
- Combat calculation formulas
- Disease progression algorithms
- Memory management utilities
- Save/load serialization functions

**Example unit tests:**
- Test that consuming a specific item increases hunger by the expected amount
- Test that a specific weapon deals damage within its configured range
- Test that a specific disease progresses at the configured rate
- Test that reputation changes trigger the correct threshold effects

### Property-Based Testing

We will use **fast-check** (for TypeScript/JavaScript) or **Hypothesis** (for Python) for property-based testing.

**Configuration:**
- Each property-based test MUST run a minimum of 100 iterations
- Each property-based test MUST be tagged with a comment explicitly referencing the correctness property from this design document
- Tag format: `// Feature: core-survival-engine, Property {number}: {property_text}`

**Property test coverage:**
- All 67 correctness properties defined above will be implemented as property-based tests
- Each property will have custom generators for relevant game entities (players, NPCs, items, world states)
- Generators will produce valid, realistic game states to ensure meaningful testing

**Example property tests:**
- Property 2: Generate random player states and action sequences, verify stats stay in bounds
- Property 23: Generate random recipes and inventories, verify material conservation
- Property 49: Generate random game states, verify save/load round-trip integrity

### Integration Testing

**Integration test coverage:**
- Cross-system interactions (combat affecting factions, choices affecting world state)
- Era data loading and system initialization
- Event propagation through multiple systems
- End-to-end gameplay loops (spawn → survive → make choices → see consequences)

**Example integration tests:**
- Test that killing an NPC triggers faction reputation change and NPC memory recording
- Test that making a choice triggers immediate effects, cascading consequences, and world state updates
- Test that disease spreads from player to NPCs and affects faction behavior

### Black Death Era Validation Tests

**Specific tests for the MVP era:**
- Verify Black Death era loads with correct factions (City Guard, Church, Peasantry, Raiders)
- Verify plague mechanics spread disease through NPC populations
- Verify at least 5 meaningful choice nodes are present and functional
- Verify player choices visibly affect faction control, population, and environment
- End-to-end playthrough test: spawn → survive 10 minutes → make 3 choices → verify world changes

## Performance Considerations

### Optimization Strategies

1. **Spatial Partitioning**: Use quadtree or octree for efficient NPC queries
2. **AI LOD System**: Reduce update frequency for distant NPCs
3. **Event Batching**: Batch world state updates to reduce overhead
4. **Memory Pooling**: Reuse NPC and entity objects to reduce allocations
5. **Lazy Loading**: Load era data on-demand rather than all at once
6. **Caching**: Cache frequently accessed data (faction relationships, reputation tiers)

### Performance Targets

- **Frame Rate**: Maintain 30+ FPS with 100 active NPCs
- **Memory**: Stay under 4GB RAM usage for MVP
- **Load Times**: Era loading under 10 seconds
- **Save/Load**: Save and load operations under 3 seconds
- **AI Update**: Process 100 NPC AI updates in under 16ms (60 FPS budget)

### Profiling and Monitoring

```typescript
interface PerformanceMonitor {
  trackFrameTime(): void;
  trackSystemUpdate(systemName: string, duration: number): void;
  trackMemoryUsage(): void;
  trackNPCCount(): void;
  generatePerformanceReport(): PerformanceReport;
}

interface PerformanceReport {
  averageFrameTime: number;
  systemUpdateTimes: Map<string, number>;
  memoryUsage: number;
  activeNPCCount: number;
  bottlenecks: string[];
}
```

## Future Extensibility

### Adding New Eras

To add a new era (e.g., WWII, Mongol Invasions):

1. Create new era data file: `/data/eras/wwii_1939.json`
2. Define era-specific content:
   - Factions (Allies, Axis, Resistance, Civilians)
   - Weapons (rifles, grenades, tanks)
   - Diseases (trench foot, shell shock)
   - Locations (battlefields, bunkers, cities)
   - Choice nodes (moral dilemmas, tactical decisions)
   - World state variables (war progress, civilian morale, supply lines)
3. No code changes required - engine loads era data dynamically

### Multiplayer Expansion

The architecture supports future multiplayer modes:

1. **Co-op Survival (2-20 players)**:
   - Shared world state
   - Synchronized NPC behavior
   - Collaborative choices
   - Shared faction reputations

2. **Era Conquest (50-100 players)**:
   - Faction-based teams
   - Territory control
   - Large-scale battles
   - Persistent world state

**Required additions for multiplayer:**
- Network synchronization layer
- Server-authoritative validation
- Client-side prediction
- Lag compensation
- Anti-cheat systems

### Creator Tools

The data-driven architecture enables creator tools:

1. **Era Editor**: GUI for creating custom eras
2. **Choice Node Editor**: Visual scripting for branching narratives
3. **Faction Designer**: Define custom factions and relationships
4. **Event System**: Create custom world events and triggers
5. **Asset Importer**: Import custom models, textures, audio

## Technical Architecture Decisions

### Why Data-Driven Design?

**Benefits:**
- Rapid content creation without code changes
- Modding support out of the box
- Easier balancing and iteration
- Clear separation of concerns
- Parallel development (engineers work on engine, designers work on content)

**Trade-offs:**
- More complex data validation required
- Potential performance overhead from data lookups
- Requires robust error handling for invalid data

### Why Event-Driven Architecture?

**Benefits:**
- Loose coupling between systems
- Easy to add new systems that react to events
- Multiplayer-ready (events can be networked)
- Easier debugging (event log shows system interactions)

**Trade-offs:**
- More complex control flow
- Potential for event cascades causing performance issues
- Requires careful event ordering

### Why AI Agents Over Scripted NPCs?

**Benefits:**
- Emergent behavior creates unique experiences
- NPCs adapt to player actions dynamically
- Scales to complex scenarios without exponential scripting
- Enables realistic social simulation

**Trade-offs:**
- More computationally expensive
- Harder to predict and debug
- Requires careful tuning to avoid nonsensical behavior

## Conclusion

The Core Survival Engine provides a robust, scalable foundation for Surviving The World™. By separating core mechanics from era-specific content, we enable rapid development of new historical scenarios while maintaining consistent gameplay quality. The AI-driven NPC system, faction dynamics, and consequence propagation create a living world that responds meaningfully to player choices.

The Black Death MVP will validate all core systems and serve as a template for future eras. Once proven, the same engine will power WWII, Mongol Invasions, and all subsequent historical catastrophes with minimal code changes—only new era data files.

This architecture positions Surviving The World™ as a platform, not just a game, with infinite extensibility through eras, mods, and creator content.
