const assert = require('assert');
const npcManager = require('../src/core/npcManager');
const factionDiplomacy = require('../src/core/factionDiplomacy');

describe('NPC Manager', () => {
  it('assigns hunger-driven goal and logs memory when player hostile', () => {
    const world = { globalThreatLevel: 0.7, resources: { food: 200 } };
    factionDiplomacy.load([
      {
        id: 'kingdom_north',
        goals: [],
        relations: { player: -0.9 }
      }
    ]);

    npcManager.load([
      {
        id: 'npc_01',
        name: 'Test NPC',
        factionId: 'kingdom_north',
        stats: {},
        needs: { hunger: 0.3, thirst: 0.9, morale: 0.5 },
        relationships: []
      }
    ]);
    npcManager.assignGoal(world, factionDiplomacy, { factionId: 'player' });
    const npc = npcManager.getNPC('npc_01');
    assert.strictEqual(npc.goal, 'avoid_player');
    assert(npc.memory.some(entry => entry.type === 'relation_warning'));
  });
});
