/**
 * BALANCE SENTINEL — Tier 1 System AI Agent
 * Ensures enemy AI upgrades do not violate fairness or pacing
 * Validates all combat/AI proposals for game balance
 * 
 * Enterprise-grade governance for Surviving The World™
 */

import { AgentProposal, GovernanceResult } from './SimulationChair';

export interface BalanceMetrics {
  playerDeathRate: number;        // Deaths per hour
  averageCombatDuration: number;  // Seconds
  playerWinRate: number;          // 0-1
  difficultyScore: number;        // 0-100
  fairnessIndex: number;          // 0-1 (1 = perfectly fair)
}

export interface BalanceThresholds {
  maxPlayerDeathRate: number;
  minPlayerWinRate: number;
  maxDifficultySpike: number;
  minFairnessIndex: number;
}

export interface EnemyBalanceProfile {
  enemyType: string;
  baseDamage: number;
  baseHealth: number;
  detectionRange: number;
  reactionTime: number;  // ms
  accuracy: number;      // 0-1
  groupSize: number;
}

export interface BalanceViolation {
  type: 'damage_too_high' | 'reaction_too_fast' | 'accuracy_too_high' | 
        'detection_too_far' | 'unfair_advantage' | 'difficulty_spike';
  severity: 'minor' | 'moderate' | 'severe';
  details: string;
  suggestedFix?: string;
}

// Fair play constants based on AAA game standards
const FAIR_PLAY_LIMITS = {
  // Enemy reaction time must be >= human reaction time
  MIN_REACTION_TIME_MS: 200,
  
  // Max accuracy for non-boss enemies
  MAX_STANDARD_ACCURACY: 0.7,
  MAX_ELITE_ACCURACY: 0.85,
  
  // Detection ranges (meters)
  MAX_SIGHT_RANGE_DAY: 100,
  MAX_SIGHT_RANGE_NIGHT: 30,
  MAX_HEARING_RANGE: 50,
  
  // Damage scaling
  MAX_DAMAGE_PER_HIT_PERCENT: 0.25,  // Max 25% of player health per hit
  
  // Group tactics
  MAX_SIMULTANEOUS_ATTACKERS: 3,
  MIN_ATTACK_INTERVAL_MS: 500,
  
  // Difficulty curve
  MAX_DIFFICULTY_INCREASE_PER_HOUR: 0.1
};

export class BalanceSentinel {
  private metrics: BalanceMetrics;
  private thresholds: BalanceThresholds;
  private enemyProfiles: Map<string, EnemyBalanceProfile> = new Map();
  private violations: BalanceViolation[] = [];
  private enabled: boolean = true;

  constructor(thresholds?: Partial<BalanceThresholds>) {
    this.metrics = {
      playerDeathRate: 0,
      averageCombatDuration: 30,
      playerWinRate: 0.6,
      difficultyScore: 50,
      fairnessIndex: 1.0
    };

    this.thresholds = {
      maxPlayerDeathRate: 2.0,      // Max 2 deaths per hour
      minPlayerWinRate: 0.4,        // Player should win at least 40%
      maxDifficultySpike: 0.3,      // Max 30% difficulty increase
      minFairnessIndex: 0.7,        // Minimum fairness score
      ...thresholds
    };
  }

  // === PROPOSAL VALIDATION ===

  validateProposal(proposal: AgentProposal): GovernanceResult {
    if (!this.enabled) {
      return { passed: true, message: 'Balance Sentinel disabled' };
    }

    const violations: BalanceViolation[] = [];

    // Check if proposal affects enemy AI
    if (this.isEnemyAIProposal(proposal)) {
      violations.push(...this.validateEnemyAI(proposal));
    }

    // Check if proposal affects combat
    if (this.isCombatProposal(proposal)) {
      violations.push(...this.validateCombat(proposal));
    }

    // Check if proposal affects difficulty
    if (this.isDifficultyProposal(proposal)) {
      violations.push(...this.validateDifficulty(proposal));
    }

    // Store violations for reporting
    this.violations.push(...violations);

    // Determine if proposal passes
    const severeViolations = violations.filter(v => v.severity === 'severe');
    const moderateViolations = violations.filter(v => v.severity === 'moderate');

    if (severeViolations.length > 0) {
      return {
        passed: false,
        message: `Balance violation: ${severeViolations[0].details}`,
        details: { violations: severeViolations }
      };
    }

    if (moderateViolations.length >= 3) {
      return {
        passed: false,
        message: 'Too many moderate balance violations',
        details: { violations: moderateViolations }
      };
    }

    return {
      passed: true,
      message: violations.length > 0 
        ? `Passed with ${violations.length} minor warnings`
        : 'Balance check passed'
    };
  }

  private isEnemyAIProposal(proposal: AgentProposal): boolean {
    return proposal.targetSystem === 'enemy_ai' || 
           proposal.targetSystem === 'combat' ||
           String(proposal.payload).includes('enemy');
  }

  private isCombatProposal(proposal: AgentProposal): boolean {
    return proposal.targetSystem === 'combat' ||
           String(proposal.payload).includes('damage') ||
           String(proposal.payload).includes('attack');
  }

  private isDifficultyProposal(proposal: AgentProposal): boolean {
    return String(proposal.payload).includes('difficulty') ||
           String(proposal.payload).includes('scaling');
  }

  // === ENEMY AI VALIDATION ===

  private validateEnemyAI(proposal: AgentProposal): BalanceViolation[] {
    const violations: BalanceViolation[] = [];
    const payload = proposal.payload as Record<string, unknown>;

    // Check reaction time
    if (payload.reactionTime !== undefined) {
      const reactionTime = Number(payload.reactionTime);
      if (reactionTime < FAIR_PLAY_LIMITS.MIN_REACTION_TIME_MS) {
        violations.push({
          type: 'reaction_too_fast',
          severity: 'severe',
          details: `Reaction time ${reactionTime}ms is below human capability (${FAIR_PLAY_LIMITS.MIN_REACTION_TIME_MS}ms)`,
          suggestedFix: `Set reactionTime >= ${FAIR_PLAY_LIMITS.MIN_REACTION_TIME_MS}`
        });
      }
    }

    // Check accuracy
    if (payload.accuracy !== undefined) {
      const accuracy = Number(payload.accuracy);
      const isElite = String(payload.enemyType || '').includes('elite');
      const maxAccuracy = isElite ? FAIR_PLAY_LIMITS.MAX_ELITE_ACCURACY : FAIR_PLAY_LIMITS.MAX_STANDARD_ACCURACY;
      
      if (accuracy > maxAccuracy) {
        violations.push({
          type: 'accuracy_too_high',
          severity: accuracy > 0.95 ? 'severe' : 'moderate',
          details: `Accuracy ${accuracy} exceeds fair limit (${maxAccuracy})`,
          suggestedFix: `Set accuracy <= ${maxAccuracy}`
        });
      }
    }

    // Check detection range
    if (payload.detectionRange !== undefined) {
      const range = Number(payload.detectionRange);
      if (range > FAIR_PLAY_LIMITS.MAX_SIGHT_RANGE_DAY) {
        violations.push({
          type: 'detection_too_far',
          severity: 'moderate',
          details: `Detection range ${range}m exceeds fair limit (${FAIR_PLAY_LIMITS.MAX_SIGHT_RANGE_DAY}m)`,
          suggestedFix: `Set detectionRange <= ${FAIR_PLAY_LIMITS.MAX_SIGHT_RANGE_DAY}`
        });
      }
    }

    // Check for omniscient/cheating patterns
    const payloadStr = JSON.stringify(payload).toLowerCase();
    const cheatingPatterns = ['omniscient', 'wallhack', 'aimbot', 'perfect_prediction'];
    for (const pattern of cheatingPatterns) {
      if (payloadStr.includes(pattern)) {
        violations.push({
          type: 'unfair_advantage',
          severity: 'severe',
          details: `Proposal contains cheating pattern: ${pattern}`,
          suggestedFix: 'Remove unfair AI advantages'
        });
      }
    }

    return violations;
  }

  // === COMBAT VALIDATION ===

  private validateCombat(proposal: AgentProposal): BalanceViolation[] {
    const violations: BalanceViolation[] = [];
    const payload = proposal.payload as Record<string, unknown>;

    // Check damage values
    if (payload.damage !== undefined) {
      const damage = Number(payload.damage);
      const playerMaxHealth = 100; // Standard player health
      const maxDamagePerHit = playerMaxHealth * FAIR_PLAY_LIMITS.MAX_DAMAGE_PER_HIT_PERCENT;
      
      if (damage > maxDamagePerHit) {
        violations.push({
          type: 'damage_too_high',
          severity: damage > playerMaxHealth * 0.5 ? 'severe' : 'moderate',
          details: `Damage ${damage} exceeds fair limit (${maxDamagePerHit})`,
          suggestedFix: `Set damage <= ${maxDamagePerHit}`
        });
      }
    }

    // Check simultaneous attackers
    if (payload.simultaneousAttackers !== undefined) {
      const attackers = Number(payload.simultaneousAttackers);
      if (attackers > FAIR_PLAY_LIMITS.MAX_SIMULTANEOUS_ATTACKERS) {
        violations.push({
          type: 'unfair_advantage',
          severity: 'moderate',
          details: `${attackers} simultaneous attackers exceeds fair limit (${FAIR_PLAY_LIMITS.MAX_SIMULTANEOUS_ATTACKERS})`,
          suggestedFix: `Limit to ${FAIR_PLAY_LIMITS.MAX_SIMULTANEOUS_ATTACKERS} attackers`
        });
      }
    }

    return violations;
  }

  // === DIFFICULTY VALIDATION ===

  private validateDifficulty(proposal: AgentProposal): BalanceViolation[] {
    const violations: BalanceViolation[] = [];
    const payload = proposal.payload as Record<string, unknown>;

    // Check difficulty scaling
    if (payload.difficultyMultiplier !== undefined) {
      const multiplier = Number(payload.difficultyMultiplier);
      const currentDifficulty = this.metrics.difficultyScore / 100;
      const increase = multiplier - currentDifficulty;
      
      if (increase > FAIR_PLAY_LIMITS.MAX_DIFFICULTY_INCREASE_PER_HOUR) {
        violations.push({
          type: 'difficulty_spike',
          severity: increase > 0.5 ? 'severe' : 'moderate',
          details: `Difficulty increase ${(increase * 100).toFixed(1)}% exceeds limit (${FAIR_PLAY_LIMITS.MAX_DIFFICULTY_INCREASE_PER_HOUR * 100}%)`,
          suggestedFix: 'Apply gradual difficulty scaling'
        });
      }
    }

    return violations;
  }

  // === METRICS TRACKING ===

  updateMetrics(metrics: Partial<BalanceMetrics>): void {
    this.metrics = { ...this.metrics, ...metrics };
    this.calculateFairnessIndex();
  }

  private calculateFairnessIndex(): void {
    // Fairness is based on multiple factors
    let fairness = 1.0;

    // Death rate factor
    if (this.metrics.playerDeathRate > this.thresholds.maxPlayerDeathRate) {
      fairness -= 0.2;
    }

    // Win rate factor
    if (this.metrics.playerWinRate < this.thresholds.minPlayerWinRate) {
      fairness -= 0.3;
    }

    // Difficulty factor
    if (this.metrics.difficultyScore > 80) {
      fairness -= 0.1;
    }

    this.metrics.fairnessIndex = Math.max(0, fairness);
  }

  getMetrics(): BalanceMetrics {
    return { ...this.metrics };
  }

  // === ENEMY PROFILES ===

  registerEnemyProfile(profile: EnemyBalanceProfile): BalanceViolation[] {
    const violations: BalanceViolation[] = [];

    // Validate profile before registering
    if (profile.reactionTime < FAIR_PLAY_LIMITS.MIN_REACTION_TIME_MS) {
      violations.push({
        type: 'reaction_too_fast',
        severity: 'severe',
        details: `Enemy ${profile.enemyType} has unfair reaction time`
      });
    }

    if (profile.accuracy > FAIR_PLAY_LIMITS.MAX_STANDARD_ACCURACY) {
      violations.push({
        type: 'accuracy_too_high',
        severity: 'moderate',
        details: `Enemy ${profile.enemyType} has high accuracy`
      });
    }

    // Register if no severe violations
    if (!violations.some(v => v.severity === 'severe')) {
      this.enemyProfiles.set(profile.enemyType, profile);
    }

    return violations;
  }

  getEnemyProfile(enemyType: string): EnemyBalanceProfile | undefined {
    return this.enemyProfiles.get(enemyType);
  }

  // === CONTROL ===

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getViolations(limit: number = 50): BalanceViolation[] {
    return this.violations.slice(-limit);
  }

  clearViolations(): void {
    this.violations = [];
  }

  // === SERIALIZATION ===

  serialize(): object {
    return {
      enabled: this.enabled,
      metrics: this.metrics,
      thresholds: this.thresholds,
      enemyProfiles: Array.from(this.enemyProfiles.entries()),
      violationCount: this.violations.length
    };
  }
}

// Singleton
let sentinelInstance: BalanceSentinel | null = null;

export function getBalanceSentinel(): BalanceSentinel {
  if (!sentinelInstance) {
    sentinelInstance = new BalanceSentinel();
  }
  return sentinelInstance;
}

export default BalanceSentinel;
