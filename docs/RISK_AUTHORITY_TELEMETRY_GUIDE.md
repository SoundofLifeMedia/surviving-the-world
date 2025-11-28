# Risk Assessment + Authority Validator + Telemetry - Developer Guide

## Overview

This guide covers the three interconnected services that wrap the AI systems with enterprise-grade observability, validation, and self-healing capabilities.

**Pipeline Flow:** `Assess → Validate → Execute → Log`

All AI decisions flow through this pipeline, ensuring no decision executes without risk evaluation, rule validation, and telemetry capture.

## Quick Start

```typescript
import { ServiceRegistry } from './src/core/ServiceRegistry';
import { AIDecision } from './src/core/types/RiskTypes';

// Initialize all services
const registry = new ServiceRegistry();

// Set up game state provider
registry.setGameStateProvider(() => ({
  entities: new Map(),
  factions: new Map(),
  squads: new Map(),
  worldTime: Date.now(),
  activeAnomalies: []
}));

// Process a decision
const decision: AIDecision = {
  id: 'spawn-1',
  type: 'spawn',
  entityId: 'enemy-1',
  action: 'spawn',
  parameters: { count: 1 },
  priority: 5,
  timestamp: Date.now()
};

const trace = registry.getPipeline().process(decision);
console.log(`Decision ${trace.executed ? 'executed' : 'rejected'}`);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Decision Pipeline                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │    Risk      │  │  Authority   │  │   Execute    │       │
│  │  Assessment  │→ │  Validator   │→ │   Decision   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         ↓                 ↓                 ↓                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Telemetry System                        │    │
│  │  • Event Recording  • Anomaly Detection  • Counters │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ↓                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Autofix Hooks                           │    │
│  │  • Spawn Throttle  • Stuck AI Reset  • Escalation   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Services

### 1. Risk Assessment Service

Evaluates AI decisions for risk before execution.

```typescript
import { RiskAssessmentService } from './src/ai/RiskAssessmentService';

const riskService = new RiskAssessmentService({
  threshold: 70,  // Decisions above this score are blocked
  weights: {
    spawn: 30,
    despawn: 10,
    heat_change: 25,
    squad_tactic: 20,
    enemy_update: 15
  }
});

// Assess a decision
const assessment = riskService.assess(decision);
console.log(`Risk Score: ${assessment.riskScore}`);
console.log(`Approved: ${assessment.approved}`);
console.log(`Cascading Effects: ${assessment.cascadingEffects.length}`);

// Queue multiple decisions for batch processing
riskService.queueDecision(decision1);
riskService.queueDecision(decision2);
const results = riskService.processQueue(); // Processes in priority order
```

**Key Methods:**
- `assess(decision)` - Calculate risk score and predict cascading effects
- `predictCascade(decision)` - Get predicted system impacts
- `setThreshold(value)` - Update risk threshold (0-100)
- `queueDecision(decision)` - Add to priority queue
- `processQueue()` - Process all queued decisions

### 2. Authority Validator

Validates AI decisions against game rules and state.

```typescript
import { AuthorityValidator } from './src/ai/AuthorityValidator';

const validator = new AuthorityValidator({
  spawn: { maxPerSecond: 50, windowMs: 1000 },
  squad_create: { maxPerSecond: 10, windowMs: 1000 }
});

// Validate against game state
const result = validator.validate(decision, gameState);

if (!result.valid) {
  console.log(`Rejected: ${result.reasonCode}`);
  console.log(`Details: ${result.details}`);
}
```

**Validation Checks:**
- Entity existence and alive status
- Faction doctrine compliance
- Rate limit enforcement
- Decision-specific rules (spawn limits, valid states, etc.)

**Reason Codes:**
- `APPROVED` - Decision is valid
- `ENTITY_DEAD` - Target entity is dead
- `DOCTRINE_VIOLATION` - Action violates faction rules
- `RATE_LIMITED` - Operation exceeds rate limit
- `INVALID_STATE` - Invalid game state for operation
- `ENTITY_NOT_FOUND` - Entity doesn't exist
- `FACTION_NOT_FOUND` - Faction doesn't exist

### 3. Telemetry System

Tracks all AI decisions with metrics and anomaly detection.

```typescript
import { TelemetrySystem } from './src/core/TelemetrySystem';

const telemetry = new TelemetrySystem({
  enabled: true,
  debugMode: false,
  maxEventsRetained: 10000
});

// Emit events
telemetry.emit('decision_executed', {
  decisionId: 'spawn-1',
  decisionType: 'spawn',
  latencyMs: 5
});

// Get performance counters
const counters = telemetry.getCounters();
console.log(`Decisions/sec: ${counters.decisionsPerSecond}`);
console.log(`Avg Latency: ${counters.averageLatencyMs}ms`);

// Enable debug streaming for NPC reasoning
telemetry.enableDebugStreaming(true);
telemetry.recordReasoning({
  entityId: 'enemy-1',
  timestamp: Date.now(),
  reasoningType: 'tactics',
  inputs: { playerDistance: 50 },
  outputs: { selectedTactic: 'flank' },
  decision: 'flank_left'
});

// Detect anomalies
const anomaly = telemetry.detectAnomaly();
if (anomaly) {
  console.log(`Anomaly: ${anomaly.type} - ${anomaly.description}`);
}
```

**Event Types:**
- `decision_assessed` - Risk assessment completed
- `decision_validated` - Authority validation completed
- `decision_executed` - Decision executed successfully
- `decision_rejected` - Decision rejected at any stage
- `anomaly_detected` - System anomaly detected
- `autofix_triggered` - Autofix routine started
- `config_changed` - Configuration updated

### 4. Autofix Hooks

Self-healing routines for anomaly resolution.

```typescript
import { AutofixHooks } from './src/core/AutofixHooks';

const autofix = new AutofixHooks();

// Register custom handler
autofix.register('CUSTOM_ANOMALY', (report) => ({
  success: true,
  anomalyId: report.id,
  anomalyType: report.type,
  actionTaken: 'custom_fix',
  entitiesAffected: report.affectedEntities.length,
  escalated: false,
  timestamp: Date.now()
}));

// Trigger autofix
const result = autofix.trigger(anomalyReport);
console.log(`Fix ${result.success ? 'succeeded' : 'failed'}`);
if (result.escalated) {
  console.log('Issue escalated for manual intervention');
}

// Set callbacks
autofix.onEntityReset((entityId) => {
  console.log(`Resetting entity: ${entityId}`);
});

autofix.onSpawnThrottle((enabled) => {
  console.log(`Spawn throttle: ${enabled ? 'ON' : 'OFF'}`);
});
```

**Built-in Handlers:**
- `EXCESSIVE_SPAWNING` - Throttles spawn rate for 5 seconds
- `STUCK_AI` - Resets stuck entities to idle state
- `PERFORMANCE_DEGRADATION` - Logs and escalates
- `INVALID_STATE` - Resets affected entities
- `MEMORY_THRESHOLD` - Triggers garbage collection

### 5. Configuration Manager

Hot-reloadable configuration for all services.

```typescript
import { ConfigurationManager } from './src/core/ConfigurationManager';

const config = new ConfigurationManager({
  riskThreshold: 70,
  rateLimits: {
    spawn: { maxPerSecond: 50, windowMs: 1000 }
  }
});

// Update at runtime (no restart needed)
config.update('riskThreshold', 80);

// Validate before applying
const validation = config.validate({ riskThreshold: 150 });
if (!validation.valid) {
  console.log('Invalid config:', validation.errors);
}

// Listen for changes
config.onChange((oldConfig, newConfig) => {
  console.log('Config changed');
});

// Get change history
const logs = config.getChangeLogs(10);
```

### 6. Service Registry

Central registry managing all service lifecycles.

```typescript
import { ServiceRegistry, createServiceRegistry } from './src/core/ServiceRegistry';

// Create with custom config
const registry = createServiceRegistry({
  riskThreshold: 60,
  telemetry: { debugMode: true }
});

// Access individual services
const riskService = registry.getRiskAssessment();
const validator = registry.getAuthorityValidator();
const telemetry = registry.getTelemetry();
const autofix = registry.getAutofix();
const pipeline = registry.getPipeline();
const config = registry.getConfigManager();

// Check status
const status = registry.getStatus();
console.log('All services initialized:', registry.isInitialized());

// Graceful shutdown
registry.shutdown();
```

## Integration with Enemy AI Stack

```typescript
import { EnhancedEnemyAIStack } from './src/ai/EnhancedEnemyAIStack';

const stack = new EnhancedEnemyAIStack();

// Configure risk threshold
stack.setRiskThreshold(70);

// Enable debug mode
stack.setDebugMode(true);

// Register enemies (goes through pipeline)
stack.registerEnemy({
  id: 'enemy-1',
  position: { x: 0, y: 0, z: 0 },
  facing: { x: 1, y: 0, z: 0 },
  health: 100,
  maxHealth: 100,
  faction: 'raiders',
  state: 'idle'
});

// Get pipeline stats
const stats = stack.getPipelineStats();
console.log(`Processed: ${stats.totalProcessed}`);
console.log(`Rejected: ${stats.rejected}`);

// Get telemetry
const counters = stack.getTelemetryCounters();

// Get recent traces for debugging
const traces = stack.getRecentTraces(10);
```

## Configuration Reference

### Risk Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `riskThreshold` | number | 70 | Score above which decisions are blocked (0-100) |
| `riskWeights.spawn` | number | 30 | Base risk for spawn decisions |
| `riskWeights.despawn` | number | 10 | Base risk for despawn decisions |
| `riskWeights.heat_change` | number | 25 | Base risk for heat changes |
| `riskWeights.squad_tactic` | number | 20 | Base risk for squad tactics |
| `riskWeights.enemy_update` | number | 15 | Base risk for enemy updates |
| `cascadeMultipliers.faction` | number | 1.5 | Multiplier for faction effects |
| `cascadeMultipliers.heat` | number | 1.3 | Multiplier for heat effects |
| `cascadeMultipliers.squad` | number | 1.2 | Multiplier for squad effects |
| `cascadeMultipliers.world` | number | 1.4 | Multiplier for world effects |

### Rate Limits

| Operation | Default Max/sec | Window |
|-----------|-----------------|--------|
| `spawn` | 50 | 1000ms |
| `squad_create` | 10 | 1000ms |
| `reinforcement_call` | 5 | 1000ms |
| `heat_change` | 20 | 1000ms |
| `enemy_update` | 500 | 1000ms |

### Anomaly Thresholds

| Threshold | Default | Description |
|-----------|---------|-------------|
| `excessiveSpawningPerSecond` | 50 | Spawns/sec to trigger throttle |
| `memoryUsageMB` | 512 | Memory threshold for GC trigger |
| `stuckAISeconds` | 30 | Seconds without state change |
| `performanceDegradationMs` | 100 | Avg latency threshold |

### Telemetry Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enabled` | boolean | true | Enable telemetry recording |
| `debugMode` | boolean | false | Enable NPC reasoning streams |
| `maxEventsRetained` | number | 10000 | Max events in memory |
| `maxReasoningEntries` | number | 1000 | Max reasoning entries per entity |
| `counterResetIntervalMs` | number | 60000 | Counter reset interval |

## Troubleshooting

### High Rejection Rate

1. Check risk threshold - may be too low
2. Review rate limits - may be too restrictive
3. Check game state provider - entities may not be registered

```typescript
// Increase threshold
registry.getConfigManager().update('riskThreshold', 85);

// Check recent rejections
const traces = pipeline.getRecentTraces(20);
const rejections = traces.filter(t => !t.executed);
rejections.forEach(t => {
  console.log(`Rejected: ${t.decision.type} - ${t.riskAssessment?.rejectionReason || t.validation?.details}`);
});
```

### Performance Issues

1. Check telemetry counters for latency spikes
2. Review anomaly detection for stuck AI
3. Consider reducing maxEventsRetained

```typescript
const counters = telemetry.getCounters();
if (counters.averageLatencyMs > 50) {
  console.log('High latency detected');
  // Reduce event retention
  config.update('telemetry', { maxEventsRetained: 5000 });
}
```

### Autofix Not Triggering

1. Verify anomaly thresholds are appropriate
2. Check that telemetry is enabled
3. Ensure autofix handlers are registered

```typescript
// Check registered hooks
const hooks = autofix.getRegisteredHooks();
console.log('Registered hooks:', hooks);

// Manually trigger anomaly check
const anomaly = telemetry.detectAnomaly();
if (anomaly) {
  autofix.trigger(anomaly);
}
```

## Testing

Run the property-based tests:

```bash
npm test -- --testPathPattern="riskAuthorityTelemetry"
```

The test suite includes 23 property-based tests covering:
- Risk score bounds (0-100)
- Threshold blocking behavior
- Cascading effect prediction
- Validation determinism
- Rate limit enforcement
- Telemetry completeness
- Autofix behavior
- Pipeline routing
- Configuration hot reload

## Requirements Traceability

| Requirement | Property Test | Implementation |
|-------------|---------------|----------------|
| 1.1 Risk score 0-100 | Property 1 | RiskAssessmentService.assess() |
| 1.2 Threshold blocking | Property 2 | RiskAssessmentService.assess() |
| 1.3 Cascade prediction | Property 3 | RiskAssessmentService.predictCascade() |
| 2.2 Dead entity rejection | Example test | AuthorityValidator.validate() |
| 2.3 Doctrine violation | Property 7 | AuthorityValidator.checkDoctrineCompliance() |
| 2.4 Rate limiting | Property 8 | AuthorityValidator.checkRateLimit() |
| 3.1 Event recording | Property 9 | TelemetrySystem.record() |
| 3.5 Performance counters | Property 12 | TelemetrySystem.getCounters() |
| 4.1 Spawn throttle | Property 13 | AutofixHooks (EXCESSIVE_SPAWNING) |
| 4.3 Stuck AI reset | Property 14 | AutofixHooks (STUCK_AI) |
| 5.1-5.5 Pipeline flow | Properties 17-20 | AIDecisionPipeline.process() |
| 6.2-6.4 Config management | Properties 21-23 | ConfigurationManager |
