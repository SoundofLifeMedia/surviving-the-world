/**
 * PlayerSystem Unit Tests
 * Tests stat decay, modifiers, and thresholds
 * Requirements: 14.1, 14.2
 */

import { PlayerSystem } from '../src/systems/PlayerSystem';

describe('PlayerSystem', () => {
  let player: PlayerSystem;

  beforeEach(() => {
    player = new PlayerSystem();
  });

  test('Initial stats are at expected values', () => {
    const stats = player.getStats();
    expect(stats.health).toBe(stats.maxHealth);
    expect(stats.stamina).toBe(stats.maxStamina);
    expect(stats.hunger).toBe(80);
    expect(stats.thirst).toBe(80);
  });

  test('Stats decay over time', () => {
    const initialStats = { ...player.getStats() };
    player.updateStats(1); // 1 hour
    const afterStats = player.getStats();
    
    expect(afterStats.hunger).toBeLessThan(initialStats.hunger);
    expect(afterStats.thirst).toBeLessThan(initialStats.thirst);
  });

  test('Stats are clamped to valid range', () => {
    // Simulate many hours to drain stats
    for (let i = 0; i < 100; i++) {
      player.updateStats(1);
    }
    const stats = player.getStats();
    
    expect(stats.hunger).toBeGreaterThanOrEqual(0);
    expect(stats.hunger).toBeLessThanOrEqual(100);
    expect(stats.thirst).toBeGreaterThanOrEqual(0);
    expect(stats.thirst).toBeLessThanOrEqual(100);
    expect(stats.health).toBeGreaterThanOrEqual(0);
    expect(stats.health).toBeLessThanOrEqual(stats.maxHealth);
  });

  test('Modifying stats works correctly', () => {
    player.modifyStat('hunger', -30);
    const stats = player.getStats();
    expect(stats.hunger).toBe(50);
  });

  test('Threshold events trigger correctly', () => {
    player.modifyStat('hunger', -75); // 80 - 75 = 5
    const events = player.checkThresholds();
    
    const hungerEvent = events.find(e => e.stat === 'hunger');
    expect(hungerEvent).toBeDefined();
    expect(hungerEvent?.threshold).toBe('critical');
  });

  test('Player dies when health reaches 0', () => {
    player.modifyStat('health', -1000);
    expect(player.isAlive()).toBe(false);
  });

  test('Stat modifiers apply correctly', () => {
    const initialHealth = player.getStats().health;
    player.applyModifier({
      id: 'test_buff',
      stat: 'health',
      value: 20,
      type: 'add',
      duration: -1
    });
    const stats = player.getStats();
    expect(stats.health).toBe(Math.min(stats.maxHealth, initialHealth + 20));
  });

  test('Serialization round-trip preserves state', () => {
    player.modifyStat('hunger', -20);
    player.modifyStat('health', -10);
    
    const serialized = player.serialize();
    const restored = PlayerSystem.deserialize(serialized);
    
    expect(restored.getStats().hunger).toBe(player.getStats().hunger);
    expect(restored.getStats().health).toBe(player.getStats().health);
  });
});
