/**
 * NPC System
 * AI-driven NPCs with personality, memory, relationships, schedules
 */

export interface Personality {
  aggression: number;
  altruism: number;
  greed: number;
  curiosity: number;
  lawfulness: number;
}

export interface MemoryRecord {
  id: string;
  type: 'interaction' | 'event' | 'observation';
  subject: string;
  sentiment: number; // -1 to 1
  timestamp: number;
  details: string;
}

export interface Relationship {
  targetId: string;
  trust: number; // -1 to 1
  familiarity: number; // 0 to 1
  lastInteraction: number;
}

export interface ScheduleEntry {
  time: number; // Hour 0-24
  activity: string;
  location: string;
}

export interface NPCNeeds {
  hunger: number;
  rest: number;
  safety: number;
  social: number;
}

export interface NPC {
  id: string;
  name: string;
  factionId: string;
  role: string;
  health: number;
  personality: Personality;
  needs: NPCNeeds;
  memory: MemoryRecord[];
  relationships: Map<string, Relationship>;
  schedule: ScheduleEntry[];
  currentActivity: string;
  currentLocation: string;
}

export type NPCAction = 'idle' | 'work' | 'eat' | 'sleep' | 'socialize' | 'patrol' | 'trade' | 'flee' | 'attack';

export class NPCSystem {
  private npcs: Map<string, NPC> = new Map();

  registerNPC(npc: NPC): void {
    this.npcs.set(npc.id, npc);
  }

  getNPC(npcId: string): NPC | undefined {
    return this.npcs.get(npcId);
  }

  getAllNPCs(): NPC[] {
    return Array.from(this.npcs.values());
  }

  getNPCsByFaction(factionId: string): NPC[] {
    return this.getAllNPCs().filter(n => n.factionId === factionId);
  }

  updateNPC(npcId: string, deltaHours: number, currentHour: number): NPCAction {
    const npc = this.npcs.get(npcId);
    if (!npc) return 'idle';

    // Update needs
    npc.needs.hunger = Math.max(0, npc.needs.hunger - 5 * deltaHours);
    npc.needs.rest = Math.max(0, npc.needs.rest - 3 * deltaHours);
    npc.needs.social = Math.max(0, npc.needs.social - 1 * deltaHours);

    // Check schedule
    const scheduledActivity = this.getScheduledActivity(npc, currentHour);
    if (scheduledActivity) {
      npc.currentActivity = scheduledActivity.activity;
      npc.currentLocation = scheduledActivity.location;
    }

    // Select action based on needs and personality
    return this.selectAction(npc);
  }

  selectAction(npc: NPC): NPCAction {
    const needs = npc.needs;

    // Critical needs override everything
    if (needs.hunger < 20) return 'eat';
    if (needs.rest < 15) return 'sleep';
    if (needs.safety < 30) return npc.personality.aggression > 0.6 ? 'attack' : 'flee';

    // Personality-driven actions
    if (needs.social < 40 && npc.personality.altruism > 0.5) return 'socialize';
    if (npc.personality.greed > 0.6 && Math.random() < 0.3) return 'trade';

    // Default to scheduled activity
    switch (npc.currentActivity) {
      case 'work': return 'work';
      case 'sleep': return 'sleep';
      case 'socialize': return 'socialize';
      case 'patrol': return 'patrol';
      default: return 'idle';
    }
  }

  recordMemory(npcId: string, memory: Omit<MemoryRecord, 'id' | 'timestamp'>): void {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    const record: MemoryRecord = {
      ...memory,
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    npc.memory.push(record);

    // Limit memory size (keep last 100)
    if (npc.memory.length > 100) {
      npc.memory = npc.memory.slice(-100);
    }
  }

  updateRelationship(npcId: string, targetId: string, trustDelta: number): void {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    let rel = npc.relationships.get(targetId);
    if (!rel) {
      rel = { targetId, trust: 0, familiarity: 0, lastInteraction: Date.now() };
      npc.relationships.set(targetId, rel);
    }

    rel.trust = Math.max(-1, Math.min(1, rel.trust + trustDelta));
    rel.familiarity = Math.min(1, rel.familiarity + 0.1);
    rel.lastInteraction = Date.now();
  }

  getRelationship(npcId: string, targetId: string): Relationship | null {
    return this.npcs.get(npcId)?.relationships.get(targetId) || null;
  }

  generateDialogue(npcId: string, context: string): string[] {
    const npc = this.npcs.get(npcId);
    if (!npc) return ['...'];

    const playerRel = npc.relationships.get('player');
    const trust = playerRel?.trust || 0;

    // Simple dialogue based on trust and personality
    if (trust < -0.5) {
      return ['Leave me alone.', 'I have nothing to say to you.'];
    } else if (trust < 0) {
      return ['What do you want?', 'Make it quick.'];
    } else if (trust < 0.5) {
      return ['Hello, traveler.', 'How can I help you?'];
    } else {
      return ['Good to see you, friend!', 'What brings you here today?'];
    }
  }

  private getScheduledActivity(npc: NPC, currentHour: number): ScheduleEntry | null {
    // Find the most recent scheduled activity
    let best: ScheduleEntry | null = null;
    for (const entry of npc.schedule) {
      if (entry.time <= currentHour && (!best || entry.time > best.time)) {
        best = entry;
      }
    }
    return best;
  }

  serialize(): string {
    const data = Array.from(this.npcs.entries()).map(([id, n]) => ({
      ...n,
      relationships: Array.from(n.relationships.entries())
    }));
    return JSON.stringify(data);
  }
}
