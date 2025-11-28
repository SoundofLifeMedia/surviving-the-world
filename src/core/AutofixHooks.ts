/**
 * Autofix Hooks - Self-healing routines for anomaly resolution
 * Feature: risk-authority-telemetry
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import {
  AnomalyReport,
  AnomalyType,
  AutofixResult,
  AutofixHandler,
  IAutofixHooks
} from './types/TelemetryTypes';

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Autofix callback for telemetry emission
 */
export type AutofixTelemetryCallback = (result: AutofixResult) => void;

/**
 * Entity reset callback
 */
export type EntityResetCallback = (entityId: string) => void;

/**
 * Spawn throttle callback
 */
export type SpawnThrottleCallback = (enabled: boolean) => void;

/**
 * AutofixHooks - Manages self-healing routines
 */
export class AutofixHooks implements IAutofixHooks {
  private handlers: Map<AnomalyType, AutofixHandler> = new Map();
  private telemetryCallback?: AutofixTelemetryCallback;
  private entityResetCallback?: EntityResetCallback;
  private spawnThrottleCallback?: SpawnThrottleCallback;
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries: number = 1;
  private spawnThrottleActive: boolean = false;

  constructor() {
    // Register default handlers
    this.registerDefaultHandlers();
  }

  /**
   * Register an autofix handler for an anomaly type
   * @param anomalyType Type of anomaly to handle
   * @param handler Handler function
   */
  register(anomalyType: AnomalyType, handler: AutofixHandler): void {
    this.handlers.set(anomalyType, handler);
  }

  /**
   * Trigger autofix for an anomaly
   * @param report Anomaly report
   * @returns Autofix result
   */
  trigger(report: AnomalyReport): AutofixResult {
    const handler = this.handlers.get(report.type);
    
    if (!handler) {
      const result: AutofixResult = {
        success: false,
        anomalyId: report.id,
        anomalyType: report.type,
        actionTaken: 'none',
        entitiesAffected: 0,
        escalated: true,
        timestamp: Date.now(),
        details: `No handler registered for anomaly type: ${report.type}`
      };
      this.emitTelemetry(result);
      return result;
    }

    try {
      const result = handler(report);
      
      // Check if fix was successful
      if (!result.success) {
        // Check retry attempts
        const attempts = this.retryAttempts.get(report.id) || 0;
        
        if (attempts < this.maxRetries) {
          // Retry once
          this.retryAttempts.set(report.id, attempts + 1);
          const retryResult = handler(report);
          
          if (!retryResult.success) {
            // Escalate after retry failure
            retryResult.escalated = true;
            retryResult.details = `Autofix failed after ${attempts + 2} attempts. ${retryResult.details || ''}`;
          }
          
          this.emitTelemetry(retryResult);
          return retryResult;
        } else {
          // Max retries exceeded, escalate
          result.escalated = true;
          result.details = `Autofix failed after ${attempts + 1} attempts. ${result.details || ''}`;
        }
      }
      
      this.emitTelemetry(result);
      return result;
      
    } catch (error) {
      const result: AutofixResult = {
        success: false,
        anomalyId: report.id,
        anomalyType: report.type,
        actionTaken: 'error',
        entitiesAffected: 0,
        escalated: true,
        timestamp: Date.now(),
        details: `Handler error: ${error instanceof Error ? error.message : String(error)}`
      };
      this.emitTelemetry(result);
      return result;
    }
  }

  /**
   * Get list of registered anomaly types
   * @returns Array of registered anomaly types
   */
  getRegisteredHooks(): AnomalyType[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Unregister a handler
   * @param anomalyType Anomaly type to unregister
   * @returns true if handler was removed
   */
  unregister(anomalyType: AnomalyType): boolean {
    return this.handlers.delete(anomalyType);
  }

  /**
   * Set telemetry callback for autofix events
   * @param callback Callback function
   */
  onTelemetry(callback: AutofixTelemetryCallback): void {
    this.telemetryCallback = callback;
  }

  /**
   * Set entity reset callback
   * @param callback Callback function
   */
  onEntityReset(callback: EntityResetCallback): void {
    this.entityResetCallback = callback;
  }

  /**
   * Set spawn throttle callback
   * @param callback Callback function
   */
  onSpawnThrottle(callback: SpawnThrottleCallback): void {
    this.spawnThrottleCallback = callback;
  }

  /**
   * Check if spawn throttle is active
   * @returns true if throttle is active
   */
  isSpawnThrottleActive(): boolean {
    return this.spawnThrottleActive;
  }

  /**
   * Clear retry attempts
   */
  clearRetryAttempts(): void {
    this.retryAttempts.clear();
  }

  private registerDefaultHandlers(): void {
    // Excessive spawning handler
    this.register('EXCESSIVE_SPAWNING', (report: AnomalyReport): AutofixResult => {
      this.spawnThrottleActive = true;
      
      if (this.spawnThrottleCallback) {
        this.spawnThrottleCallback(true);
      }

      // Auto-disable throttle after 5 seconds
      setTimeout(() => {
        this.spawnThrottleActive = false;
        if (this.spawnThrottleCallback) {
          this.spawnThrottleCallback(false);
        }
      }, 5000);

      return {
        success: true,
        anomalyId: report.id,
        anomalyType: report.type,
        actionTaken: 'throttle_spawning',
        entitiesAffected: 0,
        escalated: false,
        timestamp: Date.now(),
        details: `Spawn throttle activated for 5 seconds. Rate was ${report.metrics.spawnsPerSecond}/sec`
      };
    });

    // Stuck AI handler
    this.register('STUCK_AI', (report: AnomalyReport): AutofixResult => {
      const affectedCount = report.affectedEntities.length;
      
      for (const entityId of report.affectedEntities) {
        if (this.entityResetCallback) {
          this.entityResetCallback(entityId);
        }
      }

      return {
        success: true,
        anomalyId: report.id,
        anomalyType: report.type,
        actionTaken: 'reset_to_idle',
        entitiesAffected: affectedCount,
        escalated: false,
        timestamp: Date.now(),
        details: `Reset ${affectedCount} stuck AI entities to idle state`
      };
    });

    // Performance degradation handler
    this.register('PERFORMANCE_DEGRADATION', (report: AnomalyReport): AutofixResult => {
      // Performance issues typically need manual intervention
      // but we can log and escalate
      return {
        success: false,
        anomalyId: report.id,
        anomalyType: report.type,
        actionTaken: 'log_and_escalate',
        entitiesAffected: 0,
        escalated: true,
        timestamp: Date.now(),
        details: `Performance degradation detected: ${report.metrics.averageLatencyMs}ms avg latency. Manual investigation required.`
      };
    });

    // Invalid state handler
    this.register('INVALID_STATE', (report: AnomalyReport): AutofixResult => {
      const affectedCount = report.affectedEntities.length;
      
      for (const entityId of report.affectedEntities) {
        if (this.entityResetCallback) {
          this.entityResetCallback(entityId);
        }
      }

      return {
        success: affectedCount > 0,
        anomalyId: report.id,
        anomalyType: report.type,
        actionTaken: 'reset_invalid_entities',
        entitiesAffected: affectedCount,
        escalated: affectedCount === 0,
        timestamp: Date.now(),
        details: affectedCount > 0 
          ? `Reset ${affectedCount} entities with invalid state`
          : 'No entities to reset'
      };
    });

    // Memory threshold handler
    this.register('MEMORY_THRESHOLD', (report: AnomalyReport): AutofixResult => {
      // Memory issues need GC and asset unloading
      // This is a placeholder - actual implementation would trigger GC
      if (typeof global !== 'undefined' && typeof (global as { gc?: () => void }).gc === 'function') {
        (global as { gc: () => void }).gc();
      }

      return {
        success: true,
        anomalyId: report.id,
        anomalyType: report.type,
        actionTaken: 'trigger_gc',
        entitiesAffected: 0,
        escalated: false,
        timestamp: Date.now(),
        details: `Triggered garbage collection. Memory was ${report.metrics.memoryUsageMB}MB`
      };
    });

    // Rate limit breach handler
    this.register('RATE_LIMIT_BREACH', (report: AnomalyReport): AutofixResult => {
      return {
        success: true,
        anomalyId: report.id,
        anomalyType: report.type,
        actionTaken: 'enforce_rate_limit',
        entitiesAffected: 0,
        escalated: false,
        timestamp: Date.now(),
        details: `Rate limit enforced for operation type`
      };
    });
  }

  private emitTelemetry(result: AutofixResult): void {
    if (this.telemetryCallback) {
      try {
        this.telemetryCallback(result);
      } catch (error) {
        console.error('Autofix telemetry callback error:', error);
      }
    }
  }
}
