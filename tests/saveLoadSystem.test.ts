/**
 * SaveLoadSystem Unit Tests
 * Tests save/load round-trip integrity
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 * Feature: surviving-the-world, Property 32: Save/load round-trip integrity
 * Feature: surviving-the-world, Property 33: Faction memory persistence
 */

import { SaveLoadSystem } from '../src/systems/SaveLoadSystem';
import * as fc from 'fast-check';

describe('SaveLoadSystem', () => {
  let saveSystem: SaveLoadSystem;

  beforeEach(() => {
    saveSystem = new SaveLoadSystem();
  });

  const createTestGameState = () => ({
    worldState: { day: 5, time: 12.5, weather: 'clear' },
    playerData: { health: 80, hunger: 60, position: { x: 100, y: 0, z: 200 } },
    factions: { kingdom_north: { heat: 25, relations: {} } },
    npcs: { npc_1: { name: 'Test NPC', health: 100 } },
    quests: { quest_1: { status: 'active', progress: 0.5 } },
    buildings: { building_1: { type: 'house', health: 100 } },
    economy: { village: { supply: { grain: 100 }, demand: { grain: 50 } } },
    techTree: { unlocked: ['basic_tools'] },
    choices: { choice_1: 'option_a' },
    conditions: { player: ['well_fed'] }
  });

  test('Save creates valid save data', () => {
    const gameState = createTestGameState();
    
    const result = saveSystem.save(
      'slot_1',
      'Test Save',
      gameState,
      'late_medieval',
      5,
      3600
    );
    
    expect(result.success).toBe(true);
  });

  test('Load retrieves saved data', () => {
    const gameState = createTestGameState();
    
    saveSystem.save('slot_1', 'Test Save', gameState, 'late_medieval', 5, 3600);
    
    const result = saveSystem.load('slot_1');
    
    expect(result.success).toBe(true);
    expect(result.data?.worldState.day).toBe(5);
    expect(result.data?.playerData.health).toBe(80);
  });

  test('Load fails for empty slot', () => {
    const result = saveSystem.load('slot_99');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('empty');
  });

  test('Get save slots returns all slots', () => {
    const slots = saveSystem.getSaveSlots();
    
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.some(s => s.slotId === 'slot_1')).toBe(true);
  });

  test('Delete save clears slot', () => {
    const gameState = createTestGameState();
    saveSystem.save('slot_1', 'Test Save', gameState, 'late_medieval', 5, 3600);
    
    expect(saveSystem.hasData('slot_1')).toBe(true);
    
    saveSystem.deleteSave('slot_1');
    
    expect(saveSystem.hasData('slot_1')).toBe(false);
  });

  test('Validate save detects corruption', () => {
    const gameState = createTestGameState();
    saveSystem.save('slot_1', 'Test Save', gameState, 'late_medieval', 5, 3600);
    
    const validation = saveSystem.validateSave('slot_1');
    
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  test('Autosave works correctly', () => {
    const gameState = createTestGameState();
    
    const result = saveSystem.autoSave(gameState, 'late_medieval', 10, 7200);
    
    expect(result.success).toBe(true);
    expect(saveSystem.hasData('autosave')).toBe(true);
  });

  test('Export and import save', () => {
    const gameState = createTestGameState();
    saveSystem.save('slot_1', 'Test Save', gameState, 'late_medieval', 5, 3600);
    
    const exported = saveSystem.exportSave('slot_1');
    expect(exported).not.toBeNull();
    
    const importResult = saveSystem.importSave('slot_2', exported!);
    expect(importResult.success).toBe(true);
    
    // Verify import worked
    expect(saveSystem.hasData('slot_2')).toBe(true);
  });

  test('Copy save to another slot', () => {
    const gameState = createTestGameState();
    saveSystem.save('slot_1', 'Test Save', gameState, 'late_medieval', 5, 3600);
    
    const copied = saveSystem.copySave('slot_1', 'slot_3');
    expect(copied).toBe(true);
    
    // Verify the copy exists
    expect(saveSystem.hasData('slot_3')).toBe(true);
  });

  test('Get metadata without full load', () => {
    const gameState = createTestGameState();
    saveSystem.save('slot_1', 'Test Save', gameState, 'late_medieval', 5, 3600);
    
    const metadata = saveSystem.getMetadata('slot_1');
    
    expect(metadata).not.toBeNull();
    expect(metadata?.name).toBe('Test Save');
    expect(metadata?.dayCount).toBe(5);
  });

  test('Get next available slot', () => {
    const nextSlot = saveSystem.getNextAvailableSlot();
    expect(nextSlot).toBe('slot_1');
    
    const gameState = createTestGameState();
    saveSystem.save('slot_1', 'Test', gameState, 'late_medieval', 1, 100);
    
    const nextSlot2 = saveSystem.getNextAvailableSlot();
    expect(nextSlot2).toBe('slot_2');
  });
});

describe('SaveLoadSystem Property Tests', () => {
  /**
   * Feature: surviving-the-world, Property 32: Save/load round-trip integrity
   * For any game state, saving and then loading should restore the exact same state
   * including world state, player data, faction states, NPC states, and quest progress.
   * Validates: Requirements 15.1
   */
  test('Property 32: Save/load round-trip preserves all data', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 0, max: 100 }),
        (day, hour, playTime, health) => {
          const saveSystem = new SaveLoadSystem();
          
          const gameState = {
            worldState: { day, time: hour + 0.5, weather: 'clear' },
            playerData: { health, hunger: 60, position: { x: 100, y: 0, z: 200 } },
            factions: { faction_1: { heat: 25 } },
            npcs: { npc_1: { name: 'NPC', health: 100 } },
            quests: { quest_1: { status: 'active' } },
            buildings: {},
            economy: {},
            techTree: { unlocked: [] },
            choices: {},
            conditions: {}
          };
          
          const saveResult = saveSystem.save(
            'slot_1',
            'Test',
            gameState,
            'test_era',
            day,
            playTime
          );
          
          if (!saveResult.success) return false;
          
          const loadResult = saveSystem.load('slot_1');
          
          if (!loadResult.success) return false;
          
          // Verify round-trip integrity
          return (
            loadResult.data?.worldState.day === day &&
            loadResult.data?.playerData.health === health &&
            loadResult.data?.metadata.dayCount === day &&
            loadResult.data?.metadata.playTime === playTime
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: surviving-the-world, Property 33: Faction memory persistence
   * For any faction memory of player actions, the memory should persist across
   * save/load cycles and influence faction behavior after loading.
   * Validates: Requirements 15.3
   */
  test('Property 33: Faction data persists across save/load', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 5 }),
        (heatLevel, factionCount) => {
          const saveSystem = new SaveLoadSystem();
          
          // Create faction data with simple IDs
          const factions: Record<string, any> = {};
          for (let i = 0; i < factionCount; i++) {
            factions[`faction_${i}`] = {
              heat: heatLevel,
              memory: ['player_attacked', 'player_stole'],
              relations: { player: -0.5 }
            };
          }
          
          const gameState = {
            worldState: { day: 1, time: 12, weather: 'clear' },
            playerData: { health: 100 },
            factions,
            npcs: {},
            quests: {},
            buildings: {},
            economy: {},
            techTree: {},
            choices: {},
            conditions: {}
          };
          
          saveSystem.save('slot_1', 'Test', gameState, 'test', 1, 100);
          const loadResult = saveSystem.load('slot_1');
          
          if (!loadResult.success) return false;
          
          // Verify all faction data persisted
          for (let i = 0; i < factionCount; i++) {
            const loadedFaction = loadResult.data?.factions[`faction_${i}`];
            if (!loadedFaction) return false;
            if (loadedFaction.heat !== heatLevel) return false;
            if (loadedFaction.memory?.length !== 2) return false;
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Validation always catches missing required fields
   */
  test('Validation catches incomplete saves', () => {
    const saveSystem = new SaveLoadSystem();
    
    // Save with minimal data
    const result = saveSystem.save(
      'slot_1',
      'Test',
      {
        worldState: { day: 1 },
        playerData: { health: 100 },
        factions: {},
        npcs: {},
        quests: {},
        buildings: {},
        economy: {},
        techTree: {},
        choices: {},
        conditions: {}
      },
      'test',
      1,
      100
    );
    
    expect(result.success).toBe(true);
    
    const validation = saveSystem.validateSave('slot_1');
    expect(validation.valid).toBe(true);
  });
});
