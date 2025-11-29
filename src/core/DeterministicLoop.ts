/**
 * DeterministicLoop - Fixed timestep game loop with seeded RNG
 * Ensures identical simulation results given same seed
 * Feature: surviving-the-world, Property 1: Game loop phase ordering
 */

import { RngStreamRegistry } from './RngStreamRegistry';

export type LoopPhase = 'LOAD' | 'INIT' | 'SIMULATE' | 'RENDER' | 'SAVE';

export interface TickContext {
  tick: number;
  dt: number;
  time: number;
  rng: () => number;
  correlationId: string;
}

export interface DeterministicLoopConfig {
  fixedTimestep: number;  // ms per tick (default 16.67 = 60fps)
  maxFrameTime: number;   // max ms to process per frame
  seed: number;
}

export interface LoopMetrics {
  ticksProcessed: number;
  totalSimTime: number;
  avgTickTime: number;
  maxTickTime: number;
  currentPhase: LoopPhase;
}

export class DeterministicLoop {
  private config: DeterministicLoopConfig;
  private rngRegistry: RngStreamRegistry;
  private currentTick: number = 0;
  private accumulator: number = 0;
  private lastFrameTime: number = 0;
  private currentPhase: LoopPhase = 'LOAD';
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  
  // Metrics
  private tickTimes: number[] = [];
  private totalSimTime: number = 0;
  
  // Callbacks
  private onTick?: (ctx: TickContext) => void;
  private onPhaseChange?: (phase: LoopPhase) => void;

  constructor(config: Partial<DeterministicLoopConfig> = {}) {
    this.config = {
      fixedTimestep: config.fixedTimestep ?? 16.67,
      maxFrameTime: config.maxFrameTime ?? 250,
      seed: config.seed ?? Date.now()
    };
    this.rngRegistry = new RngStreamRegistry(this.config.seed);
  }

  setTickCallback(callback: (ctx: TickContext) => void): void {
    this.onTick = callback;
  }

  setPhaseCallback(callback: (phase: LoopPhase) => void): void {
    this.onPhaseChange = callback;
  }

  private transitionPhase(phase: LoopPhase): void {
    this.currentPhase = phase;
    this.onPhaseChange?.(phase);
  }

  async initialize(): Promise<void> {
    this.transitionPhase('LOAD');
    // Load phase - data loading happens here
    await this.sleep(1); // Yield to allow async operations
    
    this.transitionPhase('INIT');
    // Init phase - system initialization
    this.currentTick = 0;
    this.accumulator = 0;
    this.lastFrameTime = performance.now();
  }

  start(): void {
    this.isRunning = true;
    this.isPaused = false;
    this.transitionPhase('SIMULATE');
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
    this.lastFrameTime = performance.now();
  }

  stop(): void {
    this.isRunning = false;
    this.transitionPhase('SAVE');
  }

  /**
   * Process a single frame - call this from your render loop
   * Returns number of ticks processed
   */
  processFrame(currentTime: number = performance.now()): number {
    if (!this.isRunning || this.isPaused) return 0;

    let frameTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // Clamp frame time to prevent spiral of death
    if (frameTime > this.config.maxFrameTime) {
      frameTime = this.config.maxFrameTime;
    }

    this.accumulator += frameTime;
    let ticksProcessed = 0;

    // Process fixed timestep ticks
    while (this.accumulator >= this.config.fixedTimestep) {
      const tickStart = performance.now();
      
      const ctx = this.createTickContext();
      this.onTick?.(ctx);
      
      this.currentTick++;
      this.accumulator -= this.config.fixedTimestep;
      ticksProcessed++;

      const tickTime = performance.now() - tickStart;
      this.tickTimes.push(tickTime);
      this.totalSimTime += tickTime;

      // Keep only last 100 tick times for metrics
      if (this.tickTimes.length > 100) {
        this.tickTimes.shift();
      }
    }

    // After simulation, transition to render phase
    if (ticksProcessed > 0) {
      this.transitionPhase('RENDER');
    }

    return ticksProcessed;
  }

  private createTickContext(): TickContext {
    const streamRng = this.rngRegistry.getStream('simulation');
    return {
      tick: this.currentTick,
      dt: this.config.fixedTimestep / 1000, // Convert to seconds
      time: this.currentTick * this.config.fixedTimestep / 1000,
      rng: () => streamRng.next(),
      correlationId: `tick-${this.currentTick}-${this.config.seed}`
    };
  }

  /**
   * Run a deterministic simulation for N ticks
   * Used for testing and replay validation
   */
  runDeterministic(ticks: number): TickContext[] {
    const contexts: TickContext[] = [];
    for (let i = 0; i < ticks; i++) {
      const ctx = this.createTickContext();
      this.onTick?.(ctx);
      contexts.push(ctx);
      this.currentTick++;
    }
    return contexts;
  }

  /**
   * Reset to initial state with same or new seed
   */
  reset(newSeed?: number): void {
    if (newSeed !== undefined) {
      this.config.seed = newSeed;
    }
    this.rngRegistry = new RngStreamRegistry(this.config.seed);
    this.currentTick = 0;
    this.accumulator = 0;
    this.tickTimes = [];
    this.totalSimTime = 0;
    this.currentPhase = 'LOAD';
    this.isRunning = false;
    this.isPaused = false;
  }

  getMetrics(): LoopMetrics {
    const avgTickTime = this.tickTimes.length > 0
      ? this.tickTimes.reduce((a, b) => a + b, 0) / this.tickTimes.length
      : 0;
    const maxTickTime = this.tickTimes.length > 0
      ? Math.max(...this.tickTimes)
      : 0;

    return {
      ticksProcessed: this.currentTick,
      totalSimTime: this.totalSimTime,
      avgTickTime,
      maxTickTime,
      currentPhase: this.currentPhase
    };
  }

  getCurrentTick(): number { return this.currentTick; }
  getCurrentPhase(): LoopPhase { return this.currentPhase; }
  getSeed(): number { return this.config.seed; }
  isActive(): boolean { return this.isRunning && !this.isPaused; }

  getRngStream(name: string): { next: () => number } {
    return this.rngRegistry.getStream(name);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
