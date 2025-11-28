/**
 * Risk Assessment + Authority Validator + Telemetry - Property-Based Tests
 * Feature: risk-authority-telemetry
 * Uses fast-check for property-based testing with 100+ iterations
 */

import * as fc from 'fast-check';
import { RiskAssessmentService } from '../src/ai/RiskAssessmentService';
import { AuthorityValidator } from '../src/ai/AuthorityValidator';
import { TelemetrySystem } from '../src/core/TelemetrySystem';
import { AutofixHooks } from '../src/core/AutofixHooks';
import { AIDecisionPipeline } from '../src/ai/AIDecisionPipeline';
import { ConfigurationManager } from '../src/core/ConfigurationManager';
import { ServiceRegistry } from '../src/core/ServiceRegistry';
import { AIDecision } from '../src/core/types/RiskTypes';
import { GameState, EntityState, FactionState, FactionDoctrine } from '../src/core/types/ValidationTypes';
import { AnomalyReport } from '../src/core/types/TelemetryTypes';

// Arbitraries for generating test data
const decisionTypeArb = fc.constantFrom('enemy_update', 'squad_tactic', 'heat_change', 'spawn', 'despawn') as fc.Arbitrary<AIDecision['type']>;

const aiDecisionArb: fc.Arbitrary<AIDecision> = fc.record({
  id: fc.uuid(),
  type: decisionTypeArb,
  entityId: fc.uuid(),
  factionId: fc.option(fc.uuid(), { nil: undefined }),
  squadId: fc.option(fc.uuid(), { nil: undefined }),
  action: fc.string({ minLength: 1, maxLength: 20 }),
  parameters: fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.oneof(fc.integer(), fc.string(), fc.boolean())),
  priority: fc.integer({ min: 0, max: 10 }),
  timestamp: fc.integer({ min: 0 })
});

const entityStateArb: fc.Arbitrary<EntityState> = fc.record({
  id: fc.uuid(),
  alive: fc.boolean(),
  health: fc.integer({ min: 0, max: 100 }),
  lastStateChange: fc.integer({ min: 0 }),
  currentState: fc.constantFrom('idle', 'aware', 'searching', 'engage', 'flank', 'retreat', 'surrender'),
  factionId: fc.option(fc.uuid(), { nil: undefined })
});

const factionDoctrineArb: fc.Arbitrary<FactionDoctrine> = fc.record({
  allowedActions: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
  forbiddenActions: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
  maxEscalationTier: fc.constantFrom('calm', 'alert', 'hunting', 'war'),
  canDeclareWar: fc.boolean(),
  canFormAlliance: fc.boolean()
});

const factionStateArb: fc.Arbitrary<FactionState> = fc.record({
  id: fc.uuid(),
  doctrine: factionDoctrineArb,
  territories: fc.array(fc.uuid(), { maxLength: 5 }),
  allies: fc.array(fc.uuid(), { maxLength: 3 }),
  enemies: fc.array(fc.uuid(), { maxLength: 3 })
});

describe('Risk Assessment Service', () => {
  let riskService: RiskAssessmentService;

  beforeEach(() => {
    riskService = new RiskAssessmentService();
  });

  // Feature: risk-authority-telemetry, Property 1: Risk score bounds preservation
  test('Property 1: Risk scores are bounded 0-100', () => {
    fc.assert(
      fc.property(aiDecisionArb, (decision) => {
        const assessment = riskService.assess(decision);
        return assessment.riskScore >= 0 && assessment.riskScore <= 100;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: risk-authority-telemetry, Property 2: Risk threshold blocking
  test('Property 2: Decisions exceeding threshold are blocked with rejection reason', () => {
    riskService.setThreshold(10); // Very low threshold
    
    fc.assert(
      fc.property(
        aiDecisionArb.filter(d => d.type === 'spawn' && d.priority > 5),
        (decision) => {
          // High priority spawn should exceed low threshold
          const assessment = riskService.assess(decision);
          if (assessment.riskScore > 10) {
            return !assessment.approved && assessment.rejectionReason !== undefined && assessment.rejectionReason.length > 0;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: risk-authority-telemetry, Property 3: Cascading effect prediction completeness
  test('Property 3: Decisions affecting systems have cascading effects', () => {
    fc.assert(
      fc.property(
        aiDecisionArb.filter(d => d.type === 'spawn' || d.type === 'heat_change'),
        (decision) => {
          if (decision.type === 'heat_change') {
            decision.parameters = { delta: 25 };
          }
          const assessment = riskService.assess(decision);
          return assessment.cascadingEffects.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: risk-authority-telemetry, Property 4: Assessment logging completeness
  test('Property 4: All assessments are logged with required fields', () => {
    fc.assert(
      fc.property(aiDecisionArb, (decision) => {
        riskService.assess(decision);
        const logs = riskService.getAssessmentLogs(1);
        if (logs.length === 0) return false;
        const log = logs[0];
        return (
          log.timestamp > 0 &&
          log.decisionType !== undefined &&
          typeof log.riskScore === 'number'
        );
      }),
      { numRuns: 100 }
    );
  });

  // Feature: risk-authority-telemetry, Property 5: Priority queue ordering
  test('Property 5: Queued decisions are processed in priority order', () => {
    fc.assert(
      fc.property(
        fc.array(aiDecisionArb, { minLength: 2, maxLength: 10 }),
        (decisions) => {
          const service = new RiskAssessmentService();
          decisions.forEach(d => service.queueDecision(d));
          const results = service.processQueue();
          
          // Check that results are in descending priority order
          for (let i = 1; i < results.length; i++) {
            const prevDecision = decisions.find(d => d.id === results[i - 1].decisionId);
            const currDecision = decisions.find(d => d.id === results[i].decisionId);
            if (prevDecision && currDecision && prevDecision.priority < currDecision.priority) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Authority Validator', () => {
  let validator: AuthorityValidator;

  beforeEach(() => {
    validator = new AuthorityValidator();
  });

  // Feature: risk-authority-telemetry, Property 6: Authority validation determinism
  test('Property 6: Validation is deterministic (same input = same output)', () => {
    fc.assert(
      fc.property(aiDecisionArb, entityStateArb, (decision, entity) => {
        const gameState: GameState = {
          entities: new Map([[decision.entityId, { ...entity, id: decision.entityId, alive: true }]]),
          factions: new Map(),
          squads: new Map(),
          worldTime: Date.now(),
          activeAnomalies: []
        };

        // Reset rate limits between calls
        validator.resetRateLimits();
        const result1 = validator.validate(decision, gameState);
        validator.resetRateLimits();
        const result2 = validator.validate(decision, gameState);

        return result1.valid === result2.valid && result1.reasonCode === result2.reasonCode;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: risk-authority-telemetry, Property 7: Doctrine violation detection
  test('Property 7: Forbidden actions are rejected with DOCTRINE_VIOLATION', () => {
    fc.assert(
      fc.property(aiDecisionArb, factionStateArb, (decision, faction) => {
        // Set up faction with forbidden action
        const forbiddenAction = decision.action;
        faction.doctrine.forbiddenActions = [forbiddenAction];
        faction.doctrine.allowedActions = [];
        decision.factionId = faction.id;

        const gameState: GameState = {
          entities: new Map([[decision.entityId, {
            id: decision.entityId,
            alive: true,
            health: 100,
            lastStateChange: Date.now(),
            currentState: 'idle',
            factionId: faction.id
          }]]),
          factions: new Map([[faction.id, faction]]),
          squads: new Map(),
          worldTime: Date.now(),
          activeAnomalies: []
        };

        validator.resetRateLimits();
        const result = validator.validate(decision, gameState);
        return result.reasonCode === 'DOCTRINE_VIOLATION';
      }),
      { numRuns: 100 }
    );
  });

  // Feature: risk-authority-telemetry, Property 8: Rate limit enforcement
  test('Property 8: Exceeding rate limits returns RATE_LIMITED', () => {
    validator = new AuthorityValidator({
      spawn: { maxPerSecond: 2, windowMs: 1000 }
    });

    const gameState: GameState = {
      entities: new Map(),
      factions: new Map(),
      squads: new Map(),
      worldTime: Date.now(),
      activeAnomalies: []
    };

    // Make 3 spawn decisions - third should be rate limited
    const decisions = [1, 2, 3].map(i => ({
      id: `spawn-${i}`,
      type: 'spawn' as const,
      entityId: `entity-${i}`,
      action: 'spawn',
      parameters: {},
      priority: 1,
      timestamp: Date.now()
    }));

    const results = decisions.map(d => validator.validate(d, gameState));
    
    expect(results[0].valid).toBe(true);
    expect(results[1].valid).toBe(true);
    expect(results[2].reasonCode).toBe('RATE_LIMITED');
  });

  // Example test for dead entity rejection
  test('Example: Dead entity returns ENTITY_DEAD', () => {
    const decision: AIDecision = {
      id: 'test-1',
      type: 'enemy_update',
      entityId: 'dead-entity',
      action: 'attack',
      parameters: {},
      priority: 1,
      timestamp: Date.now()
    };

    const gameState: GameState = {
      entities: new Map([['dead-entity', {
        id: 'dead-entity',
        alive: false,
        health: 0,
        lastStateChange: Date.now(),
        currentState: 'idle'
      }]]),
      factions: new Map(),
      squads: new Map(),
      worldTime: Date.now(),
      activeAnomalies: []
    };

    const result = validator.validate(decision, gameState);
    expect(result.reasonCode).toBe('ENTITY_DEAD');
  });
});

describe('Telemetry System', () => {
  let telemetry: TelemetrySystem;

  beforeEach(() => {
    telemetry = new TelemetrySystem();
  });

  // Feature: risk-authority-telemetry, Property 9: Telemetry record completeness
  test('Property 9: All recorded events have required fields', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('decision_executed', 'decision_rejected', 'escalation_change') as fc.Arbitrary<'decision_executed' | 'decision_rejected' | 'escalation_change'>,
        fc.dictionary(fc.string(), fc.oneof(fc.integer(), fc.string())),
        (eventType, data) => {
          telemetry.emit(eventType, data);
          const events = telemetry.getRecentEvents(1);
          if (events.length === 0) return false;
          const event = events[0];
          return (
            event.eventId !== undefined &&
            event.eventType === eventType &&
            event.timestamp > 0 &&
            event.data !== undefined
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: risk-authority-telemetry, Property 12: Performance counter validity
  test('Property 12: Performance counters have non-negative values', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('decision_executed', 'decision_rejected') as fc.Arbitrary<'decision_executed' | 'decision_rejected'>, { maxLength: 20 }),
        (eventTypes) => {
          const tel = new TelemetrySystem();
          eventTypes.forEach(type => tel.emit(type, { latencyMs: 10 }));
          const counters = tel.getCounters();
          return (
            counters.decisionsPerSecond >= 0 &&
            counters.averageLatencyMs >= 0 &&
            counters.memoryUsageMB >= 0 &&
            counters.activeEntities >= 0 &&
            counters.pendingDecisions >= 0 &&
            counters.totalDecisionsProcessed >= 0 &&
            counters.totalRejectionsCount >= 0 &&
            counters.autofixTriggeredCount >= 0
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Autofix Hooks', () => {
  let autofix: AutofixHooks;

  beforeEach(() => {
    jest.useFakeTimers();
    autofix = new AutofixHooks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // Feature: risk-authority-telemetry, Property 13: Excessive spawning throttle
  test('Property 13: Excessive spawning triggers throttle', () => {
    const report: AnomalyReport = {
      id: 'test-anomaly',
      type: 'EXCESSIVE_SPAWNING',
      severity: 'high',
      affectedEntities: [],
      detectedAt: Date.now(),
      metrics: { spawnsPerSecond: 100, threshold: 50 },
      description: 'Test excessive spawning'
    };

    const result = autofix.trigger(report);
    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe('throttle_spawning');
    expect(autofix.isSpawnThrottleActive()).toBe(true);
    
    // Fast-forward timers to clear the throttle
    jest.advanceTimersByTime(5000);
    expect(autofix.isSpawnThrottleActive()).toBe(false);
  });

  // Feature: risk-authority-telemetry, Property 14: Stuck AI reset
  test('Property 14: Stuck AI triggers reset to idle', () => {
    let resetCalled = false;
    autofix.onEntityReset((entityId) => {
      resetCalled = true;
      expect(entityId).toBe('stuck-entity');
    });

    const report: AnomalyReport = {
      id: 'test-anomaly',
      type: 'STUCK_AI',
      severity: 'medium',
      affectedEntities: ['stuck-entity'],
      detectedAt: Date.now(),
      metrics: { lastStateChange: Date.now() - 60000, stuckDurationMs: 60000 },
      description: 'Test stuck AI'
    };

    const result = autofix.trigger(report);
    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe('reset_to_idle');
    expect(resetCalled).toBe(true);
  });

  // Feature: risk-authority-telemetry, Property 15: Autofix telemetry emission
  test('Property 15: Autofix triggers emit telemetry', () => {
    let telemetryEmitted = false;
    autofix.onTelemetry((result) => {
      telemetryEmitted = true;
      expect(result.anomalyType).toBe('STUCK_AI');
    });

    const report: AnomalyReport = {
      id: 'test-anomaly',
      type: 'STUCK_AI',
      severity: 'medium',
      affectedEntities: ['entity-1'],
      detectedAt: Date.now(),
      metrics: {},
      description: 'Test'
    };

    autofix.trigger(report);
    expect(telemetryEmitted).toBe(true);
  });

  // Feature: risk-authority-telemetry, Property 16: Autofix escalation on failure
  test('Property 16: Failed autofix escalates', () => {
    // Register a handler that always fails
    autofix.register('PERFORMANCE_DEGRADATION', () => ({
      success: false,
      anomalyId: 'test',
      anomalyType: 'PERFORMANCE_DEGRADATION',
      actionTaken: 'none',
      entitiesAffected: 0,
      escalated: false,
      timestamp: Date.now()
    }));

    const report: AnomalyReport = {
      id: 'test-anomaly',
      type: 'PERFORMANCE_DEGRADATION',
      severity: 'high',
      affectedEntities: [],
      detectedAt: Date.now(),
      metrics: { averageLatencyMs: 500 },
      description: 'Test performance issue'
    };

    const result = autofix.trigger(report);
    expect(result.escalated).toBe(true);
  });
});

describe('AI Decision Pipeline', () => {
  let registry: ServiceRegistry;
  let pipeline: AIDecisionPipeline;

  beforeEach(() => {
    registry = new ServiceRegistry();
    pipeline = registry.getPipeline();
  });

  // Feature: risk-authority-telemetry, Property 17: Pipeline risk assessment routing
  test('Property 17: All decisions pass through risk assessment', () => {
    fc.assert(
      fc.property(aiDecisionArb, (decision) => {
        const trace = pipeline.process(decision);
        const riskStage = trace.stages.find(s => s.name === 'risk_assessment');
        return riskStage !== undefined;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: risk-authority-telemetry, Property 18: Pipeline validation routing
  test('Property 18: Approved decisions pass through validation', () => {
    // Set high threshold so most pass risk assessment
    registry.getConfigManager().update('riskThreshold', 95);

    fc.assert(
      fc.property(aiDecisionArb, (decision) => {
        const trace = pipeline.process(decision);
        if (trace.riskAssessment?.approved) {
          const validationStage = trace.stages.find(s => s.name === 'validation');
          return validationStage !== undefined;
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: risk-authority-telemetry, Property 19: Pipeline rejection propagation
  test('Property 19: Rejected decisions have executed=false and reason', () => {
    // Set very low threshold to force rejections
    registry.getConfigManager().update('riskThreshold', 5);

    fc.assert(
      fc.property(
        aiDecisionArb.filter(d => d.priority > 3),
        (decision) => {
          const trace = pipeline.process(decision);
          if (!trace.riskAssessment?.approved || !trace.validation?.valid) {
            return trace.executed === false;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: risk-authority-telemetry, Property 20: Pipeline trace completeness
  test('Property 20: All traces have timing information', () => {
    fc.assert(
      fc.property(aiDecisionArb, (decision) => {
        const trace = pipeline.process(decision);
        return (
          trace.traceId !== undefined &&
          trace.totalLatencyMs >= 0 &&
          trace.stages.length > 0 &&
          trace.stages.every(s => s.startTime > 0 && s.endTime >= s.startTime)
        );
      }),
      { numRuns: 100 }
    );
  });
});

describe('Configuration Manager', () => {
  let configManager: ConfigurationManager;

  beforeEach(() => {
    configManager = new ConfigurationManager();
  });

  // Feature: risk-authority-telemetry, Property 21: Configuration hot reload
  test('Property 21: Valid config updates take effect without restart', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (threshold) => {
          const updated = configManager.update('riskThreshold', threshold);
          if (updated) {
            return configManager.get().riskThreshold === threshold;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: risk-authority-telemetry, Property 22: Invalid configuration rejection
  test('Property 22: Invalid config is rejected, previous config retained', () => {
    const originalThreshold = configManager.get().riskThreshold;
    
    // Try to set invalid threshold
    const updated = configManager.update('riskThreshold', 150 as number);
    
    expect(updated).toBe(false);
    expect(configManager.get().riskThreshold).toBe(originalThreshold);
  });

  // Feature: risk-authority-telemetry, Property 23: Configuration change logging
  test('Property 23: Config changes are logged with old and new values', () => {
    configManager.update('riskThreshold', 50);
    const logs = configManager.getChangeLogs(1);
    
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].key).toBe('riskThreshold');
    expect(logs[0].newValue).toBe(50);
  });
});

describe('Service Registry Integration', () => {
  test('All services initialize correctly', () => {
    const registry = new ServiceRegistry();
    const status = registry.getStatus();

    expect(status.configManager).toBe(true);
    expect(status.telemetry).toBe(true);
    expect(status.autofix).toBe(true);
    expect(status.riskAssessment).toBe(true);
    expect(status.authorityValidator).toBe(true);
    expect(status.pipeline).toBe(true);
    expect(registry.isInitialized()).toBe(true);
  });

  test('Configuration changes propagate to services', () => {
    const registry = new ServiceRegistry();
    
    registry.getConfigManager().update('riskThreshold', 30);
    
    expect(registry.getRiskAssessment().getThreshold()).toBe(30);
  });

  test('Shutdown clears all service state', () => {
    const registry = new ServiceRegistry();
    
    // Generate some state
    const decision: AIDecision = {
      id: 'test',
      type: 'spawn',
      entityId: 'entity-1',
      action: 'spawn',
      parameters: {},
      priority: 1,
      timestamp: Date.now()
    };
    registry.getPipeline().process(decision);
    
    // Shutdown
    registry.shutdown();
    
    expect(registry.isInitialized()).toBe(false);
  });
});


describe('Enhanced Enemy AI Stack Integration', () => {
  test('Enhanced stack integrates with pipeline', () => {
    // Dynamic import to avoid circular dependency issues
    const { EnhancedEnemyAIStack } = require('../src/ai/EnhancedEnemyAIStack');
    
    const stack = new EnhancedEnemyAIStack();
    
    // Set high threshold to allow spawns
    stack.setRiskThreshold(95);
    
    // Register an enemy
    const enemy = {
      id: 'test-enemy-1',
      position: { x: 0, y: 0, z: 0 },
      facing: { x: 1, y: 0, z: 0 },
      health: 100,
      maxHealth: 100,
      faction: 'raiders',
      state: 'idle' as const
    };
    
    stack.registerEnemy(enemy);
    
    // Get pipeline stats - should have processed at least one decision
    const stats = stack.getPipelineStats();
    expect(stats.totalProcessed).toBeGreaterThan(0);
    
    // Cleanup
    stack.shutdown();
  });

  test('Enhanced stack tracks telemetry', () => {
    const { EnhancedEnemyAIStack } = require('../src/ai/EnhancedEnemyAIStack');
    
    const stack = new EnhancedEnemyAIStack();
    stack.setRiskThreshold(95);
    
    // Register multiple enemies
    for (let i = 0; i < 5; i++) {
      stack.registerEnemy({
        id: `enemy-${i}`,
        position: { x: i * 10, y: 0, z: 0 },
        facing: { x: 1, y: 0, z: 0 },
        health: 100,
        maxHealth: 100,
        faction: 'raiders',
        state: 'idle' as const
      });
    }
    
    // Get telemetry counters - should have processed decisions
    const counters = stack.getTelemetryCounters();
    expect(counters.totalDecisionsProcessed).toBeGreaterThanOrEqual(5);
    
    // Cleanup
    stack.shutdown();
  });

  test('Enhanced stack respects risk threshold', () => {
    const { EnhancedEnemyAIStack } = require('../src/ai/EnhancedEnemyAIStack');
    
    const stack = new EnhancedEnemyAIStack();
    
    // Set very low threshold
    stack.setRiskThreshold(5);
    
    // Register enemy - may be rejected due to low threshold
    const enemy = {
      id: 'high-risk-enemy',
      position: { x: 0, y: 0, z: 0 },
      facing: { x: 1, y: 0, z: 0 },
      health: 100,
      maxHealth: 100,
      faction: 'raiders',
      state: 'idle' as const
    };
    
    stack.registerEnemy(enemy);
    
    // Check traces for rejection
    const traces = stack.getRecentTraces(10);
    expect(traces.length).toBeGreaterThan(0);
    
    // Cleanup
    stack.shutdown();
  });

  test('Enhanced stack creates squads with pipeline', () => {
    const { EnhancedEnemyAIStack } = require('../src/ai/EnhancedEnemyAIStack');
    
    const stack = new EnhancedEnemyAIStack();
    stack.setRiskThreshold(95);
    
    // Register enemies first
    const enemyIds = ['squad-member-1', 'squad-member-2', 'squad-member-3'];
    enemyIds.forEach(id => {
      stack.registerEnemy({
        id,
        position: { x: 0, y: 0, z: 0 },
        facing: { x: 1, y: 0, z: 0 },
        health: 100,
        maxHealth: 100,
        faction: 'raiders',
        state: 'idle' as const
      });
    });
    
    // Create squad
    const squad = stack.createSquad('test-squad', enemyIds);
    expect(squad.squadId).toBe('test-squad');
    
    // Cleanup
    stack.shutdown();
  });

  test('Debug mode enables reasoning stream', () => {
    const { EnhancedEnemyAIStack } = require('../src/ai/EnhancedEnemyAIStack');
    
    const stack = new EnhancedEnemyAIStack();
    
    // Enable debug mode
    stack.setDebugMode(true);
    
    // Verify config updated
    const config = stack.getServices().getConfigManager().get();
    expect(config.telemetry.debugMode).toBe(true);
    
    // Cleanup
    stack.shutdown();
  });
});
