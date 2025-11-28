/**
 * Validation Types - Core type definitions for authority validation
 * Feature: risk-authority-telemetry
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

/**
 * Reason codes for validation results
 */
export type ValidationReasonCode =
  | 'APPROVED'
  | 'ENTITY_DEAD'
  | 'DOCTRINE_VIOLATION'
  | 'RATE_LIMITED'
  | 'INVALID_STATE'
  | 'PERMISSION_DENIED'
  | 'ENTITY_NOT_FOUND'
  | 'FACTION_NOT_FOUND';

/**
 * Result of authority validation
 */
export interface ValidationResult {
  valid: boolean;
  reasonCode: ValidationReasonCode;
  details?: string;
  entityId?: string;
  timestamp: number;
}

/**
 * Entity state for validation
 */
export interface EntityState {
  id: string;
  alive: boolean;
  health: number;
  lastStateChange: number;
  currentState: string;
  factionId?: string;
}

/**
 * Faction state for validation
 */
export interface FactionState {
  id: string;
  doctrine: FactionDoctrine;
  territories: string[];
  allies: string[];
  enemies: string[];
}

/**
 * Faction doctrine rules
 */
export interface FactionDoctrine {
  allowedActions: string[];
  forbiddenActions: string[];
  maxEscalationTier: 'calm' | 'alert' | 'hunting' | 'war';
  canDeclareWar: boolean;
  canFormAlliance: boolean;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxPerSecond: number;
  windowMs: number;
}

/**
 * Rate limit state tracking
 */
export interface RateLimitState {
  operationType: string;
  count: number;
  windowStart: number;
}

/**
 * Game state for validation context
 */
export interface GameState {
  entities: Map<string, EntityState>;
  factions: Map<string, FactionState>;
  squads: Map<string, SquadValidationState>;
  worldTime: number;
  activeAnomalies: string[];
}

/**
 * Squad state for validation
 */
export interface SquadValidationState {
  id: string;
  memberIds: string[];
  factionId: string;
  isActive: boolean;
}

/**
 * Default rate limits
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  spawn: { maxPerSecond: 50, windowMs: 1000 },
  squad_create: { maxPerSecond: 10, windowMs: 1000 },
  reinforcement_call: { maxPerSecond: 5, windowMs: 1000 },
  heat_change: { maxPerSecond: 20, windowMs: 1000 },
  enemy_update: { maxPerSecond: 500, windowMs: 1000 }
};

/**
 * Interface for Authority Validator
 */
export interface IAuthorityValidator {
  validate(decision: import('./RiskTypes').AIDecision, gameState: GameState): ValidationResult;
  checkEntityAlive(entityId: string, gameState: GameState): boolean;
  checkDoctrineCompliance(factionId: string, action: string, gameState: GameState): boolean;
  checkRateLimit(operationType: string): boolean;
  resetRateLimits(): void;
  setRateLimitConfig(operationType: string, config: RateLimitConfig): void;
}
