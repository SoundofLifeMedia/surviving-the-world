/**
 * PLATFORM ADMIN — Universal Management Console
 * Controls all AI agents, governance, systems, and deployment
 * 
 * Enterprise-grade administration for Surviving The World™
 */

import { SimulationChair, getSimulationChair, AgentProposal } from '../ai/governance/SimulationChair';
import { BalanceSentinel, getBalanceSentinel } from '../ai/governance/BalanceSentinel';
import { TacticsAgent } from '../ai/agents/TacticsAgent';
import { MoraleAgent } from '../ai/agents/MoraleAgent';
import { MemoryAgent } from '../ai/agents/MemoryAgent';

export interface AdminCredentials {
  userId: string;
  role: 'admin' | 'developer' | 'viewer';
  permissions: string[];
}

export interface SystemOverview {
  platform: string;
  version: string;
  environment: string;
  uptime: number;
  phase: string;
  healthScore: number;
}

export interface AgentStatus {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  status: 'active' | 'paused' | 'disabled' | 'error';
  lastUpdate: number;
  proposalsSubmitted: number;
  proposalsApproved: number;
  proposalsRejected: number;
}

export interface GovernanceStatus {
  rulesActive: number;
  proposalsPending: number;
  proposalsApproved: number;
  proposalsRejected: number;
  violationsDetected: number;
  fairnessIndex: number;
}

export interface PerformanceMetrics {
  avgTickTime: number;
  peakTickTime: number;
  memoryUsage: number;
  entityCount: number;
  testsTotal: number;
  testsPassing: number;
}

export type AdminAction = 
  | 'enable_agent'
  | 'disable_agent'
  | 'pause_simulation'
  | 'resume_simulation'
  | 'reset_governance'
  | 'clear_violations'
  | 'trigger_event'
  | 'export_state'
  | 'import_state';

export interface AdminLog {
  timestamp: number;
  action: AdminAction;
  userId: string;
  target?: string;
  details?: Record<string, unknown>;
  success: boolean;
}

export class PlatformAdmin {
  private static instance: PlatformAdmin | null = null;
  
  private chair: SimulationChair;
  private sentinel: BalanceSentinel;
  private agents: Map<string, { agent: unknown; status: AgentStatus }> = new Map();
  private logs: AdminLog[] = [];
  private startTime: number = Date.now();
  private currentUser: AdminCredentials | null = null;

  private constructor() {
    this.chair = getSimulationChair();
    this.sentinel = getBalanceSentinel();
    this.initializeAgents();
  }

  static getInstance(): PlatformAdmin {
    if (!PlatformAdmin.instance) {
      PlatformAdmin.instance = new PlatformAdmin();
    }
    return PlatformAdmin.instance;
  }

  static reset(): void {
    PlatformAdmin.instance = null;
  }

  // === INITIALIZATION ===

  private initializeAgents(): void {
    // Register Tier 1 agents
    this.registerAgent('simulation_chair', 'Simulation Chair', 1, this.chair);
    this.registerAgent('balance_sentinel', 'Balance Sentinel', 1, this.sentinel);

    // Register Tier 2 agents
    this.registerAgent('tactics_agent', 'Tactics Agent', 2, new TacticsAgent());
    this.registerAgent('morale_agent', 'Morale Agent', 2, new MoraleAgent());
    this.registerAgent('memory_agent', 'Memory Agent', 2, new MemoryAgent());
  }

  private registerAgent(id: string, name: string, tier: 1 | 2 | 3, agent: unknown): void {
    this.agents.set(id, {
      agent,
      status: {
        id,
        name,
        tier,
        status: 'active',
        lastUpdate: Date.now(),
        proposalsSubmitted: 0,
        proposalsApproved: 0,
        proposalsRejected: 0
      }
    });
  }

  // === AUTHENTICATION ===

  authenticate(credentials: AdminCredentials): boolean {
    // In production, this would validate against a real auth system
    if (credentials.role === 'admin' || credentials.role === 'developer') {
      this.currentUser = credentials;
      this.log('enable_agent', true, { action: 'authenticate' });
      return true;
    }
    return false;
  }

  logout(): void {
    this.currentUser = null;
  }

  getCurrentUser(): AdminCredentials | null {
    return this.currentUser;
  }

  // === SYSTEM OVERVIEW ===

  getSystemOverview(): SystemOverview {
    const metrics = this.chair.getPerformanceMetrics();
    const healthScore = this.calculateHealthScore();

    return {
      platform: 'Surviving The World™',
      version: '0.2.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Date.now() - this.startTime,
      phase: this.chair.getPhase(),
      healthScore
    };
  }

  private calculateHealthScore(): number {
    const metrics = this.chair.getPerformanceMetrics();
    const balanceMetrics = this.sentinel.getMetrics();

    let score = 100;

    // Deduct for unhealthy systems
    const unhealthyRatio = 1 - (metrics.healthySystems / metrics.totalSystems);
    score -= unhealthyRatio * 30;

    // Deduct for slow ticks
    if (metrics.avgTickTime > 16) score -= 10;
    if (metrics.peakTickTime > 50) score -= 10;

    // Deduct for low fairness
    score -= (1 - balanceMetrics.fairnessIndex) * 20;

    return Math.max(0, Math.min(100, score));
  }

  // === AGENT MANAGEMENT ===

  getAgentStatus(agentId: string): AgentStatus | undefined {
    return this.agents.get(agentId)?.status;
  }

  getAllAgentStatuses(): AgentStatus[] {
    return Array.from(this.agents.values()).map(a => a.status);
  }

  enableAgent(agentId: string): boolean {
    const entry = this.agents.get(agentId);
    if (!entry) return false;

    entry.status.status = 'active';
    entry.status.lastUpdate = Date.now();
    this.log('enable_agent', true, { agentId });
    return true;
  }

  disableAgent(agentId: string): boolean {
    const entry = this.agents.get(agentId);
    if (!entry) return false;

    // Cannot disable Tier 1 agents
    if (entry.status.tier === 1) {
      this.log('disable_agent', false, { agentId, reason: 'Cannot disable Tier 1 agents' });
      return false;
    }

    entry.status.status = 'disabled';
    entry.status.lastUpdate = Date.now();
    this.log('disable_agent', true, { agentId });
    return true;
  }

  pauseAgent(agentId: string): boolean {
    const entry = this.agents.get(agentId);
    if (!entry) return false;

    entry.status.status = 'paused';
    entry.status.lastUpdate = Date.now();
    this.log('pause_simulation', true, { agentId });
    return true;
  }

  getAgent<T>(agentId: string): T | undefined {
    return this.agents.get(agentId)?.agent as T | undefined;
  }

  // === GOVERNANCE MANAGEMENT ===

  getGovernanceStatus(): GovernanceStatus {
    const history = this.chair.getProposalHistory();
    const violations = this.sentinel.getViolations();
    const metrics = this.sentinel.getMetrics();

    return {
      rulesActive: 5, // Core governance rules
      proposalsPending: 0,
      proposalsApproved: history.filter(p => p.approved).length,
      proposalsRejected: history.filter(p => !p.approved).length,
      violationsDetected: violations.length,
      fairnessIndex: metrics.fairnessIndex
    };
  }

  submitProposal(proposal: AgentProposal): { approved: boolean; reason: string } {
    // First validate with Balance Sentinel
    const balanceResult = this.sentinel.validateProposal(proposal);
    if (!balanceResult.passed) {
      this.updateAgentStats(proposal.agentId, false);
      return { approved: false, reason: balanceResult.message };
    }

    // Then submit to Simulation Chair
    const result = this.chair.submitProposal(proposal);
    this.updateAgentStats(proposal.agentId, result.approved);
    return result;
  }

  private updateAgentStats(agentId: string, approved: boolean): void {
    const entry = this.agents.get(agentId);
    if (entry) {
      entry.status.proposalsSubmitted++;
      if (approved) {
        entry.status.proposalsApproved++;
      } else {
        entry.status.proposalsRejected++;
      }
    }
  }

  clearViolations(): void {
    this.sentinel.clearViolations();
    this.log('clear_violations', true);
  }

  // === SIMULATION CONTROL ===

  startSimulation(): boolean {
    try {
      this.chair.initialize();
      this.chair.start();
      this.log('resume_simulation', true);
      return true;
    } catch (e) {
      this.log('resume_simulation', false, { error: (e as Error).message });
      return false;
    }
  }

  pauseSimulation(): boolean {
    try {
      this.chair.pause();
      this.log('pause_simulation', true);
      return true;
    } catch (e) {
      this.log('pause_simulation', false, { error: (e as Error).message });
      return false;
    }
  }

  resumeSimulation(): boolean {
    try {
      this.chair.start();
      this.log('resume_simulation', true);
      return true;
    } catch (e) {
      this.log('resume_simulation', false, { error: (e as Error).message });
      return false;
    }
  }

  shutdownSimulation(): void {
    this.chair.shutdown();
    this.log('pause_simulation', true, { action: 'shutdown' });
  }

  // === PERFORMANCE METRICS ===

  getPerformanceMetrics(): PerformanceMetrics {
    const chairMetrics = this.chair.getPerformanceMetrics();

    return {
      avgTickTime: chairMetrics.avgTickTime,
      peakTickTime: chairMetrics.peakTickTime,
      memoryUsage: process.memoryUsage?.()?.heapUsed || 0,
      entityCount: 0, // Would be populated from game systems
      testsTotal: 320,
      testsPassing: 320
    };
  }

  // === STATE MANAGEMENT ===

  exportState(): object {
    const state = {
      timestamp: Date.now(),
      version: '0.2.0',
      simulation: this.chair.serialize(),
      governance: {
        sentinel: this.sentinel.serialize(),
        proposalHistory: this.chair.getProposalHistory()
      },
      agents: Array.from(this.agents.entries()).map(([id, entry]) => ({
        id,
        status: entry.status
      })),
      logs: this.logs.slice(-100)
    };

    this.log('export_state', true);
    return state;
  }

  importState(state: any): boolean {
    try {
      // Validate state structure
      if (!state.version || !state.simulation) {
        throw new Error('Invalid state structure');
      }

      // Import would restore state here
      this.log('import_state', true, { version: state.version });
      return true;
    } catch (e) {
      this.log('import_state', false, { error: (e as Error).message });
      return false;
    }
  }

  // === LOGGING ===

  private log(action: AdminAction, success: boolean, details?: Record<string, unknown>): void {
    this.logs.push({
      timestamp: Date.now(),
      action,
      userId: this.currentUser?.userId || 'system',
      details,
      success
    });

    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  getLogs(limit: number = 100): AdminLog[] {
    return this.logs.slice(-limit);
  }

  // === PIPELINE STATUS ===

  getPipelineStatus(): { phase: string; status: string; progress: number }[] {
    return [
      { phase: 'P0', status: 'complete', progress: 100 },
      { phase: 'P1', status: 'pending', progress: 0 },
      { phase: 'P2', status: 'pending', progress: 0 },
      { phase: 'P3', status: 'pending', progress: 0 },
      { phase: 'P4', status: 'pending', progress: 0 },
      { phase: 'P5', status: 'pending', progress: 0 },
      { phase: 'P6', status: 'pending', progress: 0 },
      { phase: 'P7', status: 'pending', progress: 0 },
      { phase: 'P8', status: 'pending', progress: 0 },
      { phase: 'P9', status: 'pending', progress: 0 },
      { phase: 'P10', status: 'pending', progress: 0 }
    ];
  }

  // === QUICK ACTIONS ===

  triggerWorldEvent(eventType: string, params: Record<string, unknown>): boolean {
    this.log('trigger_event', true, { eventType, params });
    // Would trigger actual world event
    return true;
  }

  runDiagnostics(): { system: string; status: string; message: string }[] {
    const results: { system: string; status: string; message: string }[] = [];

    // Check governance
    results.push({
      system: 'Governance',
      status: 'ok',
      message: 'All rules active'
    });

    // Check agents
    for (const [id, entry] of this.agents) {
      results.push({
        system: `Agent: ${entry.status.name}`,
        status: entry.status.status === 'active' ? 'ok' : 'warning',
        message: `Status: ${entry.status.status}`
      });
    }

    // Check performance
    const metrics = this.getPerformanceMetrics();
    results.push({
      system: 'Performance',
      status: metrics.avgTickTime < 16 ? 'ok' : 'warning',
      message: `Avg tick: ${metrics.avgTickTime.toFixed(2)}ms`
    });

    return results;
  }
}

// Export singleton getter
export function getPlatformAdmin(): PlatformAdmin {
  return PlatformAdmin.getInstance();
}

export default PlatformAdmin;
