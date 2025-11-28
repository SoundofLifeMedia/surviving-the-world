# Surviving The World™ - Modding Guide

## Introduction

Surviving The World™ supports extensive modding through data packs. Mods can add new eras, factions, items, NPCs, quests, recipes, and technologies without modifying engine code.

## Mod Structure

```
my_mod/
├── manifest.json       # Required: Mod metadata
├── eras/              # Era definitions
├── factions/          # Faction configurations
├── items/             # Item definitions
├── npcs/              # NPC templates
├── quests/            # Quest templates
├── recipes/           # Crafting recipes
├── tech/              # Technology definitions
└── strings/           # Localization strings
```

## Manifest File

Every mod requires a `manifest.json`:

```json
{
  "id": "my_awesome_mod",
  "name": "My Awesome Mod",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Adds cool new content",
  "gameVersion": "1.0.0",
  "dependencies": [],
  "conflicts": [],
  "loadOrder": 100,
  "dataFiles": [
    "items/new_sword.json",
    "factions/new_faction.json"
  ]
}
```

### Manifest Fields

| Field | Required | Description |
|-------|----------|-------------|
| id | Yes | Unique identifier (lowercase, no spaces) |
| name | Yes | Display name |
| version | Yes | Semantic version (X.Y.Z) |
| author | Yes | Creator name |
| description | No | Brief description |
| gameVersion | Yes | Minimum game version required |
| dependencies | No | Array of required mod IDs |
| conflicts | No | Array of incompatible mod IDs |
| loadOrder | No | Load priority (lower = earlier) |
| dataFiles | No | List of data files to load |

## Adding Items

Create JSON files in the `items/` folder:

```json
{
  "id": "legendary_sword",
  "name": "Legendary Sword",
  "type": "weapon_melee",
  "weight": 4.0,
  "durability": 500,
  "stackable": false,
  "traits": ["legendary", "sharp", "metal"],
  "stats": {
    "damage": 50,
    "attack_speed": 1.5,
    "range": 2.0
  },
  "requirements": {
    "tech": "master_smithing",
    "skill_combat": 5
  }
}
```

### Item Types
- `weapon_melee` - Swords, axes, clubs
- `weapon_ranged` - Bows, crossbows
- `armor_head` - Helmets
- `armor_body` - Chest armor
- `armor_legs` - Leg armor
- `shield` - Shields
- `consumable` - Food, potions
- `resource` - Crafting materials
- `tool` - Tools and utilities

### Item Traits
Traits affect gameplay mechanics:
- `sharp` - Causes bleeding
- `blunt` - Causes stagger
- `metal` - Affected by rust
- `wooden` - Flammable
- `perishable` - Decays over time
- `legendary` - Cannot be destroyed

## Adding Factions

```json
{
  "id": "shadow_guild",
  "name": "Shadow Guild",
  "type": "criminal_organization",
  "base_alignment": "chaotic",
  "resources": {
    "food": 200,
    "gold": 1000,
    "manpower": 50
  },
  "attitudeToPlayer": -0.2,
  "relations": {
    "kingdom_north": -0.5,
    "mercenary_band": 0.3
  },
  "ai_personality": {
    "aggression": 0.7,
    "risk_aversion": 0.2,
    "diplomacy": 0.3,
    "honor": 0.1
  },
  "goals": [
    "accumulate_wealth",
    "expand_influence",
    "avoid_authorities"
  ]
}
```

## Adding NPCs

```json
{
  "id": "mysterious_stranger",
  "name": "Mysterious Stranger",
  "role": "wanderer",
  "faction": "neutral",
  "personality": {
    "aggression": 0.3,
    "altruism": 0.5,
    "greed": 0.4,
    "curiosity": 0.9,
    "lawfulness": 0.3
  },
  "schedule": [
    {"time": 6, "activity": "wander", "location": "roads"},
    {"time": 12, "activity": "rest", "location": "tavern"},
    {"time": 18, "activity": "trade", "location": "market"},
    {"time": 22, "activity": "sleep", "location": "inn"}
  ]
}
```

## Adding Quests

```json
{
  "id": "find_artifact",
  "type": "template",
  "name": "The Lost Artifact",
  "triggers": ["ruins_discovered", "player_reputation > 0.3"],
  "roles": {
    "quest_giver": "scholar",
    "target_location": "ancient_ruins"
  },
  "steps": [
    "talk_to_scholar",
    "travel_to_ruins",
    "solve_puzzle",
    "retrieve_artifact",
    "return_to_scholar"
  ],
  "outcomes": {
    "success": {
      "worldEffects": ["artifact_found = true"],
      "rewards": {"gold": 200, "reputation": 25}
    },
    "failure": {
      "worldEffects": ["artifact_lost = true"],
      "penalties": {"reputation": -10}
    }
  }
}
```

## Adding Recipes

```json
{
  "id": "legendary_sword_recipe",
  "name": "Forge Legendary Sword",
  "inputs": [
    {"itemId": "iron_ingot", "quantity": 10},
    {"itemId": "legendary_gem", "quantity": 1},
    {"itemId": "dragon_scale", "quantity": 3}
  ],
  "outputs": [
    {"itemId": "legendary_sword", "quantity": 1}
  ],
  "craftTimeSeconds": 600,
  "requiresStation": "master_forge",
  "unlockedBy": "master_smithing"
}
```

## Adding Technologies

```json
{
  "id": "master_smithing",
  "name": "Master Smithing",
  "description": "Forge legendary weapons",
  "category": "crafting",
  "era": "late_medieval",
  "tier": 4,
  "requirements": [
    {"type": "tech", "id": "ironworking"},
    {"type": "resource", "id": "gold", "amount": 500}
  ],
  "benefits": [
    {"type": "unlock_recipe", "id": "legendary_sword_recipe"},
    {"type": "stat_bonus", "id": "crafting_quality", "value": 0.3}
  ],
  "researchTime": 20,
  "researchCost": [
    {"resource": "gold", "amount": 200}
  ]
}
```

## Localization

Add strings in `strings/` folder:

```json
{
  "en": {
    "item.legendary_sword": "Legendary Sword",
    "item.legendary_sword.desc": "A blade of immense power",
    "quest.find_artifact": "The Lost Artifact",
    "npc.mysterious_stranger.greeting": "Greetings, traveler..."
  },
  "es": {
    "item.legendary_sword": "Espada Legendaria",
    "item.legendary_sword.desc": "Una hoja de inmenso poder"
  }
}
```

## Overriding Base Content

To modify existing content, use the same ID:

```json
{
  "id": "sword_iron",
  "stats": {
    "damage": 30
  }
}
```

This will merge with the base item, only changing specified fields.

## Conflict Resolution

When mods conflict:
1. Declared conflicts prevent both mods from loading
2. Data overlaps are detected and reported
3. Later load order overrides earlier mods

## Testing Your Mod

1. Place mod folder in `/mods/` directory
2. Enable mod in game settings
3. Check console for validation errors
4. Test all new content in-game

## Best Practices

- Use unique, prefixed IDs (e.g., `mymod_sword`)
- Test with and without dependencies
- Document your mod's features
- Version your releases properly
- Respect other mods' namespaces
