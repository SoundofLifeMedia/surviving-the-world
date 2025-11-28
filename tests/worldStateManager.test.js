const assert = require('assert');
const worldStateManager = require('../src/core/worldStateManager');

describe('WorldStateManager', () => {
  it('loads era config and updates state', () => {
    worldStateManager.loadEra('late_medieval');
    const snapshot = worldStateManager.logState();
    assert.strictEqual(snapshot.era, 'late_medieval');
    assert(snapshot.threat >= 0);
  });

  it('increments time correctly', () => {
    const before = worldStateManager.state.timeOfDay;
    worldStateManager.tick(5);
    assert(worldStateManager.state.timeOfDay !== before, 'time should advance');
  });
});
