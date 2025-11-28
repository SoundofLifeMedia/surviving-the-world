/**
 * Combat System
 * Handles melee/ranged combat, damage, injuries, AI behavior
 */

export interface Weapon {
  id: string;
  name: string;
  type: 'melee' | 'ranged';
  damage: number;
  attackSpeed: number;
  range: number;
}

export interface CombatEntity {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  armor: number;
  morale: number;
  faction: string;
  weapon?: Weapon;
  state: CombatState;
}

export type CombatState = 'idle' | 'aware' | 'engage' | 'flank' | 'retreat' | 'surrender';

export interface Injury {
  type: 'bleeding' | 'fracture' | 'stun' | 'limb_damage';
  severity: number;
  location: string;
  duration: number;
}

export interface CombatResult {
  hit: boolean;
  damage: number;
  stagger: boolean;
  injuries: Injury[];
  targetDied: boolean;
  attackerMoraleChange: number;
  targetMoraleChange: number;
}

export class CombatSystem {
  private entities: Map<string, CombatEntity> = new Map();

  registerEntity(entity: CombatEntity): void {
    this.entities.set(entity.id, entity);
  }

  removeEntity(entityId: string): void {
    this.entities.delete(entityId);
  }

  getEntity(entityId: string): CombatEntity | undefined {
    return this.entities.get(entityId);
  }

  attack(attackerId: string, targetId: string, attackType: 'light' | 'heavy' = 'light'): CombatResult {
    const attacker = this.entities.get(attackerId);
    const target = this.entities.get(targetId);

    if (!attacker || !target) {
      return { hit: false, damage: 0, stagger: false, injuries: [], targetDied: false, attackerMoraleChange: 0, targetMoraleChange: 0 };
    }

    // Hit chance based on attack type
    const hitChance = attackType === 'light' ? 0.8 : 0.6;
    const hit = Math.random() < hitChance;

    if (!hit) {
      return { hit: false, damage: 0, stagger: false, injuries: [], targetDied: false, attackerMoraleChange: -2, targetMoraleChange: 5 };
    }

    // Calculate damage
    const baseDamage = attacker.weapon?.damage || 10;
    const multiplier = attackType === 'heavy' ? 1.5 : 1.0;
    const armorReduction = target.armor * 0.5;
    const damage = Math.max(1, Math.floor(baseDamage * multiplier - armorReduction));

    // Apply damage
    target.health -= damage;
    const targetDied = target.health <= 0;

    // Stagger chance
    const stagger = attackType === 'heavy' && Math.random() < 0.4;

    // Injury chance
    const injuries: Injury[] = [];
    if (damage > 15 && Math.random() < 0.3) {
      injuries.push({
        type: Math.random() < 0.5 ? 'bleeding' : 'fracture',
        severity: Math.min(1, damage / 30),
        location: ['head', 'torso', 'arm', 'leg'][Math.floor(Math.random() * 4)],
        duration: 60 + Math.random() * 120
      });
    }

    // Morale changes
    const attackerMoraleChange = targetDied ? 15 : 5;
    const targetMoraleChange = targetDied ? 0 : -10 - damage * 0.5;

    attacker.morale = Math.min(100, attacker.morale + attackerMoraleChange);
    target.morale = Math.max(0, target.morale + targetMoraleChange);

    return { hit, damage, stagger, injuries, targetDied, attackerMoraleChange, targetMoraleChange };
  }

  block(defenderId: string): boolean {
    const defender = this.entities.get(defenderId);
    if (!defender) return false;
    defender.state = 'engage';
    return Math.random() < 0.7; // 70% block success
  }

  dodge(defenderId: string): boolean {
    const defender = this.entities.get(defenderId);
    if (!defender) return false;
    return Math.random() < 0.5; // 50% dodge success
  }

  updateCombatAI(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    // State transitions based on morale and health
    const healthPercent = entity.health / entity.maxHealth;

    if (entity.morale < 20 || healthPercent < 0.2) {
      entity.state = entity.morale < 10 ? 'surrender' : 'retreat';
    } else if (healthPercent < 0.5) {
      entity.state = 'flank'; // Try to get advantage
    } else {
      entity.state = 'engage';
    }
  }

  checkMorale(entityId: string): { shouldFlee: boolean; shouldSurrender: boolean } {
    const entity = this.entities.get(entityId);
    if (!entity) return { shouldFlee: false, shouldSurrender: false };
    return {
      shouldFlee: entity.morale < 25,
      shouldSurrender: entity.morale < 10
    };
  }

  getEntitiesInCombat(): CombatEntity[] {
    return Array.from(this.entities.values()).filter(e => e.state !== 'idle');
  }
}
