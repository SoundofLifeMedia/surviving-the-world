const assert = require('assert');
const factionDiplomacy = require('../src/core/factionDiplomacy');

describe('FactionDiplomacy', () => {
  it('loads factions and adjusts relations', () => {
    const world = { globalThreatLevel: 0.6, resources: { food: 400 } };
    factionDiplomacy.load([
      {
        id: 'kingdom_north',
        goals: ['secure_food_supply'],
        relations: {},
        modifiers: {}
      }
    ]);

    factionDiplomacy.tick(world, { factionId: 'player' });
    const relations = factionDiplomacy.getRelations('kingdom_north');
    assert(relations.player !== undefined);
  });
});
