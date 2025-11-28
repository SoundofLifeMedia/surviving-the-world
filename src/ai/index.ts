/**
 * Enemy AI Stack - GTA-grade intelligence for Surviving The World™
 * 
 * Layer 1: Perception Layer - sight, sound, memory, environmental modifiers
 * Layer 2: Behavior Tree - combat state machine (existing in CombatAISystem)
 * Layer 3: Micro-Agent System - internal decision agents
 * Layer 4: Enemy Coordinator Agent - squad-level tactics
 * 
 * EnemyAIStack - Integrated system combining all 4 layers
 */

export * from './PerceptionLayer';
export * from './MicroAgentSystem';
export * from './EnemyCoordinatorAgent';
export * from './EnemyAIStack';

// Re-export types for convenience
export type {
  Vector3,
  PerceptionState,
  PerceptionModifiers,
  WeatherEffect,
  PerceptionConfig
} from './PerceptionLayer';

export type {
  CombatContext,
  AggressionOutput,
  TacticsOutput,
  PerceptionAgentOutput,
  MoraleOutput,
  MicroAgentOutputs,
  ResolvedBehavior,
  MicroAgentConfig
} from './MicroAgentSystem';

export type {
  SquadRole,
  SquadMember,
  SquadState,
  SquadTactic,
  PlayerAction,
  PredictedBehavior
} from './EnemyCoordinatorAgent';
