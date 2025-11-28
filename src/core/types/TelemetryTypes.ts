/**
 * Telemetry Types - Core type definitions for telemetry and monitoring
 * Feature: risk-authority-telemetry
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { AIDecision, RiskAssessment } from './RiskTypes';
import { ValidationResult } from './ValidationTypes';

/**
 * Telemetry event types
 */
export type TelemetryEventType =
  | 'decision_assessed'
  | 'decision_validated'
  | 'decision_executed'
  | 'decision_rejected'
  | 'escalation_change'
  | 'squad_formation'
  | 'player_prediction'
  | 'anomaly_detected'
  | 'autofix_triggered'
  | 'autofix_completed'
  | 'autofix_failed'
  | 'config_changed'
  | 'performance_warning';

/**
 * Telemetry event structure
 */
export interface TelemetryEvent {
  eventId: string;
  eventType: TelemetryEventType;
  timestamp: number;
  data: Record<string, unknown>;
  latencyMs?: number;
  traceId?: string;
}

/**
 * Performance counters
 */
export interface PerformanceCounters {
  decisionsPerSecond: number;
  averageLatencyMs: number;
  memoryUsageMB: number;
  activeEntities: number;
  pendingDecisions: number;
  totalDecisionsProcessed: number;
  totalRejectionsCount: number;
  autofixTriggeredCount: number;
}

/**
 * NPC reasoning entry for debug streaming
 */
export interface NPCReasoningEntry {
  entityId: string;
  timestamp: number;
  reasoningType: 'perception' | 'tactics' | 'morale' | 'aggression';
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  decision: string;
}

/**
 * Anomaly types
 */
export type AnomalyType =
  | 'EXCESSIVE_SPAWNING'
  | 'MEMORY_THRESHOLD'
  | 'STUCK_AI'
  | 'INVALID_STATE'
  | 'PERFORMANCE_DEGRADATION'
  | 'RATE_LIMIT_BREACH';

/**
 * Anomaly severity levels
 */
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Anomaly report structure
 */
export interface AnomalyReport {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  affectedEntities: string[];
  detectedAt: number;
  metrics: Record<string, number>;
  description: string;
}

/**
 * Autofix result structure
 */
export interface AutofixResult {
  success: boolean;
  anomalyId: string;
  anomalyType: AnomalyType;
  actionTaken: string;
  entitiesAffected: number;
  escalated: boolean;
  timestamp: number;
  details?: string;
}

/**
 * Autofix handler function type
 */
export type AutofixHandler = (report: AnomalyReport) => AutofixResult;

/**
 * Pipeline stage information
 */
export interface PipelineStage {
  name: 'risk_assessment' | 'validation' | 'execution' | 'telemetry';
  startTime: number;
  endTime: number;
  result: 'pass' | 'fail' | 'skip';
  details?: string;
}

/**
 * Complete pipeline trace
 */
export interface PipelineTrace {
  traceId: string;
  decision: AIDecision;
  riskAssessment: RiskAssessment | null;
  validation: ValidationResult | null;
  executed: boolean;
  executionResult?: unknown;
  totalLatencyMs: number;
  stages: PipelineStage[];
  timestamp: number;
}

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  enabled: boolean;
  debugMode: boolean;
  maxEventsRetained: number;
  maxReasoningEntries: number;
  counterResetIntervalMs: number;
  anomalyCheckIntervalMs: number;
}

/**
 * Default telemetry configuration
 */
export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  enabled: true,
  debugMode: false,
  maxEventsRetained: 10000,
  maxReasoningEntries: 1000,
  counterResetIntervalMs: 60000,
  anomalyCheckIntervalMs: 1000
};

/**
 * Anomaly detection thresholds
 */
export interface AnomalyThresholds {
  excessiveSpawningPerSecond: number;
  memoryUsageMB: number;
  stuckAISeconds: number;
  performanceDegradationMs: number;
}

/**
 * Default anomaly thresholds
 */
export const DEFAULT_ANOMALY_THRESHOLDS: AnomalyThresholds = {
  excessiveSpawningPerSecond: 50,
  memoryUsageMB: 512,
  stuckAISeconds: 30,
  performanceDegradationMs: 100
};

/**
 * Interface for Telemetry System
 */
export interface ITelemetrySystem {
  record(event: TelemetryEvent): void;
  emit(eventType: TelemetryEventType, data: Record<string, unknown>): void;
  getCounters(): PerformanceCounters;
  enableDebugStreaming(enabled: boolean): void;
  getReasoningStream(entityId: string): NPCReasoningEntry[];
  detectAnomaly(): AnomalyReport | null;
  getRecentEvents(count: number): TelemetryEvent[];
  recordReasoning(entry: NPCReasoningEntry): void;
}

/**
 * Interface for Autofix Hooks
 */
export interface IAutofixHooks {
  register(anomalyType: AnomalyType, handler: AutofixHandler): void;
  trigger(report: AnomalyReport): AutofixResult;
  getRegisteredHooks(): AnomalyType[];
  unregister(anomalyType: AnomalyType): boolean;
}

/**
 * Interface for AI Decision Pipeline
 */
export interface IAIDecisionPipeline {
  process(decision: AIDecision): PipelineTrace;
  getTrace(traceId: string): PipelineTrace | null;
  getRecentTraces(count: number): PipelineTrace[];
}
