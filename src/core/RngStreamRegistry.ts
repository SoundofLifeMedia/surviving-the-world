/**
 * RngStreamRegistry - Deterministic seeded RNG streams
 * Each system gets its own stream for reproducible results
 * Feature: surviving-the-world, Determinism requirement
 */

export interface RngStream {
  next(): number;
  nextInt(min: number, max: number): number;
  nextFloat(min: number, max: number): number;
  nextBool(probability?: number): boolean;
  pick<T>(array: T[]): T | undefined;
  shuffle<T>(array: T[]): T[];
  getSeed(): number;
  getCallCount(): number;
}

/**
 * Mulberry32 PRNG - Fast, deterministic, good distribution
 */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class SeededRngStream implements RngStream {
  private rng: () => number;
  private seed: number;
  private callCount: number = 0;

  constructor(seed: number) {
    this.seed = seed;
    this.rng = mulberry32(seed);
  }

  next(): number {
    this.callCount++;
    return this.rng();
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  pick<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.nextInt(0, array.length - 1)];
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  getSeed(): number { return this.seed; }
  getCallCount(): number { return this.callCount; }
}

export class RngStreamRegistry {
  private masterSeed: number;
  private streams: Map<string, SeededRngStream> = new Map();
  private streamSeeds: Map<string, number> = new Map();

  constructor(masterSeed: number) {
    this.masterSeed = masterSeed;
  }

  /**
   * Get or create a named RNG stream
   * Same name always returns same stream with same seed
   */
  getStream(name: string): RngStream {
    if (!this.streams.has(name)) {
      // Derive stream seed from master seed + name hash
      const streamSeed = this.deriveStreamSeed(name);
      this.streamSeeds.set(name, streamSeed);
      this.streams.set(name, new SeededRngStream(streamSeed));
    }
    return this.streams.get(name)!;
  }

  /**
   * Create a fresh stream (resets call count)
   */
  resetStream(name: string): RngStream {
    const seed = this.streamSeeds.get(name) ?? this.deriveStreamSeed(name);
    const stream = new SeededRngStream(seed);
    this.streams.set(name, stream);
    this.streamSeeds.set(name, seed);
    return stream;
  }

  /**
   * Reset all streams to initial state
   */
  resetAll(): void {
    for (const name of this.streams.keys()) {
      this.resetStream(name);
    }
  }

  /**
   * Get all stream names
   */
  getStreamNames(): string[] {
    return Array.from(this.streams.keys());
  }

  /**
   * Get stream statistics
   */
  getStats(): Map<string, { seed: number; callCount: number }> {
    const stats = new Map<string, { seed: number; callCount: number }>();
    for (const [name, stream] of this.streams) {
      stats.set(name, {
        seed: stream.getSeed(),
        callCount: stream.getCallCount()
      });
    }
    return stats;
  }

  getMasterSeed(): number { return this.masterSeed; }

  private deriveStreamSeed(name: string): number {
    // Simple hash combining master seed with stream name
    let hash = this.masterSeed;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  /**
   * Serialize registry state for save/load
   */
  serialize(): { masterSeed: number; streamSeeds: Record<string, number> } {
    const streamSeeds: Record<string, number> = {};
    for (const [name, seed] of this.streamSeeds) {
      streamSeeds[name] = seed;
    }
    return { masterSeed: this.masterSeed, streamSeeds };
  }

  /**
   * Restore registry from serialized state
   */
  static deserialize(data: { masterSeed: number; streamSeeds: Record<string, number> }): RngStreamRegistry {
    const registry = new RngStreamRegistry(data.masterSeed);
    for (const [name, seed] of Object.entries(data.streamSeeds)) {
      registry.streamSeeds.set(name, seed);
    }
    return registry;
  }
}
