/**
 * Enhanced Enemy AI Stack - Full integration with Risk/Authority/Telemetry Pipeline
 * Extends EnemyAIStack with observability, validation, and autofix capabilities
 * Feature: risk-authority-telemetry
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { EnemyAIStack, Enemy, AIUpdateResult, WorldContext, EnemyState } from './EnemyAIStack';
import { MicroAgentConfig } from './MicroAgentSystem';
import { SquadState, PlayerAction } from './EnemyCoordinatorAgent';
import { Vector3 } from './PerceptionLayer';
import { ServiceRegistry } from '../core/ServiceRegistry';
import { AIDecision } from '../core/types/RiskTypes';
import { GameState, EntityState, FactionState, SquadValidationState } from '../core/types/ValidationTypes';
import { PipelineTrace } from '../core/types/TelemetryTypes';

/**
 * Enhanced AI update result with pipeline trace
 */
export interface EnhancedAIUpdateResult extends AIUpdateResult {
  trace: PipelineTrace;
  approved: boolean;
  rejectionReason?: string;
}

/**
 * EnhancedEnemyAIStack - EnemyAIStack with full pipeline integration
 */
export class EnhancedEnemyAIStack extends EnemyAIStack {
  private services: ServiceRegistry;
  private factions: Map<string, FactionState> = new Map();
  private squads: Map<string, SquadValidationState> = new Map();

  constructor(services?: ServiceRegistry) {
    super();
    this.services = services || new ServiceRegistry();
    
    // Wire entity reset callback for stuck AI autofix
    this.services.getAutofix().onEntityReset((entityId) => {
      const enemy = this.getEnemy(entityId);
      if (enemy) {
        enemy.state = 'idle';
        this.services.getTelemetry().trackEntityStateChange(entityId);
      }
    });

    // Wire spawn throttle callback
    this.services.getAutofix().onSpawnThrottle((enabled) => {
      if (enabled) {
        this.services.getTelemetry().emit('performance_warning', {
          type: 'spawn_throttle_active',
          message: 'Spawn throttle activated due to excessive spawning'
        });
      }
    });
  }

  /**
   * Register enemy with pipeline tracking
   */
  override registerEnemy(enemy: Enemy, microAgentConfig?: Partial<MicroAgentConfig>): void {
    // Check spawn throttle
    if (this.services.getAutofix().isSpawnThrottleActive()) {
      this.services.getTelemetry().emit('decision_rejected', {
        decisionType: 'spawn',
        entityId: enemy.id,
        reason: 'Spawn throttle active'
      });
      return;
    }

    // Create spawn decision
    const decision: AIDecision = {
      id: `spawn-${enemy.id}-${Date.now()}`,
      type: 'spawn',
      entityId: enemy.id,
      factionId: enemy.faction,
      squadId: enemy.squadId,
      action: 'register_enemy',
      parameters: { microAgentConfig },
      priority: 5,
      timestamp: Date.now()
    };

    // Process through pipeline
    const trace = this.services.getPipeline().process(decision);
    
    if (trace.executed) {
      super.registerEnemy(enemy, microAgentConfig);
      this.services.getTelemetry().trackEntityStateChange(enemy.id);
    }
  }

  /**
   * Remove enemy with pipeline tracking
   */
  override removeEnemy(enemyId: string): void {
    const decision: AIDecision = {
      id: `despawn-${enemyId}-${Date.now()}`,
      type: 'despawn',
      entityId: enemyId,
      action: 'remove_enemy',
      parameters: {},
      priority: 3,
      timestamp: Date.now()
    };

    const trace = this.services.getPipeline().process(decision);
    
    if (trace.executed) {
      super.removeEnemy(enemyId);
      this.services.getTelemetry().removeEntity(enemyId);
    }
  }

  /**
   * Update enemy with full pipeline integration
   */
  updateEnemyWithPipeline(enemyId: string, deltaTime: number): EnhancedAIUpdateResult | null {
    const enemy = this.getEnemy(enemyId);
    if (!enemy) return null;

    // Create enemy update decision
    const decision: AIDecision = {
      id: `update-${enemyId}-${Date.now()}`,
      type: 'enemy_update',
      entityId: enemyId,
      factionId: enemy.faction,
      squadId: enemy.squadId,
      action: 'update_ai',
      parameters: { deltaTime, currentState: enemy.state },
      priority: 7,
      timestamp: Date.now()
    };

    // Set game state provider
    this.services.getPipeline().setGameStateProvider(() => this.buildGameState());

    // Set executor to perform the actual update
    const resultHolder: { value: AIUpdateResult | null } = { value: null };
    this.services.getPipeline().setExecutor((d) => {
      if (d.type === 'enemy_update') {
        resultHolder.value = super.updateEnemy(d.entityId, d.parameters.deltaTime as number);
      }
      return resultHolder.value;
    });

    // Process through pipeline
    const trace = this.services.getPipeline().process(decision);
    const updateResult = resultHolder.value;

    // Track state change for stuck AI detection
    if (updateResult) {
      this.services.getTelemetry().trackEntityStateChange(enemyId);
      
      // Record reasoning if debug mode enabled
      if (this.services.getConfigManager().get().telemetry.debugMode) {
        this.services.getTelemetry().recordReasoning({
          entityId: enemyId,
          timestamp: Date.now(),
          reasoningType: 'tactics',
          inputs: { state: enemy.state, health: enemy.health },
          outputs: { newState: updateResult.newState, behavior: updateResult.behavior },
          decision: updateResult.behavior.action
        });
      }

      return {
        enemyId: updateResult.enemyId,
        newState: updateResult.newState,
        behavior: updateResult.behavior,
        targetPosition: updateResult.targetPosition,
        squadTactic: updateResult.squadTactic,
        trace,
        approved: trace.executed,
        rejectionReason: trace.executed ? undefined : 
          (trace.riskAssessment?.rejectionReason || trace.validation?.details)
      };
    }

    return {
      enemyId: enemyId,
      newState: enemy.state,
      behavior: { action: 'hold' as const, intensity: 0, coordination: false, priority: 0 },
      targetPosition: null,
      squadTactic: null,
      trace,
      approved: false,
      rejectionReason: trace.riskAssessment?.rejectionReason || trace.validation?.details
    };
  }

  /**
   * Create squad with pipeline tracking
   */
  override createSquad(squadId: string, enemyIds: string[]): SquadState {
    const decision: AIDecision = {
      id: `squad-create-${squadId}-${Date.now()}`,
      type: 'squad_tactic',
      entityId: squadId,
      action: 'create_squad',
      parameters: { memberIds: enemyIds },
      priority: 6,
      timestamp: Date.now()
    };

    const trace = this.services.getPipeline().process(decision);
    
    if (trace.executed) {
      const squad = super.createSquad(squadId, enemyIds);
      
      // Track in validation state
      this.squads.set(squadId, {
        id: squadId,
        memberIds: enemyIds,
        factionId: this.getEnemy(enemyIds[0])?.faction || 'unknown',
        isActive: true
      });

      this.services.getTelemetry().emit('squad_formation', {
        squadId,
        memberCount: enemyIds.length
      });

      return squad;
    }

    // Return empty squad if rejected
    return {
      squadId,
      members: [],
      roles: new Map(),
      currentTactic: { type: 'hold', primaryTarget: { x: 0, y: 0, z: 0 }, flankingRoutes: [], suppressionTargets: [] },
      playerSkillAssessment: 0.5,
      reinforcementsPending: false,
      formationCenter: { x: 0, y: 0, z: 0 }
    };
  }

  /**
   * Register a faction for validation
   */
  registerFaction(faction: FactionState): void {
    this.factions.set(faction.id, faction);
  }

  /**
   * Get service registry for external access
   */
  getServices(): ServiceRegistry {
    return this.services;
  }

  /**
   * Get pipeline statistics
   */
  getPipelineStats(): {
    totalProcessed: number;
    approved: number;
    rejected: number;
    averageLatencyMs: number;
  } {
    return this.services.getPipeline().getStats();
  }

  /**
   * Get recent pipeline traces
   */
  getRecentTraces(count: number): PipelineTrace[] {
    return this.services.getPipeline().getRecentTraces(count);
  }

  /**
   * Get telemetry counters
   */
  getTelemetryCounters() {
    return this.services.getTelemetry().getCounters();
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.services.getTelemetry().enableDebugStreaming(enabled);
    this.services.getConfigManager().update('telemetry', {
      ...this.services.getConfigManager().get().telemetry,
      debugMode: enabled
    });
  }

  /**
   * Update risk threshold
   */
  setRiskThreshold(threshold: number): void {
    this.services.getConfigManager().update('riskThreshold', threshold);
  }

  /**
   * Shutdown services
   */
  shutdown(): void {
    this.services.shutdown();
  }

  private buildGameState(): GameState {
    const entities = new Map<string, EntityState>();
    
    // Convert enemies to entity states
    for (const [id, enemy] of Array.from(this.getAllEnemies().entries())) {
      entities.set(id, {
        id: enemy.id,
        alive: enemy.health > 0,
        health: enemy.health,
        lastStateChange: Date.now(), // Would track actual last change
        currentState: enemy.state,
        factionId: enemy.faction
      });
    }

    return {
      entities,
      factions: this.factions,
      squads: this.squads,
      worldTime: Date.now(),
      activeAnomalies: []
    };
  }

  private getAllEnemies(): Map<string, Enemy> {
    // Access parent's enemies map through getEnemy
    const enemies = new Map<string, Enemy>();
    // This is a workaround - in production, expose enemies properly
    return enemies;
  }
}

/**
 * Create an enhanced AI stack with default services
 */
export function createEnhancedAIStack(): EnhancedEnemyAIStack {
  return new EnhancedEnemyAIStack();
}
