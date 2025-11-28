/**
 * Player System
 * Manages player stats, needs, decay, thresholds, and modifiers
 */

export interface PlayerStats {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  hunger: number; // 0-100, 100 = full
  thirst: number; // 0-100, 100 = full
  bodyTemperature: number; // Celsius, ideal 36-38
  infection: number; // 0-100, 0 = healthy
  morale: number; // 0-100
}

export interface StatModifier {
  id: string;
  stat: keyof PlayerStats;
  value: number;
  type: 'add' | 'multiply';
  duration: number; // seconds, -1 = permanent
}

export interface DecayConfig {
  hunger: number; // per hour
  thirst: number;
  stamina: number;
  morale: number;
}

export interface ThresholdEvent {
  stat: string;
  threshold: 'critical' | 'low' | 'normal';
  value: number;
}

const DEFAULT_DECAY: DecayConfig = { hunger: 4, thirst: 6, stamina: 2, morale: 1 };

export class PlayerSystem {
  private stats: PlayerStats;
  private modifiers: StatModifier[] = [];
  private decayConfig: DecayConfig;

  constructor(decayConfig: DecayConfig = DEFAULT_DECAY) {
    this.stats = {
      health: 100, maxHealth: 100,
      stamina: 100, maxStamina: 100,
      hunger: 80, thirst: 80,
      bodyTemperature: 37, infection: 0, morale: 70
    };
    this.decayConfig = decayConfig;
  }

  getStats(): PlayerStats { return { ...this.stats }; }
  getStat(stat: keyof PlayerStats): number { return this.stats[stat]; }

  updateStats(deltaHours: number): void {
    // Apply decay
    this.stats.hunger = Math.max(0, this.stats.hunger - this.decayConfig.hunger * deltaHours);
    this.stats.thirst = Math.max(0, this.stats.thirst - this.decayConfig.thirst * deltaHours);
    this.stats.stamina = Math.max(0, this.stats.stamina - this.decayConfig.stamina * deltaHours);
    this.stats.morale = Math.max(0, this.stats.morale - this.decayConfig.morale * deltaHours);

    // Threshold penalties
    if (this.stats.hunger <= 0) this.stats.health -= 5 * deltaHours;
    if (this.stats.thirst <= 0) this.stats.health -= 8 * deltaHours;
    if (this.stats.bodyTemperature < 35 || this.stats.bodyTemperature > 39) this.stats.health -= 3 * deltaHours;
    if (this.stats.infection > 50) this.stats.health -= this.stats.infection * 0.1 * deltaHours;

    // Clamp values
    this.stats.health = Math.max(0, Math.min(this.stats.maxHealth, this.stats.health));
    this.stats.stamina = Math.max(0, Math.min(this.stats.maxStamina, this.stats.stamina));

    // Update modifier durations
    this.modifiers = this.modifiers.filter(m => {
      if (m.duration === -1) return true;
      m.duration -= deltaHours * 3600;
      return m.duration > 0;
    });
  }

  modifyStat(stat: keyof PlayerStats, delta: number): void {
    (this.stats[stat] as number) += delta;
    this.clampStat(stat);
  }

  setStat(stat: keyof PlayerStats, value: number): void {
    (this.stats[stat] as number) = value;
    this.clampStat(stat);
  }

  private clampStat(stat: keyof PlayerStats): void {
    const max = stat === 'health' ? this.stats.maxHealth : stat === 'stamina' ? this.stats.maxStamina : 100;
    (this.stats[stat] as number) = Math.max(0, Math.min(max, this.stats[stat] as number));
  }

  applyModifier(modifier: StatModifier): void {
    this.modifiers.push(modifier);
    if (modifier.type === 'add') this.modifyStat(modifier.stat, modifier.value);
    else (this.stats[modifier.stat] as number) *= modifier.value;
  }

  removeModifier(modifierId: string): void {
    const idx = this.modifiers.findIndex(m => m.id === modifierId);
    if (idx !== -1) {
      const m = this.modifiers[idx];
      if (m.type === 'add') this.modifyStat(m.stat, -m.value);
      else (this.stats[m.stat] as number) /= m.value;
      this.modifiers.splice(idx, 1);
    }
  }

  checkThresholds(): ThresholdEvent[] {
    const events: ThresholdEvent[] = [];
    const check = (stat: string, value: number, critThresh: number, lowThresh: number) => {
      if (value <= critThresh) events.push({ stat, threshold: 'critical', value });
      else if (value <= lowThresh) events.push({ stat, threshold: 'low', value });
    };
    check('health', this.stats.health, 20, 50);
    check('hunger', this.stats.hunger, 10, 30);
    check('thirst', this.stats.thirst, 10, 30);
    check('stamina', this.stats.stamina, 10, 30);
    check('morale', this.stats.morale, 15, 40);
    return events;
  }

  isAlive(): boolean { return this.stats.health > 0; }

  serialize(): string { return JSON.stringify({ stats: this.stats, modifiers: this.modifiers }); }

  static deserialize(json: string): PlayerSystem {
    const data = JSON.parse(json);
    const system = new PlayerSystem();
    system.stats = data.stats;
    system.modifiers = data.modifiers;
    return system;
  }
}
