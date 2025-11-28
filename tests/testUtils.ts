/**
 * Test Utilities
 * Mocks, helpers, and test infrastructure for Surviving The World
 */

import { PlayerSystem } from '../src/systems/PlayerSystem';
import { InventorySystem } from '../src/systems/InventorySystem';
import { CombatSystem, CombatEntity, Weapon } from '../src/systems/CombatSystem';
import { FactionSystem, Faction } from '../src/systems/FactionSystem';
import { NPCSystem, NPC, Personality, NPCNeeds } from '../src/systems/NPCSystem';
import { EconomySystem } from '../src/systems/EconomySystem';
import { QuestSystem } from '../src/systems/QuestSystem';

// Test data generators
export function createTestPlayer(): PlayerSystem {
  const player = new PlayerSystem();
  return player;
}

export function createTestInventory(capacity: number = 50): InventorySystem {
  const inventory = new InventorySystem(capacity);
  // Register some test items
  inventory.registerItemConfig({
    id: 'test_item',
    name: 'Test Item',
    type: 'resource',
    weight: 1.0,
    durability: 100,
    stackable: true,
    maxStack: 10,
    traits: [],
    stats: {},
    requirements: {}
  });
  inventory.registerItemConfig({
    id: 'heavy_item',
    name: 'Heavy Item',
    type: 'resource',
    weight: 10.0,
    durability: 100,
    stackable: false,
    traits: ['heavy'],
    stats: {},
    requirements: {}
  });
  return inventory;
}

export function createTestCombatEntity(overrides: Partial<CombatEntity> = {}): CombatEntity {
  return {
    id: `entity_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Entity',
    health: 100,
    maxHealth: 100,
    armor: 10,
    morale: 100,
    faction: 'test_faction',
    state: 'idle',
    ...overrides
  };
}

export function createTestWeapon(overrides: Partial<Weapon> = {}): Weapon {
  return {
    id: 'test_weapon',
    name: 'Test Weapon',
    type: 'melee',
    damage: 20,
    attackSpeed: 1.0,
    range: 1.5,
    ...overrides
  };
}

export function createTestFaction(overrides: Partial<Faction> = {}): Faction {
  return {
    id: `faction_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Faction',
    type: 'feudal_state',
    alignment: 'neutral',
    resources: { food: 500, gold: 200, manpower: 100 },
    attitudeToPlayer: 0,
    relations: new Map(),
    personality: {
      aggression: 0.5,
      riskAversion: 0.5,
      diplomacy: 0.5,
      honor: 0.5
    },
    goals: ['maintain_territory'],
    atWar: [],
    allies: [],
    ...overrides
  };
}

export function createTestNPC(overrides: Partial<NPC> = {}): NPC {
  return {
    id: `npc_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test NPC',
    factionId: 'test_faction',
    role: 'villager',
    health: 100,
    personality: {
      aggression: 0.5,
      altruism: 0.5,
      greed: 0.5,
      curiosity: 0.5,
      lawfulness: 0.5
    },
    needs: {
      hunger: 100,
      rest: 100,
      safety: 100,
      social: 100
    },
    memory: [],
    relationships: new Map(),
    schedule: [],
    currentActivity: 'idle',
    currentLocation: 'village',
    ...overrides
  };
}

// Assertion helpers
export function assertApproximatelyEqual(actual: number, expected: number, tolerance: number = 0.001): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${expected} ± ${tolerance}, got ${actual}`);
  }
}

export function assertInRange(value: number, min: number, max: number): void {
  if (value < min || value > max) {
    throw new Error(`Expected value in range [${min}, ${max}], got ${value}`);
  }
}

// Simulation helpers
export function simulateTime(system: { updateStats?: (delta: number) => void; update?: (delta: number) => void }, hours: number, stepSize: number = 0.1): void {
  const steps = Math.ceil(hours / stepSize);
  for (let i = 0; i < steps; i++) {
    if (system.updateStats) {
      system.updateStats(stepSize);
    }
    if (system.update) {
      system.update(stepSize);
    }
  }
}

// Random generators for property-based testing
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function randomString(length: number = 8): string {
  return Math.random().toString(36).substr(2, length);
}

// Test runner helper
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export async function runTest(name: string, testFn: () => void | Promise<void>): Promise<TestResult> {
  const start = performance.now();
  try {
    await testFn();
    return {
      name,
      passed: true,
      duration: performance.now() - start
    };
  } catch (error) {
    return {
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: performance.now() - start
    };
  }
}

export function printTestResults(results: TestResult[]): void {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log('\n=== Test Results ===');
  for (const result of results) {
    const status = result.passed ? '✓' : '✗';
    console.log(`${status} ${result.name} (${result.duration.toFixed(2)}ms)`);
    if (!result.passed && result.error) {
      console.log(`  Error: ${result.error}`);
    }
  }
  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
}
