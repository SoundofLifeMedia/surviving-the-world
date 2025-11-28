const worldStateManager = require('./worldStateManager');
const factionDiplomacy = require('./factionDiplomacy');
const npcManager = require('./npcManager');
const logger = require('./instrumentationLogger');

class EngineLoop {
  constructor() {
    this.ticks = 0;
  }

  tick(hours = 1, playerContext = { factionId: 'player' }) {
    worldStateManager.tick(hours);
    factionDiplomacy.tick(worldStateManager.state, playerContext);
    npcManager.updateNeeds(hours);
    npcManager.assignGoal(worldStateManager.state, factionDiplomacy, playerContext);

    this.ticks += 1;
    logger.log({
      type: 'engine.tick',
      tick: this.ticks,
      era: worldStateManager.state.currentEraId,
      threat: worldStateManager.state.globalThreatLevel
    });

    if (worldStateManager.state.globalThreatLevel > 0.85) {
      logger.triggerAutofix('threat', {
        threat: worldStateManager.state.globalThreatLevel,
        action: 'cooldown_world'
      });
    }

    this._checkRelations();
  }

  _checkRelations() {
    factionDiplomacy.factions?.forEach((faction) => {
      const playerRel = faction.relations?.player ?? 0;
      if (playerRel < -0.95) {
        logger.triggerAutofix('relations', {
          factionId: faction.id,
          relation: playerRel,
          action: 'temporary_ceasefire'
        });
      }
    });
  }
}

module.exports = new EngineLoop();
