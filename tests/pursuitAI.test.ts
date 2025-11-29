/**
 * PursuitAI Unit Tests
 * Feature: enterprise-100-percent
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4
 */

import { PursuitAI, PursuitConfig } from '../src/systems/PursuitAI';

describe('PursuitAI', () => {
  let pursuitAI: PursuitAI;
  const playerPosition = { x: 0, y: 0, z: 0 };

  beforeEach(() => {
    pursuitAI = new PursuitAI();
  });

  describe('Pursuit Escalation', () => {
    test('No pursuit at wanted level 1', () => {
      pursuitAI.updateForWantedLevel(1, playerPosition);
      
      expect(pursuitAI.getActiveVehicleCount()).toBe(0);
    });

    test('Pursuit vehicles spawn at wanted level 2', () => {
      pursuitAI.updateForWantedLevel(2, playerPosition);
      
      expect(pursuitAI.getActiveVehicleCount()).toBeGreaterThan(0);
    });

    test('Roadblocks spawn at wanted level 3', () => {
      pursuitAI.updateForWantedLevel(3, playerPosition);
      
      const state = pursuitAI.getPursuitState();
      expect(state.roadblocks.length).toBeGreaterThan(0);
    });

    test('Helicopter spawns at wanted level 4', () => {
      pursuitAI.updateForWantedLevel(4, playerPosition);
      
      const state = pursuitAI.getPursuitState();
      expect(state.helicopterActive).toBe(true);
    });

    test('Vehicle count increases with wanted level', () => {
      pursuitAI.updateForWantedLevel(2, playerPosition);
      const level2Count = pursuitAI.getActiveVehicleCount();
      
      pursuitAI.updateForWantedLevel(4, playerPosition);
      const level4Count = pursuitAI.getActiveVehicleCount();
      
      expect(level4Count).toBeGreaterThan(level2Count);
    });
  });

  describe('PIT Maneuver', () => {
    test('PIT attempted when within 5 meters', () => {
      pursuitAI.updateForWantedLevel(2, playerPosition);
      const state = pursuitAI.getPursuitState();
      const vehicle = state.activeVehicles[0];
      
      // Move vehicle close to player
      vehicle.position = { x: 3, y: 0, z: 0 };
      
      const canPIT = pursuitAI.canAttemptPIT(vehicle.id, playerPosition);
      expect(canPIT).toBe(true);
    });

    test('PIT not attempted when beyond 5 meters', () => {
      pursuitAI.updateForWantedLevel(2, playerPosition);
      const state = pursuitAI.getPursuitState();
      const vehicle = state.activeVehicles[0];
      
      // Vehicle is far from player
      vehicle.position = { x: 100, y: 0, z: 0 };
      
      const canPIT = pursuitAI.canAttemptPIT(vehicle.id, playerPosition);
      expect(canPIT).toBe(false);
    });

    test('Helicopter cannot attempt PIT', () => {
      pursuitAI.updateForWantedLevel(4, playerPosition);
      const state = pursuitAI.getPursuitState();
      const helicopter = state.activeVehicles.find(v => v.type === 'helicopter');
      
      if (helicopter) {
        helicopter.position = { x: 3, y: 0, z: 0 };
        const canPIT = pursuitAI.canAttemptPIT(helicopter.id, playerPosition);
        expect(canPIT).toBe(false);
      }
    });
  });

  describe('LOS Break and Search', () => {
    test('Search mode activates after 10 seconds LOS break', () => {
      pursuitAI.updateForWantedLevel(3, playerPosition);
      pursuitAI.setPlayerTracked(false);
      
      // Simulate 10 seconds of LOS break
      pursuitAI.handleLOSBreak(10);
      
      const state = pursuitAI.getPursuitState();
      expect(state.isSearching).toBe(true);
    });

    test('Vehicles switch to search state', () => {
      pursuitAI.updateForWantedLevel(3, playerPosition);
      pursuitAI.setPlayerTracked(false);
      pursuitAI.handleLOSBreak(10);
      
      const state = pursuitAI.getPursuitState();
      const searchingVehicles = state.activeVehicles.filter(v => v.state === 'searching');
      expect(searchingVehicles.length).toBeGreaterThan(0);
    });

    test('Search timer resets when player tracked', () => {
      pursuitAI.updateForWantedLevel(3, playerPosition);
      pursuitAI.setPlayerTracked(false);
      pursuitAI.handleLOSBreak(5);
      
      pursuitAI.setPlayerTracked(true, playerPosition);
      pursuitAI.handleLOSBreak(0);
      
      const state = pursuitAI.getPursuitState();
      expect(state.searchTimer).toBe(0);
      expect(state.isSearching).toBe(false);
    });
  });

  describe('Helicopter Tracking', () => {
    test('Helicopter tracks player position', () => {
      pursuitAI.updateForWantedLevel(4, playerPosition);
      
      const newPosition = { x: 50, y: 0, z: 50 };
      pursuitAI.updateHelicopterTracking(newPosition, false);
      
      const state = pursuitAI.getPursuitState();
      expect(state.lastKnownPlayerPosition).toEqual(newPosition);
      expect(state.playerTracked).toBe(true);
    });

    test('Helicopter loses tracking in covered area', () => {
      pursuitAI.updateForWantedLevel(4, playerPosition);
      
      pursuitAI.updateHelicopterTracking(playerPosition, true); // In tunnel
      
      const state = pursuitAI.getPursuitState();
      expect(state.playerTracked).toBe(false);
    });

    test('Helicopter regains tracking when player exits covered area', () => {
      pursuitAI.updateForWantedLevel(4, playerPosition);
      pursuitAI.updateHelicopterTracking(playerPosition, true); // Enter tunnel
      pursuitAI.updateHelicopterTracking(playerPosition, false); // Exit tunnel
      
      const state = pursuitAI.getPursuitState();
      expect(state.playerTracked).toBe(true);
    });
  });

  describe('Vehicle Damage and Retreat', () => {
    test('Helicopter retreats at low health', () => {
      pursuitAI.updateForWantedLevel(4, playerPosition);
      const state = pursuitAI.getPursuitState();
      const helicopterId = state.helicopterId;
      
      if (helicopterId) {
        // Damage helicopter to below 30% health
        pursuitAI.damageVehicle(helicopterId, 150);
        
        const newState = pursuitAI.getPursuitState();
        expect(newState.helicopterActive).toBe(false);
      }
    });

    test('Vehicle destroyed at 0 health', () => {
      pursuitAI.updateForWantedLevel(2, playerPosition);
      const state = pursuitAI.getPursuitState();
      const vehicle = state.activeVehicles[0];
      const initialCount = state.activeVehicles.length;
      
      pursuitAI.damageVehicle(vehicle.id, 200);
      
      const newState = pursuitAI.getPursuitState();
      expect(newState.activeVehicles.length).toBe(initialCount - 1);
    });
  });

  describe('Player Vehicle Disabled', () => {
    test('Officers exit vehicles when player vehicle disabled', () => {
      pursuitAI.updateForWantedLevel(3, playerPosition);
      
      pursuitAI.handlePlayerVehicleDisabled();
      
      const state = pursuitAI.getPursuitState();
      const onFootVehicles = state.activeVehicles.filter(v => v.state === 'on_foot');
      expect(onFootVehicles.length).toBeGreaterThan(0);
    });
  });

  describe('Clear Pursuit', () => {
    test('Clearing pursuit removes all vehicles', () => {
      pursuitAI.updateForWantedLevel(5, playerPosition);
      
      pursuitAI.clearAllPursuit();
      
      const state = pursuitAI.getPursuitState();
      expect(state.activeVehicles.length).toBe(0);
      expect(state.roadblocks.length).toBe(0);
      expect(state.helicopterActive).toBe(false);
    });
  });
});
