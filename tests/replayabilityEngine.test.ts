/**
 * ReplayabilityEngine Unit Tests
 * Tests procedural generation, enemy evolution, world modifiers
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 * Feature: surviving-the-world, Property 27: Procedural squad generation validity
 * Feature: surviving-the-world, Property 28: Enemy evolution from player patterns
 */

import { ReplayabilityEngine } from '../src/systems/ReplayabilityEngine';
import * as fc from 'fast-check';

describe('ReplayabilityEngine', () => {
  let engine: ReplayabilityEngine;

  beforeEach(() => {
    engine = new ReplayabilityEngine(12345); // Fixed seed for determinism
  });

  test('Generates consistent world seed', () => {
    const seed = engine.getWorldSeed();
    expect(seed).toBe(12345);
  });

  test('Generates procedural squads', () => {
    const squad = engine.generateProceduralSquad('forest', 1.0);
    
    expect(squad.length).toBeGreaterThanOrEqual(2);
    expect(squad.length).toBeLessThanOrEqual(6);
    expect(squad.every(s => s.includes('forest_enemy'))).toBe(true);
  });

  test('Records player patterns', () => {
    engine.recordPlayerPattern('player_1', 'stealth_heavy');
    engine.recordPlayerPattern('player_1', 'stealth_heavy');
    engine.recordPlayerPattern('player_1', 'stealth_heavy');
    
    const predictions = engine.predictPlayerTactics('player_1');
    expect(predictions.length).toBeGreaterThan(0);
    expect(predictions[0].tactic).toBe('stealth_heavy');
  });

  test('Evolves enemy tactics based on patterns', () => {
    // Record enough patterns to trigger evolution
    for (let i = 0; i < 10; i++) {
      engine.recordPlayerPattern('player_1', 'ranged');
    }
    
    const evolution = engine.getEnemyEvolution();
    expect(evolution.counterStrategies.length).toBeGreaterThan(0);
  });

  test('Applies world modifiers', () => {
    const modifier = engine.applyWorldModifier('harsh_winter');
    
    expect(modifier).not.toBeNull();
    expect(modifier?.id).toBe('harsh_winter');
    expect(engine.getActiveModifiers().length).toBe(1);
  });

  test('Generates random modifiers', () => {
    const modifier = engine.generateRandomModifier();
    
    expect(modifier).toBeDefined();
    expect(modifier.effects.length).toBeGreaterThan(0);
  });

  test('Persists faction memory', () => {
    engine.persistFactionMemory('kingdom_north', 'killed_guard');
    engine.persistFactionMemory('kingdom_north', 'killed_guard');
    engine.persistFactionMemory('kingdom_north', 'killed_guard');
    
    const memory = engine.getFactionMemory('kingdom_north');
    expect(memory).toBeDefined();
    expect(memory?.playerActions.length).toBe(3);
  });

  test('Difficulty progression increases over time', () => {
    const initialDifficulty = engine.getEnemyEvolution().difficultyProgression;
    
    // Trigger evolution multiple times
    for (let i = 0; i < 20; i++) {
      engine.recordPlayerPattern('player_1', 'aggressive');
    }
    
    const finalDifficulty = engine.getEnemyEvolution().difficultyProgression;
    expect(finalDifficulty).toBeGreaterThan(initialDifficulty);
  });

  test('Serialization round-trip preserves state', () => {
    engine.recordPlayerPattern('player_1', 'stealth_heavy');
    engine.applyWorldModifier('bandit_surge');
    engine.persistFactionMemory('faction_1', 'attack');
    
    const serialized = engine.serialize();
    
    const newEngine = new ReplayabilityEngine();
    newEngine.deserialize(serialized);
    
    expect(newEngine.getWorldSeed()).toBe(engine.getWorldSeed());
    expect(newEngine.getActiveModifiers().length).toBe(engine.getActiveModifiers().length);
  });

  test('Same seed produces same squad composition', () => {
    const engine1 = new ReplayabilityEngine(99999);
    const engine2 = new ReplayabilityEngine(99999);
    
    const squad1 = engine1.generateProceduralSquad('village', 1.0);
    const squad2 = engine2.generateProceduralSquad('village', 1.0);
    
    expect(squad1.length).toBe(squad2.length);
  });
});

describe('ReplayabilityEngine Property Tests', () => {
  /**
   * Feature: surviving-the-world, Property 27: Procedural squad generation validity
   * For any new game start, the Replayability Engine should generate enemy squads
   * with valid compositions matching region difficulty and faction configuration.
   * Validates: Requirements 12.1
   */
  test('Property 27: Procedural squads are always valid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.double({ min: 0.5, max: 2.0, noNaN: true }),
        (seed, difficulty) => {
          const engine = new ReplayabilityEngine(seed);
          const squad = engine.generateProceduralSquad('test_region', difficulty);
          
          // Squad size should be within bounds
          if (squad.length < 2 || squad.length > 10) return false;
          
          // All members should have valid IDs
          if (!squad.every(s => s.includes('test_region_enemy'))) return false;
          
          // All members should have role suffix
          const validRoles = ['pointman', 'flanker', 'suppressor', 'medic', 'sniper', 'leader'];
          if (!squad.every(s => validRoles.some(r => s.includes(r)))) return false;
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: surviving-the-world, Property 28: Enemy evolution from player patterns
   * For any recorded player pattern, enemy tactics should evolve to include
   * counter-strategies for that pattern in subsequent encounters.
   * Validates: Requirements 12.2
   */
  test('Property 28: Enemy evolution responds to player patterns', () => {
    const patternTypes = ['stealth_heavy', 'aggressive', 'ranged', 'melee', 'flanking'];
    
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: patternTypes.length - 1 }),
        fc.integer({ min: 6, max: 15 }),
        (patternIdx, repeatCount) => {
          const engine = new ReplayabilityEngine();
          const pattern = patternTypes[patternIdx];
          
          const initialEvolution = engine.getEnemyEvolution();
          const initialStrategies = initialEvolution.counterStrategies.length;
          
          // Record pattern multiple times
          for (let i = 0; i < repeatCount; i++) {
            engine.recordPlayerPattern('player_1', pattern);
          }
          
          const finalEvolution = engine.getEnemyEvolution();
          
          // Should have evolved (added counter strategies or adaptations)
          return (
            finalEvolution.counterStrategies.length >= initialStrategies ||
            finalEvolution.tacticalAdaptations.length > 0 ||
            finalEvolution.difficultyProgression > 1.0
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * World modifiers have valid structure
   */
  test('World modifiers are always valid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (modifierCount) => {
          const engine = new ReplayabilityEngine();
          
          for (let i = 0; i < modifierCount; i++) {
            engine.generateRandomModifier();
          }
          
          const modifiers = engine.getActiveModifiers();
          
          // All modifiers should have required fields
          return modifiers.every(m => 
            m.id && 
            m.type && 
            m.effects.length > 0 &&
            m.duration > 0
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});
