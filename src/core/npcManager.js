const INITIAL_STATES = ['alert', 'idle', 'patrol', 'engaged'];

class NPCManager {
  constructor() {
    this.npcs = [];
  }

  load(npcData = []) {
    this.npcs = npcData.map(npc => ({
      ...npc,
      stats: { ...npc.stats },
      needs: { ...npc.needs },
      memory: [],
      relationships: [],
      state: 'idle',
      goal: null
    }));
  }

  updateNeeds(deltaHours = 1) {
    this.npcs.forEach((npc) => {
      npc.needs.hunger = Math.max(0, npc.needs.hunger - 0.05 * deltaHours);
      npc.needs.thirst = Math.max(0, npc.needs.thirst - 0.08 * deltaHours);
      npc.needs.morale = Math.max(0, Math.min(1, npc.needs.morale - 0.01 * deltaHours));
    });
  }

  assignGoal(world, factionDiplomacy, playerContext = { factionId: 'player' }) {
    this.npcs.forEach((npc) => {
      const hungerNeed = 1 - npc.needs.hunger;
      const thirstNeed = 1 - npc.needs.thirst;
      const lowMorale = npc.needs.morale < 0.3;
      const relations = factionDiplomacy.getRelations(npc.factionId || 'kingdom_north');
      const playerRelation = relations[playerContext.factionId] || 0;

      let selected = 'idle';
      if (hungerNeed > 0.6) {
        selected = 'find_food';
      }
      if (thirstNeed > 0.6) {
        selected = 'fetch_water';
      }
      if (world.globalThreatLevel > 0.5 && playerRelation < -0.4) {
        selected = 'seek_shelter';
      }
      if (lowMorale && playerRelation > 0.2) {
        selected = 'seek_alliance';
      }

      npc.goal = selected;
      npc.state = INITIAL_STATES.includes(npc.state) ? npc.state : 'idle';
      console.log(`[NPC GOAL] ${npc.name || npc.id} -> ${selected}`);

      if (playerRelation < -0.8 && selected !== 'avoid_player') {
        this.assignMemory(npc.id, {
          type: 'relation_warning',
          detail: 'Player hostile, avoiding engagement',
          timestamp: Date.now()
        });
        selected = 'avoid_player';
      }

      npc.goal = selected;
    });
  }

  assignMemory(npcId, entry) {
    const npc = this.npcs.find(n => n.id === npcId);
    if (!npc) return;
    npc.memory.push(entry);
  }

  updateRelationships(npcId, otherId, delta) {
    const npc = this.npcs.find(n => n.id === npcId);
    if (!npc) return;
    const relation = npc.relationships.find(r => r.target === otherId);
    if (relation) {
      relation.value = Math.max(-1, Math.min(1, relation.value + delta));
    } else {
      npc.relationships.push({
        target: otherId,
        value: Math.max(-1, Math.min(1, delta))
      });
    }
  }

  getNPC(id) {
    return this.npcs.find(n => n.id === id);
  }
}

module.exports = new NPCManager();
