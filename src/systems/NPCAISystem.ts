/**
 * NPC AI System
 * Utility-based AI for NPC decision-making, pathfinding, and interactions
 * Requirements: 9.2, 9.3, 9.4, 9.5
 */

import { NPC, NPCNeeds, Personality, MemoryRecord, NPCSystem, NPCAction } from './NPCSystem';

// Utility-based action evaluation
export interface ActionUtility {
  action: NPCAction;
  utility: number;
  target?: string;
  reason: string;
}

// Pathfinding node
export interface PathNode {
  location: string;
  gCost: number;
  hCost: number;
  fCost: number;
  parent: PathNode | null;
}

// Location graph for pathfinding
export interface LocationGraph {
  nodes: Map<string, string[]>; // location -> connected locations
  distances: Map<string, number>; // "loc1-loc2" -> distance
}

// Dialogue context
export interface DialogueContext {
  topic: string;
  playerReputation: number;
  recentEvents: string[];
  questAvailable: boolean;
}

// Dialogue response
export interface DialogueResponse {
  text: string;
  emotion: 'neutral' | 'happy' | 'angry' | 'sad' | 'fearful' | 'curious';
  options?: DialogueOption[];
}

export interface DialogueOption {
  text: string;
  action: string;
  requirements?: Record<string, number>;
}

export class NPCAISystem {
  private npcSystem: NPCSystem;
  private locationGraph: LocationGraph;
  private utilityWeights: Map<string, number> = new Map();

  constructor(npcSystem: NPCSystem) {
    this.npcSystem = npcSystem;
    this.locationGraph = { nodes: new Map(), distances: new Map() };
    this.initializeUtilityWeights();
    this.initializeDefaultLocations();
  }


  private initializeUtilityWeights(): void {
    // Base weights for need satisfaction
    this.utilityWeights.set('hunger_critical', 100);
    this.utilityWeights.set('hunger_low', 60);
    this.utilityWeights.set('rest_critical', 90);
    this.utilityWeights.set('rest_low', 50);
    this.utilityWeights.set('safety_critical', 95);
    this.utilityWeights.set('safety_low', 40);
    this.utilityWeights.set('social_low', 30);
    
    // Action base utilities
    this.utilityWeights.set('work_base', 25);
    this.utilityWeights.set('patrol_base', 20);
    this.utilityWeights.set('trade_base', 15);
    this.utilityWeights.set('idle_base', 5);
  }

  private initializeDefaultLocations(): void {
    // Default village layout
    const locations = ['home', 'market', 'tavern', 'church', 'blacksmith', 'farm', 'gate', 'well'];
    
    // Connect all locations (simplified)
    for (const loc of locations) {
      this.locationGraph.nodes.set(loc, locations.filter(l => l !== loc));
    }

    // Set distances
    const distances: [string, string, number][] = [
      ['home', 'market', 2],
      ['home', 'tavern', 3],
      ['market', 'tavern', 1],
      ['market', 'blacksmith', 2],
      ['church', 'market', 2],
      ['farm', 'market', 4],
      ['gate', 'market', 3],
      ['well', 'market', 1]
    ];

    for (const [a, b, dist] of distances) {
      this.locationGraph.distances.set(`${a}-${b}`, dist);
      this.locationGraph.distances.set(`${b}-${a}`, dist);
    }
  }

  // Utility-based action selection
  evaluateActions(npc: NPC): ActionUtility[] {
    const utilities: ActionUtility[] = [];

    // Evaluate each possible action
    utilities.push(this.evaluateEat(npc));
    utilities.push(this.evaluateSleep(npc));
    utilities.push(this.evaluateFlee(npc));
    utilities.push(this.evaluateAttack(npc));
    utilities.push(this.evaluateSocialize(npc));
    utilities.push(this.evaluateWork(npc));
    utilities.push(this.evaluatePatrol(npc));
    utilities.push(this.evaluateTrade(npc));
    utilities.push(this.evaluateIdle(npc));

    // Sort by utility
    return utilities.sort((a, b) => b.utility - a.utility);
  }

  private evaluateEat(npc: NPC): ActionUtility {
    const hunger = npc.needs.hunger;
    let utility = 0;
    let reason = '';

    if (hunger < 10) {
      utility = this.utilityWeights.get('hunger_critical')!;
      reason = 'Starving';
    } else if (hunger < 30) {
      utility = this.utilityWeights.get('hunger_low')!;
      reason = 'Hungry';
    } else {
      utility = Math.max(0, 30 - hunger) * 0.5;
      reason = 'Could eat';
    }

    return { action: 'eat', utility, reason };
  }

  private evaluateSleep(npc: NPC): ActionUtility {
    const rest = npc.needs.rest;
    let utility = 0;
    let reason = '';

    if (rest < 10) {
      utility = this.utilityWeights.get('rest_critical')!;
      reason = 'Exhausted';
    } else if (rest < 25) {
      utility = this.utilityWeights.get('rest_low')!;
      reason = 'Tired';
    } else {
      utility = Math.max(0, 25 - rest) * 0.3;
      reason = 'Could rest';
    }

    return { action: 'sleep', utility, reason };
  }

  private evaluateFlee(npc: NPC): ActionUtility {
    const safety = npc.needs.safety;
    const aggression = npc.personality.aggression;
    let utility = 0;
    let reason = '';

    if (safety < 20 && aggression < 0.5) {
      utility = this.utilityWeights.get('safety_critical')! * (1 - aggression);
      reason = 'Danger - fleeing';
    } else if (safety < 40 && aggression < 0.3) {
      utility = this.utilityWeights.get('safety_low')! * (1 - aggression);
      reason = 'Unsafe - considering retreat';
    }

    return { action: 'flee', utility, reason };
  }

  private evaluateAttack(npc: NPC): ActionUtility {
    const safety = npc.needs.safety;
    const aggression = npc.personality.aggression;
    let utility = 0;
    let reason = '';

    if (safety < 30 && aggression > 0.6) {
      utility = this.utilityWeights.get('safety_critical')! * aggression;
      reason = 'Danger - fighting back';
    } else if (aggression > 0.8 && Math.random() < 0.2) {
      utility = 30 * aggression;
      reason = 'Aggressive mood';
    }

    return { action: 'attack', utility, reason };
  }

  private evaluateSocialize(npc: NPC): ActionUtility {
    const social = npc.needs.social;
    const altruism = npc.personality.altruism;
    let utility = 0;
    let reason = '';

    if (social < 30) {
      utility = this.utilityWeights.get('social_low')! + altruism * 20;
      reason = 'Lonely';
    } else {
      utility = altruism * 15;
      reason = 'Feeling social';
    }

    return { action: 'socialize', utility, reason };
  }

  private evaluateWork(npc: NPC): ActionUtility {
    const lawfulness = npc.personality.lawfulness;
    const utility = this.utilityWeights.get('work_base')! + lawfulness * 20;
    return { action: 'work', utility, reason: 'Duty calls' };
  }

  private evaluatePatrol(npc: NPC): ActionUtility {
    const lawfulness = npc.personality.lawfulness;
    const aggression = npc.personality.aggression;
    const utility = this.utilityWeights.get('patrol_base')! + (lawfulness + aggression) * 10;
    return { action: 'patrol', utility, reason: 'Keeping watch' };
  }

  private evaluateTrade(npc: NPC): ActionUtility {
    const greed = npc.personality.greed;
    const utility = this.utilityWeights.get('trade_base')! + greed * 25;
    return { action: 'trade', utility, reason: 'Business opportunity' };
  }

  private evaluateIdle(npc: NPC): ActionUtility {
    return { action: 'idle', utility: this.utilityWeights.get('idle_base')!, reason: 'Nothing pressing' };
  }


  // Select best action
  selectBestAction(npc: NPC): ActionUtility {
    const utilities = this.evaluateActions(npc);
    return utilities[0];
  }

  // Pathfinding (A*)
  findPath(from: string, to: string): string[] {
    if (from === to) return [from];
    if (!this.locationGraph.nodes.has(from) || !this.locationGraph.nodes.has(to)) {
      return [];
    }

    const openSet: PathNode[] = [];
    const closedSet: Set<string> = new Set();

    const startNode: PathNode = {
      location: from,
      gCost: 0,
      hCost: this.estimateDistance(from, to),
      fCost: 0,
      parent: null
    };
    startNode.fCost = startNode.gCost + startNode.hCost;
    openSet.push(startNode);

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.fCost - b.fCost);
      const current = openSet.shift()!;

      if (current.location === to) {
        return this.reconstructPath(current);
      }

      closedSet.add(current.location);

      const neighbors = this.locationGraph.nodes.get(current.location) || [];
      for (const neighbor of neighbors) {
        if (closedSet.has(neighbor)) continue;

        const gCost = current.gCost + this.getDistance(current.location, neighbor);
        const hCost = this.estimateDistance(neighbor, to);
        const fCost = gCost + hCost;

        const existingNode = openSet.find(n => n.location === neighbor);
        if (existingNode) {
          if (gCost < existingNode.gCost) {
            existingNode.gCost = gCost;
            existingNode.fCost = fCost;
            existingNode.parent = current;
          }
        } else {
          openSet.push({
            location: neighbor,
            gCost,
            hCost,
            fCost,
            parent: current
          });
        }
      }
    }

    return []; // No path found
  }

  private getDistance(from: string, to: string): number {
    return this.locationGraph.distances.get(`${from}-${to}`) || 
           this.locationGraph.distances.get(`${to}-${from}`) || 
           1;
  }

  private estimateDistance(from: string, to: string): number {
    // Simple heuristic - could be improved with actual coordinates
    return this.getDistance(from, to);
  }

  private reconstructPath(node: PathNode): string[] {
    const path: string[] = [];
    let current: PathNode | null = node;
    while (current) {
      path.unshift(current.location);
      current = current.parent;
    }
    return path;
  }

  // Add location to graph
  addLocation(location: string, connections: string[]): void {
    this.locationGraph.nodes.set(location, connections);
    for (const conn of connections) {
      const existing = this.locationGraph.nodes.get(conn) || [];
      if (!existing.includes(location)) {
        existing.push(location);
        this.locationGraph.nodes.set(conn, existing);
      }
    }
  }

  setDistance(from: string, to: string, distance: number): void {
    this.locationGraph.distances.set(`${from}-${to}`, distance);
    this.locationGraph.distances.set(`${to}-${from}`, distance);
  }

  // NPC Interaction system
  interact(npcId: string, playerId: string, interactionType: 'talk' | 'trade' | 'help' | 'threaten'): {
    success: boolean;
    response: DialogueResponse;
    relationshipChange: number;
  } {
    const npc = this.npcSystem.getNPC(npcId);
    if (!npc) {
      return {
        success: false,
        response: { text: '...', emotion: 'neutral' },
        relationshipChange: 0
      };
    }

    const relationship = this.npcSystem.getRelationship(npcId, playerId);
    const trust = relationship?.trust || 0;

    let response: DialogueResponse;
    let relationshipChange = 0;

    switch (interactionType) {
      case 'talk':
        response = this.generateTalkResponse(npc, trust);
        relationshipChange = 0.02;
        break;
      case 'trade':
        response = this.generateTradeResponse(npc, trust);
        relationshipChange = trust > 0 ? 0.05 : 0.01;
        break;
      case 'help':
        response = this.generateHelpResponse(npc, trust);
        relationshipChange = 0.15;
        break;
      case 'threaten':
        response = this.generateThreatenResponse(npc, trust);
        relationshipChange = -0.2;
        break;
    }

    // Update relationship
    this.npcSystem.updateRelationship(npcId, playerId, relationshipChange);

    // Record memory
    this.npcSystem.recordMemory(npcId, {
      type: 'interaction',
      subject: playerId,
      sentiment: relationshipChange > 0 ? 0.5 : -0.5,
      details: `Player ${interactionType}`
    });

    return { success: true, response, relationshipChange };
  }

  private generateTalkResponse(npc: NPC, trust: number): DialogueResponse {
    if (trust < -0.5) {
      return {
        text: "I don't want to talk to you.",
        emotion: 'angry',
        options: [{ text: 'Leave', action: 'end' }]
      };
    } else if (trust < 0) {
      return {
        text: 'What do you want?',
        emotion: 'neutral',
        options: [
          { text: 'Ask about the area', action: 'info' },
          { text: 'Leave', action: 'end' }
        ]
      };
    } else if (trust < 0.5) {
      return {
        text: 'Hello there. How can I help you?',
        emotion: 'neutral',
        options: [
          { text: 'Ask about work', action: 'quest' },
          { text: 'Ask about rumors', action: 'rumors' },
          { text: 'Trade', action: 'trade' },
          { text: 'Leave', action: 'end' }
        ]
      };
    } else {
      return {
        text: 'Good to see you, friend! What brings you here?',
        emotion: 'happy',
        options: [
          { text: 'Ask for help', action: 'help' },
          { text: 'Ask about secrets', action: 'secrets' },
          { text: 'Trade', action: 'trade' },
          { text: 'Just chatting', action: 'chat' }
        ]
      };
    }
  }

  private generateTradeResponse(npc: NPC, trust: number): DialogueResponse {
    if (trust < -0.3) {
      return { text: "I won't trade with the likes of you.", emotion: 'angry' };
    }
    
    const greed = npc.personality.greed;
    if (greed > 0.7) {
      return { text: "Let's see your coin first.", emotion: 'curious' };
    }
    return { text: "Let's see what you've got.", emotion: 'neutral' };
  }

  private generateHelpResponse(npc: NPC, trust: number): DialogueResponse {
    const altruism = npc.personality.altruism;
    
    if (trust > 0.3 || altruism > 0.6) {
      return { text: "Of course, I'll help you!", emotion: 'happy' };
    } else if (trust > 0) {
      return { text: "What's in it for me?", emotion: 'curious' };
    }
    return { text: "Why should I help you?", emotion: 'neutral' };
  }

  private generateThreatenResponse(npc: NPC, trust: number): DialogueResponse {
    const aggression = npc.personality.aggression;
    
    if (aggression > 0.7) {
      return { text: "You dare threaten me?!", emotion: 'angry' };
    } else if (aggression > 0.4) {
      return { text: "Back off, or you'll regret it.", emotion: 'angry' };
    }
    return { text: "Please, don't hurt me!", emotion: 'fearful' };
  }

  // Generate contextual dialogue
  generateDialogue(npcId: string, context: DialogueContext): DialogueResponse {
    const npc = this.npcSystem.getNPC(npcId);
    if (!npc) return { text: '...', emotion: 'neutral' };

    const trust = this.npcSystem.getRelationship(npcId, 'player')?.trust || 0;

    // Check memories for relevant context
    const relevantMemories = npc.memory.filter(m => 
      context.recentEvents.some(e => m.details.includes(e))
    );

    let text = '';
    let emotion: DialogueResponse['emotion'] = 'neutral';

    // Topic-based responses
    switch (context.topic) {
      case 'weather':
        text = 'The weather has been strange lately...';
        break;
      case 'faction':
        text = trust > 0 
          ? `Our ${npc.factionId} has been busy. There's much happening.`
          : "I shouldn't discuss faction matters with outsiders.";
        emotion = trust > 0 ? 'neutral' : 'fearful';
        break;
      case 'quest':
        if (context.questAvailable && trust > -0.2) {
          text = "Actually, there is something you could help with...";
          emotion = 'curious';
        } else {
          text = "I don't have any work for you right now.";
        }
        break;
      default:
        text = this.generateTalkResponse(npc, trust).text;
    }

    // Modify based on recent memories
    if (relevantMemories.length > 0) {
      const avgSentiment = relevantMemories.reduce((sum, m) => sum + m.sentiment, 0) / relevantMemories.length;
      if (avgSentiment < -0.3) {
        text = "After what happened... " + text;
        emotion = 'sad';
      } else if (avgSentiment > 0.3) {
        text = "Given our history... " + text;
        emotion = 'happy';
      }
    }

    return { text, emotion };
  }

  // Update all NPCs
  updateAllNPCs(deltaHours: number, currentHour: number): Map<string, ActionUtility> {
    const actions: Map<string, ActionUtility> = new Map();
    
    for (const npc of this.npcSystem.getAllNPCs()) {
      // Update via base system
      this.npcSystem.updateNPC(npc.id, deltaHours, currentHour);
      
      // Get AI decision
      const action = this.selectBestAction(npc);
      actions.set(npc.id, action);
    }

    return actions;
  }
}
