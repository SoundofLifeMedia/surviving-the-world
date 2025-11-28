/**
 * Replayability Engine - Procedural squads, enemy evolution, world modifiers
 * Feature: surviving-the-world, Property 27: Procedural squad generation validity
 * Feature: surviving-the-world, Property 28: Enemy evolution from player patterns
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

export interface PlayerPattern {
  patternType: string;
  frequency: number;
  lastUsed: number;
  counterStrategy: string;
}

export interface EnemyEvolutionState {
  tacticalAdaptations: string[];
  squadCompositionBias: Map<string, number>;
  difficultyProgression: number;
  counterStrategies: string[];
}

export interface WorldModifier {
  id: string;
  type: 'daily' | 'weekly' | 'seasonal';
  effects: ModifierEffect[];
  duration: number;
  startTime: number;
}

export interface ModifierEffect {
  type: string;
  value?: number;
  multiplier?: number;
}

export interface FactionMemory {
  factionId: string;
  playerActions: string[];
  lastEncounter: number;
  hostilityLevel: number;
  knownTactics: string[];
}

export interface ProceduralSquadConfig {
  minSize: number;
  maxSize: number;
  roleDistribution: Record<string, number>;
  difficultyScale: number;
}


const COUNTER_STRATEGIES: Record<string, string> = {
  stealth_heavy: 'increased_patrols',
  aggressive: 'defensive_formations',
  ranged: 'cover_seeking',
  melee: 'maintain_distance',
  flanking: 'watch_flanks',
  hit_and_run: 'pursuit_tactics',
  defensive: 'siege_tactics'
};

const DEFAULT_MODIFIERS: WorldModifier[] = [
  {
    id: 'harsh_winter',
    type: 'seasonal',
    effects: [
      { type: 'temperature', value: -20 },
      { type: 'enemy_speed', multiplier: 0.8 },
      { type: 'food_scarcity', multiplier: 1.5 }
    ],
    duration: 604800000, // 7 days in ms
    startTime: 0
  },
  {
    id: 'bandit_surge',
    type: 'weekly',
    effects: [
      { type: 'enemy_spawn_rate', multiplier: 1.5 },
      { type: 'patrol_frequency', multiplier: 1.3 }
    ],
    duration: 86400000, // 1 day in ms
    startTime: 0
  },
  {
    id: 'plague_outbreak',
    type: 'weekly',
    effects: [
      { type: 'disease_chance', multiplier: 2.0 },
      { type: 'npc_population', multiplier: 0.8 }
    ],
    duration: 172800000, // 2 days in ms
    startTime: 0
  },
  {
    id: 'harvest_festival',
    type: 'seasonal',
    effects: [
      { type: 'food_abundance', multiplier: 1.5 },
      { type: 'trade_prices', multiplier: 0.8 },
      { type: 'faction_hostility', multiplier: 0.7 }
    ],
    duration: 259200000, // 3 days in ms
    startTime: 0
  }
];

export class ReplayabilityEngine {
  private worldSeed: number;
  private playerPatterns: Map<string, PlayerPattern[]> = new Map();
  private enemyEvolution: EnemyEvolutionState;
  private activeModifiers: WorldModifier[] = [];
  private factionMemories: Map<string, FactionMemory> = new Map();
  private random: () => number;

  constructor(seed?: number) {
    this.worldSeed = seed || Math.floor(Math.random() * 2147483647);
    this.random = this.createSeededRandom(this.worldSeed);
    
    this.enemyEvolution = {
      tacticalAdaptations: [],
      squadCompositionBias: new Map(),
      difficultyProgression: 1.0,
      counterStrategies: []
    };
  }

  private createSeededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  getWorldSeed(): number {
    return this.worldSeed;
  }

  generateProceduralSquad(regionId: string, baseDifficulty: number): string[] {
    const config: ProceduralSquadConfig = {
      minSize: 2,
      maxSize: 6,
      roleDistribution: {
        pointman: 0.3,
        flanker: 0.2,
        suppressor: 0.2,
        medic: 0.1,
        sniper: 0.1,
        leader: 0.1
      },
      difficultyScale: baseDifficulty * this.enemyEvolution.difficultyProgression
    };

    // Adjust size based on difficulty
    const sizeRange = config.maxSize - config.minSize;
    const squadSize = Math.floor(config.minSize + this.random() * sizeRange * config.difficultyScale);
    
    const squad: string[] = [];
    const roles = Object.keys(config.roleDistribution);

    // Apply composition bias from evolution
    for (let i = 0; i < squadSize; i++) {
      let selectedRole = this.selectWeightedRole(roles, config.roleDistribution);
      
      // Apply bias
      const bias = this.enemyEvolution.squadCompositionBias.get(selectedRole) || 0;
      if (bias > 0 && this.random() < bias) {
        selectedRole = this.selectWeightedRole(roles, config.roleDistribution);
      }

      squad.push(`${regionId}_enemy_${i}_${selectedRole}`);
    }

    return squad;
  }

  private selectWeightedRole(roles: string[], weights: Record<string, number>): string {
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = this.random() * totalWeight;
    
    for (const role of roles) {
      random -= weights[role];
      if (random <= 0) return role;
    }
    
    return roles[0];
  }

  recordPlayerPattern(playerId: string, actionType: string): void {
    let patterns = this.playerPatterns.get(playerId);
    if (!patterns) {
      patterns = [];
      this.playerPatterns.set(playerId, patterns);
    }

    const existing = patterns.find(p => p.patternType === actionType);
    if (existing) {
      existing.frequency++;
      existing.lastUsed = Date.now();
    } else {
      patterns.push({
        patternType: actionType,
        frequency: 1,
        lastUsed: Date.now(),
        counterStrategy: COUNTER_STRATEGIES[actionType] || 'adapt'
      });
    }

    // Trigger evolution if pattern is strong
    if (existing && existing.frequency > 5) {
      this.evolveEnemyTactics(playerId);
    }
  }

  evolveEnemyTactics(playerId: string): void {
    const patterns = this.playerPatterns.get(playerId) || [];
    
    // Find dominant patterns
    const dominantPatterns = patterns
      .filter(p => p.frequency > 3)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);

    // Add counter strategies
    for (const pattern of dominantPatterns) {
      if (!this.enemyEvolution.counterStrategies.includes(pattern.counterStrategy)) {
        this.enemyEvolution.counterStrategies.push(pattern.counterStrategy);
        this.enemyEvolution.tacticalAdaptations.push(`counter_${pattern.patternType}`);
      }
    }

    // Adjust squad composition bias
    if (dominantPatterns.some(p => p.patternType === 'ranged')) {
      this.enemyEvolution.squadCompositionBias.set('flanker', 0.3);
    }
    if (dominantPatterns.some(p => p.patternType === 'stealth_heavy')) {
      this.enemyEvolution.squadCompositionBias.set('sniper', 0.2);
    }

    // Increase difficulty over time
    this.enemyEvolution.difficultyProgression = Math.min(2.0, 
      this.enemyEvolution.difficultyProgression + 0.1);
  }

  getEnemyEvolution(): EnemyEvolutionState {
    return this.enemyEvolution;
  }

  applyWorldModifier(modifierId: string): WorldModifier | null {
    const template = DEFAULT_MODIFIERS.find(m => m.id === modifierId);
    if (!template) return null;

    const modifier: WorldModifier = {
      ...template,
      startTime: Date.now()
    };

    this.activeModifiers.push(modifier);
    return modifier;
  }

  generateRandomModifier(): WorldModifier {
    const template = DEFAULT_MODIFIERS[Math.floor(this.random() * DEFAULT_MODIFIERS.length)];
    const modifier: WorldModifier = {
      ...template,
      startTime: Date.now()
    };
    this.activeModifiers.push(modifier);
    return modifier;
  }

  updateModifiers(currentTime: number): WorldModifier[] {
    // Remove expired modifiers
    this.activeModifiers = this.activeModifiers.filter(m => 
      currentTime - m.startTime < m.duration
    );
    return this.activeModifiers;
  }

  getActiveModifiers(): WorldModifier[] {
    return this.activeModifiers;
  }

  getModifierEffect(effectType: string): { value?: number; multiplier?: number } {
    for (const modifier of this.activeModifiers) {
      const effect = modifier.effects.find(e => e.type === effectType);
      if (effect) return effect;
    }
    return {};
  }

  persistFactionMemory(factionId: string, action: string): void {
    let memory = this.factionMemories.get(factionId);
    if (!memory) {
      memory = {
        factionId,
        playerActions: [],
        lastEncounter: Date.now(),
        hostilityLevel: 0,
        knownTactics: []
      };
      this.factionMemories.set(factionId, memory);
    }

    memory.playerActions.push(action);
    memory.lastEncounter = Date.now();

    // Analyze for tactics
    if (memory.playerActions.length > 10) {
      const recentActions = memory.playerActions.slice(-10);
      const actionCounts: Record<string, number> = {};
      
      for (const a of recentActions) {
        actionCounts[a] = (actionCounts[a] || 0) + 1;
      }

      for (const [action, count] of Object.entries(actionCounts)) {
        if (count >= 3 && !memory.knownTactics.includes(action)) {
          memory.knownTactics.push(action);
        }
      }
    }
  }

  getFactionMemory(factionId: string): FactionMemory | undefined {
    return this.factionMemories.get(factionId);
  }

  predictPlayerTactics(playerId: string): { tactic: string; confidence: number }[] {
    const patterns = this.playerPatterns.get(playerId) || [];
    const total = patterns.reduce((sum, p) => sum + p.frequency, 0);
    
    return patterns
      .map(p => ({
        tactic: p.patternType,
        confidence: p.frequency / Math.max(1, total)
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  // Serialize for save/load
  serialize(): string {
    return JSON.stringify({
      worldSeed: this.worldSeed,
      playerPatterns: Array.from(this.playerPatterns.entries()),
      enemyEvolution: {
        ...this.enemyEvolution,
        squadCompositionBias: Array.from(this.enemyEvolution.squadCompositionBias.entries())
      },
      activeModifiers: this.activeModifiers,
      factionMemories: Array.from(this.factionMemories.entries())
    });
  }

  deserialize(json: string): void {
    const data = JSON.parse(json);
    this.worldSeed = data.worldSeed;
    this.random = this.createSeededRandom(this.worldSeed);
    this.playerPatterns = new Map(data.playerPatterns);
    this.enemyEvolution = {
      ...data.enemyEvolution,
      squadCompositionBias: new Map(data.enemyEvolution.squadCompositionBias)
    };
    this.activeModifiers = data.activeModifiers;
    this.factionMemories = new Map(data.factionMemories);
  }
}
