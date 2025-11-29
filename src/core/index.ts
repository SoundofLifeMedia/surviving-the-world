/**
 * Core Module Exports
 * Feature: risk-authority-telemetry, surviving-the-world
 */

// Types
export * from './types/RiskTypes';
export * from './types/ValidationTypes';
export * from './types/TelemetryTypes';

// Deterministic Engine
export { DeterministicLoop, LoopPhase, TickContext, DeterministicLoopConfig, LoopMetrics } from './DeterministicLoop';
export { RngStreamRegistry, RngStream } from './RngStreamRegistry';

// Services
export { ConfigurationManager, ServiceConfig, DEFAULT_SERVICE_CONFIG } from './ConfigurationManager';
export { TelemetrySystem } from './TelemetrySystem';
export { AutofixHooks } from './AutofixHooks';
export { ServiceRegistry, createServiceRegistry } from './ServiceRegistry';
