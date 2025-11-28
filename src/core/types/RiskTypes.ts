/**
 * Risk Assessment Types - Core type definitions for risk evaluation
 * Feature: risk-authority-telemetry
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

/**
 * Represents an AI decision to be assessed
 */
export interface AIDecision {
  id: string;
  type: 'enemy_update' | 'squad_tactic' | 'heat_change' | 'spawn' | 'despawn';
  entityId: string;
  factionId?: string;
  squadId?: string;
  action: string;
  parameters: Record<string, unknown>;
  priority: number;
  timestamp: number;
}

/**
 * Represents a predicted cascading effect from an AI decision
 */
export interface CascadingEffect {
  system: 'faction' | 'heat' | 'squad' | 'world';
  variable: string;
  predictedChange: number;
  confidence: number;
}

/**
 * Result of risk assessment for an AI decision
 */
export interface RiskAssessment {
  decisionId: string;
  decisionType: string;
  riskScore: number;
  cascadingEffects: CascadingEffect[];
  approved: boolean;
  rejectionReason?: string;
  timestamp: number;
}

/**
 * Configuration for risk assessment thresholds and weights
 */
export interface RiskConfig {
  threshold: number;
  weights: {
    spawn: number;
    despawn: number;
    heat_change: number;
    squad_tactic: number;
    enemy_update: number;
  };
  cascadeMultipliers: {
    faction: number;
    heat: number;
    squad: number;
    world: number;
  };
}

/**
 * Default risk configuration
 */
export const DEFAULT_RISK_CONFIG: RiskConfig = {
  threshold: 70,
  weights: {
    spawn: 30,
    despawn: 10,
    heat_change: 25,
    squad_tactic: 20,
    enemy_update: 15
  },
  cascadeMultipliers: {
    faction: 1.5,
    heat: 1.3,
    squad: 1.2,
    world: 1.4
  }
};

/**
 * Interface for Risk Assessment Service
 */
export interface IRiskAssessmentService {
  assess(decision: AIDecision): RiskAssessment;
  predictCascade(decision: AIDecision): CascadingEffect[];
  setThreshold(threshold: number): void;
  getThreshold(): number;
  queueDecision(decision: AIDecision): void;
  processQueue(): RiskAssessment[];
  getQueueLength(): number;
}
