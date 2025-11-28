/**
 * CombatSystem Unit Tests
 * Tests damage calculation, combat mechanics
 * Requirements: 13.1, 13.2, 13.3, 13.4
 * Feature: surviving-the-world, Property 29: Damage calculation produces valid injuries
 */

import { CombatSystem, CombatEntity, Weapon } from '../src/systems/CombatSystem';
import * as fc from 'fast-check';

function createTestEntity(overrides: Partial<CombatEntity> = {}): CombatEntity {
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

function createTestWeapon(overrides: Partial<Weapon> = {}): Weapon {
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

describe('CombatSystem', () => {
  let combat: CombatSystem;

  beforeEach(() => {
    combat = new CombatSystem();
  });

  test('Register combat entities', () => {
    const entity = createTestEntity({ id: 'test1' });
    combat.registerEntity(entity);
    const retrieved = combat.getEntity('test1');
    
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe('test1');
  });

  test('Attack deals damage', () => {
    const attacker = createTestEntity({ 
      id: 'attacker',
      weapon: createTestWeapon({ damage: 30 })
    });
    const target = createTestEntity({ 
      id: 'target',
      health: 100,
      armor: 0
    });
    
    combat.registerEntity(attacker);
    combat.registerEntity(target);
    
    // Multiple attacks to ensure at least one hits
    let totalDamage = 0;
    for (let i = 0; i < 20; i++) {
      const result = combat.attack('attacker', 'target', 'light');
      if (result.hit) {
        totalDamage += result.damage;
      }
    }
    
    expect(totalDamage).toBeGreaterThan(0);
    expect(target.health).toBeLessThan(100);
  });

  test('Armor reduces damage', () => {
    const attacker = createTestEntity({ 
      id: 'attacker',
      weapon: createTestWeapon({ damage: 30 })
    });
    const targetNoArmor = createTestEntity({ 
      id: 'target1',
      health: 1000,
      armor: 0
    });
    const targetWithArmor = createTestEntity({ 
      id: 'target2',
      health: 1000,
      armor: 20
    });
    
    combat.registerEntity(attacker);
    combat.registerEntity(targetNoArmor);
    combat.registerEntity(targetWithArmor);
    
    // Force hits by running many attacks
    let damageNoArmor = 0;
    let damageWithArmor = 0;
    
    for (let i = 0; i < 50; i++) {
      const r1 = combat.attack('attacker', 'target1', 'light');
      const r2 = combat.attack('attacker', 'target2', 'light');
      if (r1.hit) damageNoArmor += r1.damage;
      if (r2.hit) damageWithArmor += r2.damage;
    }
    
    // Armor should reduce damage (if we got hits)
    if (damageNoArmor > 0 && damageWithArmor > 0) {
      expect(damageWithArmor).toBeLessThan(damageNoArmor);
    }
  });

  test('Heavy attacks deal more damage on average', () => {
    const attacker = createTestEntity({ 
      id: 'attacker',
      weapon: createTestWeapon({ damage: 20 })
    });
    const target = createTestEntity({ 
      id: 'target',
      health: 10000,
      armor: 0
    });
    
    combat.registerEntity(attacker);
    combat.registerEntity(target);
    
    let lightDamage = 0;
    let heavyDamage = 0;
    let lightHits = 0;
    let heavyHits = 0;
    
    for (let i = 0; i < 100; i++) {
      const light = combat.attack('attacker', 'target', 'light');
      const heavy = combat.attack('attacker', 'target', 'heavy');
      if (light.hit) { lightDamage += light.damage; lightHits++; }
      if (heavy.hit) { heavyDamage += heavy.damage; heavyHits++; }
    }
    
    const avgLight = lightHits > 0 ? lightDamage / lightHits : 0;
    const avgHeavy = heavyHits > 0 ? heavyDamage / heavyHits : 0;
    
    if (avgLight > 0 && avgHeavy > 0) {
      expect(avgHeavy).toBeGreaterThan(avgLight);
    }
  });

  test('Low morale triggers retreat/surrender', () => {
    const entity = createTestEntity({ 
      id: 'coward',
      morale: 5
    });
    
    combat.registerEntity(entity);
    const moraleCheck = combat.checkMorale('coward');
    
    expect(moraleCheck.shouldFlee).toBe(true);
    expect(moraleCheck.shouldSurrender).toBe(true);
  });

  test('Entity dies at 0 health', () => {
    const attacker = createTestEntity({ 
      id: 'attacker',
      weapon: createTestWeapon({ damage: 200 })
    });
    const target = createTestEntity({ 
      id: 'target',
      health: 50,
      armor: 0
    });
    
    combat.registerEntity(attacker);
    combat.registerEntity(target);
    
    // Attack until dead
    for (let i = 0; i < 20; i++) {
      const result = combat.attack('attacker', 'target', 'heavy');
      if (result.targetDied) break;
    }
    
    expect(target.health).toBeLessThanOrEqual(0);
  });

  test('Block and dodge mechanics exist', () => {
    const defender = createTestEntity({ id: 'defender' });
    combat.registerEntity(defender);
    
    // These should return boolean values
    const blockResult = combat.block('defender');
    const dodgeResult = combat.dodge('defender');
    
    expect(typeof blockResult).toBe('boolean');
    expect(typeof dodgeResult).toBe('boolean');
  });
});

describe('CombatSystem Property Tests', () => {
  /**
   * Feature: surviving-the-world, Property 29: Damage calculation produces valid injuries
   * For any damage dealt, the Combat System should calculate and apply valid injury states
   * (stagger, bleeding, limb damage) based on damage amount and type.
   * Validates: Requirements 13.3
   */
  test('Property 29: Damage produces valid injury states', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }),
        fc.integer({ min: 0, max: 30 }),
        (weaponDamage, targetArmor) => {
          const combat = new CombatSystem();
          
          const attacker = createTestEntity({
            id: 'attacker',
            weapon: createTestWeapon({ damage: weaponDamage })
          });
          const target = createTestEntity({
            id: 'target',
            health: 1000,
            armor: targetArmor
          });
          
          combat.registerEntity(attacker);
          combat.registerEntity(target);
          
          const result = combat.attack('attacker', 'target', 'heavy');
          
          // If hit, damage should be positive
          if (result.hit) {
            if (result.damage <= 0) return false;
            
            // Injuries should have valid structure
            for (const injury of result.injuries) {
              if (!['bleeding', 'fracture', 'stun', 'limb_damage'].includes(injury.type)) return false;
              if (injury.severity < 0 || injury.severity > 1) return false;
              if (injury.duration <= 0) return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Damage is always at least 1 when hit
   */
  test('Damage is always at least 1 when hit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 0, max: 100 }),
        (weaponDamage, targetArmor) => {
          const combat = new CombatSystem();
          
          const attacker = createTestEntity({
            id: 'attacker',
            weapon: createTestWeapon({ damage: weaponDamage })
          });
          const target = createTestEntity({
            id: 'target',
            health: 1000,
            armor: targetArmor
          });
          
          combat.registerEntity(attacker);
          combat.registerEntity(target);
          
          // Run multiple attacks to get hits
          for (let i = 0; i < 20; i++) {
            const result = combat.attack('attacker', 'target', 'light');
            if (result.hit && result.damage < 1) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
