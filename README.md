# 🎮 Surviving The World™

**AAA-Caliber Era-Agnostic Survival Simulation Game**

Version: 0.1.0 (MVP Development)  
Owner: Llewellyn Systems  
Status: 🚧 In Development

---

## 🌍 Vision

Surviving The World™ is a systems-driven survival game spanning multiple eras of human civilization. Players make choices that interact with AI-driven NPCs, dynamic factions, and a persistent world state. Built with clean separation between engine and content to support DLC, mods, and live operations.

**Core Pillars:**
- Era-agnostic (Stone Age → Cyberpunk → Offworld) via data
- System-first, content-second (simulation over scripts)
- AI-NPC heavy with memory, goals, relationships
- Choice & consequence across time
- Mod-ready and DLC-ready architecture

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development build
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## 📁 Project Structure

```
surviving-the-world/
├── src/
│   ├── engine/          # Core engine systems
│   ├── systems/         # Game systems (combat, crafting, etc.)
│   ├── data/            # Runtime data structures
│   └── ui/              # User interface
├── data/
│   ├── eras/            # Era configurations (JSON)
│   ├── factions/        # Faction definitions
│   ├── items/           # Item templates
│   ├── npcs/            # NPC templates
│   ├── quests/          # Quest templates
│   └── tech/            # Tech tree definitions
├── tests/               # Unit and integration tests
└── .kiro/specs/         # Design specifications
```

---

## 🎯 MVP Features

- ✅ Data-driven era system (Late Medieval)
- ✅ Player survival (hunger, thirst, health, temperature)
- ✅ Inventory & crafting
- ✅ Basic combat (melee + ranged)
- ✅ 3 factions with AI
- ✅ NPCs with personality & memory
- ✅ Dynamic quests
- ✅ Save/load
- ✅ 30-day survival scenario

---

## 🛠️ Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js
- **Testing:** Jest + fast-check (property-based testing)
- **Data Format:** JSON (hot-reloadable)
- **Future:** Port to Unity/Unreal for full 3D

---

## 📖 Documentation

- [Developer Guide](/docs/DEVELOPER_GUIDE.md) - System architecture and API reference
- [Modding Guide](/docs/MODDING_GUIDE.md) - Creating content mods
- [Data Formats](/docs/DATA_FORMATS.md) - JSON schema reference
- [Requirements](/.kiro/specs/surviving-the-world/requirements.md)
- [Design](/.kiro/specs/surviving-the-world/design.md)
- [Tasks](/.kiro/specs/surviving-the-world/tasks.md)
- [Master Design Framework](/WAR_MODE_MASTER_DIRECTIVE.md)

---

## 🎮 Game Modes

### Single-Player Campaign (MVP)
Story-light, system-heavy. Player dropped into Late Medieval era with goal: "Lead your faction to survive the Great Famine and prevent collapse."

### Sandbox Mode (Future)
Pick era, world parameters, difficulty, faction starting conditions. Pure simulation.

### Co-op/Multiplayer (Future)
2-4 player co-op with authoritative server architecture.

---

## 🧬 Core Systems

1. **World State Manager** - Time, weather, factions, regions, threat level
2. **Faction AI** - GOAP-based decision making, diplomacy, wars, trade
3. **NPC AI** - Personality, memory, relationships, schedules
4. **Player Systems** - Stats, needs, decay, thresholds
5. **Inventory** - Weight, encumbrance, durability, traits
6. **Combat** - Melee/ranged, damage, injuries, AI behavior
7. **Crafting** - Recipes, stations, tech unlocks
8. **Building** - Placement, construction, damage, upgrades
9. **Quest System** - Template-driven, context-aware generation
10. **Economy** - Supply/demand, trade routes, dynamic pricing
11. **Tech Tree** - Era-specific + global progression
12. **Save/Load** - Full state serialization

---

## 🔥 WAR MODE Principles

- **Foundation-first** - Build for scale from day one
- **No hardcoding** - All content in data files
- **Era-agnostic** - Engine never knows about specific eras
- **System-driven** - Simulation over scripts
- **Mod-ready** - Clean data pack architecture
- **DLC-ready** - New eras as data, no engine changes
- **AAA quality** - 60 FPS, 100-200 NPCs, 10+ factions

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run property-based tests
npm test -- --testPathPattern=property
```

**Test Coverage:**
- Unit tests for all core systems
- Property-based tests for invariants
- Integration tests for game loops
- Soak tests (100 in-game days)
- Load tests (200 NPCs, 10 factions)

---

## 📦 Data Format Example

### Era Configuration
```json
{
  "id": "late_medieval",
  "name": "Late Medieval Collapse",
  "factions": ["kingdom_north", "church_order"],
  "available_items": ["grain", "sword", "armor"],
  "global_modifiers": {
    "disease_risk": 0.7,
    "famine_risk": 0.6
  }
}
```

### Faction Configuration
```json
{
  "id": "kingdom_north",
  "name": "Kingdom of the North",
  "resources": { "food": 1000, "gold": 500 },
  "ai_personality": {
    "aggression": 0.6,
    "diplomacy": 0.4
  },
  "goals": ["maintain_territory", "secure_food_supply"]
}
```

---

## 🎯 Roadmap

### Phase 1: MVP (Current)
- Core engine systems
- Late Medieval era
- 3 factions, 50+ items
- Basic combat & crafting
- 30-day survival scenario

### Phase 2: Content Expansion
- 2 additional eras (Stone Age, Renaissance)
- 10+ factions
- 200+ items
- Advanced quest system
- Faction wars

### Phase 3: Polish & Features
- Full UI/UX
- Audio integration
- Visual polish
- Modding tools
- Steam release

### Phase 4: Multiplayer
- 2-4 player co-op
- Server authoritative architecture
- Shared world state

---

## 🤝 Contributing

This is a proprietary project by Llewellyn Systems. Internal development only.

---

## 📄 License

Proprietary - All Rights Reserved  
© 2025 Llewellyn Systems

---

**Built with WAR MODE principles - Foundation-first, AAA-caliber, zero compromises.**
