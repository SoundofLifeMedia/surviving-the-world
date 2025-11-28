/**
 * AI Governance Module — Tier 1 System Agents
 * Enterprise-grade governance for Surviving The World™
 */

export {
  SimulationChair,
  getSimulationChair,
  resetSimulationChair,
  type AgentProposal,
  type GovernanceRule,
  type GovernanceResult,
  type TickContext,
  type SystemState,
  type SystemMetrics,
  type SimulationPhase,
  type ChairEvent
} from './SimulationChair';

export {
  BalanceSentinel,
  getBalanceSentinel,
  type BalanceMetrics,
  type BalanceThresholds,
  type BalanceViolation,
  type EnemyBalanceProfile
} from './BalanceSentinel';
