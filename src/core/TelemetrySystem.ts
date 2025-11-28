/**
 * Telemetry System - Tracks AI decisions, emits events, detects anomalies
 * Feature: risk-authority-telemetry
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import {
  TelemetryEvent,
  TelemetryEventType,
  PerformanceCounters,
  NPCReasoningEntry,
  AnomalyReport,
  AnomalyType,
  AnomalySeverity,
  TelemetryConfig,
  AnomalyThresholds,
  DEFAULT_TELEMETRY_CONFIG,
  DEFAULT_ANOMALY_THRESHOLDS,
  ITelemetrySystem
} from './types/TelemetryTypes';

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * TelemetrySystem - Comprehensive telemetry and monitoring
 */
export class TelemetrySystem implements ITelemetrySystem {
  private config: TelemetryConfig;
  private anomalyThresholds: AnomalyThresholds;
  private events: TelemetryEvent[] = [];
  private reasoningEntries: Map<string, NPCReasoningEntry[]> = new Map();
  private listeners: Map<TelemetryEventType, ((event: TelemetryEvent) => void)[]> = new Map();
  private anomalyCallback?: (report: AnomalyReport) => void;
  
  // Performance tracking
  private decisionCount: number = 0;
  private totalLatency: number = 0;
  private rejectionCount: number = 0;
  private autofixCount: number = 0;
  private lastCounterReset: number = Date.now();
  private spawnCountWindow: { timestamp: number; count: number }[] = [];
  private entityStateChanges: Map<string, number> = new Map();

  constructor(
    config: Partial<TelemetryConfig> = {},
    thresholds: Partial<AnomalyThresholds> = {}
  ) {
    this.config = { ...DEFAULT_TELEMETRY_CONFIG, ...config };
    this.anomalyThresholds = { ...DEFAULT_ANOMALY_THRESHOLDS, ...thresholds };
  }

  /**
   * Record a telemetry event
   * @param event Event to record
   */
  record(event: TelemetryEvent): void {
    if (!this.config.enabled) return;

    this.events.push(event);

    // Update counters
    if (event.eventType === 'decision_executed' || event.eventType === 'decision_rejected') {
      this.decisionCount++;
      if (event.latencyMs) {
        this.totalLatency += event.latencyMs;
      }
    }
    if (event.eventType === 'decision_rejected') {
      this.rejectionCount++;
    }
    if (event.eventType === 'autofix_triggered') {
      this.autofixCount++;
    }

    // Track spawns for anomaly detection
    if (event.eventType === 'decision_executed' && event.data.decisionType === 'spawn') {
      this.spawnCountWindow.push({ timestamp: Date.now(), count: 1 });
    }

    // Trim events if exceeding max
    if (this.events.length > this.config.maxEventsRetained) {
      this.events = this.events.slice(-this.config.maxEventsRetained);
    }

    // Notify listeners
    this.notifyListeners(event);
  }

  /**
   * Emit a telemetry event
   * @param eventType Type of event
   * @param data Event data
   */
  emit(eventType: TelemetryEventType, data: Record<string, unknown>): void {
    const event: TelemetryEvent = {
      eventId: generateId(),
      eventType,
      timestamp: Date.now(),
      data
    };
    this.record(event);
  }

  /**
   * Get performance counters
   * @returns Current performance counters
   */
  getCounters(): PerformanceCounters {
    const now = Date.now();
    const elapsed = (now - this.lastCounterReset) / 1000;
    
    // Reset counters if interval exceeded
    if (now - this.lastCounterReset >= this.config.counterResetIntervalMs) {
      this.resetCounters();
    }

    return {
      decisionsPerSecond: elapsed > 0 ? Math.max(0, this.decisionCount / elapsed) : 0,
      averageLatencyMs: this.decisionCount > 0 ? Math.max(0, this.totalLatency / this.decisionCount) : 0,
      memoryUsageMB: Math.max(0, this.estimateMemoryUsage()),
      activeEntities: Math.max(0, this.entityStateChanges.size),
      pendingDecisions: 0, // Would be set by pipeline
      totalDecisionsProcessed: Math.max(0, this.decisionCount),
      totalRejectionsCount: Math.max(0, this.rejectionCount),
      autofixTriggeredCount: Math.max(0, this.autofixCount)
    };
  }

  /**
   * Enable or disable debug streaming
   * @param enabled Whether to enable debug mode
   */
  enableDebugStreaming(enabled: boolean): void {
    this.config.debugMode = enabled;
  }

  /**
   * Get reasoning stream for an entity
   * @param entityId Entity ID to query
   * @returns Array of reasoning entries
   */
  getReasoningStream(entityId: string): NPCReasoningEntry[] {
    return this.reasoningEntries.get(entityId) || [];
  }

  /**
   * Record NPC reasoning entry
   * @param entry Reasoning entry to record
   */
  recordReasoning(entry: NPCReasoningEntry): void {
    if (!this.config.debugMode) return;

    let entries = this.reasoningEntries.get(entry.entityId);
    if (!entries) {
      entries = [];
      this.reasoningEntries.set(entry.entityId, entries);
    }

    entries.push(entry);

    // Trim if exceeding max
    if (entries.length > this.config.maxReasoningEntries) {
      this.reasoningEntries.set(entry.entityId, entries.slice(-this.config.maxReasoningEntries));
    }
  }

  /**
   * Detect anomalies in system behavior
   * @returns Anomaly report if detected, null otherwise
   */
  detectAnomaly(): AnomalyReport | null {
    const now = Date.now();

    // Check excessive spawning
    const recentSpawns = this.spawnCountWindow.filter(s => now - s.timestamp < 1000);
    this.spawnCountWindow = recentSpawns; // Clean old entries
    
    const spawnCount = recentSpawns.reduce((sum, s) => sum + s.count, 0);
    if (spawnCount > this.anomalyThresholds.excessiveSpawningPerSecond) {
      const report = this.createAnomalyReport(
        'EXCESSIVE_SPAWNING',
        'high',
        [],
        { spawnsPerSecond: spawnCount, threshold: this.anomalyThresholds.excessiveSpawningPerSecond },
        `Excessive spawning detected: ${spawnCount} spawns/second exceeds threshold of ${this.anomalyThresholds.excessiveSpawningPerSecond}`
      );
      this.triggerAnomalyCallback(report);
      return report;
    }

    // Check stuck AI
    const stuckThresholdMs = this.anomalyThresholds.stuckAISeconds * 1000;
    for (const [entityId, lastChange] of Array.from(this.entityStateChanges.entries())) {
      if (now - lastChange > stuckThresholdMs) {
        const report = this.createAnomalyReport(
          'STUCK_AI',
          'medium',
          [entityId],
          { lastStateChange: lastChange, stuckDurationMs: now - lastChange },
          `AI entity ${entityId} has not changed state for ${((now - lastChange) / 1000).toFixed(1)} seconds`
        );
        this.triggerAnomalyCallback(report);
        return report;
      }
    }

    // Check performance degradation
    const avgLatency = this.decisionCount > 0 ? this.totalLatency / this.decisionCount : 0;
    if (avgLatency > this.anomalyThresholds.performanceDegradationMs) {
      const report = this.createAnomalyReport(
        'PERFORMANCE_DEGRADATION',
        'medium',
        [],
        { averageLatencyMs: avgLatency, threshold: this.anomalyThresholds.performanceDegradationMs },
        `Performance degradation detected: average latency ${avgLatency.toFixed(1)}ms exceeds threshold of ${this.anomalyThresholds.performanceDegradationMs}ms`
      );
      this.triggerAnomalyCallback(report);
      return report;
    }

    return null;
  }

  /**
   * Get recent events
   * @param count Number of events to return
   * @returns Array of recent events
   */
  getRecentEvents(count: number): TelemetryEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Register event listener
   * @param eventType Event type to listen for
   * @param callback Callback function
   */
  on(eventType: TelemetryEventType, callback: (event: TelemetryEvent) => void): void {
    let listeners = this.listeners.get(eventType);
    if (!listeners) {
      listeners = [];
      this.listeners.set(eventType, listeners);
    }
    listeners.push(callback);
  }

  /**
   * Remove event listener
   * @param eventType Event type
   * @param callback Callback to remove
   */
  off(eventType: TelemetryEventType, callback: (event: TelemetryEvent) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Set anomaly callback
   * @param callback Function to call when anomaly detected
   */
  onAnomaly(callback: (report: AnomalyReport) => void): void {
    this.anomalyCallback = callback;
  }

  /**
   * Track entity state change
   * @param entityId Entity that changed state
   */
  trackEntityStateChange(entityId: string): void {
    this.entityStateChanges.set(entityId, Date.now());
  }

  /**
   * Remove entity from tracking
   * @param entityId Entity to remove
   */
  removeEntity(entityId: string): void {
    this.entityStateChanges.delete(entityId);
    this.reasoningEntries.delete(entityId);
  }

  /**
   * Clear all telemetry data
   */
  clear(): void {
    this.events = [];
    this.reasoningEntries.clear();
    this.entityStateChanges.clear();
    this.spawnCountWindow = [];
    this.resetCounters();
  }

  /**
   * Update configuration
   * @param config Partial configuration to update
   */
  updateConfig(config: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Update anomaly thresholds
   * @param thresholds Partial thresholds to update
   */
  updateThresholds(thresholds: Partial<AnomalyThresholds>): void {
    this.anomalyThresholds = { ...this.anomalyThresholds, ...thresholds };
  }

  private resetCounters(): void {
    this.decisionCount = 0;
    this.totalLatency = 0;
    this.rejectionCount = 0;
    this.autofixCount = 0;
    this.lastCounterReset = Date.now();
  }

  private estimateMemoryUsage(): number {
    // Rough estimate based on stored data
    const eventSize = this.events.length * 200; // ~200 bytes per event
    const reasoningSize = Array.from(this.reasoningEntries.values())
      .reduce((sum, entries) => sum + entries.length * 300, 0);
    return (eventSize + reasoningSize) / (1024 * 1024);
  }

  private createAnomalyReport(
    type: AnomalyType,
    severity: AnomalySeverity,
    affectedEntities: string[],
    metrics: Record<string, number>,
    description: string
  ): AnomalyReport {
    return {
      id: generateId(),
      type,
      severity,
      affectedEntities,
      detectedAt: Date.now(),
      metrics,
      description
    };
  }

  private notifyListeners(event: TelemetryEvent): void {
    const listeners = this.listeners.get(event.eventType);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(event);
        } catch (error) {
          console.error('Telemetry listener error:', error);
        }
      }
    }
  }

  private triggerAnomalyCallback(report: AnomalyReport): void {
    if (this.anomalyCallback) {
      try {
        this.anomalyCallback(report);
      } catch (error) {
        console.error('Anomaly callback error:', error);
      }
    }
    
    // Also emit as event
    this.emit('anomaly_detected', { report });
  }
}
