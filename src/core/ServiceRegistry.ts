/**
 * Service Registry - Manages service lifecycle and dependencies
 * Feature: risk-authority-telemetry
 * Requirements: All (integration)
 */

import { ConfigurationManager, ServiceConfig } from './ConfigurationManager';
import { TelemetrySystem } from './TelemetrySystem';
import { AutofixHooks } from './AutofixHooks';
import { RiskAssessmentService } from '../ai/RiskAssessmentService';
import { AuthorityValidator } from '../ai/AuthorityValidator';
import { AIDecisionPipeline, DecisionExecutor } from '../ai/AIDecisionPipeline';
import { GameState } from './types/ValidationTypes';

/**
 * Service initialization status
 */
export interface ServiceStatus {
  configManager: boolean;
  telemetry: boolean;
  autofix: boolean;
  riskAssessment: boolean;
  authorityValidator: boolean;
  pipeline: boolean;
}

/**
 * ServiceRegistry - Central registry for all services
 */
export class ServiceRegistry {
  private configManager: ConfigurationManager;
  private telemetry: TelemetrySystem;
  private autofix: AutofixHooks;
  private riskAssessment: RiskAssessmentService;
  private authorityValidator: AuthorityValidator;
  private pipeline: AIDecisionPipeline;
  private initialized: boolean = false;

  constructor(initialConfig: Partial<ServiceConfig> = {}) {
    // Initialize services in dependency order
    this.configManager = new ConfigurationManager(initialConfig);
    const config = this.configManager.get();

    this.telemetry = new TelemetrySystem(
      config.telemetry,
      config.anomalyThresholds
    );

    this.autofix = new AutofixHooks();

    this.riskAssessment = new RiskAssessmentService({
      threshold: config.riskThreshold,
      weights: config.riskWeights,
      cascadeMultipliers: config.cascadeMultipliers
    });

    this.authorityValidator = new AuthorityValidator(config.rateLimits);

    this.pipeline = new AIDecisionPipeline(
      this.riskAssessment,
      this.authorityValidator,
      this.telemetry,
      this.autofix
    );

    // Wire configuration changes
    this.configManager.onChange((oldConfig, newConfig) => {
      this.applyConfigChanges(oldConfig, newConfig);
    });

    this.initialized = true;
  }

  /**
   * Get the configuration manager
   */
  getConfigManager(): ConfigurationManager {
    return this.configManager;
  }

  /**
   * Get the telemetry system
   */
  getTelemetry(): TelemetrySystem {
    return this.telemetry;
  }

  /**
   * Get the autofix hooks
   */
  getAutofix(): AutofixHooks {
    return this.autofix;
  }

  /**
   * Get the risk assessment service
   */
  getRiskAssessment(): RiskAssessmentService {
    return this.riskAssessment;
  }

  /**
   * Get the authority validator
   */
  getAuthorityValidator(): AuthorityValidator {
    return this.authorityValidator;
  }

  /**
   * Get the AI decision pipeline
   */
  getPipeline(): AIDecisionPipeline {
    return this.pipeline;
  }

  /**
   * Set the decision executor for the pipeline
   * @param executor Function to execute approved decisions
   */
  setExecutor(executor: DecisionExecutor): void {
    this.pipeline.setExecutor(executor);
  }

  /**
   * Set the game state provider for validation
   * @param provider Function that returns current game state
   */
  setGameStateProvider(provider: () => GameState): void {
    this.pipeline.setGameStateProvider(provider);
  }

  /**
   * Get service initialization status
   */
  getStatus(): ServiceStatus {
    return {
      configManager: this.configManager !== undefined,
      telemetry: this.telemetry !== undefined,
      autofix: this.autofix !== undefined,
      riskAssessment: this.riskAssessment !== undefined,
      authorityValidator: this.authorityValidator !== undefined,
      pipeline: this.pipeline !== undefined
    };
  }

  /**
   * Check if all services are initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Shutdown all services gracefully
   */
  shutdown(): void {
    // Clear telemetry data
    this.telemetry.clear();

    // Clear pipeline traces
    this.pipeline.clearTraces();

    // Clear risk assessment logs
    this.riskAssessment.clearLogs();

    // Reset rate limits
    this.authorityValidator.resetRateLimits();

    // Clear autofix retry attempts
    this.autofix.clearRetryAttempts();

    this.initialized = false;
  }

  /**
   * Reset all services to initial state
   */
  reset(): void {
    this.shutdown();
    this.configManager.reset();
    this.initialized = true;
  }

  private applyConfigChanges(oldConfig: ServiceConfig, newConfig: ServiceConfig): void {
    // Update risk assessment
    if (oldConfig.riskThreshold !== newConfig.riskThreshold) {
      this.riskAssessment.setThreshold(newConfig.riskThreshold);
    }
    if (JSON.stringify(oldConfig.riskWeights) !== JSON.stringify(newConfig.riskWeights) ||
        JSON.stringify(oldConfig.cascadeMultipliers) !== JSON.stringify(newConfig.cascadeMultipliers)) {
      this.riskAssessment.updateConfig({
        weights: newConfig.riskWeights,
        cascadeMultipliers: newConfig.cascadeMultipliers
      });
    }

    // Update rate limits
    if (JSON.stringify(oldConfig.rateLimits) !== JSON.stringify(newConfig.rateLimits)) {
      for (const [key, config] of Object.entries(newConfig.rateLimits)) {
        this.authorityValidator.setRateLimitConfig(key, config);
      }
    }

    // Update telemetry
    if (JSON.stringify(oldConfig.telemetry) !== JSON.stringify(newConfig.telemetry)) {
      this.telemetry.updateConfig(newConfig.telemetry);
    }

    // Update anomaly thresholds
    if (JSON.stringify(oldConfig.anomalyThresholds) !== JSON.stringify(newConfig.anomalyThresholds)) {
      this.telemetry.updateThresholds(newConfig.anomalyThresholds);
    }

    // Log configuration change
    this.telemetry.emit('config_changed', {
      changedKeys: this.getChangedKeys(oldConfig, newConfig)
    });
  }

  private getChangedKeys(oldConfig: ServiceConfig, newConfig: ServiceConfig): string[] {
    const changed: string[] = [];
    const keys = Object.keys(newConfig) as (keyof ServiceConfig)[];
    
    for (const key of keys) {
      if (JSON.stringify(oldConfig[key]) !== JSON.stringify(newConfig[key])) {
        changed.push(key);
      }
    }
    
    return changed;
  }
}

/**
 * Create a default service registry instance
 */
export function createServiceRegistry(config: Partial<ServiceConfig> = {}): ServiceRegistry {
  return new ServiceRegistry(config);
}
