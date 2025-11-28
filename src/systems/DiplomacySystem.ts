/**
 * Diplomacy System
 * Handles alliances, wars, trade agreements, and diplomatic events
 * Requirements: 3.3, 3.4, 3.5
 */

import { Faction, FactionSystem } from './FactionSystem';

export type DiplomaticStatus = 'neutral' | 'friendly' | 'allied' | 'hostile' | 'at_war';

export interface TradeAgreement {
  id: string;
  faction1: string;
  faction2: string;
  terms: TradeTerm[];
  duration: number; // days
  startDay: number;
  active: boolean;
}

export interface TradeTerm {
  fromFaction: string;
  resource: 'food' | 'gold' | 'manpower';
  amount: number;
  frequency: 'daily' | 'weekly';
}

export interface Alliance {
  id: string;
  members: string[];
  leader: string;
  formedDay: number;
  mutualDefense: boolean;
  sharedEnemies: string[];
}

export interface War {
  id: string;
  aggressors: string[];
  defenders: string[];
  startDay: number;
  endDay: number | null;
  casualties: Map<string, number>;
  territoryChanges: TerritoryChange[];
  warScore: Map<string, number>;
}

export interface TerritoryChange {
  region: string;
  fromFaction: string;
  toFaction: string;
  day: number;
}

export interface DiplomaticEvent {
  type: 'alliance_proposed' | 'alliance_formed' | 'alliance_broken' | 
        'war_declared' | 'peace_treaty' | 'trade_agreement' | 
        'trade_broken' | 'tribute_paid' | 'insult' | 'gift';
  initiator: string;
  target: string;
  day: number;
  details: Record<string, any>;
}

export class DiplomacySystem {
  private factionSystem: FactionSystem;
  private alliances: Map<string, Alliance> = new Map();
  private wars: Map<string, War> = new Map();
  private tradeAgreements: Map<string, TradeAgreement> = new Map();
  private eventLog: DiplomaticEvent[] = [];
  private nextId: number = 1;

  constructor(factionSystem: FactionSystem) {
    this.factionSystem = factionSystem;
  }


  // Status calculation
  getStatus(faction1: string, faction2: string): DiplomaticStatus {
    // Check war
    for (const war of this.wars.values()) {
      if (!war.endDay) {
        const f1Aggressor = war.aggressors.includes(faction1);
        const f1Defender = war.defenders.includes(faction1);
        const f2Aggressor = war.aggressors.includes(faction2);
        const f2Defender = war.defenders.includes(faction2);
        
        if ((f1Aggressor && f2Defender) || (f1Defender && f2Aggressor)) {
          return 'at_war';
        }
      }
    }

    // Check alliance
    for (const alliance of this.alliances.values()) {
      if (alliance.members.includes(faction1) && alliance.members.includes(faction2)) {
        return 'allied';
      }
    }

    // Check relations
    const relation = this.factionSystem.getRelation(faction1, faction2);
    if (relation > 0.5) return 'friendly';
    if (relation < -0.5) return 'hostile';
    return 'neutral';
  }

  // Attitude calculation with modifiers
  calculateAttitude(faction1: string, faction2: string): number {
    const f1 = this.factionSystem.getFaction(faction1);
    const f2 = this.factionSystem.getFaction(faction2);
    if (!f1 || !f2) return 0;

    let attitude = f1.relations.get(faction2) || 0;

    // Alliance bonus
    if (this.areAllied(faction1, faction2)) {
      attitude += 0.3;
    }

    // Shared enemy bonus
    const sharedEnemies = f1.atWar.filter(e => f2.atWar.includes(e));
    attitude += sharedEnemies.length * 0.1;

    // Trade agreement bonus
    if (this.hasTradeAgreement(faction1, faction2)) {
      attitude += 0.15;
    }

    // Personality compatibility
    const personalityMatch = 1 - Math.abs(f1.personality.aggression - f2.personality.aggression);
    attitude += (personalityMatch - 0.5) * 0.1;

    return Math.max(-1, Math.min(1, attitude));
  }

  // Alliance management
  proposeAlliance(initiator: string, target: string, mutualDefense: boolean): boolean {
    const attitude = this.calculateAttitude(target, initiator);
    const targetFaction = this.factionSystem.getFaction(target);
    
    if (!targetFaction) return false;

    // Acceptance based on attitude and diplomacy personality
    const acceptanceThreshold = 0.3 - (targetFaction.personality.diplomacy * 0.2);
    
    if (attitude >= acceptanceThreshold) {
      return this.formAlliance([initiator, target], initiator, mutualDefense);
    }

    this.logEvent({
      type: 'alliance_proposed',
      initiator,
      target,
      day: 0, // Would come from world state
      details: { accepted: false, mutualDefense }
    });

    return false;
  }

  formAlliance(members: string[], leader: string, mutualDefense: boolean): boolean {
    const allianceId = `alliance_${this.nextId++}`;
    
    const alliance: Alliance = {
      id: allianceId,
      members,
      leader,
      formedDay: 0,
      mutualDefense,
      sharedEnemies: []
    };

    this.alliances.set(allianceId, alliance);

    // Update faction allies
    for (const member of members) {
      const faction = this.factionSystem.getFaction(member);
      if (faction) {
        for (const other of members) {
          if (other !== member && !faction.allies.includes(other)) {
            faction.allies.push(other);
          }
        }
      }
    }

    this.logEvent({
      type: 'alliance_formed',
      initiator: leader,
      target: members.filter(m => m !== leader).join(','),
      day: 0,
      details: { allianceId, mutualDefense }
    });

    return true;
  }

  breakAlliance(allianceId: string, initiator: string): boolean {
    const alliance = this.alliances.get(allianceId);
    if (!alliance) return false;

    // Remove from faction allies
    for (const member of alliance.members) {
      const faction = this.factionSystem.getFaction(member);
      if (faction) {
        faction.allies = faction.allies.filter(a => !alliance.members.includes(a) || a === member);
      }
    }

    this.alliances.delete(allianceId);

    // Relation penalty for breaking alliance
    for (const member of alliance.members) {
      if (member !== initiator) {
        this.factionSystem.updateDiplomacy(member, initiator, -0.3);
      }
    }

    this.logEvent({
      type: 'alliance_broken',
      initiator,
      target: alliance.members.filter(m => m !== initiator).join(','),
      day: 0,
      details: { allianceId }
    });

    return true;
  }

  areAllied(faction1: string, faction2: string): boolean {
    for (const alliance of this.alliances.values()) {
      if (alliance.members.includes(faction1) && alliance.members.includes(faction2)) {
        return true;
      }
    }
    return false;
  }

  getAlliance(factionId: string): Alliance | null {
    for (const alliance of this.alliances.values()) {
      if (alliance.members.includes(factionId)) {
        return alliance;
      }
    }
    return null;
  }


  // War management
  declareWar(aggressor: string, defender: string, currentDay: number): War | null {
    // Check if already at war
    if (this.areAtWar(aggressor, defender)) return null;

    // Break any alliance between them
    const alliance = this.getAlliance(aggressor);
    if (alliance && alliance.members.includes(defender)) {
      this.breakAlliance(alliance.id, aggressor);
    }

    const warId = `war_${this.nextId++}`;
    const war: War = {
      id: warId,
      aggressors: [aggressor],
      defenders: [defender],
      startDay: currentDay,
      endDay: null,
      casualties: new Map([[aggressor, 0], [defender, 0]]),
      territoryChanges: [],
      warScore: new Map([[aggressor, 0], [defender, 0]])
    };

    // Call allies to war (mutual defense)
    const defenderAlliance = this.getAlliance(defender);
    if (defenderAlliance?.mutualDefense) {
      for (const ally of defenderAlliance.members) {
        if (ally !== defender && !war.defenders.includes(ally)) {
          war.defenders.push(ally);
          war.casualties.set(ally, 0);
          war.warScore.set(ally, 0);
        }
      }
    }

    this.wars.set(warId, war);

    // Update faction war lists
    const aggressorFaction = this.factionSystem.getFaction(aggressor);
    const defenderFaction = this.factionSystem.getFaction(defender);
    
    if (aggressorFaction && !aggressorFaction.atWar.includes(defender)) {
      aggressorFaction.atWar.push(defender);
    }
    if (defenderFaction && !defenderFaction.atWar.includes(aggressor)) {
      defenderFaction.atWar.push(aggressor);
    }

    // Major relation penalty
    this.factionSystem.updateDiplomacy(aggressor, defender, -0.5);

    this.logEvent({
      type: 'war_declared',
      initiator: aggressor,
      target: defender,
      day: currentDay,
      details: { warId, defenders: war.defenders }
    });

    return war;
  }

  negotiatePeace(warId: string, initiator: string, currentDay: number): boolean {
    const war = this.wars.get(warId);
    if (!war || war.endDay) return false;

    // Calculate war score to determine terms
    const initiatorScore = war.warScore.get(initiator) || 0;
    const isAggressor = war.aggressors.includes(initiator);
    const opponents = isAggressor ? war.defenders : war.aggressors;

    // Peace acceptance based on war score
    let acceptPeace = false;
    for (const opponent of opponents) {
      const opponentScore = war.warScore.get(opponent) || 0;
      const opponentFaction = this.factionSystem.getFaction(opponent);
      
      if (!opponentFaction) continue;

      // Accept if losing or war-weary
      if (opponentScore < initiatorScore - 20) {
        acceptPeace = true;
      } else if (opponentFaction.personality.riskAversion > 0.6) {
        acceptPeace = true;
      }
    }

    if (!acceptPeace) return false;

    // End war
    war.endDay = currentDay;

    // Remove from faction war lists
    for (const faction of [...war.aggressors, ...war.defenders]) {
      const f = this.factionSystem.getFaction(faction);
      if (f) {
        f.atWar = f.atWar.filter(e => 
          !war.aggressors.includes(e) && !war.defenders.includes(e)
        );
      }
    }

    this.logEvent({
      type: 'peace_treaty',
      initiator,
      target: opponents.join(','),
      day: currentDay,
      details: { warId, warScore: Object.fromEntries(war.warScore) }
    });

    return true;
  }

  areAtWar(faction1: string, faction2: string): boolean {
    for (const war of this.wars.values()) {
      if (war.endDay) continue;
      
      const f1Aggressor = war.aggressors.includes(faction1);
      const f1Defender = war.defenders.includes(faction1);
      const f2Aggressor = war.aggressors.includes(faction2);
      const f2Defender = war.defenders.includes(faction2);
      
      if ((f1Aggressor && f2Defender) || (f1Defender && f2Aggressor)) {
        return true;
      }
    }
    return false;
  }

  updateWarScore(warId: string, faction: string, delta: number): void {
    const war = this.wars.get(warId);
    if (!war) return;
    
    const current = war.warScore.get(faction) || 0;
    war.warScore.set(faction, current + delta);
  }

  recordCasualties(warId: string, faction: string, casualties: number): void {
    const war = this.wars.get(warId);
    if (!war) return;
    
    const current = war.casualties.get(faction) || 0;
    war.casualties.set(faction, current + casualties);
  }

  getActiveWars(): War[] {
    return Array.from(this.wars.values()).filter(w => !w.endDay);
  }

  getWarsForFaction(factionId: string): War[] {
    return Array.from(this.wars.values()).filter(w => 
      !w.endDay && (w.aggressors.includes(factionId) || w.defenders.includes(factionId))
    );
  }


  // Trade agreement management
  proposeTradeAgreement(
    initiator: string,
    target: string,
    terms: TradeTerm[],
    duration: number,
    currentDay: number
  ): TradeAgreement | null {
    const attitude = this.calculateAttitude(target, initiator);
    const targetFaction = this.factionSystem.getFaction(target);
    
    if (!targetFaction || attitude < 0) return null;

    // Evaluate if trade is beneficial
    const benefitToTarget = this.evaluateTradeBenefit(terms, target);
    const acceptanceChance = attitude * 0.5 + benefitToTarget * 0.5 + targetFaction.personality.diplomacy * 0.2;

    if (acceptanceChance < 0.3) return null;

    const agreementId = `trade_${this.nextId++}`;
    const agreement: TradeAgreement = {
      id: agreementId,
      faction1: initiator,
      faction2: target,
      terms,
      duration,
      startDay: currentDay,
      active: true
    };

    this.tradeAgreements.set(agreementId, agreement);

    // Improve relations
    this.factionSystem.updateDiplomacy(initiator, target, 0.1);

    this.logEvent({
      type: 'trade_agreement',
      initiator,
      target,
      day: currentDay,
      details: { agreementId, terms, duration }
    });

    return agreement;
  }

  private evaluateTradeBenefit(terms: TradeTerm[], factionId: string): number {
    let benefit = 0;
    const faction = this.factionSystem.getFaction(factionId);
    if (!faction) return 0;

    for (const term of terms) {
      const value = term.amount * (term.frequency === 'daily' ? 7 : 1);
      if (term.fromFaction === factionId) {
        benefit -= value * 0.01;
      } else {
        // Value based on need
        const need = this.getResourceNeed(faction, term.resource);
        benefit += value * 0.01 * need;
      }
    }

    return Math.max(-1, Math.min(1, benefit));
  }

  private getResourceNeed(faction: Faction, resource: 'food' | 'gold' | 'manpower'): number {
    switch (resource) {
      case 'food':
        return faction.resources.food < faction.resources.manpower * 5 ? 2 : 0.5;
      case 'gold':
        return faction.resources.gold < 100 ? 1.5 : 0.5;
      case 'manpower':
        return faction.resources.manpower < 50 ? 1.5 : 0.3;
    }
  }

  executeTradeAgreements(currentDay: number): void {
    for (const agreement of this.tradeAgreements.values()) {
      if (!agreement.active) continue;

      // Check expiration
      if (currentDay - agreement.startDay >= agreement.duration) {
        agreement.active = false;
        continue;
      }

      // Execute daily trades
      for (const term of agreement.terms) {
        if (term.frequency === 'daily' || (term.frequency === 'weekly' && currentDay % 7 === 0)) {
          const fromFaction = this.factionSystem.getFaction(term.fromFaction);
          const toFaction = this.factionSystem.getFaction(
            term.fromFaction === agreement.faction1 ? agreement.faction2 : agreement.faction1
          );

          if (fromFaction && toFaction) {
            if (fromFaction.resources[term.resource] >= term.amount) {
              fromFaction.resources[term.resource] -= term.amount;
              toFaction.resources[term.resource] += term.amount;
            } else {
              // Can't fulfill trade - break agreement
              this.breakTradeAgreement(agreement.id, term.fromFaction, currentDay);
            }
          }
        }
      }
    }
  }

  breakTradeAgreement(agreementId: string, initiator: string, currentDay: number): boolean {
    const agreement = this.tradeAgreements.get(agreementId);
    if (!agreement || !agreement.active) return false;

    agreement.active = false;

    // Relation penalty
    const other = agreement.faction1 === initiator ? agreement.faction2 : agreement.faction1;
    this.factionSystem.updateDiplomacy(initiator, other, -0.15);

    this.logEvent({
      type: 'trade_broken',
      initiator,
      target: other,
      day: currentDay,
      details: { agreementId }
    });

    return true;
  }

  hasTradeAgreement(faction1: string, faction2: string): boolean {
    for (const agreement of this.tradeAgreements.values()) {
      if (!agreement.active) continue;
      if ((agreement.faction1 === faction1 && agreement.faction2 === faction2) ||
          (agreement.faction1 === faction2 && agreement.faction2 === faction1)) {
        return true;
      }
    }
    return false;
  }

  getTradeAgreements(factionId: string): TradeAgreement[] {
    return Array.from(this.tradeAgreements.values()).filter(a => 
      a.active && (a.faction1 === factionId || a.faction2 === factionId)
    );
  }

  // Event logging
  private logEvent(event: DiplomaticEvent): void {
    this.eventLog.push(event);
  }

  getEventLog(factionId?: string): DiplomaticEvent[] {
    if (!factionId) return [...this.eventLog];
    return this.eventLog.filter(e => e.initiator === factionId || e.target.includes(factionId));
  }

  getRecentEvents(days: number, currentDay: number): DiplomaticEvent[] {
    return this.eventLog.filter(e => currentDay - e.day <= days);
  }

  // Serialization
  serialize(): string {
    return JSON.stringify({
      alliances: Array.from(this.alliances.entries()),
      wars: Array.from(this.wars.entries()).map(([id, w]) => ({
        ...w,
        casualties: Array.from(w.casualties.entries()),
        warScore: Array.from(w.warScore.entries())
      })),
      tradeAgreements: Array.from(this.tradeAgreements.entries()),
      eventLog: this.eventLog,
      nextId: this.nextId
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.alliances = new Map(parsed.alliances);
    this.wars = new Map(parsed.wars.map((w: any) => [w.id, {
      ...w,
      casualties: new Map(w.casualties),
      warScore: new Map(w.warScore)
    }]));
    this.tradeAgreements = new Map(parsed.tradeAgreements);
    this.eventLog = parsed.eventLog;
    this.nextId = parsed.nextId;
  }
}
