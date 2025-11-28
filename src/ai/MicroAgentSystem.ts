/**
 * Micro-Agent System - Enemy AI Stack Layer 3
 * Internal decision-making agents: Aggression, Tactics, Perception, Morale
 * Feature: surviving-the-world, Property 9: Micro-agent initialization completeness
 * Feature: surviving-the-world, Property 10: Aggression agent context sensitivity
 * Feature: surviving-the-world, Property 11: Micro-agent conflict resolution determinism
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

export interface CombatContext {
  enemyHealth: number;
  enemyMaxHealth: number;
  allyCount: number;
  enemyCount: number;
  playerThreatLevel: number;
  combatDuration: number;
  recentCasualties: number;
  distanceToPlayer: number;
  hascover: boolean;
  isOutnumbered: boolean;
}

export interface AggressionOutput {
  attackFrequency: number; // 0-1
  riskTolerance: number; // 0-1
  targetPriority: string[];
}

export interface TacticsOutput {
  recommendedBehavior: 'flank' | 'push' | 'suppress' | 'defend' | 'retreat';
  movementStyle: 'aggressive' | 'cautious' | 'evasive';
  useCoordination: boolean;
}

export interface PerceptionAgentOutput {
  alertness: number; // 0-1
  searchIntensity: number; // 0-1
  trackingAccuracy: number; // 0-1
}

export interface MoraleOutput {
  panicLevel: number; // 0-1
  willToFight: number; // 0-1
  surrenderThreshold: number;
}

export interface MicroAgentOutputs {
  aggression: AggressionOutput;
  tactics: TacticsOutput;
  perception: PerceptionAgentOutput;
  morale: MoraleOutput;
}

export interface ResolvedBehavior {
  action: 'attack' | 'flank' | 'defend' | 'retreat' | 'surrender' | 'search' | 'hold';
  intensity: number;
  coordination: boolean;
  priority: number;
}


export interface MicroAgentConfig {
  aggressionBase: number;
  healthWeight: number;
  allyWeight: number;
  flankPreference: number;
  coverPreference: number;
  casualtyImpact: number;
  durationDecay: number;
}

const DEFAULT_CONFIG: MicroAgentConfig = {
  aggressionBase: 0.5,
  healthWeight: 0.3,
  allyWeight: 0.4,
  flankPreference: 0.6,
  coverPreference: 0.7,
  casualtyImpact: 0.2,
  durationDecay: 0.05
};

export class MicroAgentSystem {
  private configs: Map<string, MicroAgentConfig> = new Map();
  private outputs: Map<string, MicroAgentOutputs> = new Map();

  initializeAgents(enemyId: string, config: Partial<MicroAgentConfig> = {}): MicroAgentOutputs {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    this.configs.set(enemyId, fullConfig);

    const outputs: MicroAgentOutputs = {
      aggression: { attackFrequency: 0.5, riskTolerance: 0.5, targetPriority: ['player'] },
      tactics: { recommendedBehavior: 'defend', movementStyle: 'cautious', useCoordination: false },
      perception: { alertness: 0.5, searchIntensity: 0.5, trackingAccuracy: 0.5 },
      morale: { panicLevel: 0, willToFight: 1, surrenderThreshold: 0.15 }
    };
    this.outputs.set(enemyId, outputs);
    return outputs;
  }

  getOutputs(enemyId: string): MicroAgentOutputs | undefined {
    return this.outputs.get(enemyId);
  }

  evaluateAggression(enemyId: string, context: CombatContext): AggressionOutput {
    const config = this.configs.get(enemyId) || DEFAULT_CONFIG;
    const outputs = this.outputs.get(enemyId);
    if (!outputs) return { attackFrequency: 0.5, riskTolerance: 0.5, targetPriority: ['player'] };

    const healthPercent = context.enemyHealth / context.enemyMaxHealth;
    const numbersAdvantage = context.allyCount / Math.max(1, context.enemyCount);

    // Lower health = lower aggression
    let aggression = config.aggressionBase;
    aggression -= (1 - healthPercent) * config.healthWeight;
    aggression += (numbersAdvantage - 1) * config.allyWeight;
    aggression -= context.playerThreatLevel * 0.2;

    aggression = Math.max(0, Math.min(1, aggression));

    outputs.aggression = {
      attackFrequency: aggression,
      riskTolerance: aggression * healthPercent,
      targetPriority: context.playerThreatLevel > 0.7 ? ['player', 'allies'] : ['weakest', 'player']
    };

    return outputs.aggression;
  }

  evaluateTactics(enemyId: string, context: CombatContext): TacticsOutput {
    const config = this.configs.get(enemyId) || DEFAULT_CONFIG;
    const outputs = this.outputs.get(enemyId);
    if (!outputs) return { recommendedBehavior: 'defend', movementStyle: 'cautious', useCoordination: false };

    const healthPercent = context.enemyHealth / context.enemyMaxHealth;
    const hasAdvantage = context.allyCount > context.enemyCount;

    let behavior: TacticsOutput['recommendedBehavior'] = 'defend';
    let movement: TacticsOutput['movementStyle'] = 'cautious';

    if (healthPercent < 0.3) {
      behavior = 'retreat';
      movement = 'evasive';
    } else if (hasAdvantage && config.flankPreference > 0.5) {
      behavior = 'flank';
      movement = 'aggressive';
    } else if (context.hascover && config.coverPreference > 0.5) {
      behavior = 'suppress';
      movement = 'cautious';
    } else if (hasAdvantage) {
      behavior = 'push';
      movement = 'aggressive';
    }

    outputs.tactics = {
      recommendedBehavior: behavior,
      movementStyle: movement,
      useCoordination: context.allyCount > 1
    };

    return outputs.tactics;
  }

  evaluatePerception(enemyId: string, context: CombatContext): PerceptionAgentOutput {
    const outputs = this.outputs.get(enemyId);
    if (!outputs) return { alertness: 0.5, searchIntensity: 0.5, trackingAccuracy: 0.5 };

    const alertness = Math.min(1, 0.3 + context.playerThreatLevel * 0.7);
    const searchIntensity = context.distanceToPlayer > 20 ? 0.8 : 0.4;
    const trackingAccuracy = Math.max(0.3, 1 - context.distanceToPlayer / 50);

    outputs.perception = { alertness, searchIntensity, trackingAccuracy };
    return outputs.perception;
  }

  evaluateMorale(enemyId: string, context: CombatContext): MoraleOutput {
    const config = this.configs.get(enemyId) || DEFAULT_CONFIG;
    const outputs = this.outputs.get(enemyId);
    if (!outputs) return { panicLevel: 0, willToFight: 1, surrenderThreshold: 0.15 };

    const healthPercent = context.enemyHealth / context.enemyMaxHealth;
    
    let panicLevel = 0;
    panicLevel += context.recentCasualties * config.casualtyImpact;
    panicLevel += context.combatDuration * config.durationDecay;
    panicLevel += context.isOutnumbered ? 0.2 : 0;
    panicLevel = Math.min(1, panicLevel);

    const willToFight = Math.max(0, 1 - panicLevel - (1 - healthPercent) * 0.3);

    outputs.morale = {
      panicLevel,
      willToFight,
      surrenderThreshold: 0.15 + panicLevel * 0.1
    };

    return outputs.morale;
  }

  resolveConflicts(enemyId: string, context: CombatContext): ResolvedBehavior {
    const outputs = this.outputs.get(enemyId);
    if (!outputs) {
      return { action: 'hold', intensity: 0.5, coordination: false, priority: 0 };
    }

    // Evaluate all agents
    this.evaluateAggression(enemyId, context);
    this.evaluateTactics(enemyId, context);
    this.evaluatePerception(enemyId, context);
    this.evaluateMorale(enemyId, context);

    // Priority: Morale > Tactics > Aggression
    // If morale is critical, override everything
    if (outputs.morale.willToFight < outputs.morale.surrenderThreshold) {
      return { action: 'surrender', intensity: 0, coordination: false, priority: 10 };
    }

    if (outputs.morale.panicLevel > 0.7) {
      return { action: 'retreat', intensity: 1, coordination: false, priority: 9 };
    }

    // Map tactics behavior to action
    const behaviorMap: Record<string, ResolvedBehavior['action']> = {
      flank: 'flank',
      push: 'attack',
      suppress: 'attack',
      defend: 'defend',
      retreat: 'retreat'
    };

    const action = behaviorMap[outputs.tactics.recommendedBehavior] || 'hold';
    const intensity = outputs.aggression.attackFrequency;

    return {
      action,
      intensity,
      coordination: outputs.tactics.useCoordination,
      priority: outputs.aggression.attackFrequency * 5
    };
  }

  updateAgentWeights(enemyId: string, outcome: 'hit' | 'miss' | 'damaged' | 'kill'): void {
    const config = this.configs.get(enemyId);
    if (!config) return;

    // Adaptive learning - adjust weights based on outcomes
    switch (outcome) {
      case 'hit':
      case 'kill':
        config.aggressionBase = Math.min(1, config.aggressionBase + 0.05);
        break;
      case 'miss':
        config.aggressionBase = Math.max(0, config.aggressionBase - 0.02);
        break;
      case 'damaged':
        config.aggressionBase = Math.max(0, config.aggressionBase - 0.1);
        config.coverPreference = Math.min(1, config.coverPreference + 0.1);
        break;
    }
  }

  clearAgents(enemyId: string): void {
    this.configs.delete(enemyId);
    this.outputs.delete(enemyId);
  }
}
