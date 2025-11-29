/**
 * CoverSystem Unit Tests
 * Feature: enterprise-100-percent
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3
 */

import { CoverSystem, CoverPoint, Vector3 } from '../src/systems/CoverSystem';

describe('CoverSystem', () => {
  let coverSystem: CoverSystem;

  const createCoverPoint = (overrides: Partial<CoverPoint> = {}): CoverPoint => ({
    id: 'cover_1',
    position: { x: 0, y: 0, z: 0 },
    normal: { x: 0, y: 0, z: 1 }, // Facing +Z
    height: 'high',
    type: 'hard',
    material: 'concrete',
    destructible: false,
    health: 100,
    maxHealth: 100,
    width: 2,
    penetrationResistance: 0.9,
    isFlanked: false,
    ...overrides
  });

  beforeEach(() => {
    coverSystem = new CoverSystem();
  });

  describe('Cover Entry/Exit', () => {
    test('Player can enter valid cover', () => {
      const cover = createCoverPoint();
      coverSystem.registerCoverPoint(cover);
      
      const result = coverSystem.enterCover('player1', 'cover_1');
      
      expect(result).toBe(true);
      const state = coverSystem.getPlayerState('player1');
      expect(state.inCover).toBe(true);
      expect(state.currentCover?.id).toBe('cover_1');
    });

    test('Player cannot enter destroyed cover', () => {
      const cover = createCoverPoint({ health: 0 });
      coverSystem.registerCoverPoint(cover);
      
      const result = coverSystem.enterCover('player1', 'cover_1');
      
      expect(result).toBe(false);
    });

    test('Player can exit cover', () => {
      const cover = createCoverPoint();
      coverSystem.registerCoverPoint(cover);
      coverSystem.enterCover('player1', 'cover_1');
      
      coverSystem.exitCover('player1');
      
      const state = coverSystem.getPlayerState('player1');
      expect(state.inCover).toBe(false);
      expect(state.currentCover).toBeNull();
    });
  });

  describe('Peek Mechanics', () => {
    test('Player can peek from cover', () => {
      const cover = createCoverPoint();
      coverSystem.registerCoverPoint(cover);
      coverSystem.enterCover('player1', 'cover_1');
      
      const result = coverSystem.peek('player1');
      
      expect(result).toBe(true);
      const state = coverSystem.getPlayerState('player1');
      expect(state.isPeeking).toBe(true);
    });

    test('Player cannot peek when not in cover', () => {
      const result = coverSystem.peek('player1');
      
      expect(result).toBe(false);
    });

    test('Stop peek returns to cover', () => {
      const cover = createCoverPoint();
      coverSystem.registerCoverPoint(cover);
      coverSystem.enterCover('player1', 'cover_1');
      coverSystem.peek('player1');
      
      coverSystem.stopPeek('player1');
      
      const state = coverSystem.getPlayerState('player1');
      expect(state.isPeeking).toBe(false);
      expect(state.inCover).toBe(true);
    });
  });

  describe('Damage Reduction', () => {
    test('Hard cover provides 90% damage reduction from front', () => {
      const cover = createCoverPoint({ type: 'hard', normal: { x: 0, y: 0, z: 1 } });
      coverSystem.registerCoverPoint(cover);
      coverSystem.enterCover('player1', 'cover_1');
      
      // Damage from front (same direction as normal)
      const reduction = coverSystem.calculateDamageReduction('player1', { x: 0, y: 0, z: 1 });
      
      expect(reduction).toBe(0.9);
    });

    test('Soft cover provides 50% damage reduction from front', () => {
      const cover = createCoverPoint({ type: 'soft', normal: { x: 0, y: 0, z: 1 } });
      coverSystem.registerCoverPoint(cover);
      coverSystem.enterCover('player1', 'cover_1');
      
      const reduction = coverSystem.calculateDamageReduction('player1', { x: 0, y: 0, z: 1 });
      
      expect(reduction).toBe(0.5);
    });

    test('No reduction when peeking', () => {
      const cover = createCoverPoint({ type: 'hard' });
      coverSystem.registerCoverPoint(cover);
      coverSystem.enterCover('player1', 'cover_1');
      coverSystem.peek('player1');
      
      const reduction = coverSystem.calculateDamageReduction('player1', { x: 0, y: 0, z: 1 });
      
      expect(reduction).toBe(0);
    });

    test('No reduction from behind cover', () => {
      const cover = createCoverPoint({ type: 'hard', normal: { x: 0, y: 0, z: 1 } });
      coverSystem.registerCoverPoint(cover);
      coverSystem.enterCover('player1', 'cover_1');
      
      // Damage from behind (opposite direction)
      const reduction = coverSystem.calculateDamageReduction('player1', { x: 0, y: 0, z: -1 });
      
      expect(reduction).toBe(0);
    });
  });

  describe('Blind Fire', () => {
    test('Blind fire applies 50% accuracy penalty', () => {
      const cover = createCoverPoint();
      coverSystem.registerCoverPoint(cover);
      coverSystem.enterCover('player1', 'cover_1');
      coverSystem.blindFire('player1');
      
      const modifier = coverSystem.getAccuracyModifier('player1');
      
      expect(modifier).toBe(0.5);
    });

    test('Normal accuracy when not blind firing', () => {
      const cover = createCoverPoint();
      coverSystem.registerCoverPoint(cover);
      coverSystem.enterCover('player1', 'cover_1');
      
      const modifier = coverSystem.getAccuracyModifier('player1');
      
      expect(modifier).toBe(1);
    });
  });

  describe('Cover Destruction', () => {
    test('Destructible cover can be damaged', () => {
      const cover = createCoverPoint({ destructible: true, health: 100 });
      coverSystem.registerCoverPoint(cover);
      
      coverSystem.damageCover('cover_1', 50);
      
      const point = coverSystem.getCoverPoint('cover_1');
      expect(point?.health).toBe(50);
    });

    test('Cover destruction forces player exit', () => {
      const cover = createCoverPoint({ destructible: true, health: 50 });
      coverSystem.registerCoverPoint(cover);
      coverSystem.enterCover('player1', 'cover_1');
      
      coverSystem.damageCover('cover_1', 50);
      
      const state = coverSystem.getPlayerState('player1');
      expect(state.inCover).toBe(false);
    });

    test('Non-destructible cover cannot be damaged', () => {
      const cover = createCoverPoint({ destructible: false, health: 100 });
      coverSystem.registerCoverPoint(cover);
      
      const destroyed = coverSystem.damageCover('cover_1', 100);
      
      expect(destroyed).toBe(false);
      const point = coverSystem.getCoverPoint('cover_1');
      expect(point?.health).toBe(100);
    });
  });

  describe('Cover Transitions', () => {
    test('Find nearest cover within range', () => {
      const cover1 = createCoverPoint({ id: 'cover_1', position: { x: 5, y: 0, z: 0 } });
      const cover2 = createCoverPoint({ id: 'cover_2', position: { x: 10, y: 0, z: 0 } });
      coverSystem.registerCoverPoint(cover1);
      coverSystem.registerCoverPoint(cover2);
      
      const nearest = coverSystem.findNearestCover({ x: 0, y: 0, z: 0 }, 15);
      
      expect(nearest?.id).toBe('cover_1');
    });

    test('Transition provides 25% damage reduction', () => {
      const cover1 = createCoverPoint({ id: 'cover_1', position: { x: 0, y: 0, z: 0 } });
      const cover2 = createCoverPoint({ id: 'cover_2', position: { x: 5, y: 0, z: 0 } });
      coverSystem.registerCoverPoint(cover1);
      coverSystem.registerCoverPoint(cover2);
      coverSystem.enterCover('player1', 'cover_1');
      coverSystem.initiateTransition('player1', 'cover_2');
      
      const reduction = coverSystem.calculateDamageReduction('player1', { x: 0, y: 0, z: 1 });
      
      expect(reduction).toBe(0.25);
    });
  });

  describe('Serialization', () => {
    test('Round-trip serialization preserves state', () => {
      const cover = createCoverPoint({ destructible: true, health: 75 });
      coverSystem.registerCoverPoint(cover);
      coverSystem.enterCover('player1', 'cover_1');
      
      const serialized = coverSystem.serialize();
      const newSystem = new CoverSystem();
      newSystem.deserialize(serialized);
      
      const point = newSystem.getCoverPoint('cover_1');
      expect(point?.health).toBe(75);
      
      const state = newSystem.getPlayerState('player1');
      expect(state.inCover).toBe(true);
    });
  });
});
