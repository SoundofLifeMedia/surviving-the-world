/**
 * TACTICS AGENT — Tier 2 Enemy AI Agent
 * Handles flanking, retreats, backup calls, ambushes
 * JSON-driven, deterministic, governed by Balance Sentinel
 * 
 * Requirements: Fair AI, no cheating, biome-aware
 */

import { getBalanceSentinel } from '../governance/BalanceSentinel';

export interface Vector3 { x: number; y: number; z: number; }

export type TacticType = 
  | 'direct_assault'
  | 'flank_left'
  | 'flank_right'
  | 'pincer'
  | 'retreat_regroup'
  | 'ambush_setup'
  | 'suppressive_fire'
  | 'bait_and_switch'
  | 'high_ground'
  | 'defensive_hold';

export interface TacticCondition {
  type: 'health' | 'morale' | 'allies' | 'enemies' | 'distance' | 'cover' | 'weather' | 'time' | 'terrain';
  operator: '<' | '>' | '==' | '<=' | '>=';
  value: number | string;
}

export interface TacticRule {
  id: string;
  name: string;
  conditions: TacticCondition[];
  tactic: TacticType;
  priority: number;
  cooldownSeconds: number;
}

export interface TacticContext {
  enemyId: string;
  health: number;
  maxHealth: number;
  morale: number;
  allyCount: number;
  enemyCount: number;
  distanceToPlayer: number;
  hasCover: boolean;
  weather: string;
  timeOfDay: number;
  terrain: string;
  position: Vector3;
  playerPosition: Vector3;
}

export interface TacticResult {
  tactic: TacticType;
  targetPosition: Vector3 | null;
  shouldCallBackup: boolean;
  shouldRetreat: boolean;
  confidence: number;
  reasoning: string;
}

// Default tactic rules (JSON-driven, can be loaded from data files)
const DEFAULT_TACTIC_RULES: TacticRule[] = [
  // Retreat conditions
  {
    id: 'retreat_low_health',
    name: 'Retreat when critically wounded',
    conditions: [
      { type: 'health', operator: '<', value: 0.2 }
    ],
    tactic: 'retreat_regroup',
    priority: 100,
    cooldownSeconds: 30
  },
  {
    id: 'retreat_low_morale',
    name: 'Retreat when morale broken',
    conditions: [
      { type: 'morale', operator: '<', value: 20 }
    ],
    tactic: 'retreat_regroup',
    priority: 95,
    cooldownSeconds: 30
  },
  {
    id: 'retreat_outnumbered',
    name: 'Retreat when heavily outnumbered',
    conditions: [
      { type: 'allies', operator: '<', value: 1 },
      { type: 'enemies', operator: '>=', value: 3 }
    ],
    tactic: 'retreat_regroup',
    priority: 90,
    cooldownSeconds: 45
  },

  // Flanking conditions
  {
    id: 'flank_with_allies',
    name: 'Flank when have numerical advantage',
    conditions: [
      { type: 'allies', operator: '>=', value: 2 },
      { type: 'distance', operator: '>', value: 15 }
    ],
    tactic: 'pincer',
    priority: 70,
    cooldownSeconds: 20
  },
  {
    id: 'flank_single',
    name: 'Solo flank when player distracted',
    conditions: [
      { type: 'enemies', operator: '>=', value: 2 },
      { type: 'distance', operator: '>', value: 20 }
    ],
    tactic: 'flank_left',
    priority: 60,
    cooldownSeconds: 15
  },

  // Ambush conditions
  {
    id: 'ambush_night',
    name: 'Set ambush at night',
    conditions: [
      { type: 'time', operator: '<', value: 6 },
      { type: 'distance', operator: '>', value: 30 }
    ],
    tactic: 'ambush_setup',
    priority: 75,
    cooldownSeconds: 60
  },
  {
    id: 'ambush_rain',
    name: 'Ambush in rain (reduced visibility)',
    conditions: [
      { type: 'weather', operator: '==', value: 'rain' },
      { type: 'distance', operator: '>', value: 25 }
    ],
    tactic: 'ambush_setup',
    priority: 70,
    cooldownSeconds: 60
  },

  // Terrain-based tactics
  {
    id: 'high_ground_hills',
    name: 'Seek high ground in hills',
    conditions: [
      { type: 'terrain', operator: '==', value: 'hills' },
      { type: 'distance', operator: '>', value: 20 }
    ],
    tactic: 'high_ground',
    priority: 65,
    cooldownSeconds: 30
  },

  // Defensive conditions
  {
    id: 'defensive_wounded',
    name: 'Hold defensive when wounded',
    conditions: [
      { type: 'health', operator: '<', value: 0.5 },
      { type: 'cover', operator: '==', value: 1 }
    ],
    tactic: 'defensive_hold',
    priority: 80,
    cooldownSeconds: 10
  },

  // Default assault
  {
    id: 'default_assault',
    name: 'Direct assault (default)',
    conditions: [],
    tactic: 'direct_assault',
    priority: 10,
    cooldownSeconds: 0
  }
];

export class TacticsAgent {
  private rules: TacticRule[] = [...DEFAULT_TACTIC_RULES];
  private cooldowns: Map<string, number> = new Map();
  private lastTactics: Map<string, TacticType> = new Map();
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  // Seeded random for determinism
  private seededRandom(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  // === TACTIC EVALUATION ===

  evaluateTactics(context: TacticContext): TacticResult {
    const now = Date.now();
    const applicableRules: TacticRule[] = [];

    // Find all rules whose conditions are met
    for (const rule of this.rules) {
      // Check cooldown
      const lastUsed = this.cooldowns.get(`${context.enemyId}_${rule.id}`) || 0;
      if (now - lastUsed < rule.cooldownSeconds * 1000) {
        continue;
      }

      // Check all conditions
      if (this.evaluateConditions(rule.conditions, context)) {
        applicableRules.push(rule);
      }
    }

    // Sort by priority (highest first)
    applicableRules.sort((a, b) => b.priority - a.priority);

    // Select best tactic
    const selectedRule = applicableRules[0] || this.rules.find(r => r.id === 'default_assault')!;
    
    // Update cooldown
    this.cooldowns.set(`${context.enemyId}_${selectedRule.id}`, now);
    this.lastTactics.set(context.enemyId, selectedRule.tactic);

    // Calculate target position based on tactic
    const targetPosition = this.calculateTargetPosition(selectedRule.tactic, context);

    // Determine if should call backup
    const shouldCallBackup = this.shouldCallBackup(context, selectedRule.tactic);

    // Determine if should retreat
    const shouldRetreat = selectedRule.tactic === 'retreat_regroup';

    // Calculate confidence
    const confidence = this.calculateConfidence(selectedRule, applicableRules.length);

    return {
      tactic: selectedRule.tactic,
      targetPosition,
      shouldCallBackup,
      shouldRetreat,
      confidence,
      reasoning: `Selected ${selectedRule.name} (priority ${selectedRule.priority})`
    };
  }

  private evaluateConditions(conditions: TacticCondition[], context: TacticContext): boolean {
    for (const condition of conditions) {
      const contextValue = this.getContextValue(condition.type, context);
      
      if (!this.compareValues(contextValue, condition.operator, condition.value)) {
        return false;
      }
    }
    return true;
  }

  private getContextValue(type: TacticCondition['type'], context: TacticContext): number | string {
    switch (type) {
      case 'health': return context.health / context.maxHealth;
      case 'morale': return context.morale;
      case 'allies': return context.allyCount;
      case 'enemies': return context.enemyCount;
      case 'distance': return context.distanceToPlayer;
      case 'cover': return context.hasCover ? 1 : 0;
      case 'weather': return context.weather;
      case 'time': return context.timeOfDay;
      case 'terrain': return context.terrain;
      default: return 0;
    }
  }

  private compareValues(
    contextValue: number | string,
    operator: TacticCondition['operator'],
    targetValue: number | string
  ): boolean {
    // Handle string comparisons
    if (typeof contextValue === 'string' || typeof targetValue === 'string') {
      return operator === '==' ? contextValue === targetValue : contextValue !== targetValue;
    }

    // Numeric comparisons
    switch (operator) {
      case '<': return contextValue < targetValue;
      case '>': return contextValue > targetValue;
      case '==': return contextValue === targetValue;
      case '<=': return contextValue <= targetValue;
      case '>=': return contextValue >= targetValue;
      default: return false;
    }
  }

  // === POSITION CALCULATION ===

  private calculateTargetPosition(tactic: TacticType, context: TacticContext): Vector3 | null {
    const { position, playerPosition } = context;
    
    // Calculate direction to player
    const dx = playerPosition.x - position.x;
    const dz = playerPosition.z - position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance === 0) return null;

    const dirX = dx / distance;
    const dirZ = dz / distance;

    // Perpendicular direction for flanking
    const perpX = -dirZ;
    const perpZ = dirX;

    switch (tactic) {
      case 'direct_assault':
        // Move towards player
        return {
          x: position.x + dirX * 5,
          y: position.y,
          z: position.z + dirZ * 5
        };

      case 'flank_left':
        // Move perpendicular left then towards player
        return {
          x: position.x + perpX * 15 + dirX * 5,
          y: position.y,
          z: position.z + perpZ * 15 + dirZ * 5
        };

      case 'flank_right':
        // Move perpendicular right then towards player
        return {
          x: position.x - perpX * 15 + dirX * 5,
          y: position.y,
          z: position.z - perpZ * 15 + dirZ * 5
        };

      case 'pincer':
        // Alternate sides based on seeded random
        const side = this.seededRandom() > 0.5 ? 1 : -1;
        return {
          x: position.x + perpX * 20 * side + dirX * 10,
          y: position.y,
          z: position.z + perpZ * 20 * side + dirZ * 10
        };

      case 'retreat_regroup':
        // Move away from player
        return {
          x: position.x - dirX * 20,
          y: position.y,
          z: position.z - dirZ * 20
        };

      case 'ambush_setup':
        // Move to intercept position ahead of player
        return {
          x: playerPosition.x + dirX * 30,
          y: position.y,
          z: playerPosition.z + dirZ * 30
        };

      case 'high_ground':
        // Move to elevated position (simplified)
        return {
          x: position.x + perpX * 10,
          y: position.y + 5,
          z: position.z + perpZ * 10
        };

      case 'defensive_hold':
        // Stay in current position
        return null;

      case 'suppressive_fire':
        // Maintain distance
        return {
          x: position.x - dirX * 2,
          y: position.y,
          z: position.z - dirZ * 2
        };

      case 'bait_and_switch':
        // Move towards then retreat
        return {
          x: position.x + dirX * 8,
          y: position.y,
          z: position.z + dirZ * 8
        };

      default:
        return null;
    }
  }

  private shouldCallBackup(context: TacticContext, tactic: TacticType): boolean {
    // Call backup when outnumbered or executing group tactics
    if (context.allyCount < context.enemyCount) return true;
    if (tactic === 'pincer' && context.allyCount < 2) return true;
    if (context.health / context.maxHealth < 0.3) return true;
    return false;
  }

  private calculateConfidence(selectedRule: TacticRule, alternativeCount: number): number {
    // Higher priority = higher confidence
    // More alternatives = lower confidence (situation is ambiguous)
    const priorityFactor = selectedRule.priority / 100;
    const alternativeFactor = 1 / (1 + alternativeCount * 0.1);
    return Math.min(0.95, priorityFactor * alternativeFactor + 0.3);
  }

  // === RULE MANAGEMENT ===

  addRule(rule: TacticRule): boolean {
    // Validate with Balance Sentinel
    const sentinel = getBalanceSentinel();
    const violations = sentinel.validateProposal({
      agentId: 'tactics_agent',
      agentTier: 2,
      proposalType: 'add',
      targetSystem: 'enemy_ai',
      payload: rule,
      confidence: 0.9,
      timestamp: Date.now()
    });

    if (!violations.passed) {
      console.warn(`[TacticsAgent] Rule rejected: ${violations.message}`);
      return false;
    }

    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
    return true;
  }

  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  getRules(): TacticRule[] {
    return [...this.rules];
  }

  // === STATE ===

  getLastTactic(enemyId: string): TacticType | undefined {
    return this.lastTactics.get(enemyId);
  }

  clearCooldowns(): void {
    this.cooldowns.clear();
  }

  // === SERIALIZATION ===

  serialize(): object {
    return {
      rules: this.rules,
      seed: this.seed
    };
  }

  static deserialize(data: { rules: TacticRule[]; seed: number }): TacticsAgent {
    const agent = new TacticsAgent(data.seed);
    agent.rules = data.rules;
    return agent;
  }
}

export default TacticsAgent;
