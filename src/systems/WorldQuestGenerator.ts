/**
 * WorldQuestGenerator - Dynamic quest generation from world conditions
 * Feature: surviving-the-world
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 * Property 26: Quest generation from world conditions
 */

export interface WorldState {
  regions: Map<string, RegionState>;
  factions: Map<string, FactionState>;
  playerReputation: Map<string, number>;
  currentDay: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
}

export interface RegionState {
  id: string;
  hungerLevel: number;      // 0-100
  diseaseLevel: number;     // 0-100
  banditThreat: number;     // 0-100
  controllingFaction: string;
  population: number;
  resources: { food: number; medicine: number; gold: number };
}

export interface FactionState {
  id: string;
  atWar: string[];
  resources: { food: number; gold: number; manpower: number };
  playerStanding: number;   // -100 to 100
}

// === QUEST TRIGGERS ===
export type TriggerType = 'hunger' | 'war' | 'disease' | 'bandit' | 'reputation' | 'seasonal';

export interface QuestTrigger {
  type: TriggerType;
  condition: TriggerCondition;
  regionId?: string;
  factionId?: string;
  priority: number;
}

export interface TriggerCondition {
  field: string;
  operator: '>' | '<' | '==' | '>=' | '<=';
  value: number | string;
}

// === QUEST TEMPLATES ===
export interface QuestTemplate {
  id: string;
  triggerType: TriggerType;
  name: string;
  description: string;
  objectives: QuestObjectiveTemplate[];
  rewards: QuestRewardTemplate[];
  worldStateChanges: WorldStateChange[];
  duration?: number;  // Hours until expiration
  minReputation?: number;
  requiredFaction?: string;
}

export interface QuestObjectiveTemplate {
  type: 'collect' | 'deliver' | 'kill' | 'escort' | 'investigate' | 'negotiate' | 'craft';
  target: string;
  amount: number;
  location?: string;
}

export interface QuestRewardTemplate {
  type: 'gold' | 'item' | 'reputation' | 'unlock';
  target: string;
  amount: number;
}

export interface WorldStateChange {
  type: 'region' | 'faction' | 'player';
  targetId: string;
  field: string;
  delta: number;
}

// === GENERATED QUESTS ===
export interface GeneratedQuest {
  id: string;
  templateId: string;
  trigger: QuestTrigger;
  name: string;
  description: string;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  worldStateOnComplete: WorldStateChange[];
  expirationTime?: number;
  status: 'available' | 'active' | 'completed' | 'failed' | 'expired';
  progress: Map<string, number>;
  generatedAt: number;
  regionId?: string;
  factionId?: string;
}

export interface QuestObjective {
  id: string;
  type: string;
  description: string;
  target: string;
  required: number;
  current: number;
  completed: boolean;
}

export interface QuestReward {
  type: string;
  target: string;
  amount: number;
}

// === DEFAULT TEMPLATES ===
const DEFAULT_TEMPLATES: QuestTemplate[] = [
  // Hunger quests (Requirement 11.1)
  {
    id: 'hunger_food_delivery',
    triggerType: 'hunger',
    name: 'Famine Relief',
    description: 'The people are starving. Deliver food supplies to save them.',
    objectives: [{ type: 'deliver', target: 'food', amount: 50, location: '{region}' }],
    rewards: [
      { type: 'gold', target: 'player', amount: 100 },
      { type: 'reputation', target: '{faction}', amount: 15 }
    ],
    worldStateChanges: [{ type: 'region', targetId: '{region}', field: 'hungerLevel', delta: -30 }],
    duration: 72
  },
  {
    id: 'hunger_hunt',
    triggerType: 'hunger',
    name: 'Emergency Hunt',
    description: 'Hunt wild game to feed the hungry villagers.',
    objectives: [{ type: 'kill', target: 'deer', amount: 5 }],
    rewards: [
      { type: 'gold', target: 'player', amount: 50 },
      { type: 'reputation', target: '{faction}', amount: 10 }
    ],
    worldStateChanges: [{ type: 'region', targetId: '{region}', field: 'hungerLevel', delta: -15 }],
    duration: 48
  },
  // War quests (Requirement 11.2)
  {
    id: 'war_supply_run',
    triggerType: 'war',
    name: 'War Supplies',
    description: 'Deliver critical supplies to the front lines.',
    objectives: [{ type: 'deliver', target: 'weapons', amount: 20 }],
    rewards: [
      { type: 'gold', target: 'player', amount: 200 },
      { type: 'reputation', target: '{faction}', amount: 25 }
    ],
    worldStateChanges: [{ type: 'faction', targetId: '{faction}', field: 'manpower', delta: 10 }],
    duration: 48,
    minReputation: 20
  },
  {
    id: 'war_sabotage',
    triggerType: 'war',
    name: 'Sabotage Mission',
    description: 'Destroy enemy supply caches to weaken their forces.',
    objectives: [{ type: 'investigate', target: 'enemy_cache', amount: 3 }],
    rewards: [
      { type: 'gold', target: 'player', amount: 300 },
      { type: 'reputation', target: '{faction}', amount: 30 }
    ],
    worldStateChanges: [{ type: 'faction', targetId: '{enemy}', field: 'resources.food', delta: -100 }],
    duration: 72,
    minReputation: 30
  },
  {
    id: 'war_diplomacy',
    triggerType: 'war',
    name: 'Peace Envoy',
    description: 'Negotiate a ceasefire between warring factions.',
    objectives: [{ type: 'negotiate', target: '{enemy}', amount: 1 }],
    rewards: [
      { type: 'gold', target: 'player', amount: 500 },
      { type: 'reputation', target: '{faction}', amount: 40 },
      { type: 'reputation', target: '{enemy}', amount: 20 }
    ],
    worldStateChanges: [],
    duration: 120,
    minReputation: 50
  },
  // Disease quests (Requirement 11.3)
  {
    id: 'disease_medicine',
    triggerType: 'disease',
    name: 'Plague Response',
    description: 'Gather medicinal herbs to treat the sick.',
    objectives: [{ type: 'collect', target: 'medicinal_herbs', amount: 30 }],
    rewards: [
      { type: 'gold', target: 'player', amount: 80 },
      { type: 'reputation', target: '{faction}', amount: 20 }
    ],
    worldStateChanges: [{ type: 'region', targetId: '{region}', field: 'diseaseLevel', delta: -25 }],
    duration: 48
  },
  {
    id: 'disease_quarantine',
    triggerType: 'disease',
    name: 'Quarantine Enforcement',
    description: 'Help establish and maintain quarantine zones.',
    objectives: [{ type: 'escort', target: 'healer', amount: 3 }],
    rewards: [
      { type: 'gold', target: 'player', amount: 120 },
      { type: 'reputation', target: '{faction}', amount: 15 }
    ],
    worldStateChanges: [{ type: 'region', targetId: '{region}', field: 'diseaseLevel', delta: -20 }],
    duration: 72
  },
  // Bandit quests (Requirement 11.4)
  {
    id: 'bandit_elimination',
    triggerType: 'bandit',
    name: 'Bandit Hunters',
    description: 'Eliminate the bandit threat terrorizing the region.',
    objectives: [{ type: 'kill', target: 'bandit', amount: 10 }],
    rewards: [
      { type: 'gold', target: 'player', amount: 150 },
      { type: 'reputation', target: '{faction}', amount: 20 }
    ],
    worldStateChanges: [{ type: 'region', targetId: '{region}', field: 'banditThreat', delta: -30 }],
    duration: 96
  },
  {
    id: 'bandit_protection',
    triggerType: 'bandit',
    name: 'Caravan Guard',
    description: 'Protect merchant caravans from bandit attacks.',
    objectives: [{ type: 'escort', target: 'merchant_caravan', amount: 1 }],
    rewards: [
      { type: 'gold', target: 'player', amount: 100 },
      { type: 'item', target: 'trade_goods', amount: 5 }
    ],
    worldStateChanges: [{ type: 'region', targetId: '{region}', field: 'banditThreat', delta: -10 }],
    duration: 24
  },
  // Reputation quests (Requirement 11.5)
  {
    id: 'reputation_champion',
    triggerType: 'reputation',
    name: 'Champion of the People',
    description: 'You have earned the trust of the faction. Prove your worth in their greatest challenge.',
    objectives: [{ type: 'investigate', target: 'faction_artifact', amount: 1 }],
    rewards: [
      { type: 'gold', target: 'player', amount: 500 },
      { type: 'unlock', target: 'faction_armor', amount: 1 },
      { type: 'reputation', target: '{faction}', amount: 50 }
    ],
    worldStateChanges: [],
    duration: 168,
    minReputation: 75,
    requiredFaction: '{faction}'
  },
  // Seasonal quests
  {
    id: 'seasonal_harvest',
    triggerType: 'seasonal',
    name: 'Harvest Festival',
    description: 'Help with the autumn harvest before winter arrives.',
    objectives: [{ type: 'collect', target: 'crops', amount: 100 }],
    rewards: [
      { type: 'gold', target: 'player', amount: 75 },
      { type: 'item', target: 'preserved_food', amount: 20 }
    ],
    worldStateChanges: [{ type: 'region', targetId: '{region}', field: 'resources.food', delta: 50 }],
    duration: 168
  }
];

export class WorldQuestGenerator {
  private templates: QuestTemplate[];
  private activeQuests: Map<string, GeneratedQuest> = new Map();
  private completedQuestIds: Set<string> = new Set();
  private questIdCounter: number = 0;

  constructor(customTemplates?: QuestTemplate[]) {
    this.templates = customTemplates ?? DEFAULT_TEMPLATES;
  }

  // === TRIGGER EVALUATION (Requirement 11.1-11.5) ===

  evaluateTriggers(worldState: WorldState): QuestTrigger[] {
    const triggers: QuestTrigger[] = [];

    // Check each region for conditions
    for (const [regionId, region] of worldState.regions) {
      // Hunger triggers (11.1)
      if (region.hungerLevel > 60) {
        triggers.push({
          type: 'hunger',
          condition: { field: 'hungerLevel', operator: '>', value: 60 },
          regionId,
          factionId: region.controllingFaction,
          priority: region.hungerLevel
        });
      }

      // Disease triggers (11.3)
      if (region.diseaseLevel > 50) {
        triggers.push({
          type: 'disease',
          condition: { field: 'diseaseLevel', operator: '>', value: 50 },
          regionId,
          factionId: region.controllingFaction,
          priority: region.diseaseLevel
        });
      }

      // Bandit triggers (11.4)
      if (region.banditThreat > 40) {
        triggers.push({
          type: 'bandit',
          condition: { field: 'banditThreat', operator: '>', value: 40 },
          regionId,
          factionId: region.controllingFaction,
          priority: region.banditThreat
        });
      }
    }

    // Check factions for war conditions (11.2)
    for (const [factionId, faction] of worldState.factions) {
      if (faction.atWar.length > 0) {
        triggers.push({
          type: 'war',
          condition: { field: 'atWar.length', operator: '>', value: 0 },
          factionId,
          priority: 80 + faction.atWar.length * 10
        });
      }
    }

    // Check player reputation for faction quests (11.5)
    for (const [factionId, reputation] of worldState.playerReputation) {
      if (reputation >= 75) {
        triggers.push({
          type: 'reputation',
          condition: { field: 'playerReputation', operator: '>=', value: 75 },
          factionId,
          priority: reputation
        });
      }
    }

    // Seasonal triggers
    if (worldState.season === 'autumn') {
      triggers.push({
        type: 'seasonal',
        condition: { field: 'season', operator: '==', value: 'autumn' },
        priority: 50
      });
    }

    return triggers.sort((a, b) => b.priority - a.priority);
  }

  // === QUEST GENERATION (Property 26) ===

  generateQuest(trigger: QuestTrigger, worldState: WorldState): GeneratedQuest | null {
    // Find matching templates
    const matchingTemplates = this.templates.filter(t => {
      if (t.triggerType !== trigger.type) return false;
      
      // Check reputation requirement
      if (t.minReputation && trigger.factionId) {
        const rep = worldState.playerReputation.get(trigger.factionId) ?? 0;
        if (rep < t.minReputation) return false;
      }

      return true;
    });

    if (matchingTemplates.length === 0) return null;

    // Select random template
    const template = matchingTemplates[Math.floor(Math.random() * matchingTemplates.length)];

    // Generate quest from template
    const questId = `quest_${++this.questIdCounter}_${Date.now()}`;
    const regionId = trigger.regionId ?? this.getRandomRegion(worldState);
    const factionId = trigger.factionId ?? this.getRegionFaction(worldState, regionId);
    const enemyFaction = this.getEnemyFaction(worldState, factionId);

    const quest: GeneratedQuest = {
      id: questId,
      templateId: template.id,
      trigger,
      name: this.interpolate(template.name, { region: regionId, faction: factionId, enemy: enemyFaction }),
      description: this.interpolate(template.description, { region: regionId, faction: factionId, enemy: enemyFaction }),
      objectives: template.objectives.map((obj, i) => ({
        id: `${questId}_obj_${i}`,
        type: obj.type,
        description: `${obj.type} ${obj.amount} ${obj.target}`,
        target: this.interpolate(obj.target, { region: regionId, faction: factionId, enemy: enemyFaction }),
        required: obj.amount,
        current: 0,
        completed: false
      })),
      rewards: template.rewards.map(r => ({
        type: r.type,
        target: this.interpolate(r.target, { region: regionId, faction: factionId, enemy: enemyFaction }),
        amount: r.amount
      })),
      worldStateOnComplete: template.worldStateChanges.map(c => ({
        ...c,
        targetId: this.interpolate(c.targetId, { region: regionId, faction: factionId, enemy: enemyFaction })
      })),
      expirationTime: template.duration ? Date.now() + template.duration * 3600 * 1000 : undefined,
      status: 'available',
      progress: new Map(),
      generatedAt: Date.now(),
      regionId,
      factionId
    };

    this.activeQuests.set(questId, quest);
    return quest;
  }

  // === QUEST MANAGEMENT ===

  getActiveQuests(): GeneratedQuest[] {
    return Array.from(this.activeQuests.values()).filter(q => q.status === 'active');
  }

  getAvailableQuests(): GeneratedQuest[] {
    return Array.from(this.activeQuests.values()).filter(q => q.status === 'available');
  }

  acceptQuest(questId: string): boolean {
    const quest = this.activeQuests.get(questId);
    if (!quest || quest.status !== 'available') return false;
    quest.status = 'active';
    return true;
  }

  updateObjective(questId: string, objectiveId: string, progress: number): void {
    const quest = this.activeQuests.get(questId);
    if (!quest || quest.status !== 'active') return;

    const objective = quest.objectives.find(o => o.id === objectiveId);
    if (!objective) return;

    objective.current = Math.min(objective.required, objective.current + progress);
    objective.completed = objective.current >= objective.required;

    // Check if all objectives complete
    if (quest.objectives.every(o => o.completed)) {
      this.completeQuest(questId, true);
    }
  }

  completeQuest(questId: string, success: boolean): void {
    const quest = this.activeQuests.get(questId);
    if (!quest) return;

    quest.status = success ? 'completed' : 'failed';
    this.completedQuestIds.add(questId);
  }

  applyQuestOutcome(quest: GeneratedQuest, worldState: WorldState): void {
    if (quest.status !== 'completed') return;

    for (const change of quest.worldStateOnComplete) {
      if (change.type === 'region') {
        const region = worldState.regions.get(change.targetId);
        if (region) {
          (region as any)[change.field] = Math.max(0, Math.min(100, (region as any)[change.field] + change.delta));
        }
      } else if (change.type === 'faction') {
        const faction = worldState.factions.get(change.targetId);
        if (faction) {
          const fields = change.field.split('.');
          if (fields.length === 2 && fields[0] === 'resources') {
            (faction.resources as any)[fields[1]] += change.delta;
          } else {
            (faction as any)[change.field] += change.delta;
          }
        }
      }
    }
  }

  checkQuestExpiration(currentTime: number): GeneratedQuest[] {
    const expired: GeneratedQuest[] = [];
    
    for (const quest of this.activeQuests.values()) {
      if (quest.expirationTime && currentTime >= quest.expirationTime && quest.status !== 'completed') {
        quest.status = 'expired';
        expired.push(quest);
      }
    }

    return expired;
  }

  // === HELPERS ===

  private interpolate(text: string, vars: Record<string, string>): string {
    let result = text;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  }

  private getRandomRegion(worldState: WorldState): string {
    const regions = Array.from(worldState.regions.keys());
    return regions[Math.floor(Math.random() * regions.length)] ?? 'unknown';
  }

  private getRegionFaction(worldState: WorldState, regionId: string): string {
    return worldState.regions.get(regionId)?.controllingFaction ?? 'unknown';
  }

  private getEnemyFaction(worldState: WorldState, factionId: string): string {
    const faction = worldState.factions.get(factionId);
    if (faction && faction.atWar.length > 0) {
      return faction.atWar[0];
    }
    // Return any other faction
    for (const id of worldState.factions.keys()) {
      if (id !== factionId) return id;
    }
    return 'unknown';
  }

  // === SERIALIZATION ===

  serialize(): string {
    return JSON.stringify({
      activeQuests: Array.from(this.activeQuests.entries()).map(([id, q]) => ({
        ...q,
        progress: Array.from(q.progress.entries())
      })),
      completedQuestIds: Array.from(this.completedQuestIds),
      questIdCounter: this.questIdCounter
    });
  }

  deserialize(json: string): void {
    const data = JSON.parse(json);
    
    this.activeQuests.clear();
    for (const questData of data.activeQuests) {
      const quest: GeneratedQuest = {
        ...questData,
        progress: new Map(questData.progress)
      };
      this.activeQuests.set(quest.id, quest);
    }

    this.completedQuestIds = new Set(data.completedQuestIds);
    this.questIdCounter = data.questIdCounter;
  }
}
