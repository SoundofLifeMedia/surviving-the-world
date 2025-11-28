/**
 * Tech Tree System
 * Era-specific and global technology progression
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

export interface TechRequirement {
  type: 'tech' | 'resource' | 'building' | 'faction_relation' | 'day';
  id?: string;
  amount?: number;
  comparison?: 'gte' | 'lte' | 'eq';
}

export interface TechBenefit {
  type: 'unlock_recipe' | 'unlock_building' | 'unlock_item' | 'stat_bonus' | 'unlock_action';
  id: string;
  value?: number;
}

export interface Tech {
  id: string;
  name: string;
  description: string;
  category: 'survival' | 'combat' | 'crafting' | 'building' | 'social' | 'economy';
  era: string | 'global'; // 'global' means available in all eras
  tier: number;
  requirements: TechRequirement[];
  benefits: TechBenefit[];
  researchTime: number; // hours
  researchCost: { resource: string; amount: number }[];
}

export interface TechProgress {
  techId: string;
  progress: number; // 0-1
  startTime: number;
  paused: boolean;
}

export class TechTreeSystem {
  private techs: Map<string, Tech> = new Map();
  private unlockedTechs: Set<string> = new Set();
  private currentResearch: TechProgress | null = null;
  private currentEra: string = 'late_medieval';

  constructor() {
    this.registerDefaultTechs();
  }

  private registerDefaultTechs(): void {
    const defaultTechs: Tech[] = [
      // Survival Tier 1
      {
        id: 'basic_survival',
        name: 'Basic Survival',
        description: 'Fundamental survival techniques',
        category: 'survival',
        era: 'global',
        tier: 1,
        requirements: [],
        benefits: [
          { type: 'unlock_recipe', id: 'campfire' },
          { type: 'unlock_recipe', id: 'basic_shelter' }
        ],
        researchTime: 0,
        researchCost: []
      },
      {
        id: 'foraging',
        name: 'Foraging',
        description: 'Identify edible plants and herbs',
        category: 'survival',
        era: 'global',
        tier: 1,
        requirements: [{ type: 'tech', id: 'basic_survival' }],
        benefits: [
          { type: 'unlock_action', id: 'forage' },
          { type: 'stat_bonus', id: 'forage_yield', value: 0.2 }
        ],
        researchTime: 2,
        researchCost: []
      },
      {
        id: 'hunting',
        name: 'Hunting',
        description: 'Track and hunt animals',
        category: 'survival',
        era: 'global',
        tier: 1,
        requirements: [{ type: 'tech', id: 'basic_survival' }],
        benefits: [
          { type: 'unlock_action', id: 'hunt' },
          { type: 'unlock_recipe', id: 'snare_trap' }
        ],
        researchTime: 3,
        researchCost: []
      },

      // Crafting Tier 1-2
      {
        id: 'basic_crafting',
        name: 'Basic Crafting',
        description: 'Create simple tools and items',
        category: 'crafting',
        era: 'global',
        tier: 1,
        requirements: [],
        benefits: [
          { type: 'unlock_recipe', id: 'stone_knife' },
          { type: 'unlock_recipe', id: 'wooden_club' }
        ],
        researchTime: 0,
        researchCost: []
      },
      {
        id: 'woodworking',
        name: 'Woodworking',
        description: 'Work with wood to create structures and tools',
        category: 'crafting',
        era: 'global',
        tier: 2,
        requirements: [{ type: 'tech', id: 'basic_crafting' }],
        benefits: [
          { type: 'unlock_recipe', id: 'wooden_bow' },
          { type: 'unlock_recipe', id: 'wooden_shield' },
          { type: 'unlock_building', id: 'wooden_wall' }
        ],
        researchTime: 4,
        researchCost: [{ resource: 'wood', amount: 20 }]
      },
      {
        id: 'leatherworking',
        name: 'Leatherworking',
        description: 'Process hides into leather goods',
        category: 'crafting',
        era: 'global',
        tier: 2,
        requirements: [{ type: 'tech', id: 'hunting' }],
        benefits: [
          { type: 'unlock_recipe', id: 'leather_armor' },
          { type: 'unlock_recipe', id: 'leather_bag' }
        ],
        researchTime: 5,
        researchCost: [{ resource: 'hide', amount: 10 }]
      },

      // Combat Tier 1-3
      {
        id: 'basic_combat',
        name: 'Basic Combat',
        description: 'Fundamental fighting techniques',
        category: 'combat',
        era: 'global',
        tier: 1,
        requirements: [],
        benefits: [
          { type: 'stat_bonus', id: 'melee_damage', value: 0.1 }
        ],
        researchTime: 0,
        researchCost: []
      },
      {
        id: 'archery',
        name: 'Archery',
        description: 'Use bows effectively',
        category: 'combat',
        era: 'global',
        tier: 2,
        requirements: [
          { type: 'tech', id: 'basic_combat' },
          { type: 'tech', id: 'woodworking' }
        ],
        benefits: [
          { type: 'unlock_item', id: 'bow_wood' },
          { type: 'stat_bonus', id: 'ranged_accuracy', value: 0.15 }
        ],
        researchTime: 6,
        researchCost: []
      },
      {
        id: 'swordsmanship',
        name: 'Swordsmanship',
        description: 'Master the art of the blade',
        category: 'combat',
        era: 'late_medieval',
        tier: 3,
        requirements: [
          { type: 'tech', id: 'basic_combat' },
          { type: 'tech', id: 'ironworking' }
        ],
        benefits: [
          { type: 'stat_bonus', id: 'melee_damage', value: 0.25 },
          { type: 'unlock_action', id: 'parry' }
        ],
        researchTime: 10,
        researchCost: []
      },

      // Building Tier 1-3
      {
        id: 'basic_construction',
        name: 'Basic Construction',
        description: 'Build simple structures',
        category: 'building',
        era: 'global',
        tier: 1,
        requirements: [{ type: 'tech', id: 'woodworking' }],
        benefits: [
          { type: 'unlock_building', id: 'wooden_hut' },
          { type: 'unlock_building', id: 'storage_shed' }
        ],
        researchTime: 5,
        researchCost: [{ resource: 'wood', amount: 30 }]
      },
      {
        id: 'masonry',
        name: 'Masonry',
        description: 'Work with stone for durable construction',
        category: 'building',
        era: 'global',
        tier: 2,
        requirements: [{ type: 'tech', id: 'basic_construction' }],
        benefits: [
          { type: 'unlock_building', id: 'stone_house' },
          { type: 'unlock_building', id: 'stone_wall' }
        ],
        researchTime: 8,
        researchCost: [{ resource: 'stone', amount: 50 }]
      },
      {
        id: 'fortification',
        name: 'Fortification',
        description: 'Build defensive structures',
        category: 'building',
        era: 'late_medieval',
        tier: 3,
        requirements: [{ type: 'tech', id: 'masonry' }],
        benefits: [
          { type: 'unlock_building', id: 'watchtower' },
          { type: 'unlock_building', id: 'gate' },
          { type: 'stat_bonus', id: 'defense_bonus', value: 0.3 }
        ],
        researchTime: 12,
        researchCost: [{ resource: 'stone', amount: 100 }, { resource: 'iron', amount: 20 }]
      },

      // Economy Tier 2-3
      {
        id: 'ironworking',
        name: 'Ironworking',
        description: 'Smelt and forge iron',
        category: 'economy',
        era: 'global',
        tier: 2,
        requirements: [{ type: 'tech', id: 'basic_crafting' }],
        benefits: [
          { type: 'unlock_building', id: 'forge' },
          { type: 'unlock_recipe', id: 'iron_sword' },
          { type: 'unlock_recipe', id: 'iron_tools' }
        ],
        researchTime: 10,
        researchCost: [{ resource: 'iron_ore', amount: 30 }]
      },
      {
        id: 'advanced_construction',
        name: 'Advanced Construction',
        description: 'Build complex structures',
        category: 'building',
        era: 'late_medieval',
        tier: 3,
        requirements: [{ type: 'tech', id: 'masonry' }, { type: 'tech', id: 'ironworking' }],
        benefits: [
          { type: 'unlock_building', id: 'warehouse' },
          { type: 'unlock_building', id: 'workshop' }
        ],
        researchTime: 15,
        researchCost: [{ resource: 'stone', amount: 80 }, { resource: 'iron', amount: 40 }]
      },
      {
        id: 'trade_routes',
        name: 'Trade Routes',
        description: 'Establish profitable trade connections',
        category: 'economy',
        era: 'late_medieval',
        tier: 3,
        requirements: [{ type: 'tech', id: 'basic_construction' }],
        benefits: [
          { type: 'unlock_action', id: 'establish_trade' },
          { type: 'stat_bonus', id: 'trade_profit', value: 0.2 }
        ],
        researchTime: 8,
        researchCost: [{ resource: 'gold', amount: 100 }]
      },

      // Social Tier 2-3
      {
        id: 'diplomacy',
        name: 'Diplomacy',
        description: 'Negotiate with factions',
        category: 'social',
        era: 'global',
        tier: 2,
        requirements: [],
        benefits: [
          { type: 'unlock_action', id: 'negotiate' },
          { type: 'stat_bonus', id: 'faction_reputation_gain', value: 0.15 }
        ],
        researchTime: 6,
        researchCost: []
      },
      {
        id: 'leadership',
        name: 'Leadership',
        description: 'Inspire and command others',
        category: 'social',
        era: 'global',
        tier: 3,
        requirements: [{ type: 'tech', id: 'diplomacy' }],
        benefits: [
          { type: 'unlock_action', id: 'recruit_follower' },
          { type: 'stat_bonus', id: 'follower_morale', value: 0.2 }
        ],
        researchTime: 10,
        researchCost: []
      }
    ];

    for (const tech of defaultTechs) {
      this.techs.set(tech.id, tech);
    }

    // Auto-unlock tier 0 techs
    this.unlockedTechs.add('basic_survival');
    this.unlockedTechs.add('basic_crafting');
    this.unlockedTechs.add('basic_combat');
  }


  // Register a new tech
  registerTech(tech: Tech): void {
    this.techs.set(tech.id, tech);
  }

  // Get tech by ID
  getTech(techId: string): Tech | undefined {
    return this.techs.get(techId);
  }

  // Get all techs
  getAllTechs(): Tech[] {
    return Array.from(this.techs.values());
  }

  // Get techs for current era
  getAvailableTechs(): Tech[] {
    return Array.from(this.techs.values()).filter(t => 
      t.era === 'global' || t.era === this.currentEra
    );
  }

  // Check if tech is unlocked
  isUnlocked(techId: string): boolean {
    return this.unlockedTechs.has(techId);
  }

  // Get unlocked techs
  getUnlockedTechs(): Tech[] {
    return Array.from(this.unlockedTechs)
      .map(id => this.techs.get(id))
      .filter((t): t is Tech => t !== undefined);
  }

  // Check if tech can be unlocked
  canUnlock(techId: string, playerState: {
    resources: Map<string, number>;
    buildings: Set<string>;
    factionRelations: Map<string, number>;
    currentDay: number;
  }): { canUnlock: boolean; missingRequirements: string[] } {
    const tech = this.techs.get(techId);
    if (!tech) return { canUnlock: false, missingRequirements: ['Tech not found'] };
    if (this.unlockedTechs.has(techId)) return { canUnlock: false, missingRequirements: ['Already unlocked'] };

    // Check era
    if (tech.era !== 'global' && tech.era !== this.currentEra) {
      return { canUnlock: false, missingRequirements: [`Requires era: ${tech.era}`] };
    }

    const missing: string[] = [];

    for (const req of tech.requirements) {
      switch (req.type) {
        case 'tech':
          if (!this.unlockedTechs.has(req.id!)) {
            missing.push(`Requires tech: ${this.techs.get(req.id!)?.name || req.id}`);
          }
          break;
        case 'resource':
          const amount = playerState.resources.get(req.id!) || 0;
          if (amount < (req.amount || 0)) {
            missing.push(`Requires ${req.amount} ${req.id}`);
          }
          break;
        case 'building':
          if (!playerState.buildings.has(req.id!)) {
            missing.push(`Requires building: ${req.id}`);
          }
          break;
        case 'faction_relation':
          const relation = playerState.factionRelations.get(req.id!) || 0;
          if (!this.checkComparison(relation, req.comparison || 'gte', req.amount || 0)) {
            missing.push(`Requires faction relation with ${req.id}`);
          }
          break;
        case 'day':
          if (!this.checkComparison(playerState.currentDay, req.comparison || 'gte', req.amount || 0)) {
            missing.push(`Requires day ${req.amount}`);
          }
          break;
      }
    }

    // Check research cost
    for (const cost of tech.researchCost) {
      const amount = playerState.resources.get(cost.resource) || 0;
      if (amount < cost.amount) {
        missing.push(`Requires ${cost.amount} ${cost.resource}`);
      }
    }

    return { canUnlock: missing.length === 0, missingRequirements: missing };
  }

  private checkComparison(value: number, comparison: string, target: number): boolean {
    switch (comparison) {
      case 'gte': return value >= target;
      case 'lte': return value <= target;
      case 'eq': return value === target;
      default: return false;
    }
  }

  // Start researching a tech
  startResearch(techId: string): boolean {
    const tech = this.techs.get(techId);
    if (!tech || this.currentResearch) return false;

    this.currentResearch = {
      techId,
      progress: 0,
      startTime: Date.now(),
      paused: false
    };

    return true;
  }

  // Update research progress
  updateResearch(deltaHours: number): { completed: boolean; techId?: string } {
    if (!this.currentResearch || this.currentResearch.paused) {
      return { completed: false };
    }

    const tech = this.techs.get(this.currentResearch.techId);
    if (!tech) return { completed: false };

    const progressIncrement = deltaHours / tech.researchTime;
    this.currentResearch.progress = Math.min(1, this.currentResearch.progress + progressIncrement);

    if (this.currentResearch.progress >= 1) {
      const completedTechId = this.currentResearch.techId;
      this.unlockTech(completedTechId);
      this.currentResearch = null;
      return { completed: true, techId: completedTechId };
    }

    return { completed: false };
  }

  // Pause/resume research
  pauseResearch(): void {
    if (this.currentResearch) {
      this.currentResearch.paused = true;
    }
  }

  resumeResearch(): void {
    if (this.currentResearch) {
      this.currentResearch.paused = false;
    }
  }

  // Cancel research
  cancelResearch(): void {
    this.currentResearch = null;
  }

  // Get current research
  getCurrentResearch(): TechProgress | null {
    return this.currentResearch;
  }

  // Unlock a tech directly
  unlockTech(techId: string): boolean {
    const tech = this.techs.get(techId);
    if (!tech || this.unlockedTechs.has(techId)) return false;

    this.unlockedTechs.add(techId);
    return true;
  }

  // Get tech benefits
  getTechBenefits(techId: string): TechBenefit[] {
    return this.techs.get(techId)?.benefits || [];
  }

  // Get all unlocked benefits
  getAllUnlockedBenefits(): TechBenefit[] {
    const benefits: TechBenefit[] = [];
    for (const techId of this.unlockedTechs) {
      const tech = this.techs.get(techId);
      if (tech) {
        benefits.push(...tech.benefits);
      }
    }
    return benefits;
  }

  // Get stat bonuses from unlocked techs
  getStatBonuses(): Map<string, number> {
    const bonuses: Map<string, number> = new Map();
    
    for (const benefit of this.getAllUnlockedBenefits()) {
      if (benefit.type === 'stat_bonus' && benefit.value !== undefined) {
        const current = bonuses.get(benefit.id) || 0;
        bonuses.set(benefit.id, current + benefit.value);
      }
    }

    return bonuses;
  }

  // Get unlocked recipes
  getUnlockedRecipes(): string[] {
    return this.getAllUnlockedBenefits()
      .filter(b => b.type === 'unlock_recipe')
      .map(b => b.id);
  }

  // Get unlocked buildings
  getUnlockedBuildings(): string[] {
    return this.getAllUnlockedBenefits()
      .filter(b => b.type === 'unlock_building')
      .map(b => b.id);
  }

  // Get unlocked items
  getUnlockedItems(): string[] {
    return this.getAllUnlockedBenefits()
      .filter(b => b.type === 'unlock_item')
      .map(b => b.id);
  }

  // Get unlocked actions
  getUnlockedActions(): string[] {
    return this.getAllUnlockedBenefits()
      .filter(b => b.type === 'unlock_action')
      .map(b => b.id);
  }

  // Set current era
  setEra(era: string): void {
    this.currentEra = era;
  }

  // Get tech tree for visualization
  getTechTree(): { nodes: Tech[]; edges: { from: string; to: string }[] } {
    const availableTechs = this.getAvailableTechs();
    const edges: { from: string; to: string }[] = [];

    for (const tech of availableTechs) {
      for (const req of tech.requirements) {
        if (req.type === 'tech' && req.id) {
          edges.push({ from: req.id, to: tech.id });
        }
      }
    }

    return { nodes: availableTechs, edges };
  }

  // Serialization
  serialize(): string {
    return JSON.stringify({
      unlockedTechs: Array.from(this.unlockedTechs),
      currentResearch: this.currentResearch,
      currentEra: this.currentEra
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.unlockedTechs = new Set(parsed.unlockedTechs);
    this.currentResearch = parsed.currentResearch;
    this.currentEra = parsed.currentEra;
  }
}
