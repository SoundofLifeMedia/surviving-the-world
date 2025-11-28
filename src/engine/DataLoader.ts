/**
 * Data Loader
 * Loads and validates JSON configuration files for eras, factions, items, NPCs, quests, and tech
 * Supports hot reload for rapid iteration
 */

import * as fs from 'fs';
import * as path from 'path';

export interface EraConfig {
  id: string;
  name: string;
  timeframe: string;
  base_tech_tier: number;
  factions: string[];
  biomes: string[];
  global_modifiers: {
    disease_risk: number;
    war_frequency: number;
    famine_risk: number;
  };
  available_items: string[];
  available_crafting_recipes: string[];
  era_events: string[];
}

export interface FactionConfig {
  id: string;
  name: string;
  type: string;
  base_alignment: string;
  resources: {
    food: number;
    gold: number;
    manpower: number;
  };
  attitudeToPlayer: number;
  relations: Record<string, number>;
  ai_personality: {
    aggression: number;
    risk_aversion: number;
    diplomacy: number;
    honor: number;
  };
  goals: string[];
}

export interface ItemConfig {
  id: string;
  name: string;
  type: string;
  weight: number;
  durability: number;
  stackable: boolean;
  maxStack?: number;
  traits: string[];
  stats?: Record<string, number>;
  requirements?: Record<string, any>;
}

export interface NPCConfig {
  id: string;
  name: string;
  role: string;
  faction: string;
  personality: {
    aggression: number;
    altruism: number;
    greed: number;
    curiosity: number;
    lawfulness: number;
  };
  schedule: Array<{
    time: number;
    activity: string;
    location: string;
  }>;
}

export interface QuestConfig {
  id: string;
  type: string;
  triggers: string[];
  roles: Record<string, string>;
  steps: string[];
  outcomes: {
    success: {
      worldEffects: string[];
    };
    failure: {
      worldEffects: string[];
    };
  };
}

export interface TechConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  eraSpecific: boolean;
  requirements: Array<{
    type: string;
    value: any;
  }>;
  benefits: Array<{
    type: string;
    value: any;
  }>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * DataLoader class
 * Handles loading, caching, and validation of all game data
 */
export class DataLoader {
  private dataPath: string;
  private eraCache: Map<string, EraConfig> = new Map();
  private factionCache: Map<string, FactionConfig> = new Map();
  private itemCache: Map<string, ItemConfig> = new Map();
  private npcCache: Map<string, NPCConfig> = new Map();
  private questCache: Map<string, QuestConfig> = new Map();
  private techCache: Map<string, TechConfig> = new Map();

  constructor(dataPath: string = './data') {
    this.dataPath = dataPath;
  }

  /**
   * Load era configuration
   */
  loadEra(eraId: string): EraConfig {
    if (this.eraCache.has(eraId)) {
      return this.eraCache.get(eraId)!;
    }

    const filePath = path.join(this.dataPath, 'eras', `${eraId}.json`);
    const data = this.loadJSON<EraConfig>(filePath);
    
    this.validateEra(data);
    this.eraCache.set(eraId, data);
    
    return data;
  }

  /**
   * Load faction configuration
   */
  loadFaction(factionId: string): FactionConfig {
    if (this.factionCache.has(factionId)) {
      return this.factionCache.get(factionId)!;
    }

    const filePath = path.join(this.dataPath, 'factions', `${factionId}.json`);
    const data = this.loadJSON<FactionConfig>(filePath);
    
    this.validateFaction(data);
    this.factionCache.set(factionId, data);
    
    return data;
  }

  /**
   * Load item configuration
   */
  loadItem(itemId: string): ItemConfig {
    if (this.itemCache.has(itemId)) {
      return this.itemCache.get(itemId)!;
    }

    const filePath = path.join(this.dataPath, 'items', `${itemId}.json`);
    const data = this.loadJSON<ItemConfig>(filePath);
    
    this.validateItem(data);
    this.itemCache.set(itemId, data);
    
    return data;
  }

  /**
   * Load NPC configuration
   */
  loadNPC(npcId: string): NPCConfig {
    if (this.npcCache.has(npcId)) {
      return this.npcCache.get(npcId)!;
    }

    const filePath = path.join(this.dataPath, 'npcs', `${npcId}.json`);
    const data = this.loadJSON<NPCConfig>(filePath);
    
    this.validateNPC(data);
    this.npcCache.set(npcId, data);
    
    return data;
  }

  /**
   * Load quest configuration
   */
  loadQuest(questId: string): QuestConfig {
    if (this.questCache.has(questId)) {
      return this.questCache.get(questId)!;
    }

    const filePath = path.join(this.dataPath, 'quests', `${questId}.json`);
    const data = this.loadJSON<QuestConfig>(filePath);
    
    this.validateQuest(data);
    this.questCache.set(questId, data);
    
    return data;
  }

  /**
   * Load tech configuration
   */
  loadTech(techId: string): TechConfig {
    if (this.techCache.has(techId)) {
      return this.techCache.get(techId)!;
    }

    const filePath = path.join(this.dataPath, 'tech', `${techId}.json`);
    const data = this.loadJSON<TechConfig>(filePath);
    
    this.validateTech(data);
    this.techCache.set(techId, data);
    
    return data;
  }

  /**
   * Reload all cached data (hot reload)
   */
  reloadAll(): void {
    this.eraCache.clear();
    this.factionCache.clear();
    this.itemCache.clear();
    this.npcCache.clear();
    this.questCache.clear();
    this.techCache.clear();
    
    console.log('🔄 All data caches cleared - ready for hot reload');
  }

  /**
   * Validate all references in loaded data
   */
  validateReferences(): ValidationResult {
    const errors: string[] = [];

    // Validate era references to factions and items
    for (const [eraId, era] of this.eraCache) {
      for (const factionId of era.factions) {
        if (!this.factionCache.has(factionId)) {
          errors.push(`Era ${eraId} references unknown faction: ${factionId}`);
        }
      }
      
      for (const itemId of era.available_items) {
        if (!this.itemCache.has(itemId)) {
          errors.push(`Era ${eraId} references unknown item: ${itemId}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Load JSON file
   */
  private loadJSON<T>(filePath: string): T {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      throw new Error(`Failed to load ${filePath}: ${error}`);
    }
  }

  /**
   * Validate era configuration
   */
  private validateEra(era: EraConfig): void {
    if (!era.id) throw new Error('Era missing required field: id');
    if (!era.name) throw new Error('Era missing required field: name');
    if (!era.factions || era.factions.length === 0) {
      throw new Error(`Era ${era.id} must have at least one faction`);
    }
  }

  /**
   * Validate faction configuration
   */
  private validateFaction(faction: FactionConfig): void {
    if (!faction.id) throw new Error('Faction missing required field: id');
    if (!faction.name) throw new Error('Faction missing required field: name');
    if (!faction.resources) throw new Error('Faction missing required field: resources');
  }

  /**
   * Validate item configuration
   */
  private validateItem(item: ItemConfig): void {
    if (!item.id) throw new Error('Item missing required field: id');
    if (!item.name) throw new Error('Item missing required field: name');
    if (item.weight < 0) throw new Error(`Item ${item.id} has negative weight`);
  }

  /**
   * Validate NPC configuration
   */
  private validateNPC(npc: NPCConfig): void {
    if (!npc.id) throw new Error('NPC missing required field: id');
    if (!npc.name) throw new Error('NPC missing required field: name');
    if (!npc.personality) throw new Error('NPC missing required field: personality');
  }

  /**
   * Validate quest configuration
   */
  private validateQuest(quest: QuestConfig): void {
    if (!quest.id) throw new Error('Quest missing required field: id');
    if (!quest.triggers || quest.triggers.length === 0) {
      throw new Error(`Quest ${quest.id} must have at least one trigger`);
    }
  }

  /**
   * Validate tech configuration
   */
  private validateTech(tech: TechConfig): void {
    if (!tech.id) throw new Error('Tech missing required field: id');
    if (!tech.name) throw new Error('Tech missing required field: name');
  }
}

// Export singleton instance
export const dataLoader = new DataLoader();
