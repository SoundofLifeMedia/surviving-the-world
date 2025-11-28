/**
 * Heat System - Property-Based Tests
 * Feature: surviving-the-world
 * Uses fast-check for property-based testing with 100+ iterations
 */

import * as fc from 'fast-check';
import { HeatSystem, EscalationTier, FactionHeatState, HeatConfig } from '../src/systems/HeatSystem';

// Arbitraries for generating test data
const factionIdArb = fc.string({ minLength: 1, maxLength: 20 });

const hostileActionArb = fc.constantFrom(
  'kill_guard', 'kill_civilian', 'steal', 'trespass', 
  'assault', 'destroy_property', 'help_enemy'
);

const escalationTierArb: fc.Arbitrary<EscalationTier> = fc.constantFrom(
  'calm', 'alert', 'hunting', 'war'
);

const heatConfigArb: fc.Arbitrary<Partial<HeatConfig>> = fc.record({
  escalationThresholds: fc.record({
    alert: fc.integer({ min: 10, max: 40 }),
    hunting: fc.integer({ min: 40, max: 70 }),
    war: fc.integer({ min: 70, max: 95 })
  }),
  cooldownRate: fc.integer({ min: 1, max: 20 }).map(n => n / 10), // 0.1 to 2.0
  revengeMemoryDuration: fc.integer({ min: 24, max: 720 })
});

describe('Heat System - Property-Based Tests', () => {
  let heatSystem: HeatSystem;

  beforeEach(() => {
    heatSystem = new HeatSystem();
  });

  // Feature: surviving-the-world, Property 20: Heat level increases on hostile actions
  test('Property 20: Heat increases on hostile actions', () => {
    fc.assert(
      fc.property(factionIdArb, hostileActionArb, (factionId, action) => {
        heatSystem.initializeFaction(factionId);
        const initialHeat = heatSystem.getHeatState(factionId)?.heatLevel || 0;
        
        heatSystem.increaseHeat(factionId, action);
        const newHeat = heatSystem.getHeatState(factionId)?.heatLevel || 0;
        
        return newHeat > initialHeat;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: surviving-the-world, Property 21: Escalation tier transitions at thresholds
  test('Property 21: Escalation tiers follow threshold rules', () => {
    fc.assert(
      fc.property(
        factionIdArb,
        fc.integer({ min: 0, max: 100 }),
        (factionId, targetHeat) => {
          heatSystem.initializeFaction(factionId);
          
          // Increase heat to target level
          while ((heatSystem.getHeatState(factionId)?.heatLevel || 0) < targetHeat) {
            heatSystem.increaseHeat(factionId, 'kill_guard');
          }
          
          const state = heatSystem.getHeatState(factionId);
          if (!state) return false;
          
          // Verify tier matches heat level
          if (state.heatLevel >= 80) {
            return state.escalationTier === 'war';
          } else if (state.heatLevel >= 50) {
            return state.escalationTier === 'hunting';
          } else if (state.heatLevel >= 25) {
            return state.escalationTier === 'alert';
          } else {
            return state.escalationTier === 'calm';
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: Heat is bounded 0-100
  test('Property: Heat level stays in 0-100 range', () => {
    fc.assert(
      fc.property(
        factionIdArb,
        fc.array(hostileActionArb, { minLength: 0, maxLength: 50 }),
        (factionId, actions) => {
          heatSystem.initializeFaction(factionId);
          
          for (const action of actions) {
            heatSystem.increaseHeat(factionId, action);
          }
          
          const heat = heatSystem.getHeatState(factionId)?.heatLevel || 0;
          return heat >= 0 && heat <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: Cooldown reduces heat over time
  test('Property: Heat decreases during cooldown', () => {
    fc.assert(
      fc.property(
        factionIdArb,
        fc.integer({ min: 1, max: 48 }),
        (factionId, hours) => {
          heatSystem.initializeFaction(factionId);
          
          // Build up some heat
          for (let i = 0; i < 5; i++) {
            heatSystem.increaseHeat(factionId, 'kill_guard');
          }
          
          const state = heatSystem.getHeatState(factionId);
          if (!state) return false;
          
          // Simulate time passing (set lastHostileAction to past)
          state.lastHostileAction = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
          
          const heatBefore = state.heatLevel;
          heatSystem.decreaseHeat(factionId, hours);
          const heatAfter = heatSystem.getHeatState(factionId)?.heatLevel || 0;
          
          return heatAfter <= heatBefore;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: Revenge targets are tracked
  test('Property: Revenge targets are recorded', () => {
    fc.assert(
      fc.property(
        factionIdArb,
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
        (factionId, targetIds) => {
          heatSystem.initializeFaction(factionId);
          
          for (const targetId of targetIds) {
            heatSystem.increaseHeat(factionId, 'kill_guard', targetId);
          }
          
          const state = heatSystem.getHeatState(factionId);
          if (!state) return false;
          
          // All unique targets should be recorded
          const uniqueTargets = [...new Set(targetIds)];
          return uniqueTargets.every(t => state.revengeTargets.includes(t));
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: Reset clears all heat state
  test('Property: Reset clears heat completely', () => {
    fc.assert(
      fc.property(
        factionIdArb,
        fc.array(hostileActionArb, { minLength: 1, maxLength: 20 }),
        (factionId, actions) => {
          heatSystem.initializeFaction(factionId);
          
          for (const action of actions) {
            heatSystem.increaseHeat(factionId, action, 'target-1');
          }
          
          heatSystem.resetHeat(factionId);
          const state = heatSystem.getHeatState(factionId);
          
          return (
            state?.heatLevel === 0 &&
            state?.escalationTier === 'calm' &&
            state?.revengeTargets.length === 0 &&
            state?.activeResponses.length === 0
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: Patrol intensity scales with heat
  test('Property: Patrol intensity increases with heat', () => {
    fc.assert(
      fc.property(factionIdArb, (factionId) => {
        heatSystem.initializeFaction(factionId);
        
        const intensityAtZero = heatSystem.updatePatrolIntensity(factionId);
        
        // Increase heat
        for (let i = 0; i < 10; i++) {
          heatSystem.increaseHeat(factionId, 'kill_guard');
        }
        
        const intensityAfter = heatSystem.updatePatrolIntensity(factionId);
        
        return intensityAfter >= intensityAtZero;
      }),
      { numRuns: 100 }
    );
  });

  // Property: Escalation listeners are called on tier change
  test('Property: Escalation triggers listener callbacks', () => {
    fc.assert(
      fc.property(factionIdArb, (factionId) => {
        let callbackCalled = false;
        let callbackTier: EscalationTier | null = null;
        
        heatSystem.onEscalation((id, tier, responses) => {
          if (id === factionId) {
            callbackCalled = true;
            callbackTier = tier;
          }
        });
        
        heatSystem.initializeFaction(factionId);
        
        // Increase heat until escalation
        for (let i = 0; i < 10; i++) {
          heatSystem.increaseHeat(factionId, 'kill_guard');
        }
        
        // Should have triggered at least one escalation
        return callbackCalled && callbackTier !== null;
      }),
      { numRuns: 100 }
    );
  });

  // Property: Revenge planning returns valid actions
  test('Property: Revenge actions match escalation tier', () => {
    fc.assert(
      fc.property(factionIdArb, escalationTierArb, (factionId, targetTier) => {
        heatSystem.initializeFaction(factionId);
        
        // Set heat to match target tier
        const thresholds: Record<EscalationTier, number> = {
          calm: 0,
          alert: 30,
          hunting: 55,
          war: 85
        };
        
        const targetHeat = thresholds[targetTier];
        while ((heatSystem.getHeatState(factionId)?.heatLevel || 0) < targetHeat) {
          heatSystem.increaseHeat(factionId, 'kill_guard', 'target-1');
        }
        
        const revenge = heatSystem.planRevengeAction(factionId);
        
        if (targetTier === 'calm') {
          return revenge === null;
        }
        
        return revenge !== null && revenge.targets.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  // Property: Serialization round-trip preserves state
  test('Property: Serialize/deserialize preserves heat state', () => {
    fc.assert(
      fc.property(
        factionIdArb,
        fc.array(hostileActionArb, { minLength: 1, maxLength: 10 }),
        (factionId, actions) => {
          heatSystem.initializeFaction(factionId);
          
          for (const action of actions) {
            heatSystem.increaseHeat(factionId, action, 'target-1');
          }
          
          const stateBefore = heatSystem.getHeatState(factionId);
          const serialized = heatSystem.serialize();
          
          const newSystem = new HeatSystem();
          newSystem.deserialize(serialized);
          
          const stateAfter = newSystem.getHeatState(factionId);
          
          return (
            stateBefore?.heatLevel === stateAfter?.heatLevel &&
            stateBefore?.escalationTier === stateAfter?.escalationTier
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: Alliance bonus reduces heat
  test('Property: Alliance bonus reduces heat', () => {
    fc.assert(
      fc.property(factionIdArb, (factionId) => {
        heatSystem.initializeFaction(factionId);
        
        // Build up heat
        for (let i = 0; i < 5; i++) {
          heatSystem.increaseHeat(factionId, 'kill_guard');
        }
        
        const heatBefore = heatSystem.getHeatState(factionId)?.heatLevel || 0;
        heatSystem.applyAllianceBonus(factionId, 'allied-player');
        const heatAfter = heatSystem.getHeatState(factionId)?.heatLevel || 0;
        
        return heatAfter <= heatBefore;
      }),
      { numRuns: 100 }
    );
  });

  // Property: Clearing revenge target removes it from list
  test('Property: Cleared revenge targets are removed', () => {
    fc.assert(
      fc.property(
        factionIdArb,
        fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
        (factionId, targetIds) => {
          heatSystem.initializeFaction(factionId);
          
          for (const targetId of targetIds) {
            heatSystem.increaseHeat(factionId, 'kill_guard', targetId);
          }
          
          const targetToRemove = targetIds[0];
          heatSystem.clearRevengeTarget(factionId, targetToRemove);
          
          const state = heatSystem.getHeatState(factionId);
          return !state?.revengeTargets.includes(targetToRemove);
        }
      ),
      { numRuns: 100 }
    );
  });
});
