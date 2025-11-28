# Design Document: Surviving The World™

## Overview

Surviving The World™ is a **lightweight 3D hybrid survival simulation** (Valheim + Project Zomboid + RimWorld AI style) featuring GTA-grade enemy intelligence, agentic NPC behavior, and deep simulation systems. The architecture prioritizes **simulation depth over photorealism**, enabling:

- 500+ active NPCs with full AI
- 10-year content lifespan through modding
- Rapid iteration and expansion
- Seamless co-op multiplayer
- Procedural world generation

Built in TypeScript as a modular simulation engine, all content is data-driven through JSON era packs. The lightweight 3D approach enables complex AI systems (GOAP factions, micro-agent enemies, memory-driven NPCs) that would choke a photorealistic engine.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   UI/HUD     │  │   Rendering  │  │    Audio     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    GAMEPLAY LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Player     │  │    Combat    │  │   Crafting   │      │
│  │   Systems    │  │    System    │  │   Building   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Inventory   │  │  Progression │  │   Economy    │      │
│  │   System     │  │   System     │  │   Triangle   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   SIMULATION LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  World State │  │   Faction    │  │   NPC AI     │      │
│  │   Manager    │  │  AI + Heat   │  │  + Agents    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Quest     │  │  Replayabil- │  │  Condition   │      │
│  │   System     │  │  ity Engine  │  │   System     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   ENEMY AI LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Perception  │  │  Behavior    │  │ Micro-Agent  │      │
│  │    Layer     │  │    Tree      │  │   System     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Enemy Coordinator Agent (ECA)              │   │
│  │   Squad Tactics | Role Assignment | Difficulty Adapt │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     ENGINE LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Data Loader │  │  Event Bus   │  │  Save/Load   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Streaming   │  │  Performance │  │  Mod System  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Eras (JSON) │  │Factions(JSON)│  │ Items (JSON) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  NPCs (JSON) │  │ Quests (JSON)│  │ EnemyAI(JSON)│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enemy AI Stack - Perception Layer

**Responsibilities:**
- Track sight cones, hearing radius, and memory
- Adjust detection based on weather, time, lighting
- Store last known positions and search patterns

**Interface:**
```typescript
interface PerceptionState {
  sightRange: number;
  sightConeAngle: number;
  hearingRadius: number;
  lastKnownPlayerPosition: Vector3 | null;
  lastSeenTimestamp: number;
  alertLevel: number; // 0-1
  memoryDuration: number;
}

interface PerceptionModifiers {
  weather: WeatherEffect;
  timeOfDay: number; // 0-24
  lighting: number; // 0-1
  playerNoise: number; // 0-1
  playerStance: 'standing' | 'crouching' | 'prone';
}

class PerceptionLayer {
  updatePerception(enemy: Enemy, modifiers: PerceptionModifiers): void;
  canSeeTarget(enemy: Enemy, target: Entity): boolean;
  canHearTarget(enemy: Enemy, target: Entity, noiseLevel: number): boolean;
  getLastKnownPosition(enemy: Enemy): Vector3 | null;
  setLastKnownPosition(enemy: Enemy, position: Vector3): void;
  decayMemory(enemy: Enemy, deltaTime: number): void;
  calculateDetectionProbability(enemy: Enemy, target: Entity): number;
}
```

### 2. Enemy AI Stack - Behavior Tree Combat System

**Responsibilities:**
- Manage combat state transitions
- Execute tactical sub-states (Cover, Flank, Suppress)
- Handle retreat and surrender logic

**Interface:**
```typescript
type CombatState = 'idle' | 'aware' | 'engage' | 'retreat' | 'surrender';
type EngageSubState = 'cover' | 'flank' | 'suppress' | 'advance' | 'hold';

interface BehaviorTreeState {
  currentState: CombatState;
  engageSubState: EngageSubState | null;
  stateEntryTime: number;
  alertnessTimer: number;
  investigationTarget: Vector3 | null;
}

class EnemyBehaviorTree {
  evaluateState(enemy: Enemy, perception: PerceptionState): CombatState;
  transitionState(enemy: Enemy, newState: CombatState): void;
  selectEngageSubState(enemy: Enemy, context: CombatContext): EngageSubState;
  executeState(enemy: Enemy, deltaTime: number): void;
  checkMoraleThreshold(enemy: Enemy): boolean;
  handleDisengagement(enemy: Enemy): void;
}
```

### 3. Enemy AI Stack - Micro-Agent System

**Responsibilities:**
- Run internal decision-making agents
- Produce adaptive behaviors through agent consensus
- Resolve conflicts between agent recommendations

**Interface:**
```typescript
interface MicroAgentOutputs {
  aggression: AggressionOutput;
  tactics: TacticsOutput;
  perception: PerceptionOutput;
  morale: MoraleOutput;
}

interface AggressionOutput {
  attackFrequency: number; // 0-1
  riskTolerance: number; // 0-1
  targetPriority: string[];
}

interface TacticsOutput {
  recommendedBehavior: 'flank' | 'push' | 'suppress' | 'defend' | 'retreat';
  movementStyle: 'aggressive' | 'cautious' | 'evasive';
  useCoordination: boolean;
}

interface MoraleOutput {
  panicLevel: number; // 0-1
  willToFight: number; // 0-1
  surrenderThreshold: number;
}

class MicroAgentSystem {
  evaluateAggression(enemy: Enemy, context: CombatContext): AggressionOutput;
  evaluateTactics(enemy: Enemy, context: CombatContext): TacticsOutput;
  evaluatePerception(enemy: Enemy, context: CombatContext): PerceptionOutput;
  evaluateMorale(enemy: Enemy, context: CombatContext): MoraleOutput;
  resolveConflicts(outputs: MicroAgentOutputs, context: CombatContext): ResolvedBehavior;
  updateAgentWeights(enemy: Enemy, combatOutcome: CombatOutcome): void;
}
```

### 4. Enemy AI Stack - Enemy Coordinator Agent (ECA)

**Responsibilities:**
- Coordinate squad-level tactics
- Assign combat roles dynamically
- Adapt difficulty based on player skill
- Predict and counter player tactics

**Interface:**
```typescript
type SquadRole = 'pointman' | 'flanker' | 'suppressor' | 'medic' | 'sniper' | 'leader';

interface SquadState {
  squadId: string;
  members: Enemy[];
  roles: Map<string, SquadRole>;
  currentTactic: SquadTactic;
  playerSkillAssessment: number; // 0-1
  reinforcementsPending: boolean;
}

interface SquadTactic {
  type: 'assault' | 'flank' | 'surround' | 'ambush' | 'retreat' | 'hold';
  primaryTarget: Vector3;
  flankingRoutes: Vector3[][];
  suppressionTargets: Vector3[];
}

class EnemyCoordinatorAgent {
  createSquad(enemies: Enemy[]): SquadState;
  assignRoles(squad: SquadState): void;
  assessPlayerSkill(squad: SquadState, playerActions: PlayerAction[]): number;
  adaptDifficulty(squad: SquadState, skillAssessment: number): void;
  planSquadTactic(squad: SquadState, context: CombatContext): SquadTactic;
  coordinateFlanking(squad: SquadState): void;
  callReinforcements(squad: SquadState, nearbyEnemies: Enemy[]): void;
  predictPlayerBehavior(playerHistory: PlayerAction[]): PredictedBehavior;
  counterPlayerTactics(squad: SquadState, prediction: PredictedBehavior): void;
  avoidFriendlyFire(squad: SquadState): void;
}
```

### 5. Agentic NPC Intelligence System

**Responsibilities:**
- Manage NPC needs, memory, and social intelligence
- Track reputation and faction allegiance
- Enable rumor spreading and collective decisions

**Interface:**
```typescript
interface AgenticNPC {
  id: string;
  name: string;
  factionId: string;
  needsEngine: NeedsEngine;
  utilityEngine: UtilityDecisionEngine;
  memoryEngine: MemoryEngine;
  socialEngine: SocialIntelligenceEngine;
  reputationBehavior: ReputationBehavior;
}

interface NeedsEngine {
  hunger: number;
  rest: number;
  safety: number;
  social: number;
  purpose: number;
  evaluateNeeds(): NeedPriority[];
}

interface MemoryEngine {
  memories: MemoryRecord[];
  addMemory(event: WorldEvent): void;
  recallRelevant(context: string): MemoryRecord[];
  decayMemories(deltaTime: number): void;
  getPlayerImpression(): number;
}

interface SocialIntelligenceEngine {
  knownNPCs: Map<string, Relationship>;
  spreadRumor(rumor: Rumor, network: AgenticNPC[]): void;
  evaluateTrust(targetId: string): number;
  participateInDecision(decision: CollectiveDecision): Vote;
}

class AgenticNPCSystem {
  updateNPC(npc: AgenticNPC, deltaTime: number, worldState: WorldState): void;
  recordInteraction(npc: AgenticNPC, interaction: Interaction): void;
  propagateRumor(sourceNpc: AgenticNPC, rumor: Rumor): void;
  updateFactionAllegiance(npc: AgenticNPC, newFaction: string): void;
  conductVillageDecision(npcs: AgenticNPC[], decision: CollectiveDecision): DecisionOutcome;
}
```

### 6. Faction AI with Heat System

**Responsibilities:**
- Track faction heat levels from player actions
- Escalate responses progressively
- Execute GOAP-driven faction behaviors

**Interface:**
```typescript
interface FactionHeatState {
  factionId: string;
  heatLevel: number; // 0-100
  escalationTier: 'calm' | 'alert' | 'hunting' | 'war';
  lastHostileAction: number;
  cooldownRate: number;
  revengeTargets: string[];
}

interface FactionCapabilities {
  canRaiseArmies: boolean;
  canLaunchRaids: boolean;
  canEngageDiplomacy: boolean;
  canAdjustTaxes: boolean;
  canEnforcePatrols: boolean;
  canExecuteRevenge: boolean;
}

class FactionHeatSystem {
  increaseHeat(factionId: string, amount: number, reason: string): void;
  decreaseHeat(factionId: string, deltaTime: number): void;
  getEscalationTier(factionId: string): string;
  triggerEscalation(factionId: string, tier: string): void;
  planRevengeAction(factionId: string, targetPlayer: string): RevengeAction;
  updatePatrolIntensity(factionId: string, heatLevel: number): void;
}

class FactionGOAPSystem {
  evaluateGoals(faction: Faction, worldState: WorldState): Goal[];
  planActions(faction: Faction, goals: Goal[]): Action[];
  executeRaid(faction: Faction, target: string): RaidResult;
  conductDiplomacy(faction1: string, faction2: string, type: string): DiplomacyResult;
  adjustTradeRoutes(faction: Faction, playerStanding: number): void;
  defendAlly(faction: Faction, ally: string): void;
}
```

### 7. Player Progression System

**Responsibilities:**
- Track stat increases from player actions
- Unlock abilities and bonuses at thresholds
- Persist progression across sessions

**Interface:**
```typescript
interface PlayerProgressionStats {
  stamina: number;        // Increased by running
  durability: number;     // Increased by climbing
  accuracy: number;       // Increased by hunting
  charisma: number;       // Increased by trading
  craftsmanship: number;  // Increased by crafting
  diplomacy: number;      // Increased by negotiating
  willpower: number;      // Increased by survival days
}

interface ProgressionUnlocks {
  betterCrafting: number;      // Craftsmanship threshold
  higherStamina: number;       // Stamina threshold
  lowerHungerDecay: number;    // Willpower threshold
  improvedHealthRegen: number; // Durability threshold
  betterDiplomacy: number;     // Diplomacy threshold
  factionRepBonus: number;     // Charisma threshold
}

class PlayerProgressionSystem {
  recordAction(player: Player, actionType: string, intensity: number): void;
  calculateStatGain(actionType: string, intensity: number): number;
  checkUnlocks(player: Player): Unlock[];
  applyUnlock(player: Player, unlock: Unlock): void;
  getProgressionBonuses(player: Player): ProgressionBonuses;
  serializeProgression(player: Player): SerializedProgression;
}
```

### 8. Replayability Engine

**Responsibilities:**
- Generate procedural enemy compositions
- Evolve enemy tactics between playthroughs
- Apply world modifiers for variety
- Track player patterns for adaptation

**Interface:**
```typescript
interface ReplayabilityState {
  worldSeed: number;
  playerId: string;
  playerPatterns: PlayerPattern[];
  enemyEvolution: EnemyEvolutionState;
  activeModifiers: WorldModifier[];
  factionMemory: Map<string, FactionMemory>;
}

interface PlayerPattern {
  patternType: string;
  frequency: number;
  lastUsed: number;
  counterStrategy: string;
}

interface EnemyEvolutionState {
  tacticalAdaptations: string[];
  squadCompositionBias: Map<SquadRole, number>;
  difficultyProgression: number;
}

interface WorldModifier {
  id: string;
  type: 'daily' | 'weekly' | 'seasonal';
  effects: ModifierEffect[];
  duration: number;
}

class ReplayabilityEngine {
  generateWorldSeed(): number;
  generateProceduralSquad(region: string, difficulty: number): Enemy[];
  recordPlayerPattern(player: Player, action: PlayerAction): void;
  evolveEnemyTactics(patterns: PlayerPattern[]): void;
  applyWorldModifier(modifier: WorldModifier): void;
  getActiveModifiers(): WorldModifier[];
  predictPlayerTactics(patterns: PlayerPattern[]): PredictedTactic[];
  persistFactionMemory(factionId: string, memory: FactionMemory): void;
}
```

### 9. World Streaming System

**Responsibilities:**
- Stream terrain, buildings, NPCs dynamically
- Manage region loading/unloading
- Handle faction territory boundaries

**Interface:**
```typescript
interface StreamingState {
  loadedRegions: Set<string>;
  pendingLoads: string[];
  pendingUnloads: string[];
  playerPosition: Vector3;
  loadRadius: number;
  unloadRadius: number;
}

interface Region {
  id: string;
  bounds: BoundingBox;
  factionControl: string;
  dangerLevel: number;
  patrolRoutes: Vector3[][];
  ambushPoints: Vector3[];
  populationDensity: number;
}

class WorldStreamingSystem {
  updateStreaming(playerPosition: Vector3): void;
  loadRegion(regionId: string): Promise<void>;
  unloadRegion(regionId: string): void;
  getLoadedRegions(): Region[];
  getFactionTerritory(factionId: string): Region[];
  getDangerZones(): Region[];
  getPatrolRoutes(regionId: string): Vector3[][];
}
```

### 10. Economy Triangle System

**Responsibilities:**
- Connect crafting, economy, and building systems
- Calculate supply/demand dynamics
- Apply faction war and weather effects

**Interface:**
```typescript
interface EconomyTriangleState {
  villageWealth: Map<string, number>;
  regionalSupply: Map<string, Map<string, number>>;
  regionalDemand: Map<string, Map<string, number>>;
  tradeRoutes: TradeRoute[];
  merchantTrust: Map<string, number>;
}

interface CraftingImpact {
  villageWealthDelta: number;
  foodSupplyDelta: number;
  factionDiplomacyDelta: Map<string, number>;
}

class EconomyTriangleSystem {
  calculateCraftingImpact(item: Item, village: string): CraftingImpact;
  updateSupplyDemand(regionId: string, deltaTime: number): void;
  applyFactionWarEffects(war: FactionWar): void;
  applyWeatherEffects(weather: WeatherState): void;
  calculatePrice(itemId: string, regionId: string, merchantTrust: number): number;
  updateTradeRoutes(factionStates: Map<string, FactionState>): void;
  getBuildingBonuses(building: Building): BuildingBonuses;
}
```

### 11. World-Generated Quest System

**Responsibilities:**
- Generate quests from world conditions
- Track quest triggers and completion
- Apply quest outcomes to world state

**Interface:**
```typescript
interface QuestTrigger {
  type: 'hunger' | 'war' | 'disease' | 'bandit' | 'reputation' | 'seasonal';
  condition: Condition;
  regionId?: string;
  factionId?: string;
}

interface GeneratedQuest {
  id: string;
  templateId: string;
  trigger: QuestTrigger;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  worldStateOnComplete: WorldStateChange[];
  expirationTime?: number;
}

class WorldQuestGenerator {
  evaluateTriggers(worldState: WorldState): QuestTrigger[];
  generateQuest(trigger: QuestTrigger, templates: QuestTemplate[]): GeneratedQuest;
  getActiveQuests(player: Player): GeneratedQuest[];
  completeQuest(questId: string, success: boolean): void;
  applyQuestOutcome(quest: GeneratedQuest, success: boolean): void;
  checkQuestExpiration(quests: GeneratedQuest[], currentTime: number): void;
}
```

## Data Models

### Enemy AI Configuration

```json
{
  "enemyType": "bandit_raider",
  "perception": {
    "baseSightRange": 30,
    "sightConeAngle": 120,
    "baseHearingRadius": 20,
    "memoryDuration": 60,
    "weatherModifiers": {
      "fog": { "sightMultiplier": 0.5 },
      "rain": { "hearingMultiplier": 0.7 },
      "night": { "sightMultiplier": 0.6 }
    }
  },
  "behaviorTree": {
    "defaultState": "idle",
    "alertnessDecay": 0.1,
    "moraleThreshold": 0.3,
    "surrenderThreshold": 0.15
  },
  "microAgents": {
    "aggression": { "baseLevel": 0.6, "healthWeight": 0.3, "allyWeight": 0.4 },
    "tactics": { "flankPreference": 0.7, "coverPreference": 0.8 },
    "morale": { "casualtyImpact": 0.2, "durationDecay": 0.05 }
  },
  "squadRole": "flanker",
  "factionDoctrine": "aggressive"
}
```

### Faction Heat Configuration

```json
{
  "factionId": "kingdom_north",
  "heatConfig": {
    "escalationThresholds": {
      "alert": 25,
      "hunting": 50,
      "war": 80
    },
    "cooldownRate": 0.5,
    "hostileActionWeights": {
      "kill_guard": 15,
      "steal": 5,
      "trespass": 2,
      "assault": 10
    },
    "escalationResponses": {
      "alert": ["increased_patrols", "wanted_posters"],
      "hunting": ["bounty_hunters", "checkpoint_searches"],
      "war": ["army_deployment", "ally_notification"]
    }
  },
  "capabilities": {
    "canRaiseArmies": true,
    "canLaunchRaids": true,
    "canEngageDiplomacy": true,
    "revengeMemoryDuration": 168
  }
}
```

### Player Progression Configuration

```json
{
  "statGainRates": {
    "running": { "stat": "stamina", "gainPerMinute": 0.1 },
    "climbing": { "stat": "durability", "gainPerAction": 0.05 },
    "hunting": { "stat": "accuracy", "gainPerKill": 0.2 },
    "trading": { "stat": "charisma", "gainPerTrade": 0.15 },
    "crafting": { "stat": "craftsmanship", "gainPerCraft": 0.1 },
    "negotiating": { "stat": "diplomacy", "gainPerSuccess": 0.25 },
    "surviving": { "stat": "willpower", "gainPerDay": 0.5 }
  },
  "unlockThresholds": {
    "betterCrafting": { "stat": "craftsmanship", "threshold": 10 },
    "higherStamina": { "stat": "stamina", "threshold": 15 },
    "lowerHungerDecay": { "stat": "willpower", "threshold": 20 },
    "improvedHealthRegen": { "stat": "durability", "threshold": 12 },
    "betterDiplomacy": { "stat": "diplomacy", "threshold": 15 },
    "factionRepBonus": { "stat": "charisma", "threshold": 18 }
  }
}
```

### Replayability Configuration

```json
{
  "worldModifiers": [
    {
      "id": "harsh_winter",
      "type": "seasonal",
      "effects": [
        { "type": "temperature", "value": -20 },
        { "type": "enemy_speed", "multiplier": 0.8 },
        { "type": "food_scarcity", "multiplier": 1.5 }
      ],
      "duration": 604800
    },
    {
      "id": "bandit_surge",
      "type": "weekly",
      "effects": [
        { "type": "enemy_spawn_rate", "multiplier": 1.5 },
        { "type": "patrol_frequency", "multiplier": 1.3 }
      ],
      "duration": 86400
    }
  ],
  "enemyEvolution": {
    "adaptationRate": 0.1,
    "patternMemoryDuration": 3,
    "counterStrategies": {
      "stealth_heavy": ["increased_patrols", "noise_traps"],
      "aggressive": ["defensive_formations", "ambush_tactics"],
      "ranged": ["cover_seeking", "flanking_priority"]
    }
  }
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Game loop phase ordering
*For any* game initialization, the engine should execute phases in order: LOAD → INIT → SIMULATE → RENDER → SAVE, and each phase should complete before the next begins.
**Validates: Requirements 1.1**

### Property 2: Era data loading integrity
*For any* valid era JSON configuration, loading the era should initialize all defined factions, items, NPCs, and events with values matching the configuration.
**Validates: Requirements 1.2**

### Property 3: Perception state initialization
*For any* enemy created, the Perception Layer should initialize with valid sight range, sight cone angle, hearing radius, and memory duration values within configured bounds.
**Validates: Requirements 2.1**

### Property 4: Weather affects perception
*For any* weather condition change, enemy detection ranges should be modified according to the weather modifiers defined in configuration (fog reduces sight, rain reduces hearing).
**Validates: Requirements 2.2**

### Property 5: Time of day affects sight
*For any* time of day value, enemy sight ranges should be adjusted proportionally, with night values producing lower sight ranges than day values.
**Validates: Requirements 2.3**

### Property 6: Behavior tree state validity
*For any* enemy, the behavior tree should always be in exactly one valid state from the set {Idle, Aware, Engage, Retreat, Surrender}.
**Validates: Requirements 3.1**

### Property 7: Detection triggers state transition
*For any* enemy in Idle state that detects the player, the behavior tree should transition to Aware state within one update cycle.
**Validates: Requirements 3.2**

### Property 8: Morale threshold triggers retreat
*For any* enemy whose morale drops below the configured threshold, the behavior tree should transition to Retreat or Surrender based on faction doctrine.
**Validates: Requirements 3.4, 13.4**

### Property 9: Micro-agent initialization completeness
*For any* enemy created, the system should initialize all four micro-agents (Aggression, Tactics, Perception, Morale) with valid initial states.
**Validates: Requirements 4.1**

### Property 10: Aggression agent context sensitivity
*For any* combat context, the Aggression Agent output should vary based on enemy health, nearby allies, and player threat level, with lower health producing lower aggression.
**Validates: Requirements 4.2**

### Property 11: Micro-agent conflict resolution determinism
*For any* set of conflicting micro-agent outputs and combat context, the resolution should produce the same behavior when given identical inputs.
**Validates: Requirements 4.5**

### Property 12: Squad role assignment completeness
*For any* squad formed from multiple enemies, the ECA should assign a valid combat role to every squad member with no duplicates for unique roles.
**Validates: Requirements 5.1**

### Property 13: Difficulty adaptation responsiveness
*For any* player skill assessment change, the ECA should adjust squad difficulty within one combat encounter, with higher skill producing harder encounters.
**Validates: Requirements 5.2**

### Property 14: Flanking route safety
*For any* flanking route planned by the ECA, the route should not intersect with friendly fire zones of other squad members.
**Validates: Requirements 5.4**

### Property 15: Region streaming consistency
*For any* player position, regions within load radius should be loaded and regions beyond unload radius should be unloaded, with no gaps in loaded area.
**Validates: Requirements 6.1**

### Property 16: Faction territory integrity
*For any* region, the faction control, patrol routes, and ambush points should be defined and consistent with faction configuration.
**Validates: Requirements 6.2**

### Property 17: NPC intelligence engine initialization
*For any* NPC created, the system should initialize all intelligence engines (Needs, Utility, Memory, Social, Reputation) with valid initial states.
**Validates: Requirements 7.1**

### Property 18: Interaction memory recording
*For any* player-NPC interaction, the Memory Engine should create a memory record containing interaction type, timestamp, and emotional impact.
**Validates: Requirements 7.2**

### Property 19: Rumor propagation through networks
*For any* rumor spread by an NPC, the rumor should propagate to connected NPCs in the social network within configured propagation time.
**Validates: Requirements 7.3**

### Property 20: Heat level increases on hostile actions
*For any* hostile action against a faction, the Heat System should increase the faction's heat level by the configured amount for that action type.
**Validates: Requirements 8.1**

### Property 21: Escalation tier transitions at thresholds
*For any* faction heat level crossing a threshold, the escalation tier should transition to the appropriate level and trigger configured responses.
**Validates: Requirements 8.2**

### Property 22: Stat gains from actions
*For any* player action with stat gain configured, the corresponding stat should increase by the configured amount.
**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

### Property 23: Unlock triggers at thresholds
*For any* player stat reaching an unlock threshold, the corresponding ability or bonus should be unlocked and applied.
**Validates: Requirements 9.5**

### Property 24: Crafting affects economy
*For any* crafting action, the economy triangle should update village wealth and supply values according to the crafted item's impact configuration.
**Validates: Requirements 10.1**

### Property 25: Price reflects supply and demand
*For any* item in a region, the calculated price should increase when supply decreases or demand increases, and decrease when supply increases or demand decreases.
**Validates: Requirements 10.3**

### Property 26: Quest generation from world conditions
*For any* world condition matching a quest trigger, the Quest System should generate a quest from the appropriate template within one update cycle.
**Validates: Requirements 11.1, 11.2, 11.3, 11.4**

### Property 27: Procedural squad generation validity
*For any* new game start, the Replayability Engine should generate enemy squads with valid compositions matching region difficulty and faction configuration.
**Validates: Requirements 12.1**

### Property 28: Enemy evolution from player patterns
*For any* recorded player pattern, enemy tactics should evolve to include counter-strategies for that pattern in subsequent encounters.
**Validates: Requirements 12.2**

### Property 29: Damage calculation produces valid injuries
*For any* damage dealt, the Combat System should calculate and apply valid injury states (stagger, bleeding, limb damage) based on damage amount and type.
**Validates: Requirements 13.3**

### Property 30: Stat decay over time
*For any* time passage, player survival stats should decay at configured rates based on activity level and environmental conditions.
**Validates: Requirements 14.2**

### Property 31: Weather effects application
*For any* weather change, the system should apply all configured effects (visibility, temperature, movement speed) to affected entities.
**Validates: Requirements 14.3**

### Property 32: Save/load round-trip integrity
*For any* game state, saving and then loading should restore the exact same state including world state, player data, faction states, NPC states, and quest progress.
**Validates: Requirements 15.1**

### Property 33: Faction memory persistence
*For any* faction memory of player actions, the memory should persist across save/load cycles and influence faction behavior after loading.
**Validates: Requirements 15.3**

### Property 34: Encumbrance penalty application
*For any* inventory weight exceeding the limit, movement penalties should be applied proportionally to the amount over the limit.
**Validates: Requirements 16.2**

### Property 35: Durability reduction on use
*For any* item use, durability should decrease by the configured amount, and items at zero durability should be removed from inventory.
**Validates: Requirements 16.3**

### Property 36: Mod data loading and merging
*For any* valid mod data pack, the system should load and merge mod content with base game data according to priority rules without corrupting base data.
**Validates: Requirements 19.1**

## Technical Approach: Lightweight 3D Hybrid

### Why This Architecture

The Valheim/Project Zomboid hybrid approach was chosen for:

1. **Viral Potential**: Most viral survival games (Valheim, Rust, Zomboid, Minecraft) prioritize simulation depth over graphics
2. **10-Year Lifespan**: Fast iteration, low art costs, endless expansion, mod-friendly
3. **AI-Driven World**: GOAP factions, NPC memory, economy simulation work better in lightweight engines
4. **Multiplayer & Modding**: Seamless co-op, dedicated servers, community content
5. **Scalability**: 500+ NPCs possible vs 100-200 in photorealistic engines

### Rendering Approach

```typescript
interface RenderingConfig {
  style: 'stylized_3d';           // Valheim-style, not photorealistic
  maxDrawDistance: 500;           // Meters
  lodLevels: 4;                   // Aggressive LOD for NPC count
  shadowQuality: 'medium';        // Save GPU for simulation
  particleLimit: 1000;            // Reasonable effects
  terrainChunkSize: 64;           // Streaming chunks
}
```

### Simulation Priority

The engine prioritizes simulation budget over rendering:
- 60% CPU budget → AI systems (NPCs, enemies, factions)
- 25% CPU budget → World simulation (economy, weather, events)
- 15% CPU budget → Physics and rendering

### Modding Architecture

```typescript
interface ModSupport {
  dataFormats: ['json', 'yaml'];
  moddableContent: [
    'eras', 'factions', 'items', 'npcs', 'quests',
    'enemy_ai_configs', 'buildings', 'recipes', 'tech_trees'
  ];
  assetOverrides: ['textures', 'models', 'audio', 'ui'];
  scriptingSupport: 'lua_sandbox';
  workshopIntegration: true;
}
```

## Error Handling

### Error Categories

1. **AI System Errors**
   - Behavior tree invalid state
   - Micro-agent conflict resolution failure
   - ECA coordination deadlock
   - Perception calculation overflow

2. **Streaming Errors**
   - Region load failure
   - Asset streaming timeout
   - Memory allocation failure
   - Faction territory inconsistency

3. **Economy Errors**
   - Supply/demand calculation overflow
   - Price calculation negative result
   - Trade route circular dependency
   - Crafting impact calculation failure

4. **Save/Load Errors**
   - Serialization failure
   - Deserialization corruption
   - Version mismatch
   - Faction memory corruption

### Error Handling Strategy

- AI errors: Fall back to simpler behavior (Idle state)
- Streaming errors: Retry with exponential backoff, then load placeholder
- Economy errors: Clamp values to valid ranges, log warning
- Save errors: Validate before write, backup previous save

## Testing Strategy

### Unit Testing

We will use **Jest** (TypeScript) as the testing framework.

Unit tests will cover:
- Perception calculations (sight, hearing, memory decay)
- Behavior tree state transitions
- Micro-agent evaluations and conflict resolution
- ECA role assignment and flanking calculations
- Heat system escalation logic
- Player progression stat gains
- Economy triangle calculations
- Quest trigger evaluation

### Property-Based Testing

We will use **fast-check** (TypeScript) as the property-based testing library.

Each property-based test will:
- Run a minimum of 100 iterations
- Be tagged with: `// Feature: surviving-the-world, Property {number}: {property_text}`

Property-based tests will verify all 36 correctness properties defined above.

### Integration Testing

Integration tests will cover:
- Full enemy AI stack (Perception → Behavior Tree → Micro-agents → ECA)
- Faction heat escalation through combat encounters
- Player progression through gameplay actions
- Economy triangle interactions (craft → economy → building)
- Quest generation from world state changes
- Replayability engine across multiple game starts

## Performance Considerations

### Optimization Strategies

1. **AI LOD System**: Reduce AI update frequency for distant enemies
2. **Spatial Partitioning**: Quadtree for efficient enemy/NPC queries
3. **Behavior Tree Caching**: Cache evaluation results for unchanged contexts
4. **Streaming Prefetch**: Predict player movement and preload regions
5. **Object Pooling**: Reuse enemy, NPC, and projectile objects

### Performance Targets (Lightweight 3D Hybrid)

- 60 FPS with 500+ active NPCs (lightweight rendering enables deep simulation)
- Region streaming under 100ms
- AI update for 500 NPCs under 16ms (full frame budget)
- Save/load under 3 seconds
- Procedural terrain generation under 5 seconds
- Dedicated server support for 32+ players

