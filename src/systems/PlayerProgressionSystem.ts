/**
 * Player Progression System - RPG-lite stats from actions
 * Feature: surviving-the-world, Property 22: Stat gains from actions
 * Feature: surviving-the-world, Property 23: Unlock triggers at thresholds
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

export interface ProgressionStats {
  stamina: number;
  durability: number;
  accuracy: number;
  charisma: number;
  craftsmanship: number;
  diplomacy: number;
  willpower: number;
}

export interface StatGainConfig {
  stat: keyof ProgressionStats;
  gainPerAction?: number;
  gainPerMinute?: number;
}

export interface UnlockThreshold {
  stat: keyof ProgressionStats;
  threshold: number;
  unlockId: string;
  description: string;
}

export interface Unlock {
  id: string;
  type: 'recipe' | 'ability' | 'bonus' | 'faction';
  value: any;
  description: string;
}

export interface ProgressionBonuses {
  staminaMultiplier: number;
  hungerDecayReduction: number;
  healthRegenBonus: number;
  craftingQualityBonus: number;
  diplomacyBonus: number;
  factionRepBonus: number;
}


const DEFAULT_GAIN_RATES: Record<string, StatGainConfig> = {
  running: { stat: 'stamina', gainPerMinute: 0.1 },
  climbing: { stat: 'durability', gainPerAction: 0.05 },
  hunting: { stat: 'accuracy', gainPerAction: 0.2 },
  trading: { stat: 'charisma', gainPerAction: 0.15 },
  crafting: { stat: 'craftsmanship', gainPerAction: 0.1 },
  negotiating: { stat: 'diplomacy', gainPerAction: 0.25 },
  surviving: { stat: 'willpower', gainPerMinute: 0.02 }
};

const DEFAULT_UNLOCKS: UnlockThreshold[] = [
  { stat: 'craftsmanship', threshold: 10, unlockId: 'better_crafting', description: 'Unlock advanced recipes' },
  { stat: 'stamina', threshold: 15, unlockId: 'higher_stamina', description: '+20% max stamina' },
  { stat: 'willpower', threshold: 20, unlockId: 'lower_hunger', description: '-15% hunger decay' },
  { stat: 'durability', threshold: 12, unlockId: 'health_regen', description: '+10% health regen' },
  { stat: 'diplomacy', threshold: 15, unlockId: 'better_diplomacy', description: 'New dialogue options' },
  { stat: 'charisma', threshold: 18, unlockId: 'faction_rep', description: '+25% faction rep gains' },
  { stat: 'accuracy', threshold: 20, unlockId: 'critical_hits', description: '+10% critical hit chance' }
];

export class PlayerProgressionSystem {
  private stats: Map<string, ProgressionStats> = new Map();
  private unlocks: Map<string, Set<string>> = new Map();
  private gainRates: Record<string, StatGainConfig> = DEFAULT_GAIN_RATES;
  private unlockThresholds: UnlockThreshold[] = DEFAULT_UNLOCKS;
  private listeners: ((playerId: string, unlock: Unlock) => void)[] = [];

  initializePlayer(playerId: string): ProgressionStats {
    const stats: ProgressionStats = {
      stamina: 0,
      durability: 0,
      accuracy: 0,
      charisma: 0,
      craftsmanship: 0,
      diplomacy: 0,
      willpower: 0
    };
    this.stats.set(playerId, stats);
    this.unlocks.set(playerId, new Set());
    return stats;
  }

  getStats(playerId: string): ProgressionStats | undefined {
    return this.stats.get(playerId);
  }

  recordAction(playerId: string, actionType: string, intensity: number = 1): number {
    let stats = this.stats.get(playerId);
    if (!stats) {
      stats = this.initializePlayer(playerId);
    }

    const gainConfig = this.gainRates[actionType];
    if (!gainConfig) return 0;

    const gain = this.calculateStatGain(gainConfig, intensity);
    stats[gainConfig.stat] += gain;

    this.checkUnlocks(playerId);
    return gain;
  }

  recordTimeBasedGains(playerId: string, deltaMinutes: number): void {
    let stats = this.stats.get(playerId);
    if (!stats) return;

    for (const [action, config] of Object.entries(this.gainRates)) {
      if (config.gainPerMinute) {
        stats[config.stat] += config.gainPerMinute * deltaMinutes;
      }
    }

    this.checkUnlocks(playerId);
  }

  private calculateStatGain(config: StatGainConfig, intensity: number): number {
    if (config.gainPerAction) {
      return config.gainPerAction * intensity;
    }
    return 0;
  }

  checkUnlocks(playerId: string): Unlock[] {
    const stats = this.stats.get(playerId);
    const playerUnlocks = this.unlocks.get(playerId);
    if (!stats || !playerUnlocks) return [];

    const newUnlocks: Unlock[] = [];

    for (const threshold of this.unlockThresholds) {
      if (stats[threshold.stat] >= threshold.threshold && !playerUnlocks.has(threshold.unlockId)) {
        playerUnlocks.add(threshold.unlockId);
        
        const unlock: Unlock = {
          id: threshold.unlockId,
          type: this.getUnlockType(threshold.unlockId),
          value: this.getUnlockValue(threshold.unlockId),
          description: threshold.description
        };
        
        newUnlocks.push(unlock);
        this.notifyUnlock(playerId, unlock);
      }
    }

    return newUnlocks;
  }

  private getUnlockType(unlockId: string): Unlock['type'] {
    if (unlockId.includes('crafting') || unlockId.includes('recipe')) return 'recipe';
    if (unlockId.includes('faction')) return 'faction';
    return 'bonus';
  }

  private getUnlockValue(unlockId: string): any {
    const values: Record<string, any> = {
      better_crafting: { recipes: ['advanced_armor', 'steel_weapons'] },
      higher_stamina: { staminaMultiplier: 1.2 },
      lower_hunger: { hungerDecayReduction: 0.15 },
      health_regen: { healthRegenBonus: 0.1 },
      better_diplomacy: { dialogueOptions: ['persuade', 'intimidate'] },
      faction_rep: { factionRepBonus: 0.25 },
      critical_hits: { criticalChanceBonus: 0.1 }
    };
    return values[unlockId] || {};
  }

  hasUnlock(playerId: string, unlockId: string): boolean {
    return this.unlocks.get(playerId)?.has(unlockId) || false;
  }

  getUnlocks(playerId: string): string[] {
    return Array.from(this.unlocks.get(playerId) || []);
  }

  getProgressionBonuses(playerId: string): ProgressionBonuses {
    const playerUnlocks = this.unlocks.get(playerId) || new Set();
    
    return {
      staminaMultiplier: playerUnlocks.has('higher_stamina') ? 1.2 : 1.0,
      hungerDecayReduction: playerUnlocks.has('lower_hunger') ? 0.15 : 0,
      healthRegenBonus: playerUnlocks.has('health_regen') ? 0.1 : 0,
      craftingQualityBonus: playerUnlocks.has('better_crafting') ? 0.2 : 0,
      diplomacyBonus: playerUnlocks.has('better_diplomacy') ? 0.15 : 0,
      factionRepBonus: playerUnlocks.has('faction_rep') ? 0.25 : 0
    };
  }

  onUnlock(callback: (playerId: string, unlock: Unlock) => void): void {
    this.listeners.push(callback);
  }

  private notifyUnlock(playerId: string, unlock: Unlock): void {
    for (const listener of this.listeners) {
      listener(playerId, unlock);
    }
  }

  // Serialize for save/load
  serialize(playerId: string): string {
    return JSON.stringify({
      stats: this.stats.get(playerId),
      unlocks: Array.from(this.unlocks.get(playerId) || [])
    });
  }

  deserialize(playerId: string, json: string): void {
    const data = JSON.parse(json);
    this.stats.set(playerId, data.stats);
    this.unlocks.set(playerId, new Set(data.unlocks));
  }
}
