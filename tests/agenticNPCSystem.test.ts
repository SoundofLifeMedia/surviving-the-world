/**
 * AgenticNPCSystem Tests
 * Feature: surviving-the-world
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 * Properties: 17, 18, 19
 */

import { 
  AgenticNPCSystem, 
  AgenticNPC, 
  Interaction, 
  Rumor,
  NPCPersonality,
  DailySchedule
} from '../src/systems/AgenticNPCSystem';
import * as fc from 'fast-check';

// Arbitraries for property tests
const personalityArb = fc.record({
  openness: fc.float({ min: 0, max: 1 }),
  conscientiousness: fc.float({ min: 0, max: 1 }),
  extraversion: fc.float({ min: 0, max: 1 }),
  agreeableness: fc.float({ min: 0, max: 1 }),
  neuroticism: fc.float({ min: 0, max: 1 })
});

const positionArb = fc.record({
  x: fc.float({ min: -1000, max: 1000 }),
  y: fc.float({ min: -1000, max: 1000 }),
  z: fc.float({ min: -1000, max: 1000 })
});

const scheduleArb: fc.Arbitrary<DailySchedule> = fc.dictionary(
  fc.integer({ min: 0, max: 23 }).map(String),
  fc.constantFrom('sleep', 'work', 'eat', 'socialize', 'patrol')
).map(obj => {
  const schedule: DailySchedule = {};
  for (const [key, value] of Object.entries(obj)) {
    schedule[parseInt(key)] = value;
  }
  return schedule;
});

describe('AgenticNPCSystem', () => {
  let system: AgenticNPCSystem;

  beforeEach(() => {
    system = new AgenticNPCSystem();
  });

  describe('Property 17: NPC intelligence engine initialization', () => {
    it('*For any* NPC created, all intelligence engines are initialized with valid states', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        personalityArb,
        positionArb,
        (id, name, factionId, personality, position) => {
          const npc = system.createNPC({
            id,
            name,
            factionId,
            position,
            personality,
            currentActivity: 'idle',
            schedule: {}
          });

          // Needs Engine initialized
          expect(npc.needs).toBeDefined();
          expect(npc.needs.hunger).toBeGreaterThanOrEqual(0);
          expect(npc.needs.hunger).toBeLessThanOrEqual(100);
          expect(npc.needs.rest).toBeGreaterThanOrEqual(0);
          expect(npc.needs.safety).toBeGreaterThanOrEqual(0);
          expect(npc.needs.social).toBeGreaterThanOrEqual(0);
          expect(npc.needs.purpose).toBeGreaterThanOrEqual(0);

          // Memory Engine initialized
          expect(npc.memories).toBeDefined();
          expect(Array.isArray(npc.memories)).toBe(true);

          // Social Intelligence Engine initialized
          expect(npc.relationships).toBeDefined();
          expect(npc.relationships instanceof Map).toBe(true);

          // Reputation behavior initialized (via knownRumors)
          expect(npc.knownRumors).toBeDefined();
          expect(Array.isArray(npc.knownRumors)).toBe(true);

          return true;
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 18: Interaction memory recording', () => {
    it('*For any* player-NPC interaction, Memory Engine creates record with required fields', () => {
      fc.assert(fc.property(
        fc.constantFrom('trade', 'conversation', 'help', 'conflict', 'gift') as fc.Arbitrary<'trade' | 'conversation' | 'help' | 'conflict' | 'gift'>,
        fc.constantFrom('positive', 'neutral', 'negative') as fc.Arbitrary<'positive' | 'neutral' | 'negative'>,
        (interactionType, outcome) => {
          const npc = system.createNPC({
            id: 'npc_1',
            name: 'Test NPC',
            factionId: 'faction_1',
            position: { x: 0, y: 0, z: 0 },
            personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
            currentActivity: 'idle',
            schedule: {}
          });

          const interaction: Interaction = {
            type: interactionType,
            initiatorId: 'player_1',
            targetId: npc.id,
            outcome,
            timestamp: Date.now()
          };

          const memory = system.recordInteraction(npc, interaction);

          // Required fields present
          expect(memory.id).toBeDefined();
          expect(memory.type).toBe('interaction');
          expect(memory.subjectId).toBe('player_1');
          expect(memory.timestamp).toBe(interaction.timestamp);
          expect(memory.emotionalImpact).toBeGreaterThanOrEqual(-1);
          expect(memory.emotionalImpact).toBeLessThanOrEqual(1);
          expect(memory.details.interactionType).toBe(interactionType);
          expect(memory.details.outcome).toBe(outcome);
          expect(memory.strength).toBe(1.0);

          return true;
        }
      ), { numRuns: 30 });
    });

    it('positive interactions create positive emotional impact', () => {
      const npc = system.createNPC({
        id: 'npc_1',
        name: 'Test NPC',
        factionId: 'faction_1',
        position: { x: 0, y: 0, z: 0 },
        personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
        currentActivity: 'idle',
        schedule: {}
      });

      const interaction: Interaction = {
        type: 'gift',
        initiatorId: 'player_1',
        targetId: npc.id,
        outcome: 'positive',
        timestamp: Date.now()
      };

      const memory = system.recordInteraction(npc, interaction);
      expect(memory.emotionalImpact).toBeGreaterThan(0);
    });

    it('negative interactions create negative emotional impact', () => {
      const npc = system.createNPC({
        id: 'npc_1',
        name: 'Test NPC',
        factionId: 'faction_1',
        position: { x: 0, y: 0, z: 0 },
        personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
        currentActivity: 'idle',
        schedule: {}
      });

      const interaction: Interaction = {
        type: 'conflict',
        initiatorId: 'player_1',
        targetId: npc.id,
        outcome: 'negative',
        timestamp: Date.now()
      };

      const memory = system.recordInteraction(npc, interaction);
      expect(memory.emotionalImpact).toBeLessThan(0);
    });
  });

  describe('Property 19: Rumor propagation through networks', () => {
    it('*For any* rumor spread by NPC, propagates to connected NPCs', () => {
      // Create NPCs in same faction (connected)
      const npc1 = system.createNPC({
        id: 'npc_1',
        name: 'Source NPC',
        factionId: 'faction_1',
        position: { x: 0, y: 0, z: 0 },
        personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
        currentActivity: 'idle',
        schedule: {}
      });

      const npc2 = system.createNPC({
        id: 'npc_2',
        name: 'Target NPC',
        factionId: 'faction_1', // Same faction = connected
        position: { x: 10, y: 0, z: 0 },
        personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
        currentActivity: 'idle',
        schedule: {}
      });

      const rumor: Rumor = {
        id: 'rumor_1',
        sourceId: npc1.id,
        subjectId: 'player_1',
        content: 'The player helped the village',
        sentiment: 0.8,
        credibility: 1.0,
        timestamp: Date.now(),
        spreadCount: 0
      };

      system.spreadRumor(npc1, rumor);

      // Source knows rumor immediately
      expect(npc1.knownRumors.find(r => r.id === rumor.id)).toBeDefined();

      // Propagate (simulate time passing)
      const futureTime = Date.now() + 25 * 3600 * 1000; // 25 hours later
      system.propagateRumors(futureTime);

      // Target should now know rumor
      const targetNpc = system.getNPC('npc_2')!;
      expect(targetNpc.knownRumors.find(r => r.id === rumor.id)).toBeDefined();
    });

    it('rumor credibility degrades with each spread', () => {
      const npc1 = system.createNPC({
        id: 'npc_1',
        name: 'Source',
        factionId: 'faction_1',
        position: { x: 0, y: 0, z: 0 },
        personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
        currentActivity: 'idle',
        schedule: {}
      });

      const npc2 = system.createNPC({
        id: 'npc_2',
        name: 'Target',
        factionId: 'faction_1',
        position: { x: 10, y: 0, z: 0 },
        personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
        currentActivity: 'idle',
        schedule: {}
      });

      const rumor: Rumor = {
        id: 'rumor_1',
        sourceId: npc1.id,
        subjectId: 'player_1',
        content: 'Test rumor',
        sentiment: 0.5,
        credibility: 1.0,
        timestamp: Date.now(),
        spreadCount: 0
      };

      system.spreadRumor(npc1, rumor);
      system.propagateRumors(Date.now() + 25 * 3600 * 1000);

      const targetNpc = system.getNPC('npc_2')!;
      const receivedRumor = targetNpc.knownRumors.find(r => r.id === rumor.id);
      
      expect(receivedRumor).toBeDefined();
      expect(receivedRumor!.credibility).toBeLessThan(1.0);
      expect(receivedRumor!.spreadCount).toBeGreaterThan(0);
    });
  });

  describe('Needs Engine (Requirement 7.1)', () => {
    it('evaluates needs and returns priorities', () => {
      const npc = system.createNPC({
        id: 'npc_1',
        name: 'Test NPC',
        factionId: 'faction_1',
        position: { x: 0, y: 0, z: 0 },
        personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
        currentActivity: 'idle',
        schedule: {}
      });

      // Set high hunger
      npc.needs.hunger = 80;
      
      const priorities = system.evaluateNeeds(npc.id);
      
      expect(priorities.length).toBeGreaterThan(0);
      expect(priorities[0].need).toBe('hunger');
      expect(priorities[0].action).toBe('find_food');
    });

    it('satisfyNeed reduces need level', () => {
      const npc = system.createNPC({
        id: 'npc_1',
        name: 'Test NPC',
        factionId: 'faction_1',
        position: { x: 0, y: 0, z: 0 },
        personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
        currentActivity: 'idle',
        schedule: {}
      });

      npc.needs.hunger = 80;
      system.satisfyNeed(npc.id, 'hunger', 50);
      
      expect(npc.needs.hunger).toBe(30);
    });
  });

  describe('Faction Allegiance (Requirement 7.4)', () => {
    it('updates faction and adjusts relationships', () => {
      const npc1 = system.createNPC({
        id: 'npc_1',
        name: 'Switcher',
        factionId: 'faction_1',
        position: { x: 0, y: 0, z: 0 },
        personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
        currentActivity: 'idle',
        schedule: {}
      });

      const npc2 = system.createNPC({
        id: 'npc_2',
        name: 'New Faction Member',
        factionId: 'faction_2',
        position: { x: 10, y: 0, z: 0 },
        personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
        currentActivity: 'idle',
        schedule: {}
      });

      // Establish relationship
      npc1.relationships.set('npc_2', { targetId: 'npc_2', trust: 0, familiarity: 0.5, lastInteraction: Date.now() });

      // Switch faction
      system.updateFactionAllegiance('npc_1', 'faction_2');

      expect(npc1.factionId).toBe('faction_2');
      expect(npc1.relationships.get('npc_2')!.trust).toBeGreaterThan(0); // Trust increased
    });

    it('creates memory of faction change', () => {
      const npc = system.createNPC({
        id: 'npc_1',
        name: 'Switcher',
        factionId: 'faction_1',
        position: { x: 0, y: 0, z: 0 },
        personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
        currentActivity: 'idle',
        schedule: {}
      });

      system.updateFactionAllegiance('npc_1', 'faction_2');

      const factionMemory = npc.memories.find(m => m.type === 'event' && m.details.newFaction === 'faction_2');
      expect(factionMemory).toBeDefined();
    });
  });

  describe('Collective Decisions (Requirement 7.5)', () => {
    it('NPCs participate in decisions based on personality', () => {
      const npc = system.createNPC({
        id: 'npc_1',
        name: 'Voter',
        factionId: 'faction_1',
        position: { x: 0, y: 0, z: 0 },
        personality: { openness: 0.9, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.9, neuroticism: 0.1 },
        currentActivity: 'idle',
        schedule: {}
      });

      const decision = system.startCollectiveDecision({
        id: 'decision_1',
        topic: 'Village Policy',
        options: ['peace_treaty', 'war_declaration', 'maintain_status'],
        deadline: Date.now() + 3600000
      });

      const vote = system.participateInDecision('npc_1', 'decision_1');

      expect(vote).not.toBeNull();
      expect(decision.options).toContain(vote!.option);
      expect(vote!.confidence).toBeGreaterThan(0);
    });

    it('concludeDecision returns winning option', () => {
      // Create multiple NPCs
      for (let i = 0; i < 5; i++) {
        system.createNPC({
          id: `npc_${i}`,
          name: `Voter ${i}`,
          factionId: 'faction_1',
          position: { x: i * 10, y: 0, z: 0 },
          personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
          currentActivity: 'idle',
          schedule: {}
        });
      }

      system.startCollectiveDecision({
        id: 'decision_1',
        topic: 'Test',
        options: ['option_a', 'option_b'],
        deadline: Date.now() + 3600000
      });

      // All NPCs vote
      for (let i = 0; i < 5; i++) {
        system.participateInDecision(`npc_${i}`, 'decision_1');
      }

      const outcome = system.concludeDecision('decision_1');

      expect(outcome).not.toBeNull();
      expect(['option_a', 'option_b']).toContain(outcome!.winningOption);
      expect(outcome!.participation).toBeGreaterThan(0);
    });
  });

  describe('Update Loop', () => {
    it('needs decay over time', () => {
      const npc = system.createNPC({
        id: 'npc_1',
        name: 'Test NPC',
        factionId: 'faction_1',
        position: { x: 0, y: 0, z: 0 },
        personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
        currentActivity: 'idle',
        schedule: {}
      });

      const initialHunger = npc.needs.hunger;
      
      // Simulate 1 hour
      system.updateNPC('npc_1', 3600);

      expect(npc.needs.hunger).toBeGreaterThan(initialHunger);
    });

    it('memories decay over time', () => {
      const npc = system.createNPC({
        id: 'npc_1',
        name: 'Test NPC',
        factionId: 'faction_1',
        position: { x: 0, y: 0, z: 0 },
        personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
        currentActivity: 'idle',
        schedule: {}
      });

      const interaction: Interaction = {
        type: 'conversation',
        initiatorId: 'player_1',
        targetId: npc.id,
        outcome: 'positive',
        timestamp: Date.now()
      };

      system.recordInteraction(npc, interaction);
      const initialStrength = npc.memories[0].strength;

      // Simulate 10 hours
      system.updateNPC('npc_1', 36000);

      expect(npc.memories[0].strength).toBeLessThan(initialStrength);
    });
  });

  describe('Serialization', () => {
    it('serialize/deserialize preserves state', () => {
      const npc = system.createNPC({
        id: 'npc_1',
        name: 'Test NPC',
        factionId: 'faction_1',
        position: { x: 10, y: 20, z: 30 },
        personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
        currentActivity: 'working',
        schedule: { 6: 'work', 12: 'eat', 18: 'socialize' }
      });

      const interaction: Interaction = {
        type: 'trade',
        initiatorId: 'player_1',
        targetId: npc.id,
        outcome: 'positive',
        timestamp: Date.now()
      };
      system.recordInteraction(npc, interaction);

      const serialized = system.serialize();
      
      const newSystem = new AgenticNPCSystem();
      newSystem.deserialize(serialized);

      const restoredNpc = newSystem.getNPC('npc_1');
      expect(restoredNpc).toBeDefined();
      expect(restoredNpc!.name).toBe('Test NPC');
      expect(restoredNpc!.factionId).toBe('faction_1');
      expect(restoredNpc!.memories.length).toBe(1);
    });
  });
});
