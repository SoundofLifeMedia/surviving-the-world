/**
 * Risk Assessment Service - Evaluates AI decisions for risk before execution
 * Feature: risk-authority-telemetry
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import {
  AIDecision,
  CascadingEffect,
  RiskAssessment,
  RiskConfig,
  DEFAULT_RISK_CONFIG,
  IRiskAssessmentService
} from '../core/types/RiskTypes';

/**
 * Assessment log entry
 */
export interface AssessmentLog {
  timestamp: number;
  decisionId: string;
  decisionType: string;
  riskScore: number;
  approved: boolean;
  rejectionReason?: string;
}

/**
 * RiskAssessmentService - Evaluates and scores AI decisions for risk
 */
export class RiskAssessmentService implements IRiskAssessmentService {
  private config: RiskConfig;
  private decisionQueue: AIDecision[] = [];
  private assessmentLogs: AssessmentLog[] = [];
  private maxLogEntries: number = 10000;

  constructor(config: Partial<RiskConfig> = {}) {
    this.config = {
      threshold: config.threshold ?? DEFAULT_RISK_CONFIG.threshold,
      weights: { ...DEFAULT_RISK_CONFIG.weights, ...config.weights },
      cascadeMultipliers: { ...DEFAULT_RISK_CONFIG.cascadeMultipliers, ...config.cascadeMultipliers }
    };
  }

  /**
   * Assess an AI decision for risk
   * @param decision The AI decision to assess
   * @returns Risk assessment result with score and approval status
   */
  assess(decision: AIDecision): RiskAssessment {
    const timestamp = Date.now();
    
    // Calculate base risk score from decision type
    let riskScore = this.calculateBaseRisk(decision);
    
    // Predict cascading effects
    const cascadingEffects = this.predictCascade(decision);
    
    // Apply cascade multipliers to risk score
    for (const effect of cascadingEffects) {
      const multiplier = this.config.cascadeMultipliers[effect.system] || 1;
      riskScore += Math.abs(effect.predictedChange) * multiplier * effect.confidence;
    }
    
    // Clamp risk score to 0-100
    riskScore = Math.max(0, Math.min(100, riskScore));
    
    // Determine approval
    const approved = riskScore <= this.config.threshold;
    const rejectionReason = approved ? undefined : `Risk score ${riskScore.toFixed(1)} exceeds threshold ${this.config.threshold}`;
    
    // Create assessment result
    const assessment: RiskAssessment = {
      decisionId: decision.id,
      decisionType: decision.type,
      riskScore,
      cascadingEffects,
      approved,
      rejectionReason,
      timestamp
    };
    
    // Log the assessment
    this.logAssessment(assessment);
    
    return assessment;
  }

  /**
   * Predict cascading effects of a decision
   * @param decision The AI decision to analyze
   * @returns Array of predicted cascading effects
   */
  predictCascade(decision: AIDecision): CascadingEffect[] {
    const effects: CascadingEffect[] = [];
    
    switch (decision.type) {
      case 'spawn':
        effects.push({
          system: 'world',
          variable: 'entity_count',
          predictedChange: 1,
          confidence: 1.0
        });
        if (decision.factionId) {
          effects.push({
            system: 'faction',
            variable: 'member_count',
            predictedChange: 1,
            confidence: 0.9
          });
        }
        break;
        
      case 'despawn':
        effects.push({
          system: 'world',
          variable: 'entity_count',
          predictedChange: -1,
          confidence: 1.0
        });
        if (decision.factionId) {
          effects.push({
            system: 'faction',
            variable: 'member_count',
            predictedChange: -1,
            confidence: 0.9
          });
        }
        if (decision.squadId) {
          effects.push({
            system: 'squad',
            variable: 'member_count',
            predictedChange: -1,
            confidence: 0.95
          });
        }
        break;
        
      case 'heat_change':
        const heatDelta = (decision.parameters.delta as number) || 0;
        effects.push({
          system: 'heat',
          variable: 'heat_level',
          predictedChange: heatDelta,
          confidence: 1.0
        });
        if (Math.abs(heatDelta) >= 20) {
          effects.push({
            system: 'faction',
            variable: 'escalation_tier',
            predictedChange: heatDelta > 0 ? 1 : -1,
            confidence: 0.7
          });
        }
        break;
        
      case 'squad_tactic':
        effects.push({
          system: 'squad',
          variable: 'tactic_change',
          predictedChange: 1,
          confidence: 0.85
        });
        const tacticType = decision.parameters.tacticType as string;
        if (tacticType === 'assault' || tacticType === 'flank') {
          effects.push({
            system: 'heat',
            variable: 'combat_intensity',
            predictedChange: 10,
            confidence: 0.6
          });
        }
        break;
        
      case 'enemy_update':
        const stateChange = decision.parameters.newState as string;
        if (stateChange === 'engage' || stateChange === 'flank') {
          effects.push({
            system: 'heat',
            variable: 'combat_activity',
            predictedChange: 5,
            confidence: 0.5
          });
        }
        break;
    }
    
    return effects;
  }

  /**
   * Set the risk threshold
   * @param threshold New threshold value (0-100)
   */
  setThreshold(threshold: number): void {
    this.config.threshold = Math.max(0, Math.min(100, threshold));
  }

  /**
   * Get the current risk threshold
   * @returns Current threshold value
   */
  getThreshold(): number {
    return this.config.threshold;
  }

  /**
   * Queue a decision for batch processing
   * @param decision Decision to queue
   */
  queueDecision(decision: AIDecision): void {
    // Insert in priority order (higher priority first)
    const insertIndex = this.decisionQueue.findIndex(d => d.priority < decision.priority);
    if (insertIndex === -1) {
      this.decisionQueue.push(decision);
    } else {
      this.decisionQueue.splice(insertIndex, 0, decision);
    }
  }

  /**
   * Process all queued decisions in priority order
   * @returns Array of assessment results
   */
  processQueue(): RiskAssessment[] {
    const results: RiskAssessment[] = [];
    
    // Process in order (already sorted by priority)
    while (this.decisionQueue.length > 0) {
      const decision = this.decisionQueue.shift()!;
      results.push(this.assess(decision));
    }
    
    return results;
  }

  /**
   * Get the current queue length
   * @returns Number of decisions in queue
   */
  getQueueLength(): number {
    return this.decisionQueue.length;
  }

  /**
   * Get assessment logs
   * @param count Number of recent logs to return
   * @returns Array of assessment log entries
   */
  getAssessmentLogs(count?: number): AssessmentLog[] {
    if (count === undefined) {
      return [...this.assessmentLogs];
    }
    return this.assessmentLogs.slice(-count);
  }

  /**
   * Update configuration
   * @param config Partial configuration to update
   */
  updateConfig(config: Partial<RiskConfig>): void {
    if (config.threshold !== undefined) {
      this.config.threshold = Math.max(0, Math.min(100, config.threshold));
    }
    if (config.weights) {
      this.config.weights = { ...this.config.weights, ...config.weights };
    }
    if (config.cascadeMultipliers) {
      this.config.cascadeMultipliers = { ...this.config.cascadeMultipliers, ...config.cascadeMultipliers };
    }
  }

  /**
   * Clear assessment logs
   */
  clearLogs(): void {
    this.assessmentLogs = [];
  }

  private calculateBaseRisk(decision: AIDecision): number {
    const baseWeight = this.config.weights[decision.type] || 15;
    
    // Adjust based on parameters
    let risk = baseWeight;
    
    // Higher priority decisions are riskier
    risk += decision.priority * 2;
    
    // Spawn decisions with high counts are riskier
    if (decision.type === 'spawn') {
      const count = (decision.parameters.count as number) || 1;
      risk += count * 5;
    }
    
    // Heat changes scale with magnitude
    if (decision.type === 'heat_change') {
      const delta = Math.abs((decision.parameters.delta as number) || 0);
      risk += delta * 0.5;
    }
    
    return risk;
  }

  private logAssessment(assessment: RiskAssessment): void {
    this.assessmentLogs.push({
      timestamp: assessment.timestamp,
      decisionId: assessment.decisionId,
      decisionType: assessment.decisionType,
      riskScore: assessment.riskScore,
      approved: assessment.approved,
      rejectionReason: assessment.rejectionReason
    });
    
    // Trim logs if exceeding max
    if (this.assessmentLogs.length > this.maxLogEntries) {
      this.assessmentLogs = this.assessmentLogs.slice(-this.maxLogEntries);
    }
  }
}
