/**
 * PlayerProgressionSystem Unit Tests
 * Tests stat gains and unlock thresholds
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 * Feature: surviving-the-world, Property 22: Stat gains from actions
 * Feature: surviving-the-world, Property 23: Unlock triggers at thresholds
 */

import { PlayerProgressionSystem } from '../src/systems/PlayerProgressionSystem';
import * as fc from 'fast-check';

describe('PlayerProgressionSystem', () => {
  let progression: PlayerProgressionSystem;

  beforeEach(() => {
    progression = new PlayerProgressionSystem();
  });

  test('Initialize player with zero stats', () => {
    const stats = progression.initializePlayer('player_1');
    
    expect(stats.stamina).toBe(0);
    expect(stats.accuracy).toBe(0);
    expect(stats.charisma).toBe(0);
    expect(stats.craftsmanship).toBe(0);
  });

  test('Running increases stamina', () => {
    progression.initializePlayer('player_1');
    progression.recordTimeBasedGains('player_1', 10); // 10 minutes
    
    const stats = progression.getStats('player_1');
    expect(stats?.stamina).toBeGreaterThan(0);
  });

  test('Hunting increases accuracy', () => {
    progression.initializePlayer('player_1');
    const gain = progression.recordAction('player_1', 'hunting');
    
    expect(gain).toBeGreaterThan(0);
    expect(progression.getStats('player_1')?.accuracy).toBeGreaterThan(0);
  });

  test('Trading increases charisma', () => {
    progression.initializePlayer('player_1');
    progression.recordAction('player_1', 'trading');
    
    expect(progression.getStats('player_1')?.charisma).toBeGreaterThan(0);
  });

  test('Crafting increases craftsmanship', () => {
    progression.initializePlayer('player_1');
    progression.recordAction('player_1', 'crafting');
    
    expect(progression.getStats('player_1')?.craftsmanship).toBeGreaterThan(0);
  });

  test('Unlocks trigger at thresholds', () => {
    progression.initializePlayer('player_1');
    
    // Directly set stat above threshold to test unlock mechanism
    const stats = progression.getStats('player_1')!;
    stats.craftsmanship = 15; // Above threshold of 10
    progression.checkUnlocks('player_1');
    
    expect(progression.hasUnlock('player_1', 'better_crafting')).toBe(true);
  });

  test('Progression bonuses reflect unlocks', () => {
    progression.initializePlayer('player_1');
    
    // No unlocks initially
    let bonuses = progression.getProgressionBonuses('player_1');
    expect(bonuses.staminaMultiplier).toBe(1.0);
    
    // Unlock stamina bonus
    const stats = progression.getStats('player_1')!;
    stats.stamina = 20; // Above threshold
    progression.checkUnlocks('player_1');
    
    bonuses = progression.getProgressionBonuses('player_1');
    expect(bonuses.staminaMultiplier).toBe(1.2);
  });

  test('Serialization round-trip preserves state', () => {
    progression.initializePlayer('player_1');
    progression.recordAction('player_1', 'hunting');
    progression.recordAction('player_1', 'crafting');
    
    const serialized = progression.serialize('player_1');
    
    const newProgression = new PlayerProgressionSystem();
    newProgression.deserialize('player_1', serialized);
    
    expect(newProgression.getStats('player_1')?.accuracy).toBe(
      progression.getStats('player_1')?.accuracy
    );
  });

  test('Unknown actions return zero gain', () => {
    progression.initializePlayer('player_1');
    const gain = progression.recordAction('player_1', 'unknown_action');
    
    expect(gain).toBe(0);
  });

  test('Intensity multiplies gains', () => {
    progression.initializePlayer('player_1');
    
    const normalGain = progression.recordAction('player_1', 'hunting', 1);
    
    const newProgression = new PlayerProgressionSystem();
    newProgression.initializePlayer('player_2');
    const doubleGain = newProgression.recordAction('player_2', 'hunting', 2);
    
    expect(doubleGain).toBe(normalGain * 2);
  });
});

describe('PlayerProgressionSystem Property Tests', () => {
  /**
   * Feature: surviving-the-world, Property 22: Stat gains from actions
   * For any player action with stat gain configured, the corresponding stat
   * should increase by the configured amount.
   * Validates: Requirements 9.1, 9.2, 9.3, 9.4
   */
  test('Property 22: Actions increase corresponding stats', () => {
    const actionStatMap: Record<string, string> = {
      hunting: 'accuracy',
      trading: 'charisma',
      crafting: 'craftsmanship',
      negotiating: 'diplomacy',
      climbing: 'durability'
    };
    
    const actions = Object.keys(actionStatMap);
    
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: actions.length - 1 }),
        fc.integer({ min: 1, max: 10 }),
        (actionIdx, repeatCount) => {
          const progression = new PlayerProgressionSystem();
          progression.initializePlayer('player_1');
          
          const action = actions[actionIdx];
          const stat = actionStatMap[action] as keyof ReturnType<typeof progression.getStats>;
          
          const initialStat = progression.getStats('player_1')![stat];
          
          for (let i = 0; i < repeatCount; i++) {
            progression.recordAction('player_1', action);
          }
          
          const finalStat = progression.getStats('player_1')![stat];
          
          // Stat should have increased
          return finalStat > initialStat;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: surviving-the-world, Property 23: Unlock triggers at thresholds
   * For any player stat reaching an unlock threshold, the corresponding
   * ability or bonus should be unlocked and applied.
   * Validates: Requirements 9.5
   */
  test('Property 23: Unlocks trigger at thresholds', () => {
    const thresholds: { stat: string; threshold: number; unlockId: string }[] = [
      { stat: 'craftsmanship', threshold: 10, unlockId: 'better_crafting' },
      { stat: 'stamina', threshold: 15, unlockId: 'higher_stamina' },
      { stat: 'willpower', threshold: 20, unlockId: 'lower_hunger' }
    ];
    
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: thresholds.length - 1 }),
        (thresholdIdx) => {
          const progression = new PlayerProgressionSystem();
          progression.initializePlayer('player_1');
          
          const { stat, threshold, unlockId } = thresholds[thresholdIdx];
          const stats = progression.getStats('player_1')!;
          
          // Set stat just below threshold
          (stats as any)[stat] = threshold - 1;
          progression.checkUnlocks('player_1');
          
          // Should not be unlocked yet
          if (progression.hasUnlock('player_1', unlockId)) return false;
          
          // Set stat at threshold
          (stats as any)[stat] = threshold;
          progression.checkUnlocks('player_1');
          
          // Should now be unlocked
          return progression.hasUnlock('player_1', unlockId);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Stats are always non-negative
   */
  test('Stats are always non-negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        (actionCount) => {
          const progression = new PlayerProgressionSystem();
          progression.initializePlayer('player_1');
          
          const actions = ['hunting', 'trading', 'crafting', 'negotiating', 'climbing'];
          
          for (let i = 0; i < actionCount; i++) {
            const action = actions[i % actions.length];
            progression.recordAction('player_1', action);
          }
          
          const stats = progression.getStats('player_1')!;
          
          return (
            stats.stamina >= 0 &&
            stats.accuracy >= 0 &&
            stats.charisma >= 0 &&
            stats.craftsmanship >= 0 &&
            stats.diplomacy >= 0 &&
            stats.durability >= 0 &&
            stats.willpower >= 0
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});
