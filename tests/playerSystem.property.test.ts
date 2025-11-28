/**
 * Player System - Property-Based Tests
 * Feature: core-survival-engine
 * Uses fast-check for property-based testing with 100+ iterations
 */

import * as fc from 'fast-check';
import { PlayerSystem } from '../src/systems/PlayerSystem';

describe('Player System - Property-Based Tests', () => {
  let playerSystem: PlayerSystem;

  beforeEach(() => {
    playerSystem = new PlayerSystem();
  });

  // Feature: core-survival-engine, Property 2: Survival stat bounds preservation
  test('Property 2: Health stays in 0-100 range', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -200, max: 200 }), { minLength: 1, maxLength: 20 }),
        (deltas) => {
          for (const delta of deltas) {
            playerSystem.modifyStat('health', delta);
          }
          
          const health = playerSystem.getStat('health');
          return health >= 0 && health <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: Stamina stays in 0-100 range
  test('Property: Stamina stays in 0-100 range', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -200, max: 200 }), { minLength: 1, maxLength: 20 }),
        (deltas) => {
          for (const delta of deltas) {
            playerSystem.modifyStat('stamina', delta);
          }
          
          const stamina = playerSystem.getStat('stamina');
          return stamina >= 0 && stamina <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: Hunger stays in 0-100 range
  test('Property: Hunger stays in 0-100 range', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -200, max: 200 }), { minLength: 1, maxLength: 20 }),
        (deltas) => {
          for (const delta of deltas) {
            playerSystem.modifyStat('hunger', delta);
          }
          
          const hunger = playerSystem.getStat('hunger');
          return hunger >= 0 && hunger <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: Thirst stays in 0-100 range
  test('Property: Thirst stays in 0-100 range', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -200, max: 200 }), { minLength: 1, maxLength: 20 }),
        (deltas) => {
          for (const delta of deltas) {
            playerSystem.modifyStat('thirst', delta);
          }
          
          const thirst = playerSystem.getStat('thirst');
          return thirst >= 0 && thirst <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: Positive health modification increases health
  test('Property: Positive health modification increases health (up to max)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (amount) => {
          // First reduce health
          playerSystem.modifyStat('health', -50);
          const before = playerSystem.getStat('health');
          
          playerSystem.modifyStat('health', amount);
          const after = playerSystem.getStat('health');
          
          return after >= before;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: Negative health modification decreases health
  test('Property: Negative health modification decreases health (down to min)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (amount) => {
          const before = playerSystem.getStat('health');
          playerSystem.modifyStat('health', -amount);
          const after = playerSystem.getStat('health');
          
          return after <= before;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: isAlive returns false when health is 0
  test('Property: isAlive returns false when health reaches 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 500 }),
        (damage) => {
          playerSystem.modifyStat('health', -damage);
          const health = playerSystem.getStat('health');
          const isAlive = playerSystem.isAlive();
          
          return (health > 0) === isAlive;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: Serialization round-trip preserves state
  test('Property: Serialize/deserialize preserves player state', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: -100, max: 100 }),
        (healthDelta, staminaDelta, hungerDelta, thirstDelta) => {
          playerSystem.modifyStat('health', healthDelta);
          playerSystem.modifyStat('stamina', staminaDelta);
          playerSystem.modifyStat('hunger', hungerDelta);
          playerSystem.modifyStat('thirst', thirstDelta);
          
          const serialized = playerSystem.serialize();
          const newSystem = PlayerSystem.deserialize(serialized);
          
          return (
            newSystem.getStat('health') === playerSystem.getStat('health') &&
            newSystem.getStat('stamina') === playerSystem.getStat('stamina') &&
            newSystem.getStat('hunger') === playerSystem.getStat('hunger') &&
            newSystem.getStat('thirst') === playerSystem.getStat('thirst')
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: setStat sets exact value (clamped)
  test('Property: setStat sets exact value within bounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (value) => {
          playerSystem.setStat('health', value);
          return playerSystem.getStat('health') === value;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: All stats are non-negative
  test('Property: All stats are non-negative', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom('health', 'stamina', 'hunger', 'thirst', 'morale') as fc.Arbitrary<'health' | 'stamina' | 'hunger' | 'thirst' | 'morale'>,
            delta: fc.integer({ min: -200, max: 200 })
          }),
          { minLength: 1, maxLength: 30 }
        ),
        (modifications) => {
          for (const mod of modifications) {
            playerSystem.modifyStat(mod.type, mod.delta);
          }
          
          const stats = playerSystem.getStats();
          return (
            stats.health >= 0 &&
            stats.stamina >= 0 &&
            stats.hunger >= 0 &&
            stats.thirst >= 0 &&
            stats.morale >= 0
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: Threshold events are generated correctly
  test('Property: Threshold events reflect stat values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (healthValue) => {
          playerSystem.setStat('health', healthValue);
          const events = playerSystem.checkThresholds();
          
          const healthEvent = events.find(e => e.stat === 'health');
          
          if (healthValue <= 20) {
            return healthEvent?.threshold === 'critical';
          } else if (healthValue <= 50) {
            return healthEvent?.threshold === 'low';
          } else {
            return healthEvent === undefined;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: Modifiers can be applied and removed
  test('Property: Modifiers are applied and removed correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (modValue) => {
          const initialHealth = playerSystem.getStat('health');
          
          playerSystem.applyModifier({
            id: 'test-mod',
            stat: 'health',
            value: -modValue,
            type: 'add',
            duration: -1
          });
          
          const afterApply = playerSystem.getStat('health');
          
          playerSystem.removeModifier('test-mod');
          const afterRemove = playerSystem.getStat('health');
          
          return (
            afterApply === Math.max(0, initialHealth - modValue) &&
            afterRemove === initialHealth
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: Time-based decay reduces stats
  test('Property: Time-based decay reduces stats', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }).map(n => n / 10), // 0.1 to 1.0 hours
        (deltaHours) => {
          const initialHunger = playerSystem.getStat('hunger');
          const initialThirst = playerSystem.getStat('thirst');
          
          playerSystem.updateStats(deltaHours);
          
          const newHunger = playerSystem.getStat('hunger');
          const newThirst = playerSystem.getStat('thirst');
          
          // Stats should decrease (or stay at 0)
          return newHunger <= initialHunger && newThirst <= initialThirst;
        }
      ),
      { numRuns: 100 }
    );
  });
});
