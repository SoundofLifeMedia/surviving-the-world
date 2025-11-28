# Surviving The World™ - Developer Guide

## Overview

Surviving The World™ is an AAA-caliber, era-agnostic survival simulation game engine built in TypeScript. The architecture emphasizes clean separation between engine and content, enabling rapid iteration, DLC expansion, and community modding.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                         │
│  UISystem, Localization, Input Handling                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    GAMEPLAY LAYER                            │
│  PlayerSystem, CombatSystem, CraftingSystem, BuildingSystem  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   SIMULATION LAYER                           │
│  WorldState, FactionAI, NPCAI, QuestSystem, EconomySystem    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     ENGINE LAYER                             │
│  DataLoader, SaveLoadSystem, PerformanceSystem, ModSystem    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  JSON configs: Eras, Factions, Items, NPCs, Quests, Tech     │
└─────────────────────────────────────────────────────────────┘
```

## Core Systems

### PlayerSystem (`src/systems/PlayerSystem.ts`)
Manages player stats including health, stamina, hunger, thirst, temperature, infection, and morale.

```typescript
const player = new PlayerSystem();
player.updateStats(deltaHours);  // Apply decay
player.modifyStat('hunger', 30); // Restore hunger
player.checkThresholds();        // Get critical events
```

### InventorySystem (`src/systems/InventorySystem.ts`)
Grid-based inventory with weight limits, stacking, and durability.

```typescript
const inventory = new InventorySystem(50); // 50 weight capacity
inventory.addItem('grain', 10);
inventory.getTotalWeight();
inventory.getEncumbrance();
```

### CombatSystem (`src/systems/CombatSystem.ts`)
Tactical combat with melee/ranged weapons, injuries, and morale.

```typescript
const combat = new CombatSystem();
combat.registerEntity(entity);
combat.attack(attackerId, targetId, 'heavy');
combat.checkMorale(entityId);
```

### FactionSystem (`src/systems/FactionSystem.ts`)
Dynamic factions with resources, relationships, and AI-driven behavior.

```typescript
const factions = new FactionSystem();
factions.registerFaction(faction);
factions.updateDiplomacy(faction1, faction2, delta);
factions.getRelation(faction1, faction2);
```

### EconomySystem (`src/systems/EconomySystem.ts`)
Supply/demand pricing with trade routes and regional economies.

```typescript
const economy = new EconomySystem();
economy.getPrice('grain', 'village');
economy.executeTrade(buyer, seller, region, items, day);
economy.applyWarEffects(regionId, day);
```

### QuestSystem (`src/systems/QuestSystem.ts`)
Template-driven quest generation based on world state.

```typescript
const quests = new QuestSystem();
quests.registerTemplate(template);
quests.evaluateTriggers(worldState);
quests.generateQuest(templateId, worldState);
```

## Data-Driven Design

All game content is defined in JSON files under `/data/`:

- `/data/eras/` - Era definitions
- `/data/factions/` - Faction configurations
- `/data/items/` - Item definitions
- `/data/npcs/` - NPC templates
- `/data/quests/` - Quest templates
- `/data/tech/` - Technology trees
- `/data/recipes/` - Crafting recipes
- `/data/world/` - Biomes and world data

### Item Definition Example
```json
{
  "id": "sword_iron",
  "name": "Iron Sword",
  "type": "weapon_melee",
  "weight": 3.5,
  "durability": 100,
  "stackable": false,
  "traits": ["sharp", "metal"],
  "stats": {
    "damage": 25,
    "attack_speed": 1.2
  }
}
```

## Performance Optimization

### Object Pooling
```typescript
const pool = new ObjectPool(
  () => new Entity(),
  (e) => e.reset(),
  100
);
const entity = pool.acquire();
pool.release(entity);
```

### Spatial Partitioning
```typescript
const grid = new SpatialGrid<Entity>(100);
grid.insert(entity);
grid.queryRadius(x, y, radius);
```

### LOD System
```typescript
const lod = new LODSystem();
lod.setCamera(playerX, playerY);
lod.getLODLevel(entityX, entityY);
```

## Save/Load System

```typescript
const saveSystem = new SaveLoadSystem();
saveSystem.save('slot_1', 'My Save', gameState, era, day, playTime);
const result = saveSystem.load('slot_1');
saveSystem.autoSave(gameState, era, day, playTime);
```

## Modding Support

```typescript
const mods = new ModSystem('1.0.0');
mods.loadMod(modData);
mods.setModEnabled(modId, true);
const merged = mods.getMergedData(baseData);
```

## Testing

Run tests with:
```bash
npx ts-node tests/playerSystem.test.ts
npx ts-node tests/inventorySystem.test.ts
npx ts-node tests/combatSystem.test.ts
npx ts-node tests/economySystem.test.ts
```

## Building

```bash
npm install
npx tsc
node dist/index.js
```
