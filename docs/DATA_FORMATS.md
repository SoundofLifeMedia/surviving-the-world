# Surviving The World™ - Data Format Reference

## Era Configuration

**Location:** `/data/eras/{era_id}.json`

```json
{
  "id": "late_medieval",
  "name": "Late Medieval Collapse",
  "timeframe": "1350-1450",
  "base_tech_tier": 3,
  "factions": ["kingdom_north", "church_order", "mercenary_band"],
  "biomes": ["farmland", "forest", "village", "castle", "trade_routes"],
  "global_modifiers": {
    "disease_risk": 0.7,
    "war_frequency": 0.5,
    "famine_risk": 0.6
  },
  "available_items": ["grain", "sword_iron", "leather_armor"],
  "available_crafting_recipes": ["bread", "bandage"],
  "era_events": ["plague_outbreak", "harvest_failure", "tax_revolt"]
}
```

## Faction Configuration

**Location:** `/data/factions/{faction_id}.json`

```json
{
  "id": "kingdom_north",
  "name": "Kingdom of the North",
  "type": "feudal_state",
  "base_alignment": "authoritarian",
  "resources": {
    "food": 1000,
    "gold": 500,
    "manpower": 200
  },
  "attitudeToPlayer": 0.1,
  "relations": {
    "church_order": 0.3,
    "mercenary_band": -0.2
  },
  "ai_personality": {
    "aggression": 0.6,
    "risk_aversion": 0.3,
    "diplomacy": 0.4,
    "honor": 0.7
  },
  "goals": ["maintain_territory", "suppress_revolt", "secure_food_supply"]
}
```

### Faction Types
- `feudal_state` - Traditional kingdom
- `religious_order` - Church/temple organization
- `mercenary_company` - Hired soldiers
- `criminal_organization` - Thieves guild, bandits
- `merchant_guild` - Trade organization
- `tribal` - Nomadic or tribal group

### Alignment Values
- `lawful` - Follows rules strictly
- `authoritarian` - Strong central control
- `neutral` - Pragmatic approach
- `chaotic` - Unpredictable behavior

## Item Configuration

**Location:** `/data/items/{item_id}.json`

```json
{
  "id": "sword_iron",
  "name": "Iron Sword",
  "type": "weapon_melee",
  "weight": 3.5,
  "durability": 100,
  "stackable": false,
  "maxStack": 1,
  "traits": ["sharp", "metal"],
  "stats": {
    "damage": 25,
    "attack_speed": 1.2,
    "range": 1.5
  },
  "requirements": {
    "tech": "ironworking",
    "skill_combat": 2
  }
}
```

### Item Types
| Type | Description |
|------|-------------|
| `weapon_melee` | Close combat weapons |
| `weapon_ranged` | Bows, crossbows, thrown |
| `armor_head` | Helmets, hoods |
| `armor_body` | Chest protection |
| `armor_legs` | Leg protection |
| `shield` | Defensive shields |
| `consumable` | Food, potions, medicine |
| `resource` | Crafting materials |
| `tool` | Utility items |
| `quest` | Quest-related items |

### Common Traits
| Trait | Effect |
|-------|--------|
| `sharp` | Causes bleeding on hit |
| `blunt` | Increased stagger chance |
| `metal` | Affected by rust, magnetic |
| `wooden` | Flammable, lighter |
| `perishable` | Decays over time |
| `waterproof` | Resists water damage |
| `heavy` | Movement penalty |
| `legendary` | Cannot be destroyed |

## NPC Configuration

**Location:** `/data/npcs/{npc_id}.json`

```json
{
  "id": "village_farmer",
  "name": "Village Farmer",
  "role": "farmer",
  "faction": "kingdom_north",
  "personality": {
    "aggression": 0.2,
    "altruism": 0.6,
    "greed": 0.4,
    "curiosity": 0.3,
    "lawfulness": 0.7
  },
  "schedule": [
    {"time": 5, "activity": "wake_up", "location": "home"},
    {"time": 6, "activity": "work", "location": "farm"},
    {"time": 12, "activity": "eat", "location": "home"},
    {"time": 13, "activity": "work", "location": "farm"},
    {"time": 18, "activity": "socialize", "location": "tavern"},
    {"time": 21, "activity": "sleep", "location": "home"}
  ]
}
```

### Personality Traits (0.0 - 1.0)
| Trait | Low Value | High Value |
|-------|-----------|------------|
| `aggression` | Peaceful, avoids conflict | Violent, seeks fights |
| `altruism` | Selfish, unhelpful | Generous, helpful |
| `greed` | Content, fair | Greedy, exploitative |
| `curiosity` | Cautious, routine | Adventurous, inquisitive |
| `lawfulness` | Rebellious, criminal | Law-abiding, strict |

### NPC Roles
- `farmer` - Works fields
- `guard` - Patrols and protects
- `merchant` - Buys and sells
- `blacksmith` - Crafts weapons/armor
- `healer` - Provides medical care
- `innkeeper` - Runs tavern/inn
- `noble` - Political figure
- `bandit` - Criminal

## Quest Template

**Location:** `/data/quests/{quest_id}.json`

```json
{
  "id": "fetch_food_for_famine",
  "type": "template",
  "name": "Famine Relief",
  "triggers": ["famine_risk > 0.5", "dayCount > 3"],
  "roles": {
    "quest_giver": "village_elder",
    "target_region": "food_surplus"
  },
  "steps": [
    "talk_to_quest_giver",
    "travel_to_target_region",
    "acquire_food",
    "return_to_village"
  ],
  "outcomes": {
    "success": {
      "worldEffects": ["region.food_stock += 100"],
      "rewards": {"gold": 50, "reputation": 10}
    },
    "failure": {
      "worldEffects": ["famine_deaths += 20"],
      "penalties": {"reputation": -20}
    }
  }
}
```

### Trigger Conditions
- `variable > value` - Greater than
- `variable < value` - Less than
- `variable == value` - Equals
- `flag_name` - Boolean flag is true

## Recipe Configuration

**Location:** `/data/recipes/recipes.json`

```json
{
  "recipes": [
    {
      "id": "bread",
      "name": "Bread",
      "inputs": [
        {"itemId": "grain", "quantity": 2},
        {"itemId": "water", "quantity": 1}
      ],
      "outputs": [
        {"itemId": "bread", "quantity": 1}
      ],
      "craftTimeSeconds": 60,
      "requiresStation": "oven_basic",
      "unlockedBy": null
    }
  ]
}
```

### Crafting Stations
- `null` - No station required (hand crafting)
- `campfire` - Basic fire
- `forge` - Metalworking
- `oven_basic` - Cooking
- `workbench` - General crafting
- `tanning_rack` - Leatherworking

## Technology Configuration

**Location:** `/data/tech/tech_tree.json`

```json
{
  "techs": [
    {
      "id": "ironworking",
      "name": "Ironworking",
      "description": "Smelt and forge iron",
      "category": "economy",
      "era": "global",
      "tier": 2,
      "requirements": [
        {"type": "tech", "id": "basic_crafting"}
      ],
      "benefits": [
        {"type": "unlock_building", "id": "forge"},
        {"type": "unlock_recipe", "id": "iron_sword"}
      ],
      "researchTime": 10,
      "researchCost": [
        {"resource": "iron_ore", "amount": 30}
      ]
    }
  ]
}
```

### Tech Categories
- `survival` - Basic survival skills
- `combat` - Fighting techniques
- `crafting` - Item creation
- `building` - Construction
- `economy` - Trade and resources
- `social` - Diplomacy and leadership

### Benefit Types
| Type | Description |
|------|-------------|
| `unlock_recipe` | Enables crafting recipe |
| `unlock_building` | Enables building type |
| `unlock_item` | Makes item available |
| `unlock_action` | Enables player action |
| `stat_bonus` | Permanent stat increase |

## Biome Configuration

**Location:** `/data/world/biomes.json`

```json
{
  "biomes": [
    {
      "id": "forest",
      "name": "Dense Forest",
      "description": "Thick woodland with wildlife",
      "climate": "temperate",
      "threats": ["wolves", "bears", "bandits"],
      "resources": ["wood", "herbs", "meat"],
      "modifiers": {
        "food_production": 0.8,
        "disease_risk": 0.4,
        "travel_speed": 0.7,
        "ambush_risk": 0.5
      }
    }
  ]
}
```

### Climate Types
- `temperate` - Mild weather
- `cold` - Snow and ice
- `hot` - Desert heat
- `humid` - Swamps and wetlands
- `arid` - Dry conditions
