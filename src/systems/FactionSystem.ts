/**
 * Faction System
 * GOAP-based faction AI with diplomacy, wars, trade
 */

export interface FactionPersonality {
  aggression: number;
  riskAversion: number;
  diplomacy: number;
  honor: number;
}

export interface Faction {
  id: string;
  name: string;
  type: string;
  alignment: string;
  resources: { food: number; gold: number; manpower: number };
  attitudeToPlayer: number;
  relations: Map<string, number>;
  personality: FactionPersonality;
  goals: string[];
  atWar: string[];
  allies: string[];
}

export type GoalType = 'maintain_territory' | 'expand' | 'secure_food' | 'secure_gold' | 'suppress_revolt' | 'form_alliance' | 'declare_war';

export interface Goal {
  type: GoalType;
  priority: number;
  target?: string;
}

export interface FactionAction {
  type: 'trade' | 'diplomacy' | 'war' | 'internal';
  target?: string;
  details: Record<string, any>;
}

export class FactionSystem {
  private factions: Map<string, Faction> = new Map();

  registerFaction(faction: Faction): void {
    this.factions.set(faction.id, faction);
  }

  getFaction(factionId: string): Faction | undefined {
    return this.factions.get(factionId);
  }

  getAllFactions(): Faction[] {
    return Array.from(this.factions.values());
  }

  updateFaction(factionId: string, deltaHours: number): FactionAction[] {
    const faction = this.factions.get(factionId);
    if (!faction) return [];

    // Resource consumption
    faction.resources.food -= faction.resources.manpower * 0.1 * deltaHours;

    // Evaluate goals and plan actions
    const goals = this.evaluateGoals(faction);
    const actions = this.planActions(faction, goals);

    // Execute top priority action
    if (actions.length > 0) {
      this.executeAction(faction, actions[0]);
    }

    return actions;
  }

  evaluateGoals(faction: Faction): Goal[] {
    const goals: Goal[] = [];

    // Food security
    if (faction.resources.food < faction.resources.manpower * 10) {
      goals.push({ type: 'secure_food', priority: 0.9 });
    }

    // Gold security
    if (faction.resources.gold < 100) {
      goals.push({ type: 'secure_gold', priority: 0.6 });
    }

    // Expansion (if aggressive)
    if (faction.personality.aggression > 0.6 && faction.resources.manpower > 150) {
      goals.push({ type: 'expand', priority: faction.personality.aggression * 0.5 });
    }

    // Alliance (if diplomatic)
    if (faction.personality.diplomacy > 0.5 && faction.allies.length < 2) {
      goals.push({ type: 'form_alliance', priority: faction.personality.diplomacy * 0.4 });
    }

    // Sort by priority
    return goals.sort((a, b) => b.priority - a.priority);
  }

  planActions(faction: Faction, goals: Goal[]): FactionAction[] {
    const actions: FactionAction[] = [];

    for (const goal of goals.slice(0, 3)) {
      switch (goal.type) {
        case 'secure_food':
          actions.push({ type: 'trade', details: { resource: 'food', amount: 100 } });
          break;
        case 'form_alliance':
          const potentialAlly = this.findPotentialAlly(faction);
          if (potentialAlly) {
            actions.push({ type: 'diplomacy', target: potentialAlly.id, details: { action: 'propose_alliance' } });
          }
          break;
        case 'expand':
        case 'declare_war':
          const enemy = this.findWeakestEnemy(faction);
          if (enemy && faction.personality.aggression > 0.5) {
            actions.push({ type: 'war', target: enemy.id, details: { action: 'declare_war' } });
          }
          break;
      }
    }

    return actions;
  }

  executeAction(faction: Faction, action: FactionAction): void {
    switch (action.type) {
      case 'war':
        if (action.target && !faction.atWar.includes(action.target)) {
          faction.atWar.push(action.target);
          const target = this.factions.get(action.target);
          if (target && !target.atWar.includes(faction.id)) {
            target.atWar.push(faction.id);
          }
        }
        break;
      case 'diplomacy':
        if (action.details.action === 'propose_alliance' && action.target) {
          const target = this.factions.get(action.target);
          if (target && this.getRelation(faction.id, action.target) > 0.3) {
            faction.allies.push(action.target);
            target.allies.push(faction.id);
          }
        }
        break;
    }
  }

  updateDiplomacy(factionId: string, targetId: string, delta: number): void {
    const faction = this.factions.get(factionId);
    const target = this.factions.get(targetId);
    if (!faction || !target) return;

    const current = faction.relations.get(targetId) || 0;
    faction.relations.set(targetId, Math.max(-1, Math.min(1, current + delta)));
    target.relations.set(factionId, Math.max(-1, Math.min(1, (target.relations.get(factionId) || 0) + delta)));
  }

  getRelation(factionId: string, targetId: string): number {
    return this.factions.get(factionId)?.relations.get(targetId) || 0;
  }

  updatePlayerAttitude(factionId: string, delta: number): void {
    const faction = this.factions.get(factionId);
    if (faction) {
      faction.attitudeToPlayer = Math.max(-1, Math.min(1, faction.attitudeToPlayer + delta));
    }
  }

  private findPotentialAlly(faction: Faction): Faction | null {
    for (const other of this.factions.values()) {
      if (other.id !== faction.id && !faction.atWar.includes(other.id) && !faction.allies.includes(other.id)) {
        const relation = faction.relations.get(other.id) || 0;
        if (relation > 0.2) return other;
      }
    }
    return null;
  }

  private findWeakestEnemy(faction: Faction): Faction | null {
    let weakest: Faction | null = null;
    let lowestPower = Infinity;

    for (const other of this.factions.values()) {
      if (other.id !== faction.id && !faction.allies.includes(other.id)) {
        const relation = faction.relations.get(other.id) || 0;
        if (relation < 0) {
          const power = other.resources.manpower + other.resources.gold * 0.1;
          if (power < lowestPower) {
            lowestPower = power;
            weakest = other;
          }
        }
      }
    }
    return weakest;
  }

  serialize(): string {
    const data = Array.from(this.factions.entries()).map(([id, f]) => ({
      ...f,
      relations: Array.from(f.relations.entries())
    }));
    return JSON.stringify(data);
  }
}
