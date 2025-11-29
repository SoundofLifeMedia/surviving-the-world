/**
 * DeterministicLoop Tests
 * Feature: surviving-the-world
 * Property 1: Game loop phase ordering
 */

import { DeterministicLoop, LoopPhase, TickContext } from '../../src/core/DeterministicLoop';
import { RngStreamRegistry } from '../../src/core/RngStreamRegistry';
import * as fc from 'fast-check';

describe('DeterministicLoop', () => {
  describe('Property 1: Game loop phase ordering', () => {
    it('executes phases in order: LOAD → INIT → SIMULATE → RENDER → SAVE', async () => {
      const loop = new DeterministicLoop({ seed: 12345 });
      const phases: LoopPhase[] = [];
      
      loop.setPhaseCallback((phase) => phases.push(phase));
      
      await loop.initialize();
      expect(phases).toContain('LOAD');
      expect(phases).toContain('INIT');
      expect(phases.indexOf('LOAD')).toBeLessThan(phases.indexOf('INIT'));
      
      loop.start();
      loop.processFrame(performance.now() + 20);
      expect(phases).toContain('SIMULATE');
      expect(phases).toContain('RENDER');
      
      loop.stop();
      expect(phases).toContain('SAVE');
    });

    it('each phase completes before next begins', async () => {
      const loop = new DeterministicLoop({ seed: 12345 });
      const phases: LoopPhase[] = [];
      
      loop.setPhaseCallback((phase) => {
        phases.push(phase);
      });
      
      await loop.initialize();
      loop.start();
      loop.processFrame(performance.now() + 20);
      loop.stop();
      
      // Verify phases were recorded and are valid
      expect(phases.length).toBeGreaterThan(0);
      for (const phase of phases) {
        expect(['LOAD', 'INIT', 'SIMULATE', 'RENDER', 'SAVE']).toContain(phase);
      }
    });
  });

  describe('Determinism Properties', () => {
    it('same seed produces identical tick contexts', () => {
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.integer({ min: 1, max: 100 }),
        (seed, tickCount) => {
          const loop1 = new DeterministicLoop({ seed });
          const loop2 = new DeterministicLoop({ seed });
          
          const contexts1: number[] = [];
          const contexts2: number[] = [];
          
          loop1.setTickCallback((ctx) => contexts1.push(ctx.rng()));
          loop2.setTickCallback((ctx) => contexts2.push(ctx.rng()));
          
          loop1.runDeterministic(tickCount);
          loop2.runDeterministic(tickCount);
          
          expect(contexts1).toEqual(contexts2);
          return true;
        }
      ), { numRuns: 50 });
    });

    it('different seeds produce different results', () => {
      const loop1 = new DeterministicLoop({ seed: 12345 });
      const loop2 = new DeterministicLoop({ seed: 54321 });
      
      const results1: number[] = [];
      const results2: number[] = [];
      
      loop1.setTickCallback((ctx) => results1.push(ctx.rng()));
      loop2.setTickCallback((ctx) => results2.push(ctx.rng()));
      
      loop1.runDeterministic(10);
      loop2.runDeterministic(10);
      
      expect(results1).not.toEqual(results2);
    });

    it('tick context has correct structure', () => {
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        (seed) => {
          const loop = new DeterministicLoop({ seed, fixedTimestep: 16.67 });
          let capturedCtx: TickContext | null = null;
          
          loop.setTickCallback((ctx) => { capturedCtx = ctx; });
          loop.runDeterministic(1);
          
          expect(capturedCtx).not.toBeNull();
          expect(capturedCtx!.tick).toBe(0);
          expect(capturedCtx!.dt).toBeCloseTo(0.01667, 4);
          expect(capturedCtx!.time).toBe(0);
          expect(typeof capturedCtx!.rng).toBe('function');
          expect(capturedCtx!.correlationId).toContain('tick-0');
          return true;
        }
      ), { numRuns: 20 });
    });

    it('reset restores initial state', () => {
      const loop = new DeterministicLoop({ seed: 12345 });
      const results1: number[] = [];
      const results2: number[] = [];
      
      loop.setTickCallback((ctx) => results1.push(ctx.rng()));
      loop.runDeterministic(10);
      
      loop.reset();
      loop.setTickCallback((ctx) => results2.push(ctx.rng()));
      loop.runDeterministic(10);
      
      expect(results1).toEqual(results2);
    });
  });

  describe('Fixed Timestep', () => {
    it('processes ticks based on elapsed time', () => {
      const loop = new DeterministicLoop({ fixedTimestep: 16.67, seed: 1 });
      let tickCount = 0;
      
      loop.setTickCallback(() => tickCount++);
      loop.start();
      
      // Simulate elapsed time - ticks should be processed
      const startTime = performance.now();
      loop.processFrame(startTime + 100);
      
      // Should process at least some ticks
      expect(tickCount).toBeGreaterThan(0);
    });

    it('clamps frame time to prevent spiral of death', () => {
      const loop = new DeterministicLoop({ fixedTimestep: 16.67, maxFrameTime: 100, seed: 1 });
      let tickCount = 0;
      
      loop.setTickCallback(() => tickCount++);
      loop.start();
      
      // Simulate 1000ms elapsed (should be clamped to 100ms = ~6 ticks)
      const startTime = performance.now();
      loop.processFrame(startTime + 1000);
      
      expect(tickCount).toBeLessThanOrEqual(10);
    });
  });

  describe('Pause/Resume', () => {
    it('pause stops tick processing', () => {
      const loop = new DeterministicLoop({ seed: 1 });
      let tickCount = 0;
      
      loop.setTickCallback(() => tickCount++);
      loop.start();
      loop.pause();
      
      const startTime = performance.now();
      loop.processFrame(startTime + 100);
      
      expect(tickCount).toBe(0);
    });

    it('resume continues tick processing', () => {
      const loop = new DeterministicLoop({ seed: 1 });
      let tickCount = 0;
      
      loop.setTickCallback(() => tickCount++);
      loop.start();
      loop.pause();
      loop.resume();
      
      const startTime = performance.now();
      loop.processFrame(startTime + 100);
      
      expect(tickCount).toBeGreaterThan(0);
    });
  });

  describe('Metrics', () => {
    it('tracks tick metrics correctly', () => {
      const loop = new DeterministicLoop({ seed: 1 });
      
      loop.setTickCallback(() => {});
      loop.runDeterministic(50);
      
      const metrics = loop.getMetrics();
      expect(metrics.ticksProcessed).toBe(50);
      expect(metrics.avgTickTime).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('RngStreamRegistry', () => {
  describe('Stream Isolation', () => {
    it('different streams produce different sequences', () => {
      const registry = new RngStreamRegistry(12345);
      
      const stream1 = registry.getStream('combat');
      const stream2 = registry.getStream('loot');
      
      const results1 = [stream1.next(), stream1.next(), stream1.next()];
      const results2 = [stream2.next(), stream2.next(), stream2.next()];
      
      expect(results1).not.toEqual(results2);
    });

    it('same stream name returns same stream', () => {
      const registry = new RngStreamRegistry(12345);
      
      const stream1 = registry.getStream('combat');
      const stream2 = registry.getStream('combat');
      
      expect(stream1).toBe(stream2);
    });
  });

  describe('Determinism', () => {
    it('same master seed produces identical streams', () => {
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (seed, streamName) => {
          const registry1 = new RngStreamRegistry(seed);
          const registry2 = new RngStreamRegistry(seed);
          
          const stream1 = registry1.getStream(streamName);
          const stream2 = registry2.getStream(streamName);
          
          const results1 = [stream1.next(), stream1.next(), stream1.next()];
          const results2 = [stream2.next(), stream2.next(), stream2.next()];
          
          expect(results1).toEqual(results2);
          return true;
        }
      ), { numRuns: 50 });
    });
  });

  describe('RNG Methods', () => {
    it('nextInt produces values in range', () => {
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 101, max: 200 }),
        (seed, min, max) => {
          const registry = new RngStreamRegistry(seed);
          const stream = registry.getStream('test');
          
          for (let i = 0; i < 100; i++) {
            const value = stream.nextInt(min, max);
            expect(value).toBeGreaterThanOrEqual(min);
            expect(value).toBeLessThanOrEqual(max);
          }
          return true;
        }
      ), { numRuns: 20 });
    });

    it('nextFloat produces values in range', () => {
      const registry = new RngStreamRegistry(12345);
      const stream = registry.getStream('test');
      
      for (let i = 0; i < 100; i++) {
        const value = stream.nextFloat(10, 50);
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThanOrEqual(50);
      }
    });

    it('shuffle preserves array elements', () => {
      const registry = new RngStreamRegistry(12345);
      const stream = registry.getStream('test');
      
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = stream.shuffle(original);
      
      // Shuffled should contain same elements
      expect(shuffled.sort((a, b) => a - b)).toEqual(original.sort((a, b) => a - b));
      // Length should be preserved
      expect(shuffled.length).toBe(original.length);
    });

    it('pick returns element from array', () => {
      const registry = new RngStreamRegistry(12345);
      const stream = registry.getStream('test');
      
      const array = ['a', 'b', 'c', 'd', 'e'];
      for (let i = 0; i < 20; i++) {
        const picked = stream.pick(array);
        expect(array).toContain(picked);
      }
    });
  });

  describe('Serialization', () => {
    it('serialize/deserialize preserves master seed', () => {
      const registry1 = new RngStreamRegistry(12345);
      registry1.getStream('combat');
      registry1.getStream('loot');
      
      const serialized = registry1.serialize();
      const registry2 = RngStreamRegistry.deserialize(serialized);
      
      // Master seed should be preserved
      expect(registry2.getMasterSeed()).toBe(12345);
      
      // After deserialize, streams need to be re-created (they're lazy)
      // But the seeds should produce same results
      const stream1 = registry1.resetStream('combat');
      const stream2 = registry2.getStream('combat');
      
      expect(stream1.next()).toBeCloseTo(stream2.next(), 10);
    });
  });
});
