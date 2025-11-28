## Engine Loop and Self-Heal Hooks

### 1. Purpose
Drive the core simulation tick:
- Advance `WorldStateManager`
- Tick `FactionDiplomacy`
- Update `NPCManager` goals and needs
- Emit telemetry + autofix candidates

### 2. Loop Steps (every hour/day)
1. `worldStateManager.tick(hours)`
2. `factionDiplomacy.tick(world, playerContext)`
3. `npcManager.updateNeeds(1)`
4. `npcManager.assignGoal(world, factionDiplomacy, playerContext)`
5. Evaluate health:
   - if `globalThreatLevel > 0.8`, emit `highThreat` event
   - if any faction relations cross [-0.95, -1], trigger `warlock` fixer (auto-ceasefire)
6. Log telemetry into `InstrumentationLogger`.

### 3. Autofix Hooks
- `Instrumentor.triggerAutofix('relations', payload)` when relations drop dangerously.
- `Instrumentor.triggerAutofix('threat', payload)` when threat spikes.

### 4. Tests
- Integration: `EngineLoop` scenario ensures goals update and autofix function invoked when threat > threshold.
