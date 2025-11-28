/**
 * InventorySystem Unit Tests
 * Tests weight calculation, stacking, durability
 * Requirements: 16.1, 16.2, 16.3
 * Feature: surviving-the-world, Property 34: Encumbrance penalty application
 * Feature: surviving-the-world, Property 35: Durability reduction on use
 */

import { InventorySystem } from '../src/systems/InventorySystem';
import * as fc from 'fast-check';

function createTestInventory(capacity: number = 50): InventorySystem {
  const inventory = new InventorySystem(capacity);
  inventory.registerItemConfig({
    id: 'test_item',
    name: 'Test Item',
    type: 'resource',
    weight: 1.0,
    durability: 100,
    stackable: true,
    maxStack: 99,
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

describe('InventorySystem', () => {
  test('Empty inventory has zero weight', () => {
    const inventory = createTestInventory();
    expect(inventory.getTotalWeight()).toBe(0);
  });

  test('Adding items increases weight correctly', () => {
    const inventory = createTestInventory();
    inventory.addItem('test_item', 5);
    expect(inventory.getTotalWeight()).toBeCloseTo(5.0);
  });

  test('Removing items decreases weight correctly', () => {
    const inventory = createTestInventory();
    inventory.addItem('test_item', 10);
    const item = inventory.getItemByTemplate('test_item');
    if (item) inventory.removeItem(item.id, 3);
    expect(inventory.getTotalWeight()).toBeCloseTo(7.0);
  });

  test('Weight is additive', () => {
    const inventory = createTestInventory();
    inventory.addItem('test_item', 3);
    inventory.addItem('heavy_item', 1);
    expect(inventory.getTotalWeight()).toBeCloseTo(13.0);
  });

  test('Stackable items stack correctly', () => {
    const inventory = createTestInventory();
    inventory.addItem('test_item', 5);
    inventory.addItem('test_item', 3);
    
    const items = inventory.getItems();
    const testItems = items.filter(i => i.templateId === 'test_item');
    expect(testItems.length).toBe(1);
    expect(testItems[0].quantity).toBe(8);
  });

  test('Non-stackable items do not stack', () => {
    const inventory = createTestInventory();
    inventory.addItem('heavy_item', 1);
    inventory.addItem('heavy_item', 1);
    
    const items = inventory.getItems();
    const heavyItems = items.filter(i => i.templateId === 'heavy_item');
    expect(heavyItems.length).toBe(2);
  });

  test('Cannot exceed capacity', () => {
    const inventory = createTestInventory(10);
    const added = inventory.addItem('heavy_item', 2);
    expect(added).toBe(false);
  });

  test('Durability tracking works', () => {
    const inventory = createTestInventory();
    inventory.addItem('test_item', 1);
    const item = inventory.getItemByTemplate('test_item');
    
    expect(item).not.toBeNull();
    expect(item!.durability).toBe(100);
    
    inventory.updateDurability(item!.id, -30);
    expect(item!.durability).toBe(70);
  });

  test('Item removed at zero durability', () => {
    const inventory = createTestInventory();
    inventory.addItem('test_item', 1);
    const item = inventory.getItemByTemplate('test_item');
    
    inventory.updateDurability(item!.id, -100);
    expect(inventory.getItems().length).toBe(0);
  });

  test('Encumbrance calculation', () => {
    const inventory = createTestInventory(100);
    inventory.addItem('test_item', 50);
    expect(inventory.getEncumbrance()).toBeCloseTo(0.5);
  });
});

describe('InventorySystem Property Tests', () => {
  /**
   * Feature: surviving-the-world, Property 34: Encumbrance penalty application
   * For any inventory weight exceeding the limit, movement penalties should be applied
   * proportionally to the amount over the limit.
   * Validates: Requirements 16.2
   */
  test('Property 34: Encumbrance is proportional to weight', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 50 }),
        (capacity, itemCount) => {
          const inventory = createTestInventory(capacity);
          inventory.addItem('test_item', itemCount);
          
          const weight = inventory.getTotalWeight();
          const encumbrance = inventory.getEncumbrance();
          const expectedEncumbrance = Math.min(1, weight / capacity);
          
          return Math.abs(encumbrance - expectedEncumbrance) < 0.001;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: surviving-the-world, Property 35: Durability reduction on use
   * For any item use, durability should decrease by the configured amount,
   * and items at zero durability should be removed from inventory.
   * Validates: Requirements 16.3
   */
  test('Property 35: Durability reduction removes items at zero', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (durabilityLoss) => {
          const inventory = createTestInventory();
          inventory.addItem('test_item', 1);
          const item = inventory.getItemByTemplate('test_item');
          
          if (!item) return false;
          
          inventory.updateDurability(item.id, -durabilityLoss);
          
          if (durabilityLoss >= 100) {
            return inventory.getItems().length === 0;
          } else {
            return item.durability === 100 - durabilityLoss;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Weight sum invariant - weight is always the sum of individual item weights
   */
  test('Weight is always sum of item weights', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 5 }),
        (testItemCount, heavyItemCount) => {
          const inventory = createTestInventory(1000);
          
          inventory.addItem('test_item', testItemCount);
          for (let i = 0; i < heavyItemCount; i++) {
            inventory.addItem('heavy_item', 1);
          }
          
          const expectedWeight = testItemCount * 1.0 + heavyItemCount * 10.0;
          const actualWeight = inventory.getTotalWeight();
          
          return Math.abs(actualWeight - expectedWeight) < 0.001;
        }
      ),
      { numRuns: 100 }
    );
  });
});
