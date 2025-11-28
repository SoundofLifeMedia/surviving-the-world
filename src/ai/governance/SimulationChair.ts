/**
 * SIMULATION CHAIR — Tier 1 System AI Agent
 * Controls global logic, event order, tick integrity
 * NEVER adds content — only protects system integrity
 * 
 * Enterprise-grade governance for Surviving The World™
 */

export interface TickContext {
  tickNumber: number;
  deltaTime: number;
  timestamp: number;
  systemStates: Map<string, SystemState>;
}

export interface SystemState {
  systemId: string;
  healthy: boolean;
  lastUpdateTick: number;
  pendingProposals: AgentProposal[];
  metrics: SystemMetrics;
}

export interface SystemMetrics {
  avgTickTime: number;
  peakTickTime: number;
  memoryUsage: number;
  entityCount: number;
}

export interface AgentProposal {
  agentId: string;
  agentTier: 1 | 2 | 3;
  proposalType: 'add' | 'modify' | 'remove';
  targetSystem: string;
  payload: unknown;
  confidence: number;
  timestamp: number;
  approved?: boolean;
  rejectionReason?: string;
}

export interface GovernanceRule {
  id: string;
  name: string;
  check: (proposal: AgentProposal, context: TickContext) => GovernanceResult;
  severity: 'block' | 'warn' | 'info';
}

export interface GovernanceResult {
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export type SimulationPhase = 'init' | 'running' | 'paused' | 'shutdown';

/**
 * Core governance rules that ALL agents must pass
 */
const CORE_GOVERNANCE_RULES: GovernanceRule[] = [
  {
    id: 'determinism',
    name: 'Determinism Check',
    severity: 'block',
    check: (proposal) => {
      // Proposals must not introduce randomness without seed
      const hasUnsafeRandom = JSON.stringify(proposal.payload).includes('Math.random()');
      return {
        passed: !hasUnsafeRandom,
        message: hasUnsafeRandom ? 'Proposal contains unseeded randomness' : 'Determinism OK'
      };
    }
  },
  {
    id: 'confidence_threshold',
    name: 'Confidence Threshold',
    severity: 'block',
    check: (proposal) => {
      const threshold = proposal.agentTier === 1 ? 0.95 : proposal.agentTier === 2 ? 0.80 : 0.70;
      return {
        passed: proposal.confidence >= threshold,
        message: proposal.confidence >= threshold 
          ? `Confidence ${proposal.confidence} meets threshold ${threshold}`
          : `Confidence ${proposal.confidence} below threshold ${threshold}`
      };
    }
  },
  {
    id: 'tick_safety',
    name: 'Tick Safety Check',
    severity: 'block',
    check: (proposal, context) => {
      const targetSystem = context.systemStates.get(proposal.targetSystem);
      if (!targetSystem) {
        return { passed: false, message: `Target system ${proposal.targetSystem} not found` };
      }
      // Don't allow modifications to unhealthy systems
      if (!targetSystem.healthy && proposal.proposalType === 'modify') {
        return { passed: false, message: 'Cannot modify unhealthy system' };
      }
      return { passed: true, message: 'Tick safety OK' };
    }
  },
  {
    id: 'schema_stability',
    name: 'Schema Stability Check',
    severity: 'block',
    check: (proposal) => {
      // Block proposals that modify core schema fields
      const protectedFields = ['id', 'version', 'checksum', 'createdAt'];
      const payloadStr = JSON.stringify(proposal.payload);
      const violatesSchema = protectedFields.some(field => 
        payloadStr.includes(`"${field}":`) && proposal.proposalType === 'modify'
      );
      return {
        passed: !violatesSchema,
        message: violatesSchema ? 'Proposal modifies protected schema fields' : 'Schema stability OK'
      };
    }
  },
  {
    id: 'no_cheating_ai',
    name: 'Fair AI Check',
    severity: 'block',
    check: (proposal) => {
      // Check for cheating patterns in AI proposals
      const cheatingPatterns = [
        'omniscient', 'perfect_accuracy', 'instant_reaction',
        'see_through_walls', 'unlimited_resources', 'god_mode'
      ];
      const payloadStr = JSON.stringify(proposal.payload).toLowerCase();
      const isCheating = cheatingPatterns.some(pattern => payloadStr.includes(pattern));
      return {
        passed: !isCheating,
        message: isCheating ? 'Proposal contains cheating AI patterns' : 'Fair AI OK'
      };
    }
  }
];

export class SimulationChair {
  private phase: SimulationPhase = 'init';
  private currentTick: number = 0;
  private systemStates: Map<string, SystemState> = new Map();
  private governanceRules: GovernanceRule[] = [...CORE_GOVERNANCE_RULES];
  private proposalHistory: AgentProposal[] = [];
  private listeners: Map<string, ((event: ChairEvent) => void)[]> = new Map();

  // Performance tracking
  private tickTimes: number[] = [];
  private readonly MAX_TICK_TIME_MS = 16; // 60 FPS target
  private readonly TICK_HISTORY_SIZE = 100;

  constructor() {
    this.registerCoreSystem('world', 'WorldStateManager');
    this.registerCoreSystem('player', 'PlayerSystem');
    this.registerCoreSystem('combat', 'CombatSystem');
    this.registerCoreSystem('economy', 'EconomySystem');
    this.registerCoreSystem('faction', 'FactionSystem');
    this.registerCoreSystem('npc', 'NPCSystem');
    this.registerCoreSystem('quest', 'QuestSystem');
    this.registerCoreSystem('enemy_ai', 'EnemyAIStack');
  }

  private registerCoreSystem(id: string, name: string): void {
    this.systemStates.set(id, {
      systemId: id,
      healthy: true,
      lastUpdateTick: 0,
      pendingProposals: [],
      metrics: {
        avgTickTime: 0,
        peakTickTime: 0,
        memoryUsage: 0,
        entityCount: 0
      }
    });
  }

  // === PHASE MANAGEMENT ===

  initialize(): void {
    this.phase = 'init';
    this.emit('phase_change', { from: 'init', to: 'init' });
    console.log('🎮 [SimulationChair] Initialized — Governance active');
  }

  start(): void {
    if (this.phase !== 'init' && this.phase !== 'paused') {
      throw new Error(`Cannot start from phase: ${this.phase}`);
    }
    const oldPhase = this.phase;
    this.phase = 'running';
    this.emit('phase_change', { from: oldPhase, to: 'running' });
    console.log('🚀 [SimulationChair] Simulation started');
  }

  pause(): void {
    if (this.phase !== 'running') return;
    this.phase = 'paused';
    this.emit('phase_change', { from: 'running', to: 'paused' });
    console.log('⏸️ [SimulationChair] Simulation paused');
  }

  shutdown(): void {
    const oldPhase = this.phase;
    this.phase = 'shutdown';
    this.emit('phase_change', { from: oldPhase, to: 'shutdown' });
    console.log('🛑 [SimulationChair] Simulation shutdown');
  }

  getPhase(): SimulationPhase {
    return this.phase;
  }

  // === TICK MANAGEMENT ===

  beginTick(deltaTime: number): TickContext {
    this.currentTick++;
    const context: TickContext = {
      tickNumber: this.currentTick,
      deltaTime,
      timestamp: Date.now(),
      systemStates: new Map(this.systemStates)
    };
    this.emit('tick_begin', { tick: this.currentTick, deltaTime });
    return context;
  }

  endTick(context: TickContext): void {
    const tickTime = Date.now() - context.timestamp;
    this.tickTimes.push(tickTime);
    if (this.tickTimes.length > this.TICK_HISTORY_SIZE) {
      this.tickTimes.shift();
    }

    // Check for performance issues
    if (tickTime > this.MAX_TICK_TIME_MS) {
      this.emit('performance_warning', {
        tick: this.currentTick,
        tickTime,
        threshold: this.MAX_TICK_TIME_MS
      });
    }

    this.emit('tick_end', { tick: this.currentTick, tickTime });
  }

  getCurrentTick(): number {
    return this.currentTick;
  }

  // === PROPOSAL GOVERNANCE ===

  submitProposal(proposal: AgentProposal): { approved: boolean; reason: string } {
    const context = this.buildCurrentContext();

    // Run all governance checks
    for (const rule of this.governanceRules) {
      const result = rule.check(proposal, context);
      
      if (!result.passed) {
        if (rule.severity === 'block') {
          proposal.approved = false;
          proposal.rejectionReason = `[${rule.name}] ${result.message}`;
          this.proposalHistory.push(proposal);
          this.emit('proposal_rejected', { proposal, rule: rule.id, reason: result.message });
          return { approved: false, reason: proposal.rejectionReason };
        } else if (rule.severity === 'warn') {
          this.emit('proposal_warning', { proposal, rule: rule.id, reason: result.message });
        }
      }
    }

    // Proposal passed all checks
    proposal.approved = true;
    this.proposalHistory.push(proposal);
    
    // Add to target system's pending proposals
    const targetSystem = this.systemStates.get(proposal.targetSystem);
    if (targetSystem) {
      targetSystem.pendingProposals.push(proposal);
    }

    this.emit('proposal_approved', { proposal });
    return { approved: true, reason: 'All governance checks passed' };
  }

  // === SYSTEM HEALTH ===

  updateSystemHealth(systemId: string, healthy: boolean, metrics?: Partial<SystemMetrics>): void {
    const system = this.systemStates.get(systemId);
    if (!system) return;

    const wasHealthy = system.healthy;
    system.healthy = healthy;
    system.lastUpdateTick = this.currentTick;
    
    if (metrics) {
      system.metrics = { ...system.metrics, ...metrics };
    }

    if (wasHealthy && !healthy) {
      this.emit('system_unhealthy', { systemId, metrics: system.metrics });
    } else if (!wasHealthy && healthy) {
      this.emit('system_recovered', { systemId });
    }
  }

  getSystemHealth(systemId: string): SystemState | undefined {
    return this.systemStates.get(systemId);
  }

  getAllSystemHealth(): Map<string, SystemState> {
    return new Map(this.systemStates);
  }

  // === GOVERNANCE RULES ===

  addGovernanceRule(rule: GovernanceRule): void {
    this.governanceRules.push(rule);
    this.emit('rule_added', { ruleId: rule.id });
  }

  removeGovernanceRule(ruleId: string): boolean {
    const index = this.governanceRules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
      this.governanceRules.splice(index, 1);
      this.emit('rule_removed', { ruleId });
      return true;
    }
    return false;
  }

  // === METRICS ===

  getPerformanceMetrics(): {
    avgTickTime: number;
    peakTickTime: number;
    currentTick: number;
    healthySystems: number;
    totalSystems: number;
  } {
    const avgTickTime = this.tickTimes.length > 0
      ? this.tickTimes.reduce((a, b) => a + b, 0) / this.tickTimes.length
      : 0;
    const peakTickTime = this.tickTimes.length > 0
      ? Math.max(...this.tickTimes)
      : 0;
    
    let healthySystems = 0;
    for (const system of this.systemStates.values()) {
      if (system.healthy) healthySystems++;
    }

    return {
      avgTickTime,
      peakTickTime,
      currentTick: this.currentTick,
      healthySystems,
      totalSystems: this.systemStates.size
    };
  }

  getProposalHistory(limit: number = 100): AgentProposal[] {
    return this.proposalHistory.slice(-limit);
  }

  // === EVENT SYSTEM ===

  on(event: string, callback: (data: ChairEvent) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: ChairEvent) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index >= 0) callbacks.splice(index, 1);
    }
  }

  private emit(event: string, data: Record<string, unknown>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback({ event, ...data });
      }
    }
  }

  private buildCurrentContext(): TickContext {
    return {
      tickNumber: this.currentTick,
      deltaTime: 0,
      timestamp: Date.now(),
      systemStates: new Map(this.systemStates)
    };
  }

  // === SERIALIZATION ===

  serialize(): object {
    return {
      phase: this.phase,
      currentTick: this.currentTick,
      systemStates: Array.from(this.systemStates.entries()).map(([id, state]) => ({
        id,
        healthy: state.healthy,
        lastUpdateTick: state.lastUpdateTick,
        metrics: state.metrics
      })),
      proposalHistoryCount: this.proposalHistory.length
    };
  }
}

export interface ChairEvent {
  event: string;
  [key: string]: unknown;
}

// Singleton instance
let chairInstance: SimulationChair | null = null;

export function getSimulationChair(): SimulationChair {
  if (!chairInstance) {
    chairInstance = new SimulationChair();
  }
  return chairInstance;
}

export function resetSimulationChair(): void {
  chairInstance = null;
}

export default SimulationChair;
