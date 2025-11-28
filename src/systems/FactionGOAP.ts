/**
 * Faction GOAP (Goal-Oriented Action Planning) System
 * Advanced AI planning for faction decision-making
 * Requirements: 3.2, 3.4, 3.5
 */

import { Faction, FactionPersonality } from './FactionSystem';

// World state representation for GOAP
export interface WorldState {
  [key: string]: number | boolean | string;
}

// GOAP Action definition
export interface GOAPAction {
  name: string;
  cost: number;
  preconditions: WorldState;
  effects: WorldState;
  execute: (faction: Faction, target?: string) => ActionResult;
}

export interface ActionResult {
  success: boolean;
  message: string;
  stateChanges: WorldState;
}

// Goal definition
export interface GOAPGoal {
  name: string;
  priority: number;
  desiredState: WorldState;
  isAchieved: (currentState: WorldState) => boolean;
}

// Plan node for A* search
interface PlanNode {
  state: WorldState;
  action: GOAPAction | null;
  parent: PlanNode | null;
  gCost: number; // Cost from start
  hCost: number; // Heuristic cost to goal
  fCost: number; // Total cost
}

export class FactionGOAP {
  private actions: Map<string, GOAPAction> = new Map();
  private goals: Map<string, GOAPGoal> = new Map();

  constructor() {
    this.registerDefaultActions();
    this.registerDefaultGoals();
  }

  private registerDefaultActions(): void {
    // Resource gathering actions
    this.registerAction({
      name: 'gather_food',
      cost: 10,
      preconditions: { hasManpower: true },
      effects: { foodSecure: true, food: 100 },
      execute: (faction) => {
        faction.resources.food += 50;
        return { success: true, message: 'Gathered food', stateChanges: { food: 50 } };
      }
    });

    this.registerAction({
      name: 'collect_taxes',
      cost: 5,
      preconditions: { hasTerritory: true },
      effects: { goldSecure: true, gold: 50 },
      execute: (faction) => {
        faction.resources.gold += 30;
        return { success: true, message: 'Collected taxes', stateChanges: { gold: 30 } };
      }
    });


    this.registerAction({
      name: 'recruit_soldiers',
      cost: 20,
      preconditions: { goldSecure: true, gold: 50 },
      effects: { hasArmy: true, manpower: 20 },
      execute: (faction) => {
        if (faction.resources.gold >= 50) {
          faction.resources.gold -= 50;
          faction.resources.manpower += 20;
          return { success: true, message: 'Recruited soldiers', stateChanges: { manpower: 20 } };
        }
        return { success: false, message: 'Insufficient gold', stateChanges: {} };
      }
    });

    // Diplomatic actions
    this.registerAction({
      name: 'propose_alliance',
      cost: 5,
      preconditions: { hasPotentialAlly: true },
      effects: { hasAlliance: true },
      execute: (faction, target) => {
        if (target) {
          faction.allies.push(target);
          return { success: true, message: `Proposed alliance with ${target}`, stateChanges: { hasAlliance: true } };
        }
        return { success: false, message: 'No target specified', stateChanges: {} };
      }
    });

    this.registerAction({
      name: 'improve_relations',
      cost: 15,
      preconditions: { gold: 20 },
      effects: { relationImproved: true },
      execute: (faction, target) => {
        if (target && faction.resources.gold >= 20) {
          faction.resources.gold -= 20;
          const current = faction.relations.get(target) || 0;
          faction.relations.set(target, Math.min(1, current + 0.1));
          return { success: true, message: `Improved relations with ${target}`, stateChanges: { relationImproved: true } };
        }
        return { success: false, message: 'Failed to improve relations', stateChanges: {} };
      }
    });

    this.registerAction({
      name: 'send_tribute',
      cost: 25,
      preconditions: { gold: 100 },
      effects: { tributePaid: true, relationImproved: true },
      execute: (faction, target) => {
        if (target && faction.resources.gold >= 100) {
          faction.resources.gold -= 100;
          const current = faction.relations.get(target) || 0;
          faction.relations.set(target, Math.min(1, current + 0.3));
          return { success: true, message: `Sent tribute to ${target}`, stateChanges: { tributePaid: true } };
        }
        return { success: false, message: 'Insufficient gold for tribute', stateChanges: {} };
      }
    });

    // Military actions
    this.registerAction({
      name: 'declare_war',
      cost: 30,
      preconditions: { hasArmy: true, manpower: 50 },
      effects: { atWar: true },
      execute: (faction, target) => {
        if (target && !faction.atWar.includes(target)) {
          faction.atWar.push(target);
          return { success: true, message: `Declared war on ${target}`, stateChanges: { atWar: true } };
        }
        return { success: false, message: 'Cannot declare war', stateChanges: {} };
      }
    });

    this.registerAction({
      name: 'raid_territory',
      cost: 15,
      preconditions: { atWar: true, manpower: 30 },
      effects: { raidComplete: true, gold: 40 },
      execute: (faction) => {
        faction.resources.gold += 40;
        faction.resources.manpower -= 5; // Casualties
        return { success: true, message: 'Raid successful', stateChanges: { gold: 40 } };
      }
    });

    this.registerAction({
      name: 'siege_settlement',
      cost: 50,
      preconditions: { atWar: true, manpower: 100, foodSecure: true },
      effects: { territoryGained: true },
      execute: (faction) => {
        faction.resources.manpower -= 20; // Casualties
        return { success: true, message: 'Siege successful', stateChanges: { territoryGained: true } };
      }
    });

    this.registerAction({
      name: 'negotiate_peace',
      cost: 10,
      preconditions: { atWar: true },
      effects: { atPeace: true },
      execute: (faction, target) => {
        if (target) {
          const idx = faction.atWar.indexOf(target);
          if (idx >= 0) faction.atWar.splice(idx, 1);
          return { success: true, message: `Negotiated peace with ${target}`, stateChanges: { atPeace: true } };
        }
        return { success: false, message: 'No target for peace', stateChanges: {} };
      }
    });

    // Internal actions
    this.registerAction({
      name: 'suppress_unrest',
      cost: 20,
      preconditions: { hasUnrest: true, manpower: 20 },
      effects: { unrestSuppressed: true },
      execute: (faction) => {
        faction.resources.manpower -= 5;
        return { success: true, message: 'Unrest suppressed', stateChanges: { unrestSuppressed: true } };
      }
    });

    this.registerAction({
      name: 'fortify_defenses',
      cost: 30,
      preconditions: { gold: 50, manpower: 30 },
      effects: { fortified: true },
      execute: (faction) => {
        faction.resources.gold -= 50;
        return { success: true, message: 'Defenses fortified', stateChanges: { fortified: true } };
      }
    });
  }


  private registerDefaultGoals(): void {
    this.registerGoal({
      name: 'survive',
      priority: 1.0,
      desiredState: { foodSecure: true, goldSecure: true },
      isAchieved: (state) => state.foodSecure === true && state.goldSecure === true
    });

    this.registerGoal({
      name: 'expand_territory',
      priority: 0.6,
      desiredState: { territoryGained: true },
      isAchieved: (state) => state.territoryGained === true
    });

    this.registerGoal({
      name: 'build_army',
      priority: 0.7,
      desiredState: { hasArmy: true, manpower: 100 },
      isAchieved: (state) => state.hasArmy === true && (state.manpower as number) >= 100
    });

    this.registerGoal({
      name: 'secure_alliances',
      priority: 0.5,
      desiredState: { hasAlliance: true },
      isAchieved: (state) => state.hasAlliance === true
    });

    this.registerGoal({
      name: 'maintain_peace',
      priority: 0.4,
      desiredState: { atPeace: true },
      isAchieved: (state) => state.atPeace === true
    });

    this.registerGoal({
      name: 'suppress_revolt',
      priority: 0.9,
      desiredState: { unrestSuppressed: true },
      isAchieved: (state) => state.unrestSuppressed === true
    });
  }

  registerAction(action: GOAPAction): void {
    this.actions.set(action.name, action);
  }

  registerGoal(goal: GOAPGoal): void {
    this.goals.set(goal.name, goal);
  }

  // Build world state from faction
  buildWorldState(faction: Faction): WorldState {
    return {
      food: faction.resources.food,
      gold: faction.resources.gold,
      manpower: faction.resources.manpower,
      foodSecure: faction.resources.food > faction.resources.manpower * 5,
      goldSecure: faction.resources.gold > 50,
      hasManpower: faction.resources.manpower > 10,
      hasArmy: faction.resources.manpower > 50,
      hasTerritory: true, // Assume all factions have territory
      atWar: faction.atWar.length > 0,
      atPeace: faction.atWar.length === 0,
      hasAlliance: faction.allies.length > 0,
      hasPotentialAlly: true, // Simplified
      hasUnrest: faction.resources.food < faction.resources.manpower * 2,
      fortified: false
    };
  }

  // Evaluate goals based on faction personality and state
  evaluateGoals(faction: Faction): GOAPGoal[] {
    const currentState = this.buildWorldState(faction);
    const evaluatedGoals: GOAPGoal[] = [];

    for (const goal of this.goals.values()) {
      if (goal.isAchieved(currentState)) continue;

      // Adjust priority based on personality
      let adjustedPriority = goal.priority;

      switch (goal.name) {
        case 'expand_territory':
          adjustedPriority *= faction.personality.aggression;
          break;
        case 'secure_alliances':
          adjustedPriority *= faction.personality.diplomacy;
          break;
        case 'maintain_peace':
          adjustedPriority *= faction.personality.riskAversion;
          break;
        case 'build_army':
          adjustedPriority *= (1 - faction.personality.riskAversion) * 0.5 + 0.5;
          break;
      }

      // Urgency adjustments
      if (goal.name === 'survive' && !currentState.foodSecure) {
        adjustedPriority = 1.0; // Maximum priority
      }
      if (goal.name === 'suppress_revolt' && currentState.hasUnrest) {
        adjustedPriority = 0.95;
      }

      evaluatedGoals.push({ ...goal, priority: adjustedPriority });
    }

    return evaluatedGoals.sort((a, b) => b.priority - a.priority);
  }


  // A* planning algorithm
  planActions(faction: Faction, goal: GOAPGoal): GOAPAction[] {
    const startState = this.buildWorldState(faction);
    
    if (goal.isAchieved(startState)) return [];

    const openSet: PlanNode[] = [];
    const closedSet: Set<string> = new Set();

    const startNode: PlanNode = {
      state: startState,
      action: null,
      parent: null,
      gCost: 0,
      hCost: this.heuristic(startState, goal.desiredState),
      fCost: 0
    };
    startNode.fCost = startNode.gCost + startNode.hCost;
    openSet.push(startNode);

    let iterations = 0;
    const maxIterations = 1000;

    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;

      // Get node with lowest fCost
      openSet.sort((a, b) => a.fCost - b.fCost);
      const current = openSet.shift()!;

      // Check if goal achieved
      if (goal.isAchieved(current.state)) {
        return this.reconstructPlan(current);
      }

      const stateKey = JSON.stringify(current.state);
      if (closedSet.has(stateKey)) continue;
      closedSet.add(stateKey);

      // Expand neighbors (applicable actions)
      for (const action of this.actions.values()) {
        if (!this.meetsPreconditons(current.state, action.preconditions)) continue;

        const newState = this.applyEffects(current.state, action.effects);
        const newStateKey = JSON.stringify(newState);
        if (closedSet.has(newStateKey)) continue;

        const gCost = current.gCost + action.cost;
        const hCost = this.heuristic(newState, goal.desiredState);

        const newNode: PlanNode = {
          state: newState,
          action,
          parent: current,
          gCost,
          hCost,
          fCost: gCost + hCost
        };

        openSet.push(newNode);
      }
    }

    return []; // No plan found
  }

  private meetsPreconditons(state: WorldState, preconditions: WorldState): boolean {
    for (const [key, value] of Object.entries(preconditions)) {
      if (typeof value === 'number') {
        if ((state[key] as number || 0) < value) return false;
      } else if (state[key] !== value) {
        return false;
      }
    }
    return true;
  }

  private applyEffects(state: WorldState, effects: WorldState): WorldState {
    const newState = { ...state };
    for (const [key, value] of Object.entries(effects)) {
      if (typeof value === 'number' && typeof newState[key] === 'number') {
        newState[key] = (newState[key] as number) + value;
      } else {
        newState[key] = value;
      }
    }
    return newState;
  }

  private heuristic(current: WorldState, desired: WorldState): number {
    let distance = 0;
    for (const [key, value] of Object.entries(desired)) {
      if (current[key] !== value) {
        if (typeof value === 'number') {
          distance += Math.abs((current[key] as number || 0) - value);
        } else {
          distance += 10; // Boolean mismatch penalty
        }
      }
    }
    return distance;
  }

  private reconstructPlan(node: PlanNode): GOAPAction[] {
    const plan: GOAPAction[] = [];
    let current: PlanNode | null = node;

    while (current && current.action) {
      plan.unshift(current.action);
      current = current.parent;
    }

    return plan;
  }

  // Execute a plan
  executePlan(faction: Faction, plan: GOAPAction[], target?: string): ActionResult[] {
    const results: ActionResult[] = [];

    for (const action of plan) {
      const result = action.execute(faction, target);
      results.push(result);

      if (!result.success) break; // Stop on failure
    }

    return results;
  }

  // High-level update function
  update(faction: Faction): { goal: GOAPGoal | null; plan: GOAPAction[]; results: ActionResult[] } {
    const goals = this.evaluateGoals(faction);
    
    if (goals.length === 0) {
      return { goal: null, plan: [], results: [] };
    }

    // Try to plan for highest priority goal
    for (const goal of goals) {
      const plan = this.planActions(faction, goal);
      if (plan.length > 0) {
        // Execute first action only (incremental execution)
        const results = this.executePlan(faction, [plan[0]]);
        return { goal, plan, results };
      }
    }

    return { goal: goals[0], plan: [], results: [] };
  }

  // React to player actions
  reactToPlayerAction(
    faction: Faction,
    action: 'attack' | 'trade' | 'help' | 'steal' | 'diplomacy',
    magnitude: number
  ): void {
    const attitudeChange = {
      attack: -0.3,
      trade: 0.1,
      help: 0.2,
      steal: -0.2,
      diplomacy: 0.05
    }[action] * magnitude;

    faction.attitudeToPlayer = Math.max(-1, Math.min(1, faction.attitudeToPlayer + attitudeChange));

    // Personality-based reactions
    if (action === 'attack' && faction.personality.aggression > 0.6) {
      // Aggressive factions may declare war
      if (!faction.atWar.includes('player')) {
        faction.atWar.push('player');
      }
    }

    if (action === 'help' && faction.personality.honor > 0.5) {
      // Honorable factions remember help
      faction.attitudeToPlayer += 0.1;
    }
  }

  // Get available actions for a faction
  getAvailableActions(faction: Faction): GOAPAction[] {
    const state = this.buildWorldState(faction);
    return Array.from(this.actions.values()).filter(
      action => this.meetsPreconditons(state, action.preconditions)
    );
  }
}
