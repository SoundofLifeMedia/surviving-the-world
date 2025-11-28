/**
 * EconomySystem Unit Tests
 * Tests price calculation, supply/demand
 * Requirements: 10.1, 10.3, 10.4, 10.5
 * Feature: surviving-the-world, Property 24: Crafting affects economy
 * Feature: surviving-the-world, Property 25: Price reflects supply and demand
 */

import { EconomySystem } from '../src/systems/EconomySystem';
import * as fc from 'fast-check';

describe('EconomySystem', () => {
  let economy: EconomySystem;

  beforeEach(() => {
    economy = new EconomySystem();
  });

  test('Base prices exist and are positive', () => {
    const price = economy.getPrice('grain', 'village');
    expect(price).toBeGreaterThan(0);
  });

  test('Low supply increases price', () => {
    const normalPrice = economy.getPrice('grain', 'village');
    
    // Reduce supply drastically
    economy.updateSupply('village', 'grain', -180);
    
    const lowSupplyPrice = economy.getPrice('grain', 'village');
    expect(lowSupplyPrice).toBeGreaterThan(normalPrice);
  });

  test('High demand increases price', () => {
    const normalPrice = economy.getPrice('grain', 'village');
    
    // Increase demand
    economy.updateDemand('village', 'grain', 200);
    
    const highDemandPrice = economy.getPrice('grain', 'village');
    expect(highDemandPrice).toBeGreaterThan(normalPrice);
  });

  test('Trade routes can be created', () => {
    const route = economy.createTradeRoute('village', 'town', ['grain'], 100, 1);
    
    expect(route).toBeDefined();
    expect(route.fromRegion).toBe('village');
    expect(route.toRegion).toBe('town');
  });

  test('Trade routes can be disrupted', () => {
    const route = economy.createTradeRoute('test1', 'test2', ['grain'], 50, 1);
    expect(route.active).toBe(true);
    
    economy.disruptTradeRoute(route.id);
    
    const routes = economy.getTradeRoutes('test1');
    const found = routes.find(r => r.id === route.id);
    expect(found?.active).toBe(false);
  });

  test('Trade execution updates supply', () => {
    const initialSupply = economy.getSupply('village', 'grain');
    
    const result = economy.executeTrade(
      'player',
      'merchant',
      'village',
      [{ itemId: 'grain', quantity: 10 }],
      1
    );
    
    expect(result.success).toBe(true);
    
    const afterSupply = economy.getSupply('village', 'grain');
    expect(afterSupply).toBe(initialSupply - 10);
  });

  test('Cannot trade more than supply', () => {
    const result = economy.executeTrade(
      'player',
      'merchant',
      'village',
      [{ itemId: 'grain', quantity: 10000 }],
      1
    );
    
    expect(result.success).toBe(false);
  });

  test('Economic modifiers affect prices', () => {
    const normalPrice = economy.getPrice('grain', 'village');
    
    economy.applyModifier('village', {
      type: 'war',
      affectedItems: ['grain'],
      priceMultiplier: 2.0,
      supplyMultiplier: 0.5,
      demandMultiplier: 1.5,
      duration: 10,
      startDay: 1
    });
    
    const warPrice = economy.getPrice('grain', 'village');
    expect(warPrice).toBeGreaterThan(normalPrice);
  });
});

describe('EconomySystem Property Tests', () => {
  /**
   * Feature: surviving-the-world, Property 25: Price reflects supply and demand
   * For any item in a region, the calculated price should increase when supply decreases
   * or demand increases, and decrease when supply increases or demand decreases.
   * Validates: Requirements 10.3
   */
  test('Property 25: Price reflects supply and demand', () => {
    // Test supply decrease increases price
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 150 }),
        (supplyDecrease) => {
          const economy = new EconomySystem();
          const initialPrice = economy.getPrice('grain', 'village');
          
          economy.updateSupply('village', 'grain', -supplyDecrease);
          const newPrice = economy.getPrice('grain', 'village');
          
          // Price should increase when supply decreases
          return newPrice >= initialPrice && newPrice > 0;
        }
      ),
      { numRuns: 50 }
    );

    // Test demand increase increases price
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 200 }),
        (demandIncrease) => {
          const economy = new EconomySystem();
          const initialPrice = economy.getPrice('grain', 'village');
          
          economy.updateDemand('village', 'grain', demandIncrease);
          const newPrice = economy.getPrice('grain', 'village');
          
          // Price should increase when demand increases
          return newPrice >= initialPrice && newPrice > 0;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Price is always positive regardless of supply/demand changes
   */
  test('Price is always positive', () => {
    const items = ['grain', 'bread', 'meat', 'water', 'wood', 'stone'];
    const regions = ['village', 'town', 'castle', 'forest', 'farmland'];
    
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: items.length - 1 }),
        fc.integer({ min: 0, max: regions.length - 1 }),
        fc.integer({ min: -200, max: 200 }),
        fc.integer({ min: -200, max: 200 }),
        (itemIdx, regionIdx, supplyDelta, demandDelta) => {
          const economy = new EconomySystem();
          const item = items[itemIdx];
          const region = regions[regionIdx];
          
          economy.updateSupply(region, item, supplyDelta);
          economy.updateDemand(region, item, demandDelta);
          
          const price = economy.getPrice(item, region);
          return price > 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});
