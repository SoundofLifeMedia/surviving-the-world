/**
 * Condition System
 * Unified system for all periodic effects (weather, disease, buffs, debuffs)
 */

export interface Effect {
  stat: string;
  value: number;
  type: 'add' | 'multiply' | 'set';
}

export interface Condition {
  id: string;
  name: string;
  type: 'buff' | 'debuff' | 'environmental' | 'disease' | 'injury';
  duration: number; // seconds, -1 = permanent
  tickRate: number; // seconds between ticks
  effects: Effect[];
  stackable: boolean;
  maxStacks: number;
  currentStacks: number;
  lastTick: number;
}

export interface ConditionTarget {
  id: string;
  conditions: Map<string, Condition>;
}

export class ConditionSystem {
  private targets: Map<string, ConditionTarget> = new Map();
  private conditionTemplates: Map<string, Omit<Condition, 'lastTick' | 'currentStacks'>> = new Map();

  constructor() {
    this.registerDefaultConditions();
  }

  private registerDefaultConditions(): void {
    const defaults: Array<Omit<Condition, 'lastTick' | 'currentStacks'>> = [
      { id: 'cold', name: 'Cold', type: 'environmental', duration: -1, tickRate: 60, effects: [{ stat: 'bodyTemperature', value: -0.5, type: 'add' }], stackable: false, maxStacks: 1 },
      { id: 'heat', name: 'Heat', type: 'environmental', duration: -1, tickRate: 60, effects: [{ stat: 'bodyTemperature', value: 0.5, type: 'add' }, { stat: 'thirst', value: -5, type: 'add' }], stackable: false, maxStacks: 1 },
      { id: 'wet', name: 'Wet', type: 'environmental', duration: 3600, tickRate: 60, effects: [{ stat: 'bodyTemperature', value: -0.3, type: 'add' }], stackable: false, maxStacks: 1 },
      { id: 'bleeding', name: 'Bleeding', type: 'injury', duration: 300, tickRate: 10, effects: [{ stat: 'health', value: -2, type: 'add' }], stackable: true, maxStacks: 3 },
      { id: 'infected', name: 'Infected', type: 'disease', duration: 7200, tickRate: 60, effects: [{ stat: 'infection', value: 1, type: 'add' }, { stat: 'health', value: -0.5, type: 'add' }], stackable: false, maxStacks: 1 },
      { id: 'plague', name: 'Plague', type: 'disease', duration: 14400, tickRate: 30, effects: [{ stat: 'health', value: -3, type: 'add' }, { stat: 'stamina', value: -5, type: 'add' }], stackable: false, maxStacks: 1 },
      { id: 'well_fed', name: 'Well Fed', type: 'buff', duration: 3600, tickRate: 300, effects: [{ stat: 'stamina', value: 5, type: 'add' }, { stat: 'morale', value: 2, type: 'add' }], stackable: false, maxStacks: 1 },
      { id: 'rested', name: 'Rested', type: 'buff', duration: 7200, tickRate: 600, effects: [{ stat: 'stamina', value: 1.2, type: 'multiply' }], stackable: false, maxStacks: 1 },
      { id: 'exhausted', name: 'Exhausted', type: 'debuff', duration: 3600, tickRate: 60, effects: [{ stat: 'stamina', value: 0.5, type: 'multiply' }, { stat: 'morale', value: -1, type: 'add' }], stackable: false, maxStacks: 1 },
      { id: 'sheltered', name: 'Sheltered', type: 'buff', duration: -1, tickRate: 60, effects: [{ stat: 'bodyTemperature', value: 37, type: 'set' }], stackable: false, maxStacks: 1 }
    ];
    defaults.forEach(c => this.conditionTemplates.set(c.id, c));
  }

  registerTarget(targetId: string): void {
    if (!this.targets.has(targetId)) {
      this.targets.set(targetId, { id: targetId, conditions: new Map() });
    }
  }

  applyCondition(targetId: string, conditionId: string): boolean {
    const template = this.conditionTemplates.get(conditionId);
    if (!template) return false;

    let target = this.targets.get(targetId);
    if (!target) {
      this.registerTarget(targetId);
      target = this.targets.get(targetId)!;
    }

    const existing = target.conditions.get(conditionId);
    if (existing) {
      if (template.stackable && existing.currentStacks < template.maxStacks) {
        existing.currentStacks++;
        existing.duration = template.duration;
        return true;
      } else if (!template.stackable) {
        existing.duration = template.duration;
        return true;
      }
      return false;
    }

    const condition: Condition = { ...template, lastTick: Date.now(), currentStacks: 1 };
    target.conditions.set(conditionId, condition);
    return true;
  }

  removeCondition(targetId: string, conditionId: string): boolean {
    const target = this.targets.get(targetId);
    if (!target) return false;
    return target.conditions.delete(conditionId);
  }

  updateConditions(deltaSeconds: number): Map<string, Effect[]> {
    const appliedEffects: Map<string, Effect[]> = new Map();
    const now = Date.now();

    for (const [targetId, target] of this.targets) {
      const effects: Effect[] = [];
      const toRemove: string[] = [];

      for (const [conditionId, condition] of target.conditions) {
        // Update duration
        if (condition.duration > 0) {
          condition.duration -= deltaSeconds;
          if (condition.duration <= 0) {
            toRemove.push(conditionId);
            continue;
          }
        }

        // Check if tick should occur
        const timeSinceLastTick = (now - condition.lastTick) / 1000;
        if (timeSinceLastTick >= condition.tickRate) {
          condition.lastTick = now;
          for (const effect of condition.effects) {
            const scaledEffect = { ...effect, value: effect.value * condition.currentStacks };
            effects.push(scaledEffect);
          }
        }
      }

      toRemove.forEach(id => target.conditions.delete(id));
      if (effects.length > 0) appliedEffects.set(targetId, effects);
    }

    return appliedEffects;
  }

  getActiveConditions(targetId: string): Condition[] {
    return Array.from(this.targets.get(targetId)?.conditions.values() || []);
  }

  calculateModifiers(targetId: string): Map<string, number> {
    const modifiers: Map<string, number> = new Map();
    const target = this.targets.get(targetId);
    if (!target) return modifiers;

    for (const condition of target.conditions.values()) {
      for (const effect of condition.effects) {
        const current = modifiers.get(effect.stat) || (effect.type === 'multiply' ? 1 : 0);
        if (effect.type === 'add') modifiers.set(effect.stat, current + effect.value * condition.currentStacks);
        else if (effect.type === 'multiply') modifiers.set(effect.stat, current * effect.value);
      }
    }
    return modifiers;
  }

  hasCondition(targetId: string, conditionId: string): boolean {
    return this.targets.get(targetId)?.conditions.has(conditionId) || false;
  }

  serialize(): string {
    const data = Array.from(this.targets.entries()).map(([id, t]) => ({
      id,
      conditions: Array.from(t.conditions.entries())
    }));
    return JSON.stringify(data);
  }
}
