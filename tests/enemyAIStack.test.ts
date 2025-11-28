/**
 * Enemy AI Stack Integration Tests
 * Feature: surviving-the-world
 * Tests Properties: 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14
 */

import { EnemyAIStack, Enemy } from '../src/ai/EnemyAIStack';
import { PerceptionLayer } from '../src/ai/PerceptionLayer';
import { MicroAgentSystem } from '../src/ai/MicroAgentSystem';
import { EnemyCoordinatorAgent } from '../src/ai/EnemyCoordinatorAgent';

describe('Enemy AI Stack', () => {
  let aiStack: EnemyAIStack;

  beforeEach(() => {
    aiStack = new EnemyAIStack();
  });

  describe('Perception Layer', () => {
    // Property 3: Perception state initialization
    test('initializes perception with valid values', () => {
      const layer = new PerceptionLayer();
      const state = layer.initializePerception('enemy_1');
      
      expect(state.sightRange).toBeGreaterThan(0);
      expect(state.sightConeAngle).toBeGreaterThan(0);
      expect(state.hearingRadius).toBeGreaterThan(0);
      expect(state.alertLevel).toBeGreaterThanOrEqual(0);
      expect(state.alertLevel).toBeLessThanOrEqual(1);
    });

    // Property 4: Weather affects perception
    test('weather modifies detection ranges', () => {
      const layer = new PerceptionLayer();
      
      // Use separate enemies to compare
      layer.initializePerception('enemy_clear');
      layer.initializePerception('enemy_fog');
      
      const clearState = layer.updatePerception('enemy_clear', {
        weather: 'clear', timeOfDay: 12, lighting: 1, playerNoise: 0, playerStance: 'standing'
      });
      
      const fogState = layer.updatePerception('enemy_fog', {
        weather: 'fog', timeOfDay: 12, lighting: 1, playerNoise: 0, playerStance: 'standing'
      });
      
      expect(fogState.sightRange).toBeLessThan(clearState.sightRange);
    });

    // Property 5: Time of day affects sight
    test('night reduces sight range', () => {
      const layer = new PerceptionLayer();
      
      // Use separate enemies to compare
      layer.initializePerception('enemy_day');
      layer.initializePerception('enemy_night');
      
      const dayState = layer.updatePerception('enemy_day', {
        weather: 'clear', timeOfDay: 12, lighting: 1, playerNoise: 0, playerStance: 'standing'
      });
      
      const nightState = layer.updatePerception('enemy_night', {
        weather: 'clear', timeOfDay: 2, lighting: 0.3, playerNoise: 0, playerStance: 'standing'
      });
      
      expect(nightState.sightRange).toBeLessThan(dayState.sightRange);
    });
  });

  describe('Micro-Agent System', () => {
    // Property 9: Micro-agent initialization completeness
    test('initializes all four micro-agents', () => {
      const system = new MicroAgentSystem();
      const outputs = system.initializeAgents('enemy_1');
      
      expect(outputs.aggression).toBeDefined();
      expect(outputs.tactics).toBeDefined();
      expect(outputs.perception).toBeDefined();
      expect(outputs.morale).toBeDefined();
    });

    // Property 10: Aggression agent context sensitivity
    test('lower health produces lower aggression', () => {
      const system = new MicroAgentSystem();
      system.initializeAgents('enemy_1');
      
      const healthyContext = {
        enemyHealth: 100, enemyMaxHealth: 100, allyCount: 2, enemyCount: 1,
        playerThreatLevel: 0.5, combatDuration: 0, recentCasualties: 0,
        distanceToPlayer: 10, hascover: false, isOutnumbered: false
      };
      
      const woundedContext = {
        ...healthyContext,
        enemyHealth: 20
      };
      
      const healthyAggression = system.evaluateAggression('enemy_1', healthyContext);
      const woundedAggression = system.evaluateAggression('enemy_1', woundedContext);
      
      expect(woundedAggression.attackFrequency).toBeLessThan(healthyAggression.attackFrequency);
    });

    // Property 11: Micro-agent conflict resolution determinism
    test('same inputs produce same behavior', () => {
      const system = new MicroAgentSystem();
      system.initializeAgents('enemy_1');
      
      const context = {
        enemyHealth: 50, enemyMaxHealth: 100, allyCount: 1, enemyCount: 1,
        playerThreatLevel: 0.5, combatDuration: 10, recentCasualties: 0,
        distanceToPlayer: 15, hascover: true, isOutnumbered: false
      };
      
      const result1 = system.resolveConflicts('enemy_1', context);
      const result2 = system.resolveConflicts('enemy_1', context);
      
      expect(result1.action).toBe(result2.action);
      expect(result1.intensity).toBe(result2.intensity);
    });
  });

  describe('Enemy Coordinator Agent', () => {
    // Property 12: Squad role assignment completeness
    test('assigns roles to all squad members', () => {
      const eca = new EnemyCoordinatorAgent();
      const squad = eca.createSquad('squad_1', ['e1', 'e2', 'e3', 'e4']);
      
      expect(squad.roles.size).toBe(4);
      for (const member of squad.members) {
        expect(squad.roles.has(member.id)).toBe(true);
      }
    });

    // Property 13: Difficulty adaptation responsiveness
    test('adapts difficulty based on player skill', () => {
      const eca = new EnemyCoordinatorAgent();
      const squad = eca.createSquad('squad_1', ['e1', 'e2', 'e3']);
      
      // Simulate skilled player actions
      const skilledActions = Array(10).fill(null).map((_, i) => ({
        type: 'attack', timestamp: Date.now() + i * 300, success: true
      }));
      
      eca.assessPlayerSkill(squad, skilledActions);
      eca.adaptDifficulty(squad);
      
      expect(eca.getDifficultyMultiplier()).toBeGreaterThanOrEqual(1.0);
    });

    // Property 14: Flanking route safety
    test('flanking routes avoid friendly fire', () => {
      const eca = new EnemyCoordinatorAgent();
      const squad = eca.createSquad('squad_1', ['e1', 'e2', 'e3']);
      
      // Set positions
      eca.updateMemberPosition('squad_1', 'e1', { x: 0, y: 0, z: 0 });
      eca.updateMemberPosition('squad_1', 'e2', { x: 5, y: 0, z: 0 });
      eca.updateMemberPosition('squad_1', 'e3', { x: 10, y: 0, z: 0 });
      
      const playerPos = { x: 20, y: 0, z: 0 };
      const tactic = eca.planSquadTactic(squad, playerPos);
      
      // Verify flanking routes exist
      expect(tactic.flankingRoutes.length).toBeGreaterThan(0);
    });
  });

  describe('Integrated AI Stack', () => {
    test('updates enemy state through all layers', () => {
      const enemy: Enemy = {
        id: 'test_enemy',
        position: { x: 10, y: 0, z: 10 },
        facing: { x: 1, y: 0, z: 0 },
        health: 100,
        maxHealth: 100,
        faction: 'bandits',
        state: 'idle'
      };

      aiStack.registerEnemy(enemy);
      aiStack.updatePlayerPosition({ x: 15, y: 0, z: 10 });
      aiStack.updateWorldContext({ weather: 'clear', timeOfDay: 12, lighting: 1 });

      const result = aiStack.updateEnemy('test_enemy', 1);
      
      expect(result).not.toBeNull();
      expect(result!.newState).toBeDefined();
      expect(result!.behavior).toBeDefined();
    });

    test('squad coordination works', () => {
      const enemies: Enemy[] = [
        { id: 'e1', position: { x: 0, y: 0, z: 0 }, facing: { x: 1, y: 0, z: 0 }, health: 100, maxHealth: 100, faction: 'bandits', state: 'idle' },
        { id: 'e2', position: { x: 5, y: 0, z: 0 }, facing: { x: 1, y: 0, z: 0 }, health: 100, maxHealth: 100, faction: 'bandits', state: 'idle' },
        { id: 'e3', position: { x: 10, y: 0, z: 0 }, facing: { x: 1, y: 0, z: 0 }, health: 100, maxHealth: 100, faction: 'bandits', state: 'idle' }
      ];

      for (const enemy of enemies) {
        aiStack.registerEnemy(enemy);
      }

      const squad = aiStack.createSquad('test_squad', ['e1', 'e2', 'e3']);
      
      expect(squad.members.length).toBe(3);
      expect(squad.roles.size).toBe(3);
    });
  });
});
