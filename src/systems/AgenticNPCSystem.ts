/**
 * AgenticNPCSystem - Autonomous NPC intelligence with memory, needs, and social behavior
 * Feature: surviving-the-world
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 * Properties: 17, 18, 19
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// === NEEDS ENGINE ===
export interface NeedsState {
  hunger: number;      // 0-100, higher = more hungry
  rest: number;        // 0-100, higher = more tired
  safety: number;      // 0-100, higher = more threatened
  social: number;      // 0-100, higher = more lonely
  purpose: number;     // 0-100, higher = more aimless
}

export type NeedType = keyof NeedsState;

export interface NeedPriority {
  need: NeedType;
  urgency: number;
  action: string;
}

// === MEMORY ENGINE ===
export interface MemoryRecord {
  id: string;
  type: 'interaction' | 'observation' | 'rumor' | 'event';
  subjectId: string;
  timestamp: number;
  emotionalImpact: number;  // -1 to 1
  details: Record<string, any>;
  strength: number;  // 0-1, decays over time
}

// === SOCIAL ENGINE ===
export interface Relationship {
  targetId: string;
  trust: number;       // -1 to 1
  familiarity: number; // 0-1
  lastInteraction: number;
}

export interface Rumor {
  id: string;
  sourceId: string;
  subjectId: string;
  content: string;
  sentiment: number;   // -1 to 1
  credibility: number; // 0-1
  timestamp: number;
  spreadCount: number;
}

// === COLLECTIVE DECISIONS ===
export interface CollectiveDecision {
  id: string;
  topic: string;
  options: string[];
  votes: Map<string, string>;
  deadline: number;
}

export interface Vote {
  npcId: string;
  option: string;
  confidence: number;
}

// === AGENTIC NPC ===
export interface AgenticNPC {
  id: string;
  name: string;
  factionId: string;
  position: Vector3;
  personality: NPCPersonality;
  needs: NeedsState;
  memories: MemoryRecord[];
  relationships: Map<string, Relationship>;
  knownRumors: Rumor[];
  currentActivity: string;
  schedule: DailySchedule;
}

export interface NPCPersonality {
  openness: number;      // 0-1, willingness to accept new ideas
  conscientiousness: number; // 0-1, reliability
  extraversion: number;  // 0-1, social energy
  agreeableness: number; // 0-1, cooperation
  neuroticism: number;   // 0-1, emotional volatility
}

export interface DailySchedule {
  [hour: number]: string;  // Activity for each hour
}

// === INTERACTION ===
export interface Interaction {
  type: 'trade' | 'conversation' | 'help' | 'conflict' | 'gift';
  initiatorId: string;
  targetId: string;
  outcome: 'positive' | 'neutral' | 'negative';
  timestamp: number;
  details?: Record<string, any>;
}

export interface DecisionOutcome {
  decisionId: string;
  winningOption: string;
  voteCount: Map<string, number>;
  participation: number;
}

// === CONFIGURATION ===
export interface AgenticNPCConfig {
  memoryDecayRate: number;      // Per hour
  needDecayRates: NeedsState;   // Per hour
  rumorPropagationTime: number; // Hours to spread
  maxMemories: number;
  maxRumors: number;
}

const DEFAULT_CONFIG: AgenticNPCConfig = {
  memoryDecayRate: 0.01,
  needDecayRates: { hunger: 5, rest: 4, safety: 2, social: 3, purpose: 1 },
  rumorPropagationTime: 24,
  maxMemories: 100,
  maxRumors: 50
};

export class AgenticNPCSystem {
  private npcs: Map<string, AgenticNPC> = new Map();
  private pendingRumors: Map<string, { rumor: Rumor; targets: string[]; spreadTime: number }> = new Map();
  private activeDecisions: Map<string, CollectiveDecision> = new Map();
  private config: AgenticNPCConfig;

  constructor(config: Partial<AgenticNPCConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // === NPC LIFECYCLE ===
  
  createNPC(data: Omit<AgenticNPC, 'needs' | 'memories' | 'relationships' | 'knownRumors'>): AgenticNPC {
    const npc: AgenticNPC = {
      ...data,
      needs: { hunger: 20, rest: 20, safety: 10, social: 30, purpose: 20 },
      memories: [],
      relationships: new Map(),
      knownRumors: []
    };
    this.npcs.set(npc.id, npc);
    return npc;
  }

  getNPC(id: string): AgenticNPC | undefined {
    return this.npcs.get(id);
  }

  getAllNPCs(): AgenticNPC[] {
    return Array.from(this.npcs.values());
  }

  // === NEEDS ENGINE (Requirement 7.1) ===

  evaluateNeeds(npcId: string): NeedPriority[] {
    const npc = this.npcs.get(npcId);
    if (!npc) return [];

    const priorities: NeedPriority[] = [];
    const needs = npc.needs;

    // Calculate urgency based on need level and personality
    if (needs.hunger > 60) {
      priorities.push({ need: 'hunger', urgency: needs.hunger / 100, action: 'find_food' });
    }
    if (needs.rest > 70) {
      priorities.push({ need: 'rest', urgency: needs.rest / 100, action: 'find_rest' });
    }
    if (needs.safety > 50) {
      priorities.push({ need: 'safety', urgency: needs.safety / 100 * (1 + npc.personality.neuroticism), action: 'seek_safety' });
    }
    if (needs.social > 60) {
      priorities.push({ need: 'social', urgency: needs.social / 100 * npc.personality.extraversion, action: 'socialize' });
    }
    if (needs.purpose > 70) {
      priorities.push({ need: 'purpose', urgency: needs.purpose / 100, action: 'find_work' });
    }

    // Sort by urgency
    return priorities.sort((a, b) => b.urgency - a.urgency);
  }

  satisfyNeed(npcId: string, need: NeedType, amount: number): void {
    const npc = this.npcs.get(npcId);
    if (!npc) return;
    npc.needs[need] = Math.max(0, npc.needs[need] - amount);
  }

  // === MEMORY ENGINE (Requirement 7.2) ===

  recordInteraction(npc: AgenticNPC, interaction: Interaction): MemoryRecord {
    const emotionalImpact = this.calculateEmotionalImpact(interaction, npc);
    
    const memory: MemoryRecord = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'interaction',
      subjectId: interaction.initiatorId === npc.id ? interaction.targetId : interaction.initiatorId,
      timestamp: interaction.timestamp,
      emotionalImpact,
      details: { interactionType: interaction.type, outcome: interaction.outcome, ...interaction.details },
      strength: 1.0
    };

    npc.memories.push(memory);
    
    // Trim old memories
    if (npc.memories.length > this.config.maxMemories) {
      npc.memories.sort((a, b) => b.strength - a.strength);
      npc.memories = npc.memories.slice(0, this.config.maxMemories);
    }

    // Update relationship
    this.updateRelationship(npc, memory.subjectId, emotionalImpact);

    return memory;
  }

  private calculateEmotionalImpact(interaction: Interaction, npc: AgenticNPC): number {
    let impact = 0;
    
    switch (interaction.outcome) {
      case 'positive': impact = 0.3; break;
      case 'negative': impact = -0.4; break;
      default: impact = 0;
    }

    // Personality modifiers
    if (interaction.type === 'gift') impact *= (1 + npc.personality.agreeableness);
    if (interaction.type === 'conflict') impact *= (1 + npc.personality.neuroticism);

    return Math.max(-1, Math.min(1, impact));
  }

  recallRelevant(npcId: string, context: string): MemoryRecord[] {
    const npc = this.npcs.get(npcId);
    if (!npc) return [];

    // Simple relevance: return strongest memories about the context subject
    return npc.memories
      .filter(m => m.strength > 0.1)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 10);
  }

  getPlayerImpression(npcId: string, playerId: string): number {
    const npc = this.npcs.get(npcId);
    if (!npc) return 0;

    const playerMemories = npc.memories.filter(m => m.subjectId === playerId);
    if (playerMemories.length === 0) return 0;

    const weightedSum = playerMemories.reduce((sum, m) => sum + m.emotionalImpact * m.strength, 0);
    const totalWeight = playerMemories.reduce((sum, m) => sum + m.strength, 0);
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  // === SOCIAL INTELLIGENCE (Requirement 7.3) ===

  spreadRumor(sourceNpc: AgenticNPC, rumor: Rumor): void {
    // Find connected NPCs (same faction or known relationships)
    const targets: string[] = [];
    
    for (const npc of this.npcs.values()) {
      if (npc.id === sourceNpc.id) continue;
      
      // Same faction = automatic connection
      if (npc.factionId === sourceNpc.factionId) {
        targets.push(npc.id);
        continue;
      }
      
      // Known relationship
      if (sourceNpc.relationships.has(npc.id)) {
        const rel = sourceNpc.relationships.get(npc.id)!;
        if (rel.trust > 0) {
          targets.push(npc.id);
        }
      }
    }

    // Queue rumor for propagation
    this.pendingRumors.set(rumor.id, {
      rumor,
      targets,
      spreadTime: Date.now() + this.config.rumorPropagationTime * 3600 * 1000
    });

    // Source NPC knows the rumor
    sourceNpc.knownRumors.push(rumor);
  }

  propagateRumors(currentTime: number): void {
    for (const [rumorId, pending] of this.pendingRumors) {
      if (currentTime >= pending.spreadTime) {
        for (const targetId of pending.targets) {
          const target = this.npcs.get(targetId);
          if (target && !target.knownRumors.find(r => r.id === rumorId)) {
            // Credibility degrades with each spread
            const degradedRumor = {
              ...pending.rumor,
              credibility: pending.rumor.credibility * 0.9,
              spreadCount: pending.rumor.spreadCount + 1
            };
            target.knownRumors.push(degradedRumor);
            
            // Trim old rumors
            if (target.knownRumors.length > this.config.maxRumors) {
              target.knownRumors.sort((a, b) => b.timestamp - a.timestamp);
              target.knownRumors = target.knownRumors.slice(0, this.config.maxRumors);
            }
          }
        }
        this.pendingRumors.delete(rumorId);
      }
    }
  }

  evaluateTrust(npcId: string, targetId: string): number {
    const npc = this.npcs.get(npcId);
    if (!npc) return 0;

    const relationship = npc.relationships.get(targetId);
    if (!relationship) return 0;

    return relationship.trust;
  }

  // === FACTION ALLEGIANCE (Requirement 7.4) ===

  updateFactionAllegiance(npcId: string, newFactionId: string): void {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    const oldFaction = npc.factionId;
    npc.factionId = newFactionId;

    // Create memory of faction change
    const memory: MemoryRecord = {
      id: `mem_faction_${Date.now()}`,
      type: 'event',
      subjectId: newFactionId,
      timestamp: Date.now(),
      emotionalImpact: 0.5,
      details: { oldFaction, newFaction: newFactionId },
      strength: 1.0
    };
    npc.memories.push(memory);

    // Adjust relationships based on faction change
    for (const [otherId, rel] of npc.relationships) {
      const other = this.npcs.get(otherId);
      if (other) {
        if (other.factionId === newFactionId) {
          rel.trust = Math.min(1, rel.trust + 0.2);
        } else if (other.factionId === oldFaction) {
          rel.trust = Math.max(-1, rel.trust - 0.3);
        }
      }
    }
  }

  // === COLLECTIVE DECISIONS (Requirement 7.5) ===

  startCollectiveDecision(decision: Omit<CollectiveDecision, 'votes'>): CollectiveDecision {
    const fullDecision: CollectiveDecision = {
      ...decision,
      votes: new Map()
    };
    this.activeDecisions.set(decision.id, fullDecision);
    return fullDecision;
  }

  participateInDecision(npcId: string, decisionId: string): Vote | null {
    const npc = this.npcs.get(npcId);
    const decision = this.activeDecisions.get(decisionId);
    if (!npc || !decision) return null;

    // NPC votes based on personality and faction loyalty
    const optionScores = decision.options.map(option => {
      let score = Math.random() * 0.5; // Base randomness
      
      // Personality influences
      if (option.includes('peace') || option.includes('cooperate')) {
        score += npc.personality.agreeableness * 0.3;
      }
      if (option.includes('change') || option.includes('new')) {
        score += npc.personality.openness * 0.3;
      }
      if (option.includes('tradition') || option.includes('maintain')) {
        score += npc.personality.conscientiousness * 0.3;
      }

      return { option, score };
    });

    optionScores.sort((a, b) => b.score - a.score);
    const chosen = optionScores[0];

    const vote: Vote = {
      npcId,
      option: chosen.option,
      confidence: chosen.score
    };

    decision.votes.set(npcId, chosen.option);
    return vote;
  }

  concludeDecision(decisionId: string): DecisionOutcome | null {
    const decision = this.activeDecisions.get(decisionId);
    if (!decision) return null;

    const voteCount = new Map<string, number>();
    for (const option of decision.options) {
      voteCount.set(option, 0);
    }
    for (const vote of decision.votes.values()) {
      voteCount.set(vote, (voteCount.get(vote) || 0) + 1);
    }

    let winningOption = decision.options[0];
    let maxVotes = 0;
    for (const [option, count] of voteCount) {
      if (count > maxVotes) {
        maxVotes = count;
        winningOption = option;
      }
    }

    const outcome: DecisionOutcome = {
      decisionId,
      winningOption,
      voteCount,
      participation: decision.votes.size / this.npcs.size
    };

    this.activeDecisions.delete(decisionId);
    return outcome;
  }

  // === UPDATE LOOP ===

  updateNPC(npcId: string, deltaTime: number): void {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    const hours = deltaTime / 3600;

    // Decay needs
    npc.needs.hunger = Math.min(100, npc.needs.hunger + this.config.needDecayRates.hunger * hours);
    npc.needs.rest = Math.min(100, npc.needs.rest + this.config.needDecayRates.rest * hours);
    npc.needs.social = Math.min(100, npc.needs.social + this.config.needDecayRates.social * hours);
    npc.needs.purpose = Math.min(100, npc.needs.purpose + this.config.needDecayRates.purpose * hours);

    // Decay memories
    for (const memory of npc.memories) {
      memory.strength = Math.max(0, memory.strength - this.config.memoryDecayRate * hours);
    }
    npc.memories = npc.memories.filter(m => m.strength > 0);
  }

  updateAll(deltaTime: number, currentTime: number): void {
    for (const npcId of this.npcs.keys()) {
      this.updateNPC(npcId, deltaTime);
    }
    this.propagateRumors(currentTime);
  }

  private updateRelationship(npc: AgenticNPC, targetId: string, impact: number): void {
    let rel = npc.relationships.get(targetId);
    if (!rel) {
      rel = { targetId, trust: 0, familiarity: 0, lastInteraction: Date.now() };
      npc.relationships.set(targetId, rel);
    }

    rel.trust = Math.max(-1, Math.min(1, rel.trust + impact * 0.2));
    rel.familiarity = Math.min(1, rel.familiarity + 0.1);
    rel.lastInteraction = Date.now();
  }

  // === SERIALIZATION ===

  serialize(): string {
    const data = {
      npcs: Array.from(this.npcs.entries()).map(([id, npc]) => ({
        ...npc,
        relationships: Array.from(npc.relationships.entries())
      })),
      pendingRumors: Array.from(this.pendingRumors.entries()),
      activeDecisions: Array.from(this.activeDecisions.entries()).map(([id, d]) => ({
        ...d,
        votes: Array.from(d.votes.entries())
      }))
    };
    return JSON.stringify(data);
  }

  deserialize(json: string): void {
    const data = JSON.parse(json);
    
    this.npcs.clear();
    for (const npcData of data.npcs) {
      const npc: AgenticNPC = {
        ...npcData,
        relationships: new Map(npcData.relationships)
      };
      this.npcs.set(npc.id, npc);
    }

    this.pendingRumors = new Map(data.pendingRumors);
    
    this.activeDecisions.clear();
    for (const decisionData of data.activeDecisions) {
      const decision: CollectiveDecision = {
        ...decisionData,
        votes: new Map(decisionData.votes)
      };
      this.activeDecisions.set(decision.id, decision);
    }
  }
}
