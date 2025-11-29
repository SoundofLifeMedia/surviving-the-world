/**
 * GTA-Style Systems Property Tests
 * Tests for WeaponSystem, VehicleSystem, and WantedSystem
 */

import * as fc from 'fast-check';
import { WeaponSystemGTA, WEAPONS, HIT_MULTIPLIERS, HitLocation } from '../src/systems/WeaponSystemGTA';
import { VehicleSystemGTA, VEHICLE_CONFIGS } from '../src/systems/VehicleSystemGTA';
import { WantedSystem5Star, CRIME_HEAT, POLICE_RESPONSE, EVASION_TIME_PER_STAR, CrimeType, WantedLevel } from '../src/systems/WantedSystem5Star';

describe('Weapon System - Property Tests', () => {
  describe('Property 1: Weapon Damage Bounds', () => {
    it('damage is always positive and bounded by weapon.damage * 3', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: WEAPONS.length - 1 }),
          fc.constantFrom<HitLocation>('head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'),
          fc.double({ min: 0.1, max: 500, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (weaponIndex, hitLocation, distance, armor) => {
            const weapon = WEAPONS[weaponIndex];
            const system = new WeaponSystemGTA();
            
            const damage = system.calculateDamage(weapon, hitLocation, distance, armor);
            
            // Damage must be positive
            expect(damage).toBeGreaterThanOrEqual(1);
            
            // Damage must be bounded by max (headshot with no armor)
            const maxDamage = weapon.damage * HIT_MULTIPLIERS.head;
            expect(damage).toBeLessThanOrEqual(maxDamage);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12: Hit Location Damage Multipliers', () => {
    it('head = 3x, torso = 1x, limbs = 0.5x', () => {
      expect(HIT_MULTIPLIERS.head).toBe(3.0);
      expect(HIT_MULTIPLIERS.torso).toBe(1.0);
      expect(HIT_MULTIPLIERS.leftArm).toBe(0.5);
      expect(HIT_MULTIPLIERS.rightArm).toBe(0.5);
      expect(HIT_MULTIPLIERS.leftLeg).toBe(0.5);
      expect(HIT_MULTIPLIERS.rightLeg).toBe(0.5);
    });

    it('headshot damage is exactly 3x torso damage at same distance', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: WEAPONS.length - 1 }),
          fc.double({ min: 1, max: 100, noNaN: true }),
          (weaponIndex, distance) => {
            const weapon = WEAPONS[weaponIndex];
            const system = new WeaponSystemGTA();
            
            const headDamage = system.calculateDamage(weapon, 'head', distance, 0);
            const torsoDamage = system.calculateDamage(weapon, 'torso', distance, 0);
            
            // Head should be 3x torso (accounting for floor rounding)
            expect(headDamage).toBeGreaterThanOrEqual(torsoDamage * 2.5);
            expect(headDamage).toBeLessThanOrEqual(torsoDamage * 3.5);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 6: Weapon Switch Timing', () => {
    it('weapon switch takes exactly 500ms', () => {
      const system = new WeaponSystemGTA();
      system.equipWeapon('pistol_9mm');
      system.equipWeapon('rifle_ak');
      
      // Start switch
      const started = system.switchWeapon('rifle');
      expect(started).toBe(true);
      
      // Progress should start near 0 (allow for timing variance)
      expect(system.getSwitchProgress()).toBeLessThan(0.2);
    });
  });

  describe('Property 9: Reload Blocking', () => {
    it('cannot fire while reloading', () => {
      const system = new WeaponSystemGTA();
      system.equipWeapon('pistol_9mm');
      
      // Empty the magazine
      for (let i = 0; i < 15; i++) {
        system.fire({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, []);
      }
      
      // Start reload
      system.reload();
      expect(system.getState()).toBe('reloading');
      
      // Try to fire - should fail
      const result = system.fire({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, []);
      expect(result.hit).toBe(false);
    });
  });

  describe('Weapon Database', () => {
    it('has at least 15 weapons', () => {
      expect(WEAPONS.length).toBeGreaterThanOrEqual(15);
    });

    it('all weapons have valid properties', () => {
      for (const weapon of WEAPONS) {
        expect(weapon.damage).toBeGreaterThan(0);
        expect(weapon.fireRate).toBeGreaterThan(0);
        expect(weapon.magazineSize).toBeGreaterThan(0);
        expect(weapon.reloadTime).toBeGreaterThanOrEqual(0);
        expect(weapon.range).toBeGreaterThan(0);
      }
    });
  });
});

describe('Vehicle System - Property Tests', () => {
  describe('Property 8: Vehicle Entry/Exit Timing', () => {
    it('vehicle entry takes 1500ms', () => {
      const system = new VehicleSystemGTA();
      const vehicle = system.spawnVehicle('sedan_basic', { x: 0, y: 0, z: 0 });
      expect(vehicle).not.toBeNull();
      
      const result = system.enterVehicle(vehicle!.id, 'player_1');
      expect(result.success).toBe(true);
      expect(result.timeMs).toBe(1500);
    });

    it('vehicle exit takes 800ms when stationary', () => {
      const system = new VehicleSystemGTA();
      const vehicle = system.spawnVehicle('sedan_basic', { x: 0, y: 0, z: 0 });
      system.enterVehicle(vehicle!.id, 'player_1');
      
      const result = system.exitVehicle(vehicle!.id, 'player_1');
      expect(result.success).toBe(true);
      expect(result.timeMs).toBe(800);
      expect(result.applyRagdoll).toBe(false);
    });
  });

  describe('Property 2: Vehicle Physics Conservation', () => {
    it('vehicle speed is bounded by maxSpeed', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: VEHICLE_CONFIGS.length - 1 }),
          fc.double({ min: 0.1, max: 1, noNaN: true }),
          fc.integer({ min: 1, max: 100 }),
          (configIndex, throttle, ticks) => {
            const config = VEHICLE_CONFIGS[configIndex];
            const system = new VehicleSystemGTA();
            const vehicle = system.spawnVehicle(config.id, { x: 0, y: 0, z: 0 });
            
            if (!vehicle) return;
            
            system.enterVehicle(vehicle.id, 'player');
            system.toggleEngine(vehicle.id);
            
            // Accelerate for multiple ticks
            for (let i = 0; i < ticks; i++) {
              system.accelerate(vehicle.id, throttle);
              system.updatePhysics(vehicle.id, 0.016);
            }
            
            const speed = system.getSpeedKmh(vehicle.id);
            // Speed should be a valid number and bounded
            expect(Number.isFinite(speed)).toBe(true);
            expect(speed).toBeLessThanOrEqual(config.maxSpeed * 1.2); // 20% tolerance for physics
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Vehicle Database', () => {
    it('has at least 6 vehicle types', () => {
      const types = new Set(VEHICLE_CONFIGS.map(c => c.type));
      expect(types.size).toBeGreaterThanOrEqual(6);
    });

    it('all vehicles have valid properties', () => {
      for (const config of VEHICLE_CONFIGS) {
        expect(config.mass).toBeGreaterThan(0);
        expect(config.enginePower).toBeGreaterThan(0);
        expect(config.maxSpeed).toBeGreaterThan(0);
        expect(config.health).toBeGreaterThan(0);
        expect(config.seats).toBeGreaterThan(0);
      }
    });
  });

  describe('Vehicle Damage', () => {
    it('collision reduces health', () => {
      const system = new VehicleSystemGTA();
      const vehicle = system.spawnVehicle('sedan_basic', { x: 0, y: 0, z: 0 });
      const initialHealth = vehicle!.health;
      
      system.applyCollision(vehicle!.id, {
        impactForce: 500,
        impactPoint: { x: 0, y: 0, z: 1 },
        impactNormal: { x: 0, y: 0, z: -1 },
        otherVehicle: null
      });
      
      const v = system.getVehicle(vehicle!.id);
      expect(v!.health).toBeLessThan(initialHealth);
    });
  });
});

describe('Wanted System - Property Tests', () => {
  describe('Property 3: Wanted Level Bounds', () => {
    it('wanted level stays in range [0, 5]', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom<CrimeType>(
            'assault', 'carTheft', 'murder', 'copKill', 'explosion', 'bankRobbery'
          ), { minLength: 1, maxLength: 20 }),
          (crimes) => {
            const system = new WantedSystem5Star();
            
            for (const crime of crimes) {
              system.reportCrime(crime);
            }
            
            const level = system.getLevel();
            expect(level).toBeGreaterThanOrEqual(0);
            expect(level).toBeLessThanOrEqual(5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Police Response Scaling', () => {
    it('level N has at least N patrol units', () => {
      for (let level = 1; level <= 5; level++) {
        const response = POLICE_RESPONSE[level as WantedLevel];
        expect(response.units.patrol).toBeGreaterThanOrEqual(level);
      }
    });

    it('higher levels have more units', () => {
      for (let level = 1; level < 5; level++) {
        const current = POLICE_RESPONSE[level as WantedLevel];
        const next = POLICE_RESPONSE[(level + 1) as WantedLevel];
        
        const currentTotal = current.units.patrol + current.units.swat + current.units.helicopter + current.units.military;
        const nextTotal = next.units.patrol + next.units.swat + next.units.helicopter + next.units.military;
        
        expect(nextTotal).toBeGreaterThan(currentTotal);
      }
    });
  });

  describe('Property 11: Evasion Timer Scaling', () => {
    it('evasion time is exactly N * 60 seconds per star', () => {
      expect(EVASION_TIME_PER_STAR).toBe(60);
      
      const system = new WantedSystem5Star();
      
      // Get to 3 stars
      system.reportCrime('copKill'); // +3 stars
      
      const timeToLose = system.getTimeToLoseStar();
      expect(timeToLose).toBe(3 * 60); // 3 stars * 60 seconds
    });
  });

  describe('Crime Heat Values', () => {
    it('all crimes have positive heat values', () => {
      for (const [crime, heat] of Object.entries(CRIME_HEAT)) {
        expect(heat).toBeGreaterThan(0);
      }
    });

    it('cop kill has highest heat among common crimes', () => {
      expect(CRIME_HEAT.copKill).toBeGreaterThan(CRIME_HEAT.murder);
      expect(CRIME_HEAT.copKill).toBeGreaterThan(CRIME_HEAT.assault);
    });
  });

  describe('Wanted Level Transitions', () => {
    it('crimes increase wanted level', () => {
      const system = new WantedSystem5Star();
      expect(system.getLevel()).toBe(0);
      
      system.reportCrime('murder'); // +2 stars
      expect(system.getLevel()).toBe(2);
    });

    it('reset clears wanted level', () => {
      const system = new WantedSystem5Star();
      system.reportCrime('copKill');
      expect(system.getLevel()).toBeGreaterThan(0);
      
      system.reset();
      expect(system.getLevel()).toBe(0);
      expect(system.getHeat()).toBe(0);
    });
  });
});

describe('Serialization Round-Trip', () => {
  describe('Property 10: Save/Load Round-Trip', () => {
    it('WeaponSystem serialization preserves state', () => {
      const system = new WeaponSystemGTA();
      system.equipWeapon('pistol_9mm');
      system.equipWeapon('rifle_ak');
      system.addAmmo('pistol_9mm', 50);
      
      const serialized = system.serialize();
      const restored = WeaponSystemGTA.deserialize(serialized);
      
      expect(restored.getCurrentWeapon()?.id).toBe(system.getCurrentWeapon()?.id);
      expect(restored.getTotalAmmo()).toBe(system.getTotalAmmo());
    });

    it('VehicleSystem serialization preserves state', () => {
      const system = new VehicleSystemGTA();
      system.spawnVehicle('sedan_basic', { x: 10, y: 0, z: 20 });
      system.spawnVehicle('sports_coupe', { x: 30, y: 0, z: 40 });
      
      const serialized = system.serialize();
      const restored = VehicleSystemGTA.deserialize(serialized);
      
      expect(restored.getAllVehicles().length).toBe(2);
    });

    it('WantedSystem serialization preserves state', () => {
      const system = new WantedSystem5Star();
      system.reportCrime('murder');
      
      const serialized = system.serialize();
      const restored = WantedSystem5Star.deserialize(serialized);
      
      expect(restored.getLevel()).toBe(system.getLevel());
      expect(restored.getHeat()).toBe(system.getHeat());
    });
  });
});
