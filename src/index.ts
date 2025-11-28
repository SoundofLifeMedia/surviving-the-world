/**
 * Surviving The World™ - Main Entry Point
 * AAA-caliber era-agnostic survival simulation game
 */

import { DataLoader } from './engine/DataLoader';
import { WorldStateManager } from './engine/WorldState';
import { PlayerSystem } from './systems/PlayerSystem';
import { InventorySystem } from './systems/InventorySystem';
import { CombatSystem } from './systems/CombatSystem';
import { CraftingSystem, Recipe } from './systems/CraftingSystem';
import { FactionSystem, Faction } from './systems/FactionSystem';
import { NPCSystem, NPC } from './systems/NPCSystem';
import { QuestSystem, QuestTemplate } from './systems/QuestSystem';
import { ConditionSystem } from './systems/ConditionSystem';
import { BuildingSystem } from './systems/BuildingSystem';
import { CombatAISystem } from './systems/CombatAISystem';
import { FactionGOAP } from './systems/FactionGOAP';
import { DiplomacySystem } from './systems/DiplomacySystem';
import { NPCAISystem } from './systems/NPCAISystem';
import { ChoiceSystem } from './systems/ChoiceSystem';
import { TechTreeSystem } from './systems/TechTreeSystem';
import { EconomySystem } from './systems/EconomySystem';
import { SaveLoadSystem } from './systems/SaveLoadSystem';
import { UISystem } from './ui/UISystem';
import { PerformanceManager, ObjectPool, SpatialGrid, LODSystem, Profiler, DataCache } from './engine/PerformanceSystem';
import { ModSystem } from './engine/ModSystem';

/**
 * Game Engine - Orchestrates all systems
 */
export class GameEngine {
  private dataLoader: DataLoader;
  private worldState: WorldStateManager;
  private playerSystem: PlayerSystem;
  private inventorySystem: InventorySystem;
  private combatSystem: CombatSystem;
  private craftingSystem: CraftingSystem;
  private factionSystem: FactionSystem;
  private npcSystem: NPCSystem;
  private questSystem: QuestSystem;

  private running: boolean = false;
  private lastUpdate: number = 0;
  private gameSpeed: number = 1; // 1 = real-time, higher = faster

  constructor() {
    this.dataLoader = new DataLoader('./data');
    this.worldState = new WorldStateManager('late_medieval');
    this.playerSystem = new PlayerSystem();
    this.inventorySystem = new InventorySystem(50);
    this.combatSystem = new CombatSystem();
    this.craftingSystem = new CraftingSystem(this.inventorySystem);
    this.factionSystem = new FactionSystem();
    this.npcSystem = new NPCSystem();
    this.questSystem = new QuestSystem();
  }

  async initialize(): Promise<void> {
    console.log('🎮 Surviving The World™ - Initializing...');

    // Load era data
    try {
      const era = this.dataLoader.loadEra('late_medieval');
      console.log(`📜 Loaded era: ${era.name} (${era.timeframe})`);

      // Load factions
      for (const factionId of era.factions) {
        try {
          const factionConfig = this.dataLoader.loadFaction(factionId);
          const faction: Faction = {
            id: factionConfig.id,
            name: factionConfig.name,
            type: factionConfig.type,
            alignment: factionConfig.base_alignment,
            resources: { ...factionConfig.resources },
            attitudeToPlayer: factionConfig.attitudeToPlayer,
            relations: new Map(Object.entries(factionConfig.relations)),
            personality: {
              aggression: factionConfig.ai_personality.aggression,
              riskAversion: factionConfig.ai_personality.risk_aversion,
              diplomacy: factionConfig.ai_personality.diplomacy,
              honor: factionConfig.ai_personality.honor
            },
            goals: [...factionConfig.goals],
            atWar: [],
            allies: []
          };
          this.factionSystem.registerFaction(faction);
          console.log(`⚔️ Loaded faction: ${faction.name}`);
        } catch (e) {
          console.warn(`⚠️ Could not load faction: ${factionId}`);
        }
      }

      // Load items
      for (const itemId of era.available_items) {
        try {
          const item = this.dataLoader.loadItem(itemId);
          this.inventorySystem.registerItemConfig(item);
          console.log(`📦 Loaded item: ${item.name}`);
        } catch (e) {
          console.warn(`⚠️ Could not load item: ${itemId}`);
        }
      }

      // Register example recipes
      this.registerRecipes();

      // Register example quest templates
      this.registerQuestTemplates();

      console.log('✅ Initialization complete!');
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  private registerRecipes(): void {
    const recipes: Recipe[] = [
      {
        id: 'bread',
        name: 'Bread',
        inputs: [{ itemId: 'grain', quantity: 2 }, { itemId: 'water', quantity: 1 }],
        outputs: [{ itemId: 'bread', quantity: 1 }],
        craftTimeSeconds: 60,
        requiresStation: 'oven_basic',
        unlockedBy: null
      },
      {
        id: 'bandage',
        name: 'Bandage',
        inputs: [{ itemId: 'herbs', quantity: 2 }],
        outputs: [{ itemId: 'bandage', quantity: 1 }],
        craftTimeSeconds: 30,
        requiresStation: null,
        unlockedBy: null
      }
    ];

    for (const recipe of recipes) {
      this.craftingSystem.registerRecipe(recipe);
    }
  }

  private registerQuestTemplates(): void {
    const templates: QuestTemplate[] = [
      {
        id: 'fetch_food_for_famine',
        type: 'template',
        triggers: ['famine_risk > 0.5', 'dayCount > 3'],
        roles: { quest_giver: 'village_elder', target_region: 'food_surplus' },
        steps: ['talk_to_quest_giver', 'travel_to_target_region', 'acquire_food', 'return_to_village'],
        outcomes: {
          success: { worldEffects: ['region.food_stock += 100'], rewards: { gold: 50, reputation: 10 } },
          failure: { worldEffects: ['famine_deaths += 20'], penalties: { reputation: -20 } }
        }
      }
    ];

    for (const template of templates) {
      this.questSystem.registerTemplate(template);
    }
  }

  start(): void {
    this.running = true;
    this.lastUpdate = Date.now();
    console.log('🚀 Game started!');
    this.gameLoop();
  }

  stop(): void {
    this.running = false;
    console.log('⏹️ Game stopped.');
  }

  private gameLoop(): void {
    if (!this.running) return;

    const now = Date.now();
    const deltaMs = now - this.lastUpdate;
    const deltaHours = (deltaMs / 1000 / 3600) * this.gameSpeed;
    this.lastUpdate = now;

    this.update(deltaHours);

    // Continue loop
    setTimeout(() => this.gameLoop(), 100); // 10 updates per second
  }

  update(deltaHours: number): void {
    // Update world state
    this.worldState.advanceTime(deltaHours);

    // Update player
    this.playerSystem.updateStats(deltaHours);

    // Update factions
    for (const faction of this.factionSystem.getAllFactions()) {
      this.factionSystem.updateFaction(faction.id, deltaHours);
    }

    // Update NPCs
    const currentHour = this.worldState.getTimeOfDay();
    for (const npc of this.npcSystem.getAllNPCs()) {
      this.npcSystem.updateNPC(npc.id, deltaHours, currentHour);
    }

    // Update crafting
    const completedJobs = this.craftingSystem.updateCrafting();
    for (const job of completedJobs) {
      this.craftingSystem.completeCrafting(job.id);
    }

    // Check quest triggers
    const triggeredQuests = this.questSystem.evaluateTriggers(this.worldState.getState());
    for (const templateId of triggeredQuests) {
      this.questSystem.generateQuest(templateId, this.worldState.getState());
    }

    // Check player thresholds
    const thresholds = this.playerSystem.checkThresholds();
    for (const event of thresholds) {
      if (event.threshold === 'critical') {
        console.log(`⚠️ CRITICAL: ${event.stat} at ${event.value.toFixed(1)}`);
      }
    }

    // Check if player is alive
    if (!this.playerSystem.isAlive()) {
      console.log('💀 GAME OVER - Player has died');
      this.stop();
    }
  }

  // Public API for game interactions
  getWorldState() { return this.worldState.getState(); }
  getPlayerStats() { return this.playerSystem.getStats(); }
  getInventory() { return this.inventorySystem.getItems(); }
  getFactions() { return this.factionSystem.getAllFactions(); }
  getNPCs() { return this.npcSystem.getAllNPCs(); }
  getActiveQuests() { return this.questSystem.getActiveQuests(); }

  addItemToInventory(itemId: string, quantity: number = 1): boolean {
    return this.inventorySystem.addItem(itemId, quantity);
  }

  craftItem(recipeId: string) {
    return this.craftingSystem.startCrafting(recipeId);
  }

  setGameSpeed(speed: number): void {
    this.gameSpeed = Math.max(0.1, Math.min(100, speed));
  }

  save(): string {
    return JSON.stringify({
      worldState: this.worldState.serialize(),
      player: this.playerSystem.serialize(),
      inventory: this.inventorySystem.serialize(),
      factions: this.factionSystem.serialize(),
      npcs: this.npcSystem.serialize(),
      quests: this.questSystem.serialize()
    });
  }
}

// Main execution
async function main() {
  const game = new GameEngine();
  await game.initialize();

  // Give player starting items
  game.addItemToInventory('grain', 10);
  game.addItemToInventory('sword_iron', 1);

  console.log('\n📊 Initial State:');
  console.log('Player Stats:', game.getPlayerStats());
  console.log('Inventory:', game.getInventory());
  console.log('Factions:', game.getFactions().map(f => f.name));

  // Start game with accelerated time for testing
  game.setGameSpeed(100); // 100x speed
  game.start();

  // Run for 10 seconds (simulates ~27 hours of game time at 100x)
  setTimeout(() => {
    game.stop();
    console.log('\n📊 Final State:');
    console.log('Day:', game.getWorldState().dayCount);
    console.log('Player Stats:', game.getPlayerStats());
    console.log('Active Quests:', game.getActiveQuests().length);
  }, 10000);
}

// Export for module usage
export { 
  DataLoader, 
  WorldStateManager, 
  PlayerSystem, 
  InventorySystem, 
  CombatSystem, 
  CraftingSystem, 
  FactionSystem, 
  NPCSystem, 
  QuestSystem,
  ConditionSystem,
  BuildingSystem,
  CombatAISystem,
  FactionGOAP,
  DiplomacySystem,
  NPCAISystem,
  ChoiceSystem,
  TechTreeSystem,
  EconomySystem,
  SaveLoadSystem,
  UISystem,
  PerformanceManager,
  ObjectPool,
  SpatialGrid,
  LODSystem,
  Profiler,
  DataCache,
  ModSystem
};

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
