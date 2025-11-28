/**
 * AI Governance Tests
 * Tests for SimulationChair, BalanceSentinel, and Tier 2 Agents
 */

import { SimulationChair, getSimulationChair, resetSimulationChair, AgentProposal } from '../src/ai/governance/SimulationChair';
import { BalanceSentinel, getBalanceSentinel } from '../src/ai/governance/BalanceSentinel';
import { TacticsAgent, TacticContext } from '../src/ai/agents/TacticsAgent';
import { MoraleAgent } from '../src/ai/agents/MoraleAgent';
import { MemoryAgent } from '../src/ai/agents/MemoryAgent';

describe('SimulationChair — Tier 1 Governance', () => {
  let chair: SimulationChair;

  beforeEach(() => {
    resetSimulationChair();
    chair = getSimulationChair();
  });

  describe('Phase Management', () => {
    it('initializes in init phase', () => {
      chair.initialize();
      expect(chair.getPhase()).toBe('init');
    });

    it('transitions to running phase', () => {
      chair.initialize();
      chair.start();
      expect(chair.getPhase()).toBe('running');
    });

    it('can pause and resume', () => {
      chair.initialize();
      chair.start();
      chair.pause();
      expect(chair.getPhase()).toBe('paused');
      chair.start();
      expect(chair.getPhase()).toBe('running');
    });

    it('can shutdown', () => {
      chair.initialize();
      chair.start();
      chair.shutdown();
      expect(chair.getPhase()).toBe('shutdown');
    });
  });

  describe('Tick Management', () => {
    it('tracks tick numbers', () => {
      chair.initialize();
      expect(chair.getCurrentTick()).toBe(0);
      
      chair.beginTick(0.016);
      expect(chair.getCurrentTick()).toBe(1);
      
      chair.beginTick(0.016);
      expect(chair.getCurrentTick()).toBe(2);
    });

    it('measures tick time', () => {
      chair.initialize();
      const context = chair.beginTick(0.016);
      chair.endTick(context);
      
      const metrics = chair.getPerformanceMetrics();
      expect(metrics.avgTickTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Proposal Governance', () => {
    it('approves valid proposals', () => {
      chair.initialize();
      
      const proposal: AgentProposal = {
        agentId: 'test_agent',
        agentTier: 2,
        proposalType: 'add',
        targetSystem: 'enemy_ai',
        payload: { tactic: 'flank_left' },
        confidence: 0.9,
        timestamp: Date.now()
      };

      const result = chair.submitProposal(proposal);
      expect(result.approved).toBe(true);
    });

    it('rejects low confidence proposals', () => {
      chair.initialize();
      
      const proposal: AgentProposal = {
        agentId: 'test_agent',
        agentTier: 2,
        proposalType: 'modify',
        targetSystem: 'combat',
        payload: { damage: 50 },
        confidence: 0.5, // Below 0.8 threshold for Tier 2
        timestamp: Date.now()
      };

      const result = chair.submitProposal(proposal);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain('Confidence');
    });

    it('rejects proposals with cheating patterns', () => {
      chair.initialize();
      
      const proposal: AgentProposal = {
        agentId: 'test_agent',
        agentTier: 2,
        proposalType: 'add',
        targetSystem: 'enemy_ai',
        payload: { ability: 'omniscient_detection' },
        confidence: 0.95,
        timestamp: Date.now()
      };

      const result = chair.submitProposal(proposal);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain('cheating');
    });

    it('tracks proposal history', () => {
      chair.initialize();
      
      const proposal: AgentProposal = {
        agentId: 'test_agent',
        agentTier: 2,
        proposalType: 'add',
        targetSystem: 'npc',
        payload: { behavior: 'patrol' },
        confidence: 0.85,
        timestamp: Date.now()
      };

      chair.submitProposal(proposal);
      const history = chair.getProposalHistory();
      expect(history.length).toBe(1);
    });
  });

  describe('System Health', () => {
    it('tracks system health', () => {
      chair.initialize();
      
      chair.updateSystemHealth('combat', true, { avgTickTime: 5 });
      const health = chair.getSystemHealth('combat');
      
      expect(health?.healthy).toBe(true);
      expect(health?.metrics.avgTickTime).toBe(5);
    });

    it('reports all system health', () => {
      chair.initialize();
      
      const allHealth = chair.getAllSystemHealth();
      expect(allHealth.size).toBeGreaterThan(0);
      expect(allHealth.has('world')).toBe(true);
      expect(allHealth.has('player')).toBe(true);
    });
  });

  describe('Serialization', () => {
    it('serializes state', () => {
      chair.initialize();
      chair.start();
      chair.beginTick(0.016);
      
      const serialized = chair.serialize();
      expect(serialized).toHaveProperty('phase', 'running');
      expect(serialized).toHaveProperty('currentTick', 1);
    });
  });
});

describe('BalanceSentinel — Fair AI Enforcement', () => {
  let sentinel: BalanceSentinel;

  beforeEach(() => {
    sentinel = new BalanceSentinel();
  });

  describe('Enemy AI Validation', () => {
    it('rejects superhuman reaction times', () => {
      const proposal: AgentProposal = {
        agentId: 'enemy_agent',
        agentTier: 2,
        proposalType: 'modify',
        targetSystem: 'enemy_ai',
        payload: { reactionTime: 50 }, // 50ms is superhuman
        confidence: 0.9,
        timestamp: Date.now()
      };

      const result = sentinel.validateProposal(proposal);
      expect(result.passed).toBe(false);
      expect(result.message.toLowerCase()).toContain('reaction');
    });

    it('accepts fair reaction times', () => {
      const proposal: AgentProposal = {
        agentId: 'enemy_agent',
        agentTier: 2,
        proposalType: 'modify',
        targetSystem: 'enemy_ai',
        payload: { reactionTime: 300 }, // 300ms is fair
        confidence: 0.9,
        timestamp: Date.now()
      };

      const result = sentinel.validateProposal(proposal);
      expect(result.passed).toBe(true);
    });

    it('rejects excessive accuracy', () => {
      const proposal: AgentProposal = {
        agentId: 'enemy_agent',
        agentTier: 2,
        proposalType: 'modify',
        targetSystem: 'enemy_ai',
        payload: { accuracy: 0.99 }, // 99% is too high
        confidence: 0.9,
        timestamp: Date.now()
      };

      const result = sentinel.validateProposal(proposal);
      expect(result.passed).toBe(false);
    });

    it('rejects cheating patterns', () => {
      const proposal: AgentProposal = {
        agentId: 'enemy_agent',
        agentTier: 2,
        proposalType: 'add',
        targetSystem: 'enemy_ai',
        payload: { ability: 'wallhack_vision' },
        confidence: 0.9,
        timestamp: Date.now()
      };

      const result = sentinel.validateProposal(proposal);
      expect(result.passed).toBe(false);
    });
  });

  describe('Combat Validation', () => {
    it('rejects excessive damage', () => {
      const proposal: AgentProposal = {
        agentId: 'combat_agent',
        agentTier: 2,
        proposalType: 'modify',
        targetSystem: 'combat',
        payload: { damage: 60 }, // 60% of player health per hit
        confidence: 0.9,
        timestamp: Date.now()
      };

      const result = sentinel.validateProposal(proposal);
      expect(result.passed).toBe(false);
    });

    it('accepts balanced damage', () => {
      const proposal: AgentProposal = {
        agentId: 'combat_agent',
        agentTier: 2,
        proposalType: 'modify',
        targetSystem: 'combat',
        payload: { damage: 15 }, // 15% is fair
        confidence: 0.9,
        timestamp: Date.now()
      };

      const result = sentinel.validateProposal(proposal);
      expect(result.passed).toBe(true);
    });
  });

  describe('Metrics Tracking', () => {
    it('tracks balance metrics', () => {
      sentinel.updateMetrics({
        playerDeathRate: 1.5,
        playerWinRate: 0.55
      });

      const metrics = sentinel.getMetrics();
      expect(metrics.playerDeathRate).toBe(1.5);
      expect(metrics.playerWinRate).toBe(0.55);
    });

    it('calculates fairness index', () => {
      sentinel.updateMetrics({
        playerDeathRate: 1.0,
        playerWinRate: 0.6,
        difficultyScore: 50
      });

      const metrics = sentinel.getMetrics();
      expect(metrics.fairnessIndex).toBeGreaterThan(0.5);
    });
  });

  describe('Enemy Profiles', () => {
    it('registers valid enemy profiles', () => {
      const violations = sentinel.registerEnemyProfile({
        enemyType: 'grunt',
        baseDamage: 15,
        baseHealth: 100,
        detectionRange: 50,
        reactionTime: 300,
        accuracy: 0.5,
        groupSize: 3
      });

      expect(violations.length).toBe(0);
      expect(sentinel.getEnemyProfile('grunt')).toBeDefined();
    });

    it('rejects unfair enemy profiles', () => {
      const violations = sentinel.registerEnemyProfile({
        enemyType: 'cheater',
        baseDamage: 100,
        baseHealth: 1000,
        detectionRange: 200,
        reactionTime: 50, // Too fast
        accuracy: 0.99,   // Too accurate
        groupSize: 10
      });

      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.severity === 'severe')).toBe(true);
    });
  });
});

describe('TacticsAgent — Tier 2 Enemy AI', () => {
  let agent: TacticsAgent;

  beforeEach(() => {
    agent = new TacticsAgent(12345); // Fixed seed for determinism
  });

  describe('Tactic Evaluation', () => {
    it('selects retreat when health is critical', () => {
      const context: TacticContext = {
        enemyId: 'enemy_1',
        health: 15,
        maxHealth: 100,
        morale: 50,
        allyCount: 2,
        enemyCount: 1,
        distanceToPlayer: 20,
        hasCover: false,
        weather: 'clear',
        timeOfDay: 12,
        terrain: 'plains',
        position: { x: 0, y: 0, z: 0 },
        playerPosition: { x: 20, y: 0, z: 0 }
      };

      const result = agent.evaluateTactics(context);
      expect(result.tactic).toBe('retreat_regroup');
      expect(result.shouldRetreat).toBe(true);
    });

    it('selects flanking with numerical advantage', () => {
      const context: TacticContext = {
        enemyId: 'enemy_1',
        health: 100,
        maxHealth: 100,
        morale: 80,
        allyCount: 3,
        enemyCount: 1,
        distanceToPlayer: 30,
        hasCover: false,
        weather: 'clear',
        timeOfDay: 12,
        terrain: 'plains',
        position: { x: 0, y: 0, z: 0 },
        playerPosition: { x: 30, y: 0, z: 0 }
      };

      const result = agent.evaluateTactics(context);
      expect(['pincer', 'flank_left', 'flank_right']).toContain(result.tactic);
    });

    it('selects ambush at night', () => {
      const context: TacticContext = {
        enemyId: 'enemy_1',
        health: 100,
        maxHealth: 100,
        morale: 70,
        allyCount: 1,
        enemyCount: 1,
        distanceToPlayer: 50,
        hasCover: false,
        weather: 'clear',
        timeOfDay: 3, // 3 AM
        terrain: 'forest',
        position: { x: 0, y: 0, z: 0 },
        playerPosition: { x: 50, y: 0, z: 0 }
      };

      const result = agent.evaluateTactics(context);
      expect(result.tactic).toBe('ambush_setup');
    });

    it('calculates target positions', () => {
      const context: TacticContext = {
        enemyId: 'enemy_1',
        health: 100,
        maxHealth: 100,
        morale: 80,
        allyCount: 0,
        enemyCount: 1,
        distanceToPlayer: 20,
        hasCover: false,
        weather: 'clear',
        timeOfDay: 12,
        terrain: 'plains',
        position: { x: 0, y: 0, z: 0 },
        playerPosition: { x: 20, y: 0, z: 0 }
      };

      const result = agent.evaluateTactics(context);
      expect(result.targetPosition).not.toBeNull();
    });
  });

  describe('Rule Management', () => {
    it('has default rules', () => {
      const rules = agent.getRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('can add custom rules', () => {
      const initialCount = agent.getRules().length;
      
      agent.addRule({
        id: 'custom_rule',
        name: 'Custom Tactic',
        conditions: [{ type: 'health', operator: '>', value: 0.9 }],
        tactic: 'direct_assault',
        priority: 50,
        cooldownSeconds: 10
      });

      expect(agent.getRules().length).toBe(initialCount + 1);
    });
  });

  describe('Serialization', () => {
    it('serializes and deserializes', () => {
      const serialized = agent.serialize();
      const restored = TacticsAgent.deserialize(serialized as any);
      
      expect(restored.getRules().length).toBe(agent.getRules().length);
    });
  });
});

describe('MoraleAgent — Tier 2 Enemy AI', () => {
  let agent: MoraleAgent;

  beforeEach(() => {
    agent = new MoraleAgent();
  });

  describe('Entity Management', () => {
    it('registers entities with default morale', () => {
      agent.registerEntity('enemy_1');
      const state = agent.getState('enemy_1');
      
      expect(state).toBeDefined();
      expect(state?.currentMorale).toBe(70);
    });

    it('registers entities with custom thresholds', () => {
      agent.registerEntity('enemy_1', 80, 30, 15);
      const state = agent.getState('enemy_1');
      
      expect(state?.baseMorale).toBe(80);
      expect(state?.panicThreshold).toBe(30);
      expect(state?.surrenderThreshold).toBe(15);
    });
  });

  describe('Event Processing', () => {
    it('reduces morale on ally death', () => {
      agent.registerEntity('enemy_1');
      const initialMorale = agent.getState('enemy_1')!.currentMorale;
      
      agent.processEvent({
        type: 'ally_killed',
        targetId: 'enemy_1',
        magnitude: 1
      });

      expect(agent.getState('enemy_1')!.currentMorale).toBeLessThan(initialMorale);
    });

    it('increases morale on enemy kill', () => {
      agent.registerEntity('enemy_1');
      agent.getState('enemy_1')!.currentMorale = 50;
      
      agent.processEvent({
        type: 'enemy_killed',
        targetId: 'enemy_1',
        magnitude: 1
      });

      expect(agent.getState('enemy_1')!.currentMorale).toBeGreaterThan(50);
    });
  });

  describe('Behavior Evaluation', () => {
    it('triggers flee at low morale', () => {
      agent.registerEntity('enemy_1', 70, 25, 10);
      agent.getState('enemy_1')!.currentMorale = 20;
      
      const behavior = agent.evaluateBehavior('enemy_1');
      expect(behavior.shouldFlee).toBe(true);
    });

    it('triggers surrender at very low morale', () => {
      agent.registerEntity('enemy_1', 70, 25, 10);
      agent.getState('enemy_1')!.currentMorale = 5;
      
      const behavior = agent.evaluateBehavior('enemy_1');
      expect(behavior.shouldSurrender).toBe(true);
    });

    it('calculates combat effectiveness', () => {
      agent.registerEntity('enemy_1');
      agent.getState('enemy_1')!.currentMorale = 100;
      agent.getState('enemy_1')!.fearLevel = 0;
      
      const behavior = agent.evaluateBehavior('enemy_1');
      expect(behavior.combatEffectiveness).toBeCloseTo(1.0, 1);
    });
  });

  describe('Group Morale', () => {
    it('tracks group morale', () => {
      agent.registerEntity('enemy_1');
      agent.registerEntity('enemy_2');
      agent.createGroup('squad_1', ['enemy_1', 'enemy_2']);
      
      const groupMorale = agent.getGroupMorale('squad_1');
      expect(groupMorale).toBe(70); // Default morale
    });
  });
});

describe('MemoryAgent — Tier 2 NPC AI', () => {
  let agent: MemoryAgent;

  beforeEach(() => {
    agent = new MemoryAgent();
  });

  describe('Entity Management', () => {
    it('registers entities with personality', () => {
      agent.registerEntity('npc_1', { forgiveness: 0.8, gratitude: 0.9 });
      const memory = agent.getMemory('npc_1');
      
      expect(memory).toBeDefined();
      expect(memory?.personality.forgiveness).toBe(0.8);
      expect(memory?.personality.gratitude).toBe(0.9);
    });
  });

  describe('Memory Recording', () => {
    it('records events to short-term memory', () => {
      agent.registerEntity('npc_1');
      
      agent.recordEvent('npc_1', {
        type: 'received_gift',
        actorId: 'player',
        importance: 0.3,
        emotionalImpact: 0.5,
        details: { item: 'food' }
      });

      const memory = agent.getMemory('npc_1');
      expect(memory?.shortTermMemory.length).toBe(1);
    });

    it('promotes important events to long-term memory', () => {
      agent.registerEntity('npc_1');
      
      agent.recordEvent('npc_1', {
        type: 'was_saved',
        actorId: 'player',
        importance: 0.9, // High importance
        emotionalImpact: 0.8,
        details: { from: 'wolves' }
      });

      const memory = agent.getMemory('npc_1');
      expect(memory?.longTermMemory.length).toBe(1);
    });
  });

  describe('Relationship Tracking', () => {
    it('builds trust from positive events', () => {
      agent.registerEntity('npc_1');
      
      agent.recordEvent('npc_1', {
        type: 'received_gift',
        actorId: 'player',
        importance: 0.5,
        emotionalImpact: 0.5,
        details: {}
      });

      const trust = agent.getTrust('npc_1', 'player');
      expect(trust).toBeGreaterThan(0);
    });

    it('reduces trust from negative events', () => {
      agent.registerEntity('npc_1');
      
      agent.recordEvent('npc_1', {
        type: 'was_attacked',
        actorId: 'player',
        importance: 0.8,
        emotionalImpact: -0.9,
        details: {}
      });

      const trust = agent.getTrust('npc_1', 'player');
      expect(trust).toBeLessThan(0);
    });

    it('calculates disposition based on trust', () => {
      agent.registerEntity('npc_1');
      
      // Build high trust
      for (let i = 0; i < 5; i++) {
        agent.recordEvent('npc_1', {
          type: 'was_saved',
          actorId: 'player',
          importance: 0.9,
          emotionalImpact: 0.8,
          details: {}
        });
      }

      const disposition = agent.getDisposition('npc_1', 'player');
      expect(['friend', 'close_friend']).toContain(disposition);
    });
  });

  describe('Memory Queries', () => {
    it('recalls events by type', () => {
      agent.registerEntity('npc_1');
      
      agent.recordEvent('npc_1', {
        type: 'received_gift',
        actorId: 'player',
        importance: 0.5,
        emotionalImpact: 0.5,
        details: {}
      });

      agent.recordEvent('npc_1', {
        type: 'conversation',
        actorId: 'player',
        importance: 0.3,
        emotionalImpact: 0.1,
        details: {}
      });

      const gifts = agent.recallEvents('npc_1', { type: 'received_gift' });
      expect(gifts.length).toBe(1);
    });

    it('checks if has memory of entity', () => {
      agent.registerEntity('npc_1');
      
      agent.recordEvent('npc_1', {
        type: 'first_meeting',
        actorId: 'player',
        importance: 0.5,
        emotionalImpact: 0,
        details: {}
      });

      expect(agent.hasMemoryOf('npc_1', 'player')).toBe(true);
      expect(agent.hasMemoryOf('npc_1', 'stranger')).toBe(false);
    });
  });

  describe('Behavior Queries', () => {
    it('determines trust based on history', () => {
      agent.registerEntity('npc_1');
      
      // Build trust
      agent.recordEvent('npc_1', {
        type: 'was_saved',
        actorId: 'player',
        importance: 0.9,
        emotionalImpact: 0.8,
        details: {}
      });

      expect(agent.shouldTrust('npc_1', 'player')).toBe(true);
    });

    it('determines fear based on attacks', () => {
      agent.registerEntity('npc_1');
      
      agent.recordEvent('npc_1', {
        type: 'was_attacked',
        actorId: 'player',
        importance: 0.9,
        emotionalImpact: -0.9,
        details: {}
      });

      expect(agent.shouldFear('npc_1', 'player')).toBe(true);
    });
  });
});
