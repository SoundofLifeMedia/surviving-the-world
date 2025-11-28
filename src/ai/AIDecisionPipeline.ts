/**
 * AI Decision Pipeline - Integration layer for Assess → Validate → Execute → Log
 * Feature: risk-authority-telemetry
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { AIDecision, RiskAssessment } from '../core/types/RiskTypes';
import { ValidationResult, GameState } from '../core/types/ValidationTypes';
import { PipelineTrace, PipelineStage, IAIDecisionPipeline } from '../core/types/TelemetryTypes';
import { RiskAssessmentService } from './RiskAssessmentService';
import { AuthorityValidator } from './AuthorityValidator';
import { TelemetrySystem } from '../core/TelemetrySystem';
import { AutofixHooks } from '../core/AutofixHooks';

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Decision executor callback type
 */
export type DecisionExecutor = (decision: AIDecision) => unknown;

/**
 * AIDecisionPipeline - Routes all AI decisions through assessment, validation, and telemetry
 */
export class AIDecisionPipeline implements IAIDecisionPipeline {
  private riskService: RiskAssessmentService;
  private validator: AuthorityValidator;
  private telemetry: TelemetrySystem;
  private autofix: AutofixHooks;
  private traces: Map<string, PipelineTrace> = new Map();
  private maxTraces: number = 1000;
  private executor?: DecisionExecutor;
  private gameStateProvider?: () => GameState;

  constructor(
    riskService: RiskAssessmentService,
    validator: AuthorityValidator,
    telemetry: TelemetrySystem,
    autofix: AutofixHooks
  ) {
    this.riskService = riskService;
    this.validator = validator;
    this.telemetry = telemetry;
    this.autofix = autofix;

    // Wire autofix to telemetry
    this.telemetry.onAnomaly((report) => {
      const result = this.autofix.trigger(report);
      this.telemetry.emit(result.success ? 'autofix_completed' : 'autofix_failed', {
        anomalyId: report.id,
        anomalyType: report.type,
        result
      });
    });

    // Wire autofix telemetry callback
    this.autofix.onTelemetry((result) => {
      this.telemetry.emit('autofix_triggered', {
        fixType: result.anomalyType,
        affectedEntities: result.entitiesAffected,
        success: result.success,
        escalated: result.escalated
      });
    });
  }

  /**
   * Set the decision executor
   * @param executor Function to execute approved decisions
   */
  setExecutor(executor: DecisionExecutor): void {
    this.executor = executor;
  }

  /**
   * Set the game state provider
   * @param provider Function that returns current game state
   */
  setGameStateProvider(provider: () => GameState): void {
    this.gameStateProvider = provider;
  }

  /**
   * Process an AI decision through the full pipeline
   * @param decision Decision to process
   * @returns Complete pipeline trace
   */
  process(decision: AIDecision): PipelineTrace {
    const traceId = generateId();
    const startTime = Date.now();
    const stages: PipelineStage[] = [];

    let riskAssessment: RiskAssessment | null = null;
    let validation: ValidationResult | null = null;
    let executed = false;
    let executionResult: unknown = undefined;

    // Stage 1: Risk Assessment
    const riskStart = Date.now();
    try {
      riskAssessment = this.riskService.assess(decision);
      stages.push({
        name: 'risk_assessment',
        startTime: riskStart,
        endTime: Date.now(),
        result: riskAssessment.approved ? 'pass' : 'fail',
        details: riskAssessment.rejectionReason
      });

      this.telemetry.emit('decision_assessed', {
        decisionId: decision.id,
        decisionType: decision.type,
        riskScore: riskAssessment.riskScore,
        approved: riskAssessment.approved
      });

      if (!riskAssessment.approved) {
        // Risk assessment rejected - skip remaining stages
        return this.createTrace(
          traceId, decision, riskAssessment, null, false, undefined, startTime, stages
        );
      }
    } catch (error) {
      stages.push({
        name: 'risk_assessment',
        startTime: riskStart,
        endTime: Date.now(),
        result: 'fail',
        details: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
      return this.createTrace(
        traceId, decision, null, null, false, undefined, startTime, stages
      );
    }

    // Stage 2: Authority Validation
    const validationStart = Date.now();
    try {
      const gameState = this.getGameState();
      validation = this.validator.validate(decision, gameState);
      stages.push({
        name: 'validation',
        startTime: validationStart,
        endTime: Date.now(),
        result: validation.valid ? 'pass' : 'fail',
        details: validation.details
      });

      this.telemetry.emit('decision_validated', {
        decisionId: decision.id,
        decisionType: decision.type,
        valid: validation.valid,
        reasonCode: validation.reasonCode
      });

      if (!validation.valid) {
        // Validation rejected - skip execution
        this.telemetry.emit('decision_rejected', {
          decisionId: decision.id,
          decisionType: decision.type,
          stage: 'validation',
          reasonCode: validation.reasonCode,
          details: validation.details
        });
        return this.createTrace(
          traceId, decision, riskAssessment, validation, false, undefined, startTime, stages
        );
      }
    } catch (error) {
      stages.push({
        name: 'validation',
        startTime: validationStart,
        endTime: Date.now(),
        result: 'fail',
        details: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
      return this.createTrace(
        traceId, decision, riskAssessment, null, false, undefined, startTime, stages
      );
    }

    // Stage 3: Execution
    const executionStart = Date.now();
    try {
      if (this.executor) {
        executionResult = this.executor(decision);
        executed = true;
      } else {
        // No executor - mark as executed but with no result
        executed = true;
      }

      stages.push({
        name: 'execution',
        startTime: executionStart,
        endTime: Date.now(),
        result: 'pass'
      });

      // Track entity state change for stuck AI detection
      if (decision.entityId) {
        this.telemetry.trackEntityStateChange(decision.entityId);
      }

      this.telemetry.emit('decision_executed', {
        decisionId: decision.id,
        decisionType: decision.type,
        entityId: decision.entityId,
        latencyMs: Date.now() - startTime
      });

    } catch (error) {
      stages.push({
        name: 'execution',
        startTime: executionStart,
        endTime: Date.now(),
        result: 'fail',
        details: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
    }

    // Stage 4: Telemetry (always runs)
    const telemetryStart = Date.now();
    stages.push({
      name: 'telemetry',
      startTime: telemetryStart,
      endTime: Date.now(),
      result: 'pass'
    });

    // Check for anomalies
    this.telemetry.detectAnomaly();

    return this.createTrace(
      traceId, decision, riskAssessment, validation, executed, executionResult, startTime, stages
    );
  }

  /**
   * Get a trace by ID
   * @param traceId Trace ID to retrieve
   * @returns Pipeline trace or null
   */
  getTrace(traceId: string): PipelineTrace | null {
    return this.traces.get(traceId) || null;
  }

  /**
   * Get recent traces
   * @param count Number of traces to return
   * @returns Array of recent traces
   */
  getRecentTraces(count: number): PipelineTrace[] {
    const allTraces = Array.from(this.traces.values());
    return allTraces
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  /**
   * Clear all traces
   */
  clearTraces(): void {
    this.traces.clear();
  }

  /**
   * Get pipeline statistics
   */
  getStats(): {
    totalProcessed: number;
    approved: number;
    rejected: number;
    averageLatencyMs: number;
  } {
    const traces = Array.from(this.traces.values());
    const approved = traces.filter(t => t.executed).length;
    const totalLatency = traces.reduce((sum, t) => sum + t.totalLatencyMs, 0);

    return {
      totalProcessed: traces.length,
      approved,
      rejected: traces.length - approved,
      averageLatencyMs: traces.length > 0 ? totalLatency / traces.length : 0
    };
  }

  private createTrace(
    traceId: string,
    decision: AIDecision,
    riskAssessment: RiskAssessment | null,
    validation: ValidationResult | null,
    executed: boolean,
    executionResult: unknown,
    startTime: number,
    stages: PipelineStage[]
  ): PipelineTrace {
    const trace: PipelineTrace = {
      traceId,
      decision,
      riskAssessment,
      validation,
      executed,
      executionResult,
      totalLatencyMs: Date.now() - startTime,
      stages,
      timestamp: startTime
    };

    // Store trace
    this.traces.set(traceId, trace);

    // Trim traces if exceeding max
    if (this.traces.size > this.maxTraces) {
      const oldestKey = Array.from(this.traces.keys())[0];
      this.traces.delete(oldestKey);
    }

    return trace;
  }

  private getGameState(): GameState {
    if (this.gameStateProvider) {
      return this.gameStateProvider();
    }

    // Return empty game state if no provider
    return {
      entities: new Map(),
      factions: new Map(),
      squads: new Map(),
      worldTime: Date.now(),
      activeAnomalies: []
    };
  }
}
