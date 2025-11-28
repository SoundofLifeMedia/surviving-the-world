class FactionDiplomacy {
  constructor() {
    this.factions = [];
    this.relationsLog = [];
  }

  load(factionStates) {
    this.factions = factionStates.map(state => ({
      ...state,
      relations: { ...(state.relations || {}) },
      modifiers: { ...(state.modifiers || {}) }
    }));
  }

  evaluateGoal(faction, world, playerContext = {}) {
    const goalImpact = faction.goals.reduce((acc, goal) => {
      acc += this.goalUtility(goal, faction, world, playerContext);
      return acc;
    }, 0);
    return goalImpact;
  }

  goalUtility(goal, faction, world, player) {
    const modifiers = faction.modifiers || {};
    switch (goal) {
      case 'secure_food_supply':
        return (world.resources?.food ?? 0) < 500 ? 0.3 : -0.1;
      case 'maintain_territory':
        return world.globalThreatLevel > 0.5 ? 0.4 * (faction.personality?.aggression || 0.5) : 0.1;
      default:
        return modifiers[goal] ?? 0;
    }
  }

  adjustRelations(actorId, targetId, delta, reason = 'goal') {
    const actor = this.factions.find(f => f.id === actorId);
    if (!actor) return;
    actor.relations[targetId] = Math.max(-1, Math.min(1, (actor.relations[targetId] ?? 0) + delta));
    this.relationsLog.push({
      actorId,
      targetId,
      delta,
      reason,
      time: Date.now()
    });
  }

  tick(world, playerContext) {
    this.factions.forEach((faction) => {
      const utility = this.evaluateGoal(faction, world, playerContext);
      if (utility > 0.25) {
        this.adjustRelations(faction.id, playerContext.factionId || 'player', utility * 0.1, 'goal_success');
      }
    });
  }

  getRelations(factionId) {
    const faction = this.factions.find(f => f.id === factionId);
    return faction ? { ...faction.relations } : {};
  }
}

module.exports = new FactionDiplomacy();
