/**
 * Performance System
 * Object pooling, spatial partitioning, LOD, profiling
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
 */

// Object Pool
export class ObjectPool<T> {
  private pool: T[] = [];
  private active: Set<T> = new Set();
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(factory: () => T, reset: (obj: T) => void, initialSize: number = 10, maxSize: number = 1000) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;

    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }

  acquire(): T {
    let obj: T;
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.factory();
    }
    this.active.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (!this.active.has(obj)) return;
    this.active.delete(obj);
    this.reset(obj);
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  releaseAll(): void {
    for (const obj of this.active) {
      this.reset(obj);
      if (this.pool.length < this.maxSize) {
        this.pool.push(obj);
      }
    }
    this.active.clear();
  }

  getActiveCount(): number { return this.active.size; }
  getPoolSize(): number { return this.pool.length; }
}

// Spatial partitioning (Grid-based)
export interface SpatialEntity {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export class SpatialGrid<T extends SpatialEntity> {
  private cellSize: number;
  private cells: Map<string, Set<T>> = new Map();
  private entityCells: Map<string, string[]> = new Map();

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
  }

  private getCellKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  private getCellsForEntity(entity: T): string[] {
    const cells: string[] = [];
    const minX = Math.floor((entity.x - entity.radius) / this.cellSize);
    const maxX = Math.floor((entity.x + entity.radius) / this.cellSize);
    const minY = Math.floor((entity.y - entity.radius) / this.cellSize);
    const maxY = Math.floor((entity.y + entity.radius) / this.cellSize);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        cells.push(`${cx},${cy}`);
      }
    }
    return cells;
  }

  insert(entity: T): void {
    const cells = this.getCellsForEntity(entity);
    this.entityCells.set(entity.id, cells);

    for (const cellKey of cells) {
      if (!this.cells.has(cellKey)) {
        this.cells.set(cellKey, new Set());
      }
      this.cells.get(cellKey)!.add(entity);
    }
  }

  remove(entity: T): void {
    const cells = this.entityCells.get(entity.id);
    if (!cells) return;

    for (const cellKey of cells) {
      this.cells.get(cellKey)?.delete(entity);
    }
    this.entityCells.delete(entity.id);
  }

  update(entity: T): void {
    this.remove(entity);
    this.insert(entity);
  }

  queryRadius(x: number, y: number, radius: number): T[] {
    const results: T[] = [];
    const checked = new Set<string>();

    const minCX = Math.floor((x - radius) / this.cellSize);
    const maxCX = Math.floor((x + radius) / this.cellSize);
    const minCY = Math.floor((y - radius) / this.cellSize);
    const maxCY = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this.cells.get(`${cx},${cy}`);
        if (!cell) continue;

        for (const entity of cell) {
          if (checked.has(entity.id)) continue;
          checked.add(entity.id);

          const dx = entity.x - x;
          const dy = entity.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius + entity.radius) {
            results.push(entity);
          }
        }
      }
    }

    return results;
  }

  queryRect(x: number, y: number, width: number, height: number): T[] {
    const results: T[] = [];
    const checked = new Set<string>();

    const minCX = Math.floor(x / this.cellSize);
    const maxCX = Math.floor((x + width) / this.cellSize);
    const minCY = Math.floor(y / this.cellSize);
    const maxCY = Math.floor((y + height) / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this.cells.get(`${cx},${cy}`);
        if (!cell) continue;

        for (const entity of cell) {
          if (checked.has(entity.id)) continue;
          checked.add(entity.id);

          if (entity.x >= x && entity.x <= x + width &&
              entity.y >= y && entity.y <= y + height) {
            results.push(entity);
          }
        }
      }
    }

    return results;
  }

  clear(): void {
    this.cells.clear();
    this.entityCells.clear();
  }

  getStats(): { cells: number; entities: number } {
    let entities = 0;
    for (const cell of this.cells.values()) {
      entities += cell.size;
    }
    return { cells: this.cells.size, entities };
  }
}


// LOD (Level of Detail) System
export type LODLevel = 'full' | 'medium' | 'low' | 'culled';

export interface LODConfig {
  fullDistance: number;
  mediumDistance: number;
  lowDistance: number;
  cullDistance: number;
}

export class LODSystem {
  private config: LODConfig;
  private cameraX: number = 0;
  private cameraY: number = 0;

  constructor(config?: Partial<LODConfig>) {
    this.config = {
      fullDistance: 50,
      mediumDistance: 150,
      lowDistance: 300,
      cullDistance: 500,
      ...config
    };
  }

  setCamera(x: number, y: number): void {
    this.cameraX = x;
    this.cameraY = y;
  }

  getLODLevel(entityX: number, entityY: number): LODLevel {
    const dx = entityX - this.cameraX;
    const dy = entityY - this.cameraY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= this.config.fullDistance) return 'full';
    if (dist <= this.config.mediumDistance) return 'medium';
    if (dist <= this.config.lowDistance) return 'low';
    if (dist <= this.config.cullDistance) return 'culled';
    return 'culled';
  }

  shouldUpdate(entityX: number, entityY: number, updateType: 'ai' | 'physics' | 'animation'): boolean {
    const lod = this.getLODLevel(entityX, entityY);
    
    switch (updateType) {
      case 'ai':
        return lod !== 'culled';
      case 'physics':
        return lod === 'full' || lod === 'medium';
      case 'animation':
        return lod === 'full';
    }
  }

  getUpdateFrequency(entityX: number, entityY: number): number {
    const lod = this.getLODLevel(entityX, entityY);
    switch (lod) {
      case 'full': return 1;    // Every frame
      case 'medium': return 2;  // Every 2 frames
      case 'low': return 5;     // Every 5 frames
      case 'culled': return 0;  // Don't update
    }
  }

  setConfig(config: Partial<LODConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Profiler
export interface ProfileSample {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  children: ProfileSample[];
}

export interface ProfileStats {
  name: string;
  calls: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
}

export class Profiler {
  private samples: ProfileSample[] = [];
  private stack: ProfileSample[] = [];
  private stats: Map<string, ProfileStats> = new Map();
  private enabled: boolean = false;
  private frameCount: number = 0;
  private frameStartTime: number = 0;
  private frameTimes: number[] = [];
  private readonly MAX_FRAME_SAMPLES = 100;

  enable(): void { this.enabled = true; }
  disable(): void { this.enabled = false; }
  isEnabled(): boolean { return this.enabled; }

  beginFrame(): void {
    if (!this.enabled) return;
    this.frameStartTime = performance.now();
    this.samples = [];
    this.stack = [];
  }

  endFrame(): void {
    if (!this.enabled) return;
    const frameTime = performance.now() - this.frameStartTime;
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.MAX_FRAME_SAMPLES) {
      this.frameTimes.shift();
    }
    this.frameCount++;
  }

  begin(name: string): void {
    if (!this.enabled) return;
    const sample: ProfileSample = {
      name,
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      children: []
    };

    if (this.stack.length > 0) {
      this.stack[this.stack.length - 1].children.push(sample);
    } else {
      this.samples.push(sample);
    }
    this.stack.push(sample);
  }

  end(name: string): void {
    if (!this.enabled) return;
    const sample = this.stack.pop();
    if (!sample || sample.name !== name) {
      console.warn(`Profiler: Mismatched end for ${name}`);
      return;
    }

    sample.endTime = performance.now();
    sample.duration = sample.endTime - sample.startTime;

    // Update stats
    let stat = this.stats.get(name);
    if (!stat) {
      stat = { name, calls: 0, totalTime: 0, avgTime: 0, minTime: Infinity, maxTime: 0 };
      this.stats.set(name, stat);
    }
    stat.calls++;
    stat.totalTime += sample.duration;
    stat.avgTime = stat.totalTime / stat.calls;
    stat.minTime = Math.min(stat.minTime, sample.duration);
    stat.maxTime = Math.max(stat.maxTime, sample.duration);
  }

  getStats(): ProfileStats[] {
    return Array.from(this.stats.values()).sort((a, b) => b.totalTime - a.totalTime);
  }

  getFrameStats(): { fps: number; avgFrameTime: number; minFrameTime: number; maxFrameTime: number } {
    if (this.frameTimes.length === 0) {
      return { fps: 0, avgFrameTime: 0, minFrameTime: 0, maxFrameTime: 0 };
    }

    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const min = Math.min(...this.frameTimes);
    const max = Math.max(...this.frameTimes);

    return {
      fps: 1000 / avg,
      avgFrameTime: avg,
      minFrameTime: min,
      maxFrameTime: max
    };
  }

  reset(): void {
    this.stats.clear();
    this.frameTimes = [];
    this.frameCount = 0;
  }

  getSamples(): ProfileSample[] {
    return this.samples;
  }
}

// Data Cache
export class DataCache<K, V> {
  private cache: Map<K, { value: V; timestamp: number; hits: number }> = new Map();
  private maxSize: number;
  private ttl: number; // Time to live in ms

  constructor(maxSize: number = 1000, ttl: number = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    entry.hits++;
    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }
    this.cache.set(key, { value, timestamp: Date.now(), hits: 0 });
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private evict(): void {
    // LRU eviction - remove least recently used
    let oldest: K | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldest = key;
      }
    }

    if (oldest !== null) {
      this.cache.delete(oldest);
    }
  }

  getStats(): { size: number; hitRate: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }
    return {
      size: this.cache.size,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0
    };
  }
}

// Performance Manager
export class PerformanceManager {
  public profiler: Profiler;
  public lodSystem: LODSystem;
  private pools: Map<string, ObjectPool<any>> = new Map();
  private caches: Map<string, DataCache<any, any>> = new Map();

  constructor() {
    this.profiler = new Profiler();
    this.lodSystem = new LODSystem();
  }

  createPool<T>(name: string, factory: () => T, reset: (obj: T) => void, initialSize?: number): ObjectPool<T> {
    const pool = new ObjectPool(factory, reset, initialSize);
    this.pools.set(name, pool);
    return pool;
  }

  getPool<T>(name: string): ObjectPool<T> | undefined {
    return this.pools.get(name);
  }

  createCache<K, V>(name: string, maxSize?: number, ttl?: number): DataCache<K, V> {
    const cache = new DataCache<K, V>(maxSize, ttl);
    this.caches.set(name, cache);
    return cache;
  }

  getCache<K, V>(name: string): DataCache<K, V> | undefined {
    return this.caches.get(name);
  }

  getMemoryStats(): { pools: Record<string, { active: number; pooled: number }>; caches: Record<string, { size: number }> } {
    const poolStats: Record<string, { active: number; pooled: number }> = {};
    const cacheStats: Record<string, { size: number }> = {};

    for (const [name, pool] of this.pools) {
      poolStats[name] = { active: pool.getActiveCount(), pooled: pool.getPoolSize() };
    }

    for (const [name, cache] of this.caches) {
      cacheStats[name] = { size: cache.getStats().size };
    }

    return { pools: poolStats, caches: cacheStats };
  }
}
