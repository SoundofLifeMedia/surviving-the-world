/**
 * Combat AI System
 * Behavioral tree-based combat AI with morale, faction doctrine, and tactical decisions
 * Requirements: 6.5
 */

import { CombatEntity, CombatState, CombatSystem } from './CombatSystem';

// Behavioral Tree Node Types
export type NodeStatus = 'success' | 'failure' | 'running';

export interface BehaviorNode {
  name: string;
  execute(context: AIContext): NodeStatus;
}

export interface AIContext {
  entity: CombatEntity;
  enemies: CombatEntity[];
  allies: CombatEntity[];
  combatSystem: CombatSystem;
  doctrine: FactionDoctrine;
  targetId: string | null;
  lastAction: string;
  actionCooldown: number;
}

export interface FactionDoctrine {
  factionId: string;
  name: string;
  aggressionThreshold: number;    // 0-1, how easily they engage
  retreatThreshold: number;       // 0-1, morale % to retreat
  surrenderThreshold: number;     // 0-1, morale % to surrender
  prefersFlanking: boolean;
  prefersAmbush: boolean;
  honorBound: boolean;            // Won't attack fleeing enemies
  numbersAdvantageRequired: number; // Ratio needed to engage (e.g., 1.5 = 50% more allies)
  protectsWounded: boolean;
}

export interface ThreatAssessment {
  entityId: string;
  threatLevel: number;
  distance: number;
  healthPercent: number;
  isEngaged: boolean;
}

// Default faction doctrines
const DEFAULT_DOCTRINES: Map<string, FactionDoctrine> = new Map([
  ['kingdom_north', {
    factionId: 'kingdom_north',
    name: 'Royal Guard Doctrine',
    aggressionThreshold: 0.6,
    retreatThreshold: 0.25,
    surrenderThreshold: 0.1,
    prefersFlanking: false,
    prefersAmbush: false,
    honorBound: true,
    numbersAdvantageRequired: 0.8,
    protectsWounded: true
  }],
  ['church_order', {
    factionId: 'church_order',
    name: 'Holy Crusade Doctrine',
    aggressionThreshold: 0.7,
    retreatThreshold: 0.15,
    surrenderThreshold: 0.05,
    prefersFlanking: false,
    prefersAmbush: false,
    honorBound: true,
    numbersAdvantageRequired: 0.5,
    protectsWounded: false
  }],
  ['mercenary_band', {
    factionId: 'mercenary_band',
    name: 'Sellsword Tactics',
    aggressionThreshold: 0.4,
    retreatThreshold: 0.4,
    surrenderThreshold: 0.2,
    prefersFlanking: true,
    prefersAmbush: true,
    honorBound: false,
    numbersAdvantageRequired: 1.2,
    protectsWounded: false
  }],
  ['bandits', {
    factionId: 'bandits',
    name: 'Raider Tactics',
    aggressionThreshold: 0.3,
    retreatThreshold: 0.5,
    surrenderThreshold: 0.3,
    prefersFlanking: true,
    prefersAmbush: true,
    honorBound: false,
    numbersAdvantageRequired: 1.5,
    protectsWounded: false
  }]
]);


// Behavioral Tree Nodes

class SelectorNode implements BehaviorNode {
  name: string;
  children: BehaviorNode[];

  constructor(name: string, children: BehaviorNode[]) {
    this.name = name;
    this.children = children;
  }

  execute(context: AIContext): NodeStatus {
    for (const child of this.children) {
      const status = child.execute(context);
      if (status !== 'failure') return status;
    }
    return 'failure';
  }
}

class SequenceNode implements BehaviorNode {
  name: string;
  children: BehaviorNode[];

  constructor(name: string, children: BehaviorNode[]) {
    this.name = name;
    this.children = children;
  }

  execute(context: AIContext): NodeStatus {
    for (const child of this.children) {
      const status = child.execute(context);
      if (status !== 'success') return status;
    }
    return 'success';
  }
}

class ConditionNode implements BehaviorNode {
  name: string;
  condition: (context: AIContext) => boolean;

  constructor(name: string, condition: (context: AIContext) => boolean) {
    this.name = name;
    this.condition = condition;
  }

  execute(context: AIContext): NodeStatus {
    return this.condition(context) ? 'success' : 'failure';
  }
}

class ActionNode implements BehaviorNode {
  name: string;
  action: (context: AIContext) => NodeStatus;

  constructor(name: string, action: (context: AIContext) => NodeStatus) {
    this.name = name;
    this.action = action;
  }

  execute(context: AIContext): NodeStatus {
    return this.action(context);
  }
}

// Combat AI System
export class CombatAISystem {
  private doctrines: Map<string, FactionDoctrine> = new Map(DEFAULT_DOCTRINES);
  private contexts: Map<string, AIContext> = new Map();
  private behaviorTree: BehaviorNode;

  constructor(private combatSystem: CombatSystem) {
    this.behaviorTree = this.buildBehaviorTree();
  }

  registerDoctrine(doctrine: FactionDoctrine): void {
    this.doctrines.set(doctrine.factionId, doctrine);
  }

  getDoctrine(factionId: string): FactionDoctrine {
    return this.doctrines.get(factionId) || {
      factionId,
      name: 'Default',
      aggressionThreshold: 0.5,
      retreatThreshold: 0.3,
      surrenderThreshold: 0.15,
      prefersFlanking: false,
      prefersAmbush: false,
      honorBound: false,
      numbersAdvantageRequired: 1.0,
      protectsWounded: false
    };
  }

  private buildBehaviorTree(): BehaviorNode {
    return new SelectorNode('Root', [
      // Priority 1: Surrender if morale critically low
      new SequenceNode('SurrenderBranch', [
        new ConditionNode('ShouldSurrender', ctx => this.shouldSurrender(ctx)),
        new ActionNode('Surrender', ctx => this.doSurrender(ctx))
      ]),

      // Priority 2: Retreat if morale low
      new SequenceNode('RetreatBranch', [
        new ConditionNode('ShouldRetreat', ctx => this.shouldRetreat(ctx)),
        new ActionNode('Retreat', ctx => this.doRetreat(ctx))
      ]),

      // Priority 3: Protect wounded allies (if doctrine allows)
      new SequenceNode('ProtectWoundedBranch', [
        new ConditionNode('ShouldProtectWounded', ctx => this.shouldProtectWounded(ctx)),
        new ActionNode('ProtectAlly', ctx => this.doProtectAlly(ctx))
      ]),

      // Priority 4: Flank if advantageous
      new SequenceNode('FlankBranch', [
        new ConditionNode('ShouldFlank', ctx => this.shouldFlank(ctx)),
        new ActionNode('Flank', ctx => this.doFlank(ctx))
      ]),

      // Priority 5: Engage enemy
      new SequenceNode('EngageBranch', [
        new ConditionNode('ShouldEngage', ctx => this.shouldEngage(ctx)),
        new ActionNode('Engage', ctx => this.doEngage(ctx))
      ]),

      // Priority 6: Stay aware
      new ActionNode('StayAware', ctx => this.doStayAware(ctx))
    ]);
  }


  // Condition evaluators
  private shouldSurrender(ctx: AIContext): boolean {
    const moralePercent = ctx.entity.morale / 100;
    return moralePercent < ctx.doctrine.surrenderThreshold;
  }

  private shouldRetreat(ctx: AIContext): boolean {
    const moralePercent = ctx.entity.morale / 100;
    const healthPercent = ctx.entity.health / ctx.entity.maxHealth;
    return moralePercent < ctx.doctrine.retreatThreshold || healthPercent < 0.2;
  }

  private shouldProtectWounded(ctx: AIContext): boolean {
    if (!ctx.doctrine.protectsWounded) return false;
    return ctx.allies.some(ally => ally.health / ally.maxHealth < 0.3);
  }

  private shouldFlank(ctx: AIContext): boolean {
    if (!ctx.doctrine.prefersFlanking) return false;
    if (ctx.enemies.length === 0) return false;
    
    // Check if we have numbers advantage
    const ratio = ctx.allies.length / Math.max(1, ctx.enemies.length);
    return ratio >= 1.2;
  }

  private shouldEngage(ctx: AIContext): boolean {
    if (ctx.enemies.length === 0) return false;
    
    const ratio = (ctx.allies.length + 1) / Math.max(1, ctx.enemies.length);
    const moralePercent = ctx.entity.morale / 100;
    
    return ratio >= ctx.doctrine.numbersAdvantageRequired && 
           moralePercent >= ctx.doctrine.aggressionThreshold;
  }

  // Action executors
  private doSurrender(ctx: AIContext): NodeStatus {
    ctx.entity.state = 'surrender';
    ctx.lastAction = 'surrender';
    return 'success';
  }

  private doRetreat(ctx: AIContext): NodeStatus {
    ctx.entity.state = 'retreat';
    ctx.lastAction = 'retreat';
    return 'success';
  }

  private doProtectAlly(ctx: AIContext): NodeStatus {
    const woundedAlly = ctx.allies.find(ally => ally.health / ally.maxHealth < 0.3);
    if (!woundedAlly) return 'failure';

    // Find enemy attacking wounded ally
    const threatToAlly = ctx.enemies.find(e => e.state === 'engage');
    if (threatToAlly) {
      ctx.targetId = threatToAlly.id;
      ctx.entity.state = 'engage';
      ctx.lastAction = 'protect_ally';
      return 'success';
    }
    return 'failure';
  }

  private doFlank(ctx: AIContext): NodeStatus {
    ctx.entity.state = 'flank';
    ctx.lastAction = 'flank';
    
    // Select weakest enemy as target
    const target = this.selectWeakestTarget(ctx.enemies);
    if (target) {
      ctx.targetId = target.id;
      return 'success';
    }
    return 'failure';
  }

  private doEngage(ctx: AIContext): NodeStatus {
    ctx.entity.state = 'engage';
    ctx.lastAction = 'engage';
    
    // Select highest threat target
    const target = this.selectPriorityTarget(ctx);
    if (target) {
      ctx.targetId = target.id;
      return 'success';
    }
    return 'failure';
  }

  private doStayAware(ctx: AIContext): NodeStatus {
    ctx.entity.state = 'aware';
    ctx.lastAction = 'aware';
    ctx.targetId = null;
    return 'success';
  }

  // Target selection
  private selectWeakestTarget(enemies: CombatEntity[]): CombatEntity | null {
    if (enemies.length === 0) return null;
    return enemies.reduce((weakest, current) => 
      (current.health / current.maxHealth) < (weakest.health / weakest.maxHealth) ? current : weakest
    );
  }

  private selectPriorityTarget(ctx: AIContext): CombatEntity | null {
    if (ctx.enemies.length === 0) return null;

    // Prioritize: 1) Low health, 2) High damage dealers, 3) Closest
    const threats = ctx.enemies.map(e => ({
      entity: e,
      score: this.calculateThreatScore(e, ctx)
    }));

    threats.sort((a, b) => b.score - a.score);
    return threats[0]?.entity || null;
  }

  private calculateThreatScore(enemy: CombatEntity, ctx: AIContext): number {
    const healthPercent = enemy.health / enemy.maxHealth;
    const damageOutput = enemy.weapon?.damage || 10;
    
    // Lower health = higher priority (easier kill)
    const healthScore = (1 - healthPercent) * 30;
    // Higher damage = higher threat
    const damageScore = damageOutput * 2;
    // Engaged enemies are higher priority
    const engagedBonus = enemy.state === 'engage' ? 20 : 0;
    
    return healthScore + damageScore + engagedBonus;
  }


  // Public API
  updateAI(entityId: string, enemies: CombatEntity[], allies: CombatEntity[]): AIContext {
    const entity = this.combatSystem.getEntity(entityId);
    if (!entity) throw new Error(`Entity ${entityId} not found`);

    let ctx = this.contexts.get(entityId);
    if (!ctx) {
      ctx = {
        entity,
        enemies,
        allies,
        combatSystem: this.combatSystem,
        doctrine: this.getDoctrine(entity.faction),
        targetId: null,
        lastAction: 'idle',
        actionCooldown: 0
      };
      this.contexts.set(entityId, ctx);
    } else {
      ctx.entity = entity;
      ctx.enemies = enemies;
      ctx.allies = allies;
      ctx.doctrine = this.getDoctrine(entity.faction);
    }

    // Execute behavior tree
    this.behaviorTree.execute(ctx);
    return ctx;
  }

  executeAction(entityId: string): { action: string; targetId: string | null; success: boolean } {
    const ctx = this.contexts.get(entityId);
    if (!ctx) return { action: 'none', targetId: null, success: false };

    const action = ctx.lastAction;
    const targetId = ctx.targetId;

    // Execute combat action based on state
    if (ctx.entity.state === 'engage' && targetId) {
      const attackType = ctx.doctrine.prefersFlanking && ctx.entity.state === 'flank' ? 'heavy' : 'light';
      const result = this.combatSystem.attack(entityId, targetId, attackType as 'light' | 'heavy');
      return { action: `attack_${attackType}`, targetId, success: result.hit };
    }

    return { action, targetId, success: true };
  }

  assessThreats(entityId: string, potentialEnemies: CombatEntity[]): ThreatAssessment[] {
    const entity = this.combatSystem.getEntity(entityId);
    if (!entity) return [];

    return potentialEnemies.map(enemy => ({
      entityId: enemy.id,
      threatLevel: this.calculateThreatScore(enemy, {
        entity,
        enemies: potentialEnemies,
        allies: [],
        combatSystem: this.combatSystem,
        doctrine: this.getDoctrine(entity.faction),
        targetId: null,
        lastAction: 'idle',
        actionCooldown: 0
      }),
      distance: 0, // Would be calculated from positions
      healthPercent: enemy.health / enemy.maxHealth,
      isEngaged: enemy.state === 'engage'
    })).sort((a, b) => b.threatLevel - a.threatLevel);
  }

  calculateNumbersAdvantage(allies: CombatEntity[], enemies: CombatEntity[]): number {
    const allyStrength = allies.reduce((sum, a) => sum + (a.health / a.maxHealth) * (a.weapon?.damage || 10), 0);
    const enemyStrength = enemies.reduce((sum, e) => sum + (e.health / e.maxHealth) * (e.weapon?.damage || 10), 0);
    return enemyStrength > 0 ? allyStrength / enemyStrength : Infinity;
  }

  updateMorale(entityId: string, delta: number): void {
    const entity = this.combatSystem.getEntity(entityId);
    if (!entity) return;
    entity.morale = Math.max(0, Math.min(100, entity.morale + delta));
  }

  applyMoraleEffects(entityId: string, event: 'ally_death' | 'enemy_death' | 'ally_wounded' | 'outnumbered' | 'reinforcements'): void {
    const entity = this.combatSystem.getEntity(entityId);
    if (!entity) return;

    const effects: Record<string, number> = {
      ally_death: -15,
      enemy_death: 10,
      ally_wounded: -5,
      outnumbered: -10,
      reinforcements: 20
    };

    this.updateMorale(entityId, effects[event] || 0);
  }

  getContext(entityId: string): AIContext | undefined {
    return this.contexts.get(entityId);
  }

  clearContext(entityId: string): void {
    this.contexts.delete(entityId);
  }

  // State queries
  isRetreating(entityId: string): boolean {
    const entity = this.combatSystem.getEntity(entityId);
    return entity?.state === 'retreat';
  }

  hasSurrendered(entityId: string): boolean {
    const entity = this.combatSystem.getEntity(entityId);
    return entity?.state === 'surrender';
  }

  isEngaged(entityId: string): boolean {
    const entity = this.combatSystem.getEntity(entityId);
    return entity?.state === 'engage' || entity?.state === 'flank';
  }

  getState(entityId: string): CombatState | null {
    return this.combatSystem.getEntity(entityId)?.state || null;
  }
}
