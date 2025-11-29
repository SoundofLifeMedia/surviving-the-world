/**
 * AdvancedMovementSystem Unit Tests
 * Feature: enterprise-100-percent
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { AdvancedMovementSystem, Obstacle, PlayerMovementInfo } from '../src/systems/AdvancedMovementSystem';

describe('AdvancedMovementSystem', () => {
  let movementSystem: AdvancedMovementSystem;

  const createPlayerInfo = (overrides: Partial<PlayerMovementInfo> = {}): PlayerMovementInfo => ({
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 10 },
    isSprinting: true,
    stamina: 100,
    maxStamina: 100,
    sprintSpeed: 10,
    ...overrides
  });

  const createObstacle = (overrides: Partial<Obstacle> = {}): Obstacle => ({
    id: 'obstacle_1',
    position: { x: 0, y: 0, z: 2 },
    height: 1.0,
    width: 2.0,
    ...overrides
  });

  beforeEach(() => {
    movementSystem = new AdvancedMovementSystem();
  });

  describe('Slide Mechanics', () => {
    test('Can slide when sprinting with sufficient stamina', () => {
      const playerInfo = createPlayerInfo({ isSprinting: true, stamina: 50 });
      
      const canSlide = movementSystem.canSlide(playerInfo);
      
      expect(canSlide).toBe(true);
    });

    test('Cannot slide with less than 20% stamina', () => {
      const playerInfo = createPlayerInfo({ stamina: 15, maxStamina: 100 });
      
      const canSlide = movementSystem.canSlide(playerInfo);
      
      expect(canSlide).toBe(false);
    });

    test('Cannot slide when not sprinting', () => {
      const playerInfo = createPlayerInfo({ isSprinting: false });
      
      const canSlide = movementSystem.canSlide(playerInfo);
      
      expect(canSlide).toBe(false);
    });

    test('Slide velocity is 80% of sprint velocity', () => {
      const playerInfo = createPlayerInfo({ velocity: { x: 0, y: 0, z: 10 } });
      
      movementSystem.initiateSlide('player1', playerInfo, 0);
      const state = movementSystem.getMovementState('player1');
      
      // Initial slide speed should be 80% of 10 = 8
      const slideSpeed = Math.sqrt(
        state.slideVelocity.x ** 2 + 
        state.slideVelocity.y ** 2 + 
        state.slideVelocity.z ** 2
      );
      expect(slideSpeed).toBeCloseTo(8, 1);
    });

    test('Slide completes after 0.8 seconds', () => {
      const playerInfo = createPlayerInfo();
      movementSystem.initiateSlide('player1', playerInfo, 0);
      
      const result = movementSystem.updateSlide('player1', 0.8);
      
      expect(result.completed).toBe(true);
      expect(result.shouldCrouch).toBe(true);
    });

    test('Slide decelerates over time', () => {
      const playerInfo = createPlayerInfo({ velocity: { x: 0, y: 0, z: 10 } });
      movementSystem.initiateSlide('player1', playerInfo, 0);
      
      const early = movementSystem.updateSlide('player1', 0.1);
      const late = movementSystem.updateSlide('player1', 0.6);
      
      const earlySpeed = Math.sqrt(early.velocity.x ** 2 + early.velocity.y ** 2 + early.velocity.z ** 2);
      const lateSpeed = Math.sqrt(late.velocity.x ** 2 + late.velocity.y ** 2 + late.velocity.z ** 2);
      
      expect(lateSpeed).toBeLessThan(earlySpeed);
    });
  });

  describe('Obstacle Detection', () => {
    test('Detects obstacle in front of player', () => {
      const obstacle = createObstacle({ position: { x: 0, y: 0, z: 1.5 } });
      movementSystem.registerObstacle(obstacle);
      
      const detected = movementSystem.detectObstacle(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 }
      );
      
      expect(detected).not.toBeNull();
      expect(detected?.id).toBe('obstacle_1');
    });

    test('Does not detect obstacle behind player', () => {
      const obstacle = createObstacle({ position: { x: 0, y: 0, z: -2 } });
      movementSystem.registerObstacle(obstacle);
      
      const detected = movementSystem.detectObstacle(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 }
      );
      
      expect(detected).toBeNull();
    });
  });

  describe('Vault Classification', () => {
    test('Obstacle 0.5m-1.2m is vaultable', () => {
      const obstacle = createObstacle({ height: 0.8 });
      
      expect(movementSystem.canVault(obstacle)).toBe(true);
      expect(movementSystem.canMantle(obstacle)).toBe(false);
      expect(movementSystem.classifyObstacle(obstacle)).toBe('vault');
    });

    test('Obstacle 1.2m-2.0m is mantleable', () => {
      const obstacle = createObstacle({ height: 1.5 });
      
      expect(movementSystem.canVault(obstacle)).toBe(false);
      expect(movementSystem.canMantle(obstacle)).toBe(true);
      expect(movementSystem.classifyObstacle(obstacle)).toBe('mantle');
    });

    test('Obstacle above 2.0m is impassable', () => {
      const obstacle = createObstacle({ height: 2.5 });
      
      expect(movementSystem.canVault(obstacle)).toBe(false);
      expect(movementSystem.canMantle(obstacle)).toBe(false);
      expect(movementSystem.classifyObstacle(obstacle)).toBe('impassable');
    });

    test('Obstacle below 0.5m is not vaultable', () => {
      const obstacle = createObstacle({ height: 0.3 });
      
      expect(movementSystem.canVault(obstacle)).toBe(false);
    });
  });

  describe('Vault Mechanics', () => {
    test('Vault takes 0.5 seconds', () => {
      const obstacle = createObstacle({ height: 1.0 });
      movementSystem.registerObstacle(obstacle);
      
      movementSystem.initiateVault('player1', obstacle, 0);
      
      const midway = movementSystem.updateVault('player1', 0.25);
      expect(midway.completed).toBe(false);
      expect(midway.progress).toBeCloseTo(0.5, 1);
      
      const complete = movementSystem.updateVault('player1', 0.5);
      expect(complete.completed).toBe(true);
    });

    test('Cannot vault non-vaultable obstacle', () => {
      const obstacle = createObstacle({ height: 1.5 }); // Too tall for vault
      
      const result = movementSystem.initiateVault('player1', obstacle, 0);
      
      expect(result).toBe(false);
    });
  });

  describe('Mantle Mechanics', () => {
    test('Mantle takes 1.0 seconds', () => {
      const obstacle = createObstacle({ height: 1.5 });
      movementSystem.registerObstacle(obstacle);
      
      movementSystem.initiateMantle('player1', obstacle, 0);
      
      const midway = movementSystem.updateMantle('player1', 0.5);
      expect(midway.completed).toBe(false);
      expect(midway.progress).toBeCloseTo(0.5, 1);
      
      const complete = movementSystem.updateMantle('player1', 1.0);
      expect(complete.completed).toBe(true);
    });

    test('Cannot mantle non-mantleable obstacle', () => {
      const obstacle = createObstacle({ height: 0.8 }); // Too short for mantle
      
      const result = movementSystem.initiateMantle('player1', obstacle, 0);
      
      expect(result).toBe(false);
    });
  });

  describe('Vulnerability', () => {
    test('Player is vulnerable during vault', () => {
      const obstacle = createObstacle({ height: 1.0 });
      movementSystem.initiateVault('player1', obstacle, 0);
      
      expect(movementSystem.isVulnerable('player1')).toBe(true);
    });

    test('Player is vulnerable during mantle', () => {
      const obstacle = createObstacle({ height: 1.5 });
      movementSystem.initiateMantle('player1', obstacle, 0);
      
      expect(movementSystem.isVulnerable('player1')).toBe(true);
    });

    test('Player is not vulnerable during slide', () => {
      const playerInfo = createPlayerInfo();
      movementSystem.initiateSlide('player1', playerInfo, 0);
      
      expect(movementSystem.isVulnerable('player1')).toBe(false);
    });

    test('Player is not vulnerable when idle', () => {
      expect(movementSystem.isVulnerable('player1')).toBe(false);
    });
  });
});
