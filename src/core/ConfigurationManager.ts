/**
 * Configuration Manager - Hot-reloadable configuration for all services
 * Feature: risk-authority-telemetry
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { RiskConfig, DEFAULT_RISK_CONFIG } from './types/RiskTypes';
import { RateLimitConfig, DEFAULT_RATE_LIMITS } from './types/ValidationTypes';
import { AnomalyThresholds, DEFAULT_ANOMALY_THRESHOLDS, TelemetryConfig, DEFAULT_TELEMETRY_CONFIG } from './types/TelemetryTypes';

/**
 * Complete service configuration
 */
export interface ServiceConfig {
  riskThreshold: number;
  riskWeights: RiskConfig['weights'];
  cascadeMultipliers: RiskConfig['cascadeMultipliers'];
  rateLimits: Record<string, RateLimitConfig>;
  anomalyThresholds: AnomalyThresholds;
  telemetry: TelemetryConfig;
}

/**
 * Configuration change callback type
 */
export type ConfigChangeCallback = (oldConfig: ServiceConfig, newConfig: ServiceConfig) => void;

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Configuration change log entry
 */
export interface ConfigChangeLog {
  timestamp: number;
  key: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Default service configuration
 */
export const DEFAULT_SERVICE_CONFIG: ServiceConfig = {
  riskThreshold: DEFAULT_RISK_CONFIG.threshold,
  riskWeights: { ...DEFAULT_RISK_CONFIG.weights },
  cascadeMultipliers: { ...DEFAULT_RISK_CONFIG.cascadeMultipliers },
  rateLimits: { ...DEFAULT_RATE_LIMITS },
  anomalyThresholds: { ...DEFAULT_ANOMALY_THRESHOLDS },
  telemetry: { ...DEFAULT_TELEMETRY_CONFIG }
};

/**
 * ConfigurationManager - Manages service configuration with hot reload support
 */
export class ConfigurationManager {
  private config: ServiceConfig;
  private previousConfig: ServiceConfig;
  private callbacks: ConfigChangeCallback[] = [];
  private changeLogs: ConfigChangeLog[] = [];
  private maxLogEntries: number = 1000;

  constructor(initialConfig: Partial<ServiceConfig> = {}) {
    this.config = this.mergeConfig(DEFAULT_SERVICE_CONFIG, initialConfig);
    this.previousConfig = { ...this.config };
  }

  /**
   * Load configuration from partial config object
   * @param config Partial configuration to load
   * @returns true if loaded successfully, false if validation failed
   */
  load(config: Partial<ServiceConfig>): boolean {
    const validation = this.validate(config);
    if (!validation.valid) {
      return false;
    }

    const oldConfig = { ...this.config };
    this.previousConfig = oldConfig;
    this.config = this.mergeConfig(this.config, config);

    // Log all changes
    this.logChanges(oldConfig, this.config);

    // Notify callbacks
    this.notifyCallbacks(oldConfig, this.config);

    return true;
  }

  /**
   * Get current configuration
   * @returns Current service configuration
   */
  get(): ServiceConfig {
    return { ...this.config };
  }

  /**
   * Update a specific configuration key
   * @param key Configuration key to update
   * @param value New value
   * @returns true if updated successfully
   */
  update<K extends keyof ServiceConfig>(key: K, value: ServiceConfig[K]): boolean {
    const partialConfig = { [key]: value } as Partial<ServiceConfig>;
    const validation = this.validate(partialConfig);
    
    if (!validation.valid) {
      return false;
    }

    const oldConfig = { ...this.config };
    this.previousConfig = oldConfig;
    this.config = { ...this.config, [key]: value };

    // Log the change
    this.addChangeLog(key, oldConfig[key], value);

    // Notify callbacks
    this.notifyCallbacks(oldConfig, this.config);

    return true;
  }

  /**
   * Validate configuration
   * @param config Configuration to validate
   * @returns Validation result with errors if any
   */
  validate(config: Partial<ServiceConfig>): ConfigValidationResult {
    const errors: string[] = [];

    // Validate risk threshold
    if (config.riskThreshold !== undefined) {
      if (typeof config.riskThreshold !== 'number' || config.riskThreshold < 0 || config.riskThreshold > 100) {
        errors.push('riskThreshold must be a number between 0 and 100');
      }
    }

    // Validate risk weights
    if (config.riskWeights !== undefined) {
      for (const [key, value] of Object.entries(config.riskWeights)) {
        if (typeof value !== 'number' || value < 0 || value > 100) {
          errors.push(`riskWeights.${key} must be a number between 0 and 100`);
        }
      }
    }

    // Validate cascade multipliers
    if (config.cascadeMultipliers !== undefined) {
      for (const [key, value] of Object.entries(config.cascadeMultipliers)) {
        if (typeof value !== 'number' || value < 0) {
          errors.push(`cascadeMultipliers.${key} must be a non-negative number`);
        }
      }
    }

    // Validate rate limits
    if (config.rateLimits !== undefined) {
      for (const [key, limit] of Object.entries(config.rateLimits)) {
        if (typeof limit.maxPerSecond !== 'number' || limit.maxPerSecond < 0) {
          errors.push(`rateLimits.${key}.maxPerSecond must be a non-negative number`);
        }
        if (typeof limit.windowMs !== 'number' || limit.windowMs <= 0) {
          errors.push(`rateLimits.${key}.windowMs must be a positive number`);
        }
      }
    }

    // Validate anomaly thresholds
    if (config.anomalyThresholds !== undefined) {
      const thresholds = config.anomalyThresholds;
      if (thresholds.excessiveSpawningPerSecond !== undefined && 
          (typeof thresholds.excessiveSpawningPerSecond !== 'number' || thresholds.excessiveSpawningPerSecond <= 0)) {
        errors.push('anomalyThresholds.excessiveSpawningPerSecond must be a positive number');
      }
      if (thresholds.memoryUsageMB !== undefined && 
          (typeof thresholds.memoryUsageMB !== 'number' || thresholds.memoryUsageMB <= 0)) {
        errors.push('anomalyThresholds.memoryUsageMB must be a positive number');
      }
      if (thresholds.stuckAISeconds !== undefined && 
          (typeof thresholds.stuckAISeconds !== 'number' || thresholds.stuckAISeconds <= 0)) {
        errors.push('anomalyThresholds.stuckAISeconds must be a positive number');
      }
      if (thresholds.performanceDegradationMs !== undefined && 
          (typeof thresholds.performanceDegradationMs !== 'number' || thresholds.performanceDegradationMs <= 0)) {
        errors.push('anomalyThresholds.performanceDegradationMs must be a positive number');
      }
    }

    // Validate telemetry config
    if (config.telemetry !== undefined) {
      const telemetry = config.telemetry;
      if (telemetry.maxEventsRetained !== undefined && 
          (typeof telemetry.maxEventsRetained !== 'number' || telemetry.maxEventsRetained <= 0)) {
        errors.push('telemetry.maxEventsRetained must be a positive number');
      }
      if (telemetry.maxReasoningEntries !== undefined && 
          (typeof telemetry.maxReasoningEntries !== 'number' || telemetry.maxReasoningEntries <= 0)) {
        errors.push('telemetry.maxReasoningEntries must be a positive number');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Register a callback for configuration changes
   * @param callback Function to call when configuration changes
   */
  onChange(callback: ConfigChangeCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove a change callback
   * @param callback Callback to remove
   */
  offChange(callback: ConfigChangeCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Get configuration change logs
   * @param count Number of recent logs to return
   * @returns Array of change log entries
   */
  getChangeLogs(count?: number): ConfigChangeLog[] {
    if (count === undefined) {
      return [...this.changeLogs];
    }
    return this.changeLogs.slice(-count);
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    const oldConfig = { ...this.config };
    this.previousConfig = oldConfig;
    this.config = { ...DEFAULT_SERVICE_CONFIG };
    this.logChanges(oldConfig, this.config);
    this.notifyCallbacks(oldConfig, this.config);
  }

  /**
   * Get previous configuration (before last change)
   */
  getPrevious(): ServiceConfig {
    return { ...this.previousConfig };
  }

  private mergeConfig(base: ServiceConfig, override: Partial<ServiceConfig>): ServiceConfig {
    return {
      riskThreshold: override.riskThreshold ?? base.riskThreshold,
      riskWeights: override.riskWeights ? { ...base.riskWeights, ...override.riskWeights } : { ...base.riskWeights },
      cascadeMultipliers: override.cascadeMultipliers ? { ...base.cascadeMultipliers, ...override.cascadeMultipliers } : { ...base.cascadeMultipliers },
      rateLimits: override.rateLimits ? { ...base.rateLimits, ...override.rateLimits } : { ...base.rateLimits },
      anomalyThresholds: override.anomalyThresholds ? { ...base.anomalyThresholds, ...override.anomalyThresholds } : { ...base.anomalyThresholds },
      telemetry: override.telemetry ? { ...base.telemetry, ...override.telemetry } : { ...base.telemetry }
    };
  }

  private notifyCallbacks(oldConfig: ServiceConfig, newConfig: ServiceConfig): void {
    for (const callback of this.callbacks) {
      try {
        callback(oldConfig, newConfig);
      } catch (error) {
        console.error('Configuration change callback error:', error);
      }
    }
  }

  private logChanges(oldConfig: ServiceConfig, newConfig: ServiceConfig): void {
    const keys = Object.keys(newConfig) as (keyof ServiceConfig)[];
    for (const key of keys) {
      if (JSON.stringify(oldConfig[key]) !== JSON.stringify(newConfig[key])) {
        this.addChangeLog(key, oldConfig[key], newConfig[key]);
      }
    }
  }

  private addChangeLog(key: string, oldValue: unknown, newValue: unknown): void {
    this.changeLogs.push({
      timestamp: Date.now(),
      key,
      oldValue,
      newValue
    });

    // Trim logs if exceeding max
    if (this.changeLogs.length > this.maxLogEntries) {
      this.changeLogs = this.changeLogs.slice(-this.maxLogEntries);
    }
  }
}
