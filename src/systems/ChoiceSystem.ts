/**
 * Choice and Consequence Engine
 * Tracks player decisions and propagates consequences
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

export type DecisionTag = 'moral' | 'economic' | 'military' | 'social' | 'political' | 'survival';

export interface Decision {
  id: string;
  timestamp: number;
  day: number;
  description: string;
  tags: DecisionTag[];
  choice: string;
  alternatives: string[];
  context: Record<string, any>;
  consequences: Consequence[];
  processed: boolean;
}

export interface Consequence {
  id: string;
  type: 'immediate' | 'delayed' | 'conditional';
  delay?: number; // days until consequence triggers
  condition?: string; // condition expression
  effects: ConsequenceEffect[];
  triggered: boolean;
  triggerDay?: number;
}

export interface ConsequenceEffect {
  target: 'player' | 'faction' | 'npc' | 'world';
  targetId?: string;
  stat: string;
  value: number;
  operation: 'add' | 'multiply' | 'set';
}

export interface DecisionWeight {
  tag: DecisionTag;
  weight: number;
}

export interface EndingCondition {
  id: string;
  name: string;
  description: string;
  requirements: EndingRequirement[];
  priority: number;
}

export interface EndingRequirement {
  type: 'tag_count' | 'faction_attitude' | 'stat_value' | 'decision_made';
  tag?: DecisionTag;
  factionId?: string;
  stat?: string;
  decisionId?: string;
  comparison: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
}

export class ChoiceSystem {
  private decisions: Map<string, Decision> = new Map();
  private pendingConsequences: Consequence[] = [];
  private tagCounts: Map<DecisionTag, number> = new Map();
  private endingConditions: EndingCondition[] = [];
  private nextId: number = 1;

  constructor() {
    this.initializeEndingConditions();
  }


  private initializeEndingConditions(): void {
    this.endingConditions = [
      {
        id: 'hero_ending',
        name: 'The Hero',
        description: 'You became a legend, remembered for your selfless deeds.',
        requirements: [
          { type: 'tag_count', tag: 'moral', comparison: 'gte', value: 20 },
          { type: 'tag_count', tag: 'social', comparison: 'gte', value: 15 }
        ],
        priority: 10
      },
      {
        id: 'tyrant_ending',
        name: 'The Tyrant',
        description: 'You ruled with an iron fist. Fear was your greatest weapon.',
        requirements: [
          { type: 'tag_count', tag: 'military', comparison: 'gte', value: 25 },
          { type: 'tag_count', tag: 'moral', comparison: 'lt', value: 5 }
        ],
        priority: 10
      },
      {
        id: 'merchant_ending',
        name: 'The Merchant Prince',
        description: 'Gold flows through your fingers. You built an empire of trade.',
        requirements: [
          { type: 'tag_count', tag: 'economic', comparison: 'gte', value: 30 }
        ],
        priority: 8
      },
      {
        id: 'survivor_ending',
        name: 'The Survivor',
        description: 'Against all odds, you endured. That is enough.',
        requirements: [
          { type: 'tag_count', tag: 'survival', comparison: 'gte', value: 20 }
        ],
        priority: 5
      },
      {
        id: 'diplomat_ending',
        name: 'The Diplomat',
        description: 'Words were your weapons. Peace, your legacy.',
        requirements: [
          { type: 'tag_count', tag: 'political', comparison: 'gte', value: 20 },
          { type: 'tag_count', tag: 'social', comparison: 'gte', value: 15 }
        ],
        priority: 9
      },
      {
        id: 'default_ending',
        name: 'The Wanderer',
        description: 'Your story continues, unwritten.',
        requirements: [],
        priority: 0
      }
    ];
  }

  // Log a decision
  logDecision(
    description: string,
    choice: string,
    alternatives: string[],
    tags: DecisionTag[],
    day: number,
    context: Record<string, any> = {},
    consequences: Omit<Consequence, 'id' | 'triggered' | 'triggerDay'>[] = []
  ): Decision {
    const decisionId = `decision_${this.nextId++}`;
    
    const processedConsequences: Consequence[] = consequences.map((c, i) => ({
      ...c,
      id: `${decisionId}_consequence_${i}`,
      triggered: false
    }));

    const decision: Decision = {
      id: decisionId,
      timestamp: Date.now(),
      day,
      description,
      tags,
      choice,
      alternatives,
      context,
      consequences: processedConsequences,
      processed: false
    };

    this.decisions.set(decisionId, decision);

    // Update tag counts
    for (const tag of tags) {
      this.tagCounts.set(tag, (this.tagCounts.get(tag) || 0) + 1);
    }

    // Queue consequences
    for (const consequence of processedConsequences) {
      if (consequence.type === 'immediate') {
        consequence.triggered = true;
        consequence.triggerDay = day;
      } else if (consequence.type === 'delayed' && consequence.delay) {
        consequence.triggerDay = day + consequence.delay;
        this.pendingConsequences.push(consequence);
      } else if (consequence.type === 'conditional') {
        this.pendingConsequences.push(consequence);
      }
    }

    return decision;
  }

  // Process pending consequences
  processConsequences(currentDay: number, worldState: Record<string, any>): ConsequenceEffect[] {
    const triggeredEffects: ConsequenceEffect[] = [];

    for (const consequence of this.pendingConsequences) {
      if (consequence.triggered) continue;

      let shouldTrigger = false;

      if (consequence.type === 'delayed' && consequence.triggerDay) {
        shouldTrigger = currentDay >= consequence.triggerDay;
      } else if (consequence.type === 'conditional' && consequence.condition) {
        shouldTrigger = this.evaluateCondition(consequence.condition, worldState);
      }

      if (shouldTrigger) {
        consequence.triggered = true;
        consequence.triggerDay = currentDay;
        triggeredEffects.push(...consequence.effects);
      }
    }

    // Clean up triggered consequences
    this.pendingConsequences = this.pendingConsequences.filter(c => !c.triggered);

    return triggeredEffects;
  }

  private evaluateCondition(condition: string, worldState: Record<string, any>): boolean {
    // Simple condition evaluation (could be expanded)
    // Format: "key operator value" e.g., "faction.kingdom_north.attitude > 0.5"
    const parts = condition.split(' ');
    if (parts.length !== 3) return false;

    const [key, operator, valueStr] = parts;
    const value = parseFloat(valueStr);
    
    // Navigate nested keys
    const keyParts = key.split('.');
    let current: any = worldState;
    for (const part of keyParts) {
      if (current === undefined) return false;
      current = current[part];
    }

    if (typeof current !== 'number') return false;

    switch (operator) {
      case '>': return current > value;
      case '<': return current < value;
      case '>=': return current >= value;
      case '<=': return current <= value;
      case '==': return current === value;
      default: return false;
    }
  }


  // Get faction attitude changes based on decision tags
  calculateFactionAttitudeChange(factionId: string, tags: DecisionTag[], factionValues: Record<DecisionTag, number>): number {
    let change = 0;
    for (const tag of tags) {
      change += factionValues[tag] || 0;
    }
    return change;
  }

  // Get decisions by tag
  getDecisionsByTag(tag: DecisionTag): Decision[] {
    return Array.from(this.decisions.values()).filter(d => d.tags.includes(tag));
  }

  // Get all decisions
  getAllDecisions(): Decision[] {
    return Array.from(this.decisions.values());
  }

  // Get decision by ID
  getDecision(decisionId: string): Decision | undefined {
    return this.decisions.get(decisionId);
  }

  // Get tag counts
  getTagCounts(): Map<DecisionTag, number> {
    return new Map(this.tagCounts);
  }

  // Get tag count for specific tag
  getTagCount(tag: DecisionTag): number {
    return this.tagCounts.get(tag) || 0;
  }

  // Calculate decision profile
  getDecisionProfile(): Record<DecisionTag, number> {
    const total = Array.from(this.tagCounts.values()).reduce((sum, v) => sum + v, 0) || 1;
    const profile: Record<DecisionTag, number> = {
      moral: 0,
      economic: 0,
      military: 0,
      social: 0,
      political: 0,
      survival: 0
    };

    for (const [tag, count] of this.tagCounts) {
      profile[tag] = count / total;
    }

    return profile;
  }

  // Evaluate NPC trust based on decision history
  evaluateNPCTrust(npcValues: Record<DecisionTag, number>): number {
    let trust = 0;
    for (const [tag, count] of this.tagCounts) {
      trust += (npcValues[tag] || 0) * count * 0.01;
    }
    return Math.max(-1, Math.min(1, trust));
  }

  // Generate ending based on accumulated choices
  generateEnding(additionalState: Record<string, any> = {}): EndingCondition {
    const state = {
      tagCounts: Object.fromEntries(this.tagCounts),
      ...additionalState
    };

    // Sort by priority (highest first)
    const sortedEndings = [...this.endingConditions].sort((a, b) => b.priority - a.priority);

    for (const ending of sortedEndings) {
      if (this.checkEndingRequirements(ending, state)) {
        return ending;
      }
    }

    // Return default ending
    return this.endingConditions.find(e => e.id === 'default_ending')!;
  }

  private checkEndingRequirements(ending: EndingCondition, state: Record<string, any>): boolean {
    for (const req of ending.requirements) {
      if (!this.checkRequirement(req, state)) {
        return false;
      }
    }
    return true;
  }

  private checkRequirement(req: EndingRequirement, state: Record<string, any>): boolean {
    let value: number;

    switch (req.type) {
      case 'tag_count':
        value = this.tagCounts.get(req.tag!) || 0;
        break;
      case 'faction_attitude':
        value = state.factions?.[req.factionId!]?.attitude || 0;
        break;
      case 'stat_value':
        value = state.player?.[req.stat!] || 0;
        break;
      case 'decision_made':
        value = this.decisions.has(req.decisionId!) ? 1 : 0;
        break;
      default:
        return false;
    }

    switch (req.comparison) {
      case 'gt': return value > req.value;
      case 'lt': return value < req.value;
      case 'eq': return value === req.value;
      case 'gte': return value >= req.value;
      case 'lte': return value <= req.value;
      default: return false;
    }
  }

  // Add custom ending condition
  addEndingCondition(condition: EndingCondition): void {
    this.endingConditions.push(condition);
  }

  // Get pending consequences count
  getPendingConsequencesCount(): number {
    return this.pendingConsequences.length;
  }

  // Get decisions made on specific day
  getDecisionsOnDay(day: number): Decision[] {
    return Array.from(this.decisions.values()).filter(d => d.day === day);
  }

  // Get recent decisions
  getRecentDecisions(count: number): Decision[] {
    return Array.from(this.decisions.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  // Serialization
  serialize(): string {
    return JSON.stringify({
      decisions: Array.from(this.decisions.entries()),
      pendingConsequences: this.pendingConsequences,
      tagCounts: Array.from(this.tagCounts.entries()),
      nextId: this.nextId
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.decisions = new Map(parsed.decisions);
    this.pendingConsequences = parsed.pendingConsequences;
    this.tagCounts = new Map(parsed.tagCounts);
    this.nextId = parsed.nextId;
  }
}
