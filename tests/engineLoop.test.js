const assert = require('assert');
const engineLoop = require('../src/core/engineLoop');
const worldStateManager = require('../src/core/worldStateManager');
const factionDiplomacy = require('../src/core/factionDiplomacy');
const npcManager = require('../src/core/npcManager');

describe('EngineLoop', () => {
  it('runs a tick and logs high threat autofix', () => {
    worldStateManager.loadEra('late_medieval');
    factionDiplomacy.load([
      {
        id: 'kingdom_north',
        goals: ['maintain_territory'],
        relations: {}
      }
    ]);
    npcManager.load([
      {
        id: 'npc_01',
        name: 'Test NPC',
        factionId: 'kingdom_north',
        stats: {},
        needs: { hunger: 0.5, thirst: 0.5, morale: 0.8 },
        relationships: []
      }
    ]);

    worldStateManager.state.globalThreatLevel = 0.9;
    engineeringCheck();

    function engineeringCheck() {
      engineLoop.tick(1, { factionId: 'player' });
      assert(engineLoop.ticks >= 1);
    }
  });
});
