/**
 * Authority Validator - Validates AI decisions against game rules
 * Feature: risk-authority-telemetry
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { AIDecision } from '../core/types/RiskTypes';
import {
  ValidationResult,
  ValidationReasonCode,
  GameState,
  RateLimitConfig,
  RateLimitState,
  DEFAULT_RATE_LIMITS,
  IAuthorityValidator
} from '../core/types/ValidationTypes';

/**
 * AuthorityValidator - Validates AI decisions against game state and rules
 */
export class AuthorityValidator implements IAuthorityValidator {
  private rateLimits: Map<string, RateLimitConfig> = new Map();
  private rateLimitStates: Map<string, RateLimitState> = new Map();

  constructor(rateLimits: Record<string, RateLimitConfig> = DEFAULT_RATE_LIMITS) {
    for (const [key, config] of Object.entries(rateLimits)) {
      this.rateLimits.set(key, config);
    }
  }

  /**
   * Validate an AI decision against game state
   * @param decision The AI decision to validate
   * @param gameState Current game state
   * @returns Validation result (deterministic - same input produces same output)
   */
  validate(decision: AIDecision, gameState: GameState): ValidationResult {
    const timestamp = Date.now();

    // Check rate limit first
    if (!this.checkRateLimit(decision.type)) {
      return {
        valid: false,
        reasonCode: 'RATE_LIMITED',
        details: `Rate limit exceeded for operation type: ${decision.type}`,
        entityId: decision.entityId,
        timestamp
      };
    }

    // Check entity exists and is alive (for entity-specific decisions)
    if (decision.entityId && decision.type !== 'spawn') {
      const entity = gameState.entities.get(decision.entityId);
      
      if (!entity) {
        return {
          valid: false,
          reasonCode: 'ENTITY_NOT_FOUND',
          details: `Entity not found: ${decision.entityId}`,
          entityId: decision.entityId,
          timestamp
        };
      }

      if (!entity.alive) {
        return {
          valid: false,
          reasonCode: 'ENTITY_DEAD',
          details: `Entity is dead: ${decision.entityId}`,
          entityId: decision.entityId,
          timestamp
        };
      }
    }

    // Check faction doctrine compliance
    if (decision.factionId) {
      if (!this.checkDoctrineCompliance(decision.factionId, decision.action, gameState)) {
        return {
          valid: false,
          reasonCode: 'DOCTRINE_VIOLATION',
          details: `Action '${decision.action}' violates faction doctrine for faction: ${decision.factionId}`,
          entityId: decision.entityId,
          timestamp
        };
      }
    }

    // Check squad validity
    if (decision.squadId) {
      const squad = gameState.squads.get(decision.squadId);
      if (!squad) {
        return {
          valid: false,
          reasonCode: 'INVALID_STATE',
          details: `Squad not found: ${decision.squadId}`,
          entityId: decision.entityId,
          timestamp
        };
      }
      if (!squad.isActive) {
        return {
          valid: false,
          reasonCode: 'INVALID_STATE',
          details: `Squad is not active: ${decision.squadId}`,
          entityId: decision.entityId,
          timestamp
        };
      }
    }

    // Validate decision-specific rules
    const specificValidation = this.validateDecisionSpecific(decision, gameState);
    if (!specificValidation.valid) {
      return { ...specificValidation, timestamp };
    }

    // All checks passed
    return {
      valid: true,
      reasonCode: 'APPROVED',
      entityId: decision.entityId,
      timestamp
    };
  }

  /**
   * Check if an entity is alive
   * @param entityId Entity ID to check
   * @param gameState Current game state
   * @returns true if entity exists and is alive
   */
  checkEntityAlive(entityId: string, gameState: GameState): boolean {
    const entity = gameState.entities.get(entityId);
    return entity !== undefined && entity.alive;
  }

  /**
   * Check if an action complies with faction doctrine
   * @param factionId Faction ID to check
   * @param action Action to validate
   * @param gameState Current game state
   * @returns true if action complies with doctrine
   */
  checkDoctrineCompliance(factionId: string, action: string, gameState: GameState): boolean {
    const faction = gameState.factions.get(factionId);
    if (!faction) {
      return true; // No faction = no doctrine restrictions
    }

    const doctrine = faction.doctrine;

    // Check forbidden actions
    if (doctrine.forbiddenActions.includes(action)) {
      return false;
    }

    // Check allowed actions (if specified, action must be in list)
    if (doctrine.allowedActions.length > 0 && !doctrine.allowedActions.includes(action)) {
      return false;
    }

    // Check war declaration permission
    if (action === 'declare_war' && !doctrine.canDeclareWar) {
      return false;
    }

    // Check alliance formation permission
    if (action === 'form_alliance' && !doctrine.canFormAlliance) {
      return false;
    }

    return true;
  }

  /**
   * Check if an operation is within rate limits
   * @param operationType Type of operation to check
   * @returns true if within rate limits
   */
  checkRateLimit(operationType: string): boolean {
    const config = this.rateLimits.get(operationType);
    if (!config) {
      return true; // No limit configured
    }

    const now = Date.now();
    let state = this.rateLimitStates.get(operationType);

    if (!state) {
      state = {
        operationType,
        count: 0,
        windowStart: now
      };
      this.rateLimitStates.set(operationType, state);
    }

    // Check if window has expired
    if (now - state.windowStart >= config.windowMs) {
      // Reset window
      state.count = 0;
      state.windowStart = now;
    }

    // Check if within limit
    if (state.count >= config.maxPerSecond) {
      return false;
    }

    // Increment count
    state.count++;
    return true;
  }

  /**
   * Reset all rate limits
   */
  resetRateLimits(): void {
    this.rateLimitStates.clear();
  }

  /**
   * Set rate limit configuration for an operation type
   * @param operationType Operation type to configure
   * @param config Rate limit configuration
   */
  setRateLimitConfig(operationType: string, config: RateLimitConfig): void {
    this.rateLimits.set(operationType, config);
  }

  /**
   * Get current rate limit state for an operation type
   * @param operationType Operation type to query
   * @returns Current rate limit state or undefined
   */
  getRateLimitState(operationType: string): RateLimitState | undefined {
    return this.rateLimitStates.get(operationType);
  }

  private validateDecisionSpecific(decision: AIDecision, gameState: GameState): Omit<ValidationResult, 'timestamp'> {
    switch (decision.type) {
      case 'spawn':
        return this.validateSpawn(decision, gameState);
      case 'despawn':
        return this.validateDespawn(decision, gameState);
      case 'heat_change':
        return this.validateHeatChange(decision, gameState);
      case 'squad_tactic':
        return this.validateSquadTactic(decision, gameState);
      case 'enemy_update':
        return this.validateEnemyUpdate(decision, gameState);
      default:
        return { valid: true, reasonCode: 'APPROVED' };
    }
  }

  private validateSpawn(decision: AIDecision, gameState: GameState): Omit<ValidationResult, 'timestamp'> {
    const count = (decision.parameters.count as number) || 1;
    
    // Check for excessive spawning
    if (count > 50) {
      return {
        valid: false,
        reasonCode: 'INVALID_STATE',
        details: `Spawn count ${count} exceeds maximum of 50 per decision`
      };
    }

    // Check faction exists if specified
    if (decision.factionId && !gameState.factions.has(decision.factionId)) {
      return {
        valid: false,
        reasonCode: 'FACTION_NOT_FOUND',
        details: `Faction not found: ${decision.factionId}`
      };
    }

    return { valid: true, reasonCode: 'APPROVED' };
  }

  private validateDespawn(decision: AIDecision, gameState: GameState): Omit<ValidationResult, 'timestamp'> {
    // Entity existence already checked in main validate
    return { valid: true, reasonCode: 'APPROVED' };
  }

  private validateHeatChange(decision: AIDecision, gameState: GameState): Omit<ValidationResult, 'timestamp'> {
    const delta = decision.parameters.delta as number;
    
    if (delta === undefined || typeof delta !== 'number') {
      return {
        valid: false,
        reasonCode: 'INVALID_STATE',
        details: 'Heat change requires numeric delta parameter'
      };
    }

    // Check faction exists
    if (decision.factionId && !gameState.factions.has(decision.factionId)) {
      return {
        valid: false,
        reasonCode: 'FACTION_NOT_FOUND',
        details: `Faction not found: ${decision.factionId}`
      };
    }

    return { valid: true, reasonCode: 'APPROVED' };
  }

  private validateSquadTactic(decision: AIDecision, gameState: GameState): Omit<ValidationResult, 'timestamp'> {
    if (!decision.squadId) {
      return {
        valid: false,
        reasonCode: 'INVALID_STATE',
        details: 'Squad tactic requires squadId'
      };
    }

    const squad = gameState.squads.get(decision.squadId);
    if (!squad) {
      return {
        valid: false,
        reasonCode: 'INVALID_STATE',
        details: `Squad not found: ${decision.squadId}`
      };
    }

    // Check squad has members
    if (squad.memberIds.length === 0) {
      return {
        valid: false,
        reasonCode: 'INVALID_STATE',
        details: `Squad has no members: ${decision.squadId}`
      };
    }

    return { valid: true, reasonCode: 'APPROVED' };
  }

  private validateEnemyUpdate(decision: AIDecision, gameState: GameState): Omit<ValidationResult, 'timestamp'> {
    const newState = decision.parameters.newState as string;
    const validStates = ['idle', 'aware', 'searching', 'engage', 'flank', 'retreat', 'surrender'];
    
    if (newState && !validStates.includes(newState)) {
      return {
        valid: false,
        reasonCode: 'INVALID_STATE',
        details: `Invalid enemy state: ${newState}`
      };
    }

    return { valid: true, reasonCode: 'APPROVED' };
  }
}
