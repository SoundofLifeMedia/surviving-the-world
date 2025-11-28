/**
 * MEMORY AGENT — Tier 2 NPC AI Agent
 * Handles episodic memory, long-term grudges, trust system
 * JSON-driven, deterministic, emergent social behaviors
 */

export interface MemoryEvent {
  id: string;
  type: MemoryEventType;
  timestamp: number;
  actorId: string;
  targetId?: string;
  location?: { x: number; y: number; z: number };
  importance: number;  // 0-1
  emotionalImpact: number;  // -1 to 1
  details: Record<string, unknown>;
}

export type MemoryEventType =
  // Positive events
  | 'received_gift'
  | 'was_healed'
  | 'was_saved'
  | 'shared_meal'
  | 'helped_in_combat'
  | 'received_compliment'
  | 'trade_fair'
  // Negative events
  | 'was_attacked'
  | 'was_robbed'
  | 'was_insulted'
  | 'witnessed_murder'
  | 'betrayed'
  | 'trade_unfair'
  | 'property_damaged'
  // Neutral events
  | 'first_meeting'
  | 'conversation'
  | 'witnessed_event'
  | 'location_visited';

export interface Relationship {
  targetId: string;
  trust: number;        // -100 to 100
  familiarity: number;  // 0 to 100
  lastInteraction: number;
  memories: string[];   // Memory IDs
  disposition: Disposition;
}

export type Disposition = 
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close_friend'
  | 'rival'
  | 'enemy'
  | 'nemesis';

export interface NPCMemory {
  entityId: string;
  shortTermMemory: MemoryEvent[];  // Recent events (last hour)
  longTermMemory: MemoryEvent[];   // Important events
  relationships: Map<string, Relationship>;
  knownLocations: Map<string, LocationMemory>;
  personality: PersonalityTraits;
}

export interface LocationMemory {
  locationId: string;
  name: string;
  position: { x: number; y: number; z: number };
  visitCount: number;
  lastVisit: number;
  associations: string[];  // Memory IDs
  danger: number;  // 0-1
}

export interface PersonalityTraits {
  forgiveness: number;    // 0-1, how quickly grudges fade
  gratitude: number;      // 0-1, how much positive events matter
  suspicion: number;      // 0-1, initial distrust of strangers
  memory_strength: number; // 0-1, how well memories persist
}

// Trust impact values
const TRUST_IMPACTS: Record<MemoryEventType, number> = {
  received_gift: 15,
  was_healed: 25,
  was_saved: 40,
  shared_meal: 10,
  helped_in_combat: 30,
  received_compliment: 5,
  trade_fair: 8,
  was_attacked: -40,
  was_robbed: -50,
  was_insulted: -15,
  witnessed_murder: -30,
  betrayed: -60,
  trade_unfair: -20,
  property_damaged: -25,
  first_meeting: 0,
  conversation: 3,
  witnessed_event: 0,
  location_visited: 0
};

// Memory decay settings
const MEMORY_CONFIG = {
  shortTermCapacity: 20,
  longTermCapacity: 100,
  shortTermDuration: 3600,  // 1 hour in seconds
  importanceThreshold: 0.5, // Min importance for long-term
  trustDecayRate: 0.01,     // Per hour
  familiarityDecayRate: 0.005
};

export class MemoryAgent {
  private memories: Map<string, NPCMemory> = new Map();
  private globalEventLog: MemoryEvent[] = [];

  // === ENTITY MANAGEMENT ===

  registerEntity(entityId: string, personality?: Partial<PersonalityTraits>): void {
    this.memories.set(entityId, {
      entityId,
      shortTermMemory: [],
      longTermMemory: [],
      relationships: new Map(),
      knownLocations: new Map(),
      personality: {
        forgiveness: 0.5,
        gratitude: 0.5,
        suspicion: 0.3,
        memory_strength: 0.7,
        ...personality
      }
    });
  }

  removeEntity(entityId: string): void {
    this.memories.delete(entityId);
  }

  getMemory(entityId: string): NPCMemory | undefined {
    return this.memories.get(entityId);
  }

  // === MEMORY RECORDING ===

  recordEvent(
    observerId: string,
    event: Omit<MemoryEvent, 'id' | 'timestamp'>
  ): void {
    const memory = this.memories.get(observerId);
    if (!memory) return;

    const fullEvent: MemoryEvent = {
      ...event,
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    // Add to short-term memory
    memory.shortTermMemory.push(fullEvent);
    
    // Trim short-term if over capacity
    if (memory.shortTermMemory.length > MEMORY_CONFIG.shortTermCapacity) {
      memory.shortTermMemory.shift();
    }

    // Promote to long-term if important enough
    const adjustedImportance = fullEvent.importance * memory.personality.memory_strength;
    if (adjustedImportance >= MEMORY_CONFIG.importanceThreshold) {
      memory.longTermMemory.push(fullEvent);
      
      // Trim long-term if over capacity (remove oldest, least important)
      if (memory.longTermMemory.length > MEMORY_CONFIG.longTermCapacity) {
        memory.longTermMemory.sort((a, b) => 
          (b.importance * (1 - (Date.now() - b.timestamp) / 86400000)) -
          (a.importance * (1 - (Date.now() - a.timestamp) / 86400000))
        );
        memory.longTermMemory.pop();
      }
    }

    // Update relationship if event involves another entity
    if (fullEvent.actorId !== observerId) {
      this.updateRelationship(observerId, fullEvent.actorId, fullEvent);
    }

    // Log globally
    this.globalEventLog.push(fullEvent);
    if (this.globalEventLog.length > 1000) {
      this.globalEventLog.shift();
    }
  }

  // === RELATIONSHIP MANAGEMENT ===

  private updateRelationship(observerId: string, otherId: string, event: MemoryEvent): void {
    const memory = this.memories.get(observerId);
    if (!memory) return;

    let relationship = memory.relationships.get(otherId);
    
    if (!relationship) {
      relationship = {
        targetId: otherId,
        trust: -memory.personality.suspicion * 20, // Initial suspicion
        familiarity: 0,
        lastInteraction: Date.now(),
        memories: [],
        disposition: 'stranger'
      };
      memory.relationships.set(otherId, relationship);
    }

    // Calculate trust change
    let trustChange = TRUST_IMPACTS[event.type] || 0;
    
    // Apply personality modifiers
    if (trustChange > 0) {
      trustChange *= memory.personality.gratitude + 0.5;
    } else {
      trustChange *= (2 - memory.personality.forgiveness);
    }

    // Apply emotional impact
    trustChange *= (1 + Math.abs(event.emotionalImpact));

    // Update trust
    relationship.trust = Math.max(-100, Math.min(100, relationship.trust + trustChange));
    
    // Update familiarity
    relationship.familiarity = Math.min(100, relationship.familiarity + 5);
    
    // Update last interaction
    relationship.lastInteraction = Date.now();
    
    // Add memory reference
    relationship.memories.push(event.id);
    if (relationship.memories.length > 20) {
      relationship.memories.shift();
    }

    // Update disposition
    relationship.disposition = this.calculateDisposition(relationship);
  }

  private calculateDisposition(relationship: Relationship): Disposition {
    const { trust, familiarity } = relationship;

    if (trust < -60) return 'nemesis';
    if (trust < -30) return 'enemy';
    if (trust < -10) return 'rival';
    if (familiarity < 20) return 'stranger';
    if (trust < 20) return 'acquaintance';
    if (trust < 50) return 'friend';
    return 'close_friend';
  }

  getRelationship(entityId: string, otherId: string): Relationship | undefined {
    return this.memories.get(entityId)?.relationships.get(otherId);
  }

  getTrust(entityId: string, otherId: string): number {
    return this.getRelationship(entityId, otherId)?.trust ?? 0;
  }

  // === MEMORY QUERIES ===

  recallEvents(
    entityId: string,
    filter?: {
      type?: MemoryEventType;
      actorId?: string;
      minImportance?: number;
      maxAge?: number;
    }
  ): MemoryEvent[] {
    const memory = this.memories.get(entityId);
    if (!memory) return [];

    const allMemories = [...memory.shortTermMemory, ...memory.longTermMemory];
    const now = Date.now();

    return allMemories.filter(event => {
      if (filter?.type && event.type !== filter.type) return false;
      if (filter?.actorId && event.actorId !== filter.actorId) return false;
      if (filter?.minImportance && event.importance < filter.minImportance) return false;
      if (filter?.maxAge && (now - event.timestamp) > filter.maxAge * 1000) return false;
      return true;
    });
  }

  hasMemoryOf(entityId: string, otherId: string, eventType?: MemoryEventType): boolean {
    const events = this.recallEvents(entityId, { actorId: otherId, type: eventType });
    return events.length > 0;
  }

  getMostRecentMemory(entityId: string, otherId: string): MemoryEvent | undefined {
    const events = this.recallEvents(entityId, { actorId: otherId });
    return events.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  // === LOCATION MEMORY ===

  recordLocationVisit(
    entityId: string,
    locationId: string,
    name: string,
    position: { x: number; y: number; z: number },
    danger: number = 0
  ): void {
    const memory = this.memories.get(entityId);
    if (!memory) return;

    let location = memory.knownLocations.get(locationId);
    
    if (!location) {
      location = {
        locationId,
        name,
        position,
        visitCount: 0,
        lastVisit: 0,
        associations: [],
        danger: 0
      };
      memory.knownLocations.set(locationId, location);
    }

    location.visitCount++;
    location.lastVisit = Date.now();
    location.danger = (location.danger * 0.8) + (danger * 0.2); // Smooth danger update
  }

  getKnownLocations(entityId: string): LocationMemory[] {
    const memory = this.memories.get(entityId);
    return memory ? Array.from(memory.knownLocations.values()) : [];
  }

  // === MEMORY DECAY ===

  update(deltaTime: number): void {
    const now = Date.now();

    for (const memory of this.memories.values()) {
      // Decay short-term memories
      memory.shortTermMemory = memory.shortTermMemory.filter(event => 
        (now - event.timestamp) < MEMORY_CONFIG.shortTermDuration * 1000
      );

      // Decay relationships
      for (const relationship of memory.relationships.values()) {
        const hoursSinceInteraction = (now - relationship.lastInteraction) / 3600000;
        
        // Trust decays towards neutral
        if (relationship.trust > 0) {
          relationship.trust = Math.max(0, 
            relationship.trust - MEMORY_CONFIG.trustDecayRate * hoursSinceInteraction * deltaTime
          );
        } else if (relationship.trust < 0) {
          // Negative trust decays based on forgiveness
          const decayRate = MEMORY_CONFIG.trustDecayRate * memory.personality.forgiveness;
          relationship.trust = Math.min(0,
            relationship.trust + decayRate * hoursSinceInteraction * deltaTime
          );
        }

        // Familiarity decays
        relationship.familiarity = Math.max(0,
          relationship.familiarity - MEMORY_CONFIG.familiarityDecayRate * hoursSinceInteraction * deltaTime
        );

        // Update disposition
        relationship.disposition = this.calculateDisposition(relationship);
      }
    }
  }

  // === BEHAVIOR QUERIES ===

  shouldTrust(entityId: string, otherId: string): boolean {
    const trust = this.getTrust(entityId, otherId);
    return trust > 20;
  }

  shouldFear(entityId: string, otherId: string): boolean {
    const events = this.recallEvents(entityId, { actorId: otherId });
    const negativeEvents = events.filter(e => TRUST_IMPACTS[e.type] < -20);
    return negativeEvents.length > 0;
  }

  getDisposition(entityId: string, otherId: string): Disposition {
    return this.getRelationship(entityId, otherId)?.disposition ?? 'stranger';
  }

  // === SERIALIZATION ===

  serialize(): object {
    const memoriesArray: [string, object][] = [];
    
    for (const [id, memory] of this.memories) {
      memoriesArray.push([id, {
        ...memory,
        relationships: Array.from(memory.relationships.entries()),
        knownLocations: Array.from(memory.knownLocations.entries())
      }]);
    }

    return {
      memories: memoriesArray,
      globalEventLogCount: this.globalEventLog.length
    };
  }

  static deserialize(data: any): MemoryAgent {
    const agent = new MemoryAgent();
    
    for (const [id, memoryData] of data.memories) {
      const memory: NPCMemory = {
        ...memoryData,
        relationships: new Map(memoryData.relationships),
        knownLocations: new Map(memoryData.knownLocations)
      };
      agent.memories.set(id, memory);
    }
    
    return agent;
  }
}

export default MemoryAgent;
