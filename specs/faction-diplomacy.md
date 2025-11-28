# Faction Diplomacy Engine - WAR MODE SPEC

## 1. Vision

Ship a general-purpose diplomacy layer driven entirely by data. Every faction has:
- resources + attitude + personality traits
- goals that influence behavior
- relations with other factions

No hardcoded interactions or prose; we evaluate utility scores per goal and adjust relations based on events.

## 2. Data Model

`FactionState` (JSON)

```json
{
  "id":"kingdom_north",
  "type":"feudal_state",
  "alignment":"authoritarian",
  "resources":{"food":1000,"gold":500},
  "relations":{"church_order":0.3,"mercenary_band":-0.2},
  "personality":{"aggression":0.6,"risk":0.3,"diplomacy":0.4,"honor":0.7},
  "goals":["maintain_territory","secure_food_supply"],
  "modifiers":{"war_floor":0.15,"trade_affinity":0.4}
}
```

Each `goal` maps to an evaluator function (tunable).

## 3. Diplomacy Loop

1. Evaluate all faction goals per tick (goal takes worldstate + player context).  
2. Utility output controls action selection: war/protect/trade/retreat.  
3. Update relations between involved factions via `delta = base + goalImpact + playerInfluence`.  
4. Log decision + metrics (serves observability + autofix trigger).  

## 4. Behavior Outcomes

- Friendly: open trade route, share resources.  
- Neutral: watch player, gather intel.  
- Aggressive: send raiders, declare siege.  

### Auto-heal hook  
If `relations` drop below -0.9 rapidly, trigger `FactionSafetyManager` to create temporary ceasefire.

## 5. Tests

- Unit: goal evaluator outputs (goal data-driven).  
- Integration: relation adjustments after simulated event (raid, trade).  
- Regression: no faction relation crosses [-1,1]; autop-run ensures.

## 6. Next Tasks

1. Implement utility matrix & `assessGoals`.  
2. Wire to `WorldStateManager` so global events feed in.  
3. Create war/trade simulation fixture + tests.
