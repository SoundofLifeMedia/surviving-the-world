/**
 * Enemy AI Stack - Integrated 4-Layer Intelligence System
 * Combines: Perception → Behavior Tree → Micro-Agents → Enemy Coordinator
 * This is the main entry point for GTA-grade enemy AI
 * Requirements: 2.1-2.5, 3.1-3.5, 4.1-4.5, 5.1-5.5
 */

import { PerceptionLayer, PerceptionState, PerceptionModifiers, Vector3, WeatherEffect } from './PerceptionLayer';
import { MicroAgentSystem, CombatContext, ResolvedBehavior, MicroAgentConfig } from './MicroAgentSystem';
import { EnemyCoordinatorAgent, SquadState, SquadTactic, PlayerAction } from './EnemyCoordinatorAgent';

export interface Enemy {
  id: string;
  position: Vector3;
  facing: Vector3;
  health: number;
  maxHealth: number;
  faction: string;
  squadId?: string;
  state: EnemyState;
}

export type EnemyState = 'idle' | 'aware' | 'searching' | 'engage' | 'flank' | 'retreat' | 'surrender';

export interface AIUpdateResult {
  enemyId: string;
  newState: EnemyState;
  behavior: ResolvedBehavior;
  targetPosition: Vector3 | null;
  squadTactic: SquadTactic | null;
}

export interface WorldContext {
  weather: WeatherEffect;
  timeOfDay: number;
  lighting: number;
}


export class EnemyAIStack {
  private perceptionLayer: PerceptionLayer;
  private microAgentSystem: MicroAgentSystem;
  private coordinatorAgent: EnemyCoordinatorAgent;
  
  private enemies: Map<string, Enemy> = new Map();
  private playerPosition: Vector3 = { x: 0, y: 0, z: 0 };
  private playerNoise: number = 0;
  private playerStance: 'standing' | 'crouching' | 'prone' = 'standing';
  private worldContext: WorldContext = { weather: 'clear', timeOfDay: 12, lighting: 1 };

  constructor() {
    this.perceptionLayer = new PerceptionLayer();
    this.microAgentSystem = new MicroAgentSystem();
    this.coordinatorAgent = new EnemyCoordinatorAgent();
  }

  // Enemy Management
  registerEnemy(enemy: Enemy, microAgentConfig?: Partial<MicroAgentConfig>): void {
    this.enemies.set(enemy.id, enemy);
    this.perceptionLayer.initializePerception(enemy.id);
    this.microAgentSystem.initializeAgents(enemy.id, microAgentConfig);
  }

  removeEnemy(enemyId: string): void {
    this.enemies.delete(enemyId);
    this.perceptionLayer.clearState(enemyId);
    this.microAgentSystem.clearAgents(enemyId);
  }

  getEnemy(enemyId: string): Enemy | undefined {
    return this.enemies.get(enemyId);
  }

  // Squad Management
  createSquad(squadId: string, enemyIds: string[]): SquadState {
    const squad = this.coordinatorAgent.createSquad(squadId, enemyIds);
    for (const id of enemyIds) {
      const enemy = this.enemies.get(id);
      if (enemy) enemy.squadId = squadId;
    }
    return squad;
  }

  // World State Updates
  updatePlayerPosition(position: Vector3): void {
    this.playerPosition = position;
  }

  updatePlayerNoise(noise: number): void {
    this.playerNoise = Math.max(0, Math.min(1, noise));
  }

  updatePlayerStance(stance: 'standing' | 'crouching' | 'prone'): void {
    this.playerStance = stance;
  }

  updateWorldContext(context: Partial<WorldContext>): void {
    this.worldContext = { ...this.worldContext, ...context };
  }

  recordPlayerAction(action: PlayerAction): void {
    this.coordinatorAgent.recordPlayerAction(action);
  }

  // Main AI Update Loop
  updateEnemy(enemyId: string, deltaTime: number): AIUpdateResult | null {
    const enemy = this.enemies.get(enemyId);
    if (!enemy) return null;

    // Layer 1: Update Perception
    const perceptionModifiers: PerceptionModifiers = {
      weather: this.worldContext.weather,
      timeOfDay: this.worldContext.timeOfDay,
      lighting: this.worldContext.lighting,
      playerNoise: this.playerNoise,
      playerStance: this.playerStance
    };
    
    const perception = this.perceptionLayer.updatePerception(enemyId, perceptionModifiers);
    this.perceptionLayer.decayMemory(enemyId, deltaTime);

    // Check if enemy can detect player
    const canSee = this.perceptionLayer.canSeeTarget(enemyId, enemy.position, this.playerPosition, enemy.facing);
    const canHear = this.perceptionLayer.canHearTarget(enemyId, enemy.position, this.playerPosition, this.playerNoise);
    
    if (canSee || canHear) {
      this.perceptionLayer.setLastKnownPosition(enemyId, this.playerPosition);
    }

    // Layer 2 & 3: Build combat context and evaluate micro-agents
    const allies = this.getAlliesInRange(enemy, 30);
    const combatContext = this.buildCombatContext(enemy, perception, allies);
    
    // Layer 3: Get resolved behavior from micro-agents
    const behavior = this.microAgentSystem.resolveConflicts(enemyId, combatContext);

    // Layer 4: Squad coordination (if in squad)
    let squadTactic: SquadTactic | null = null;
    if (enemy.squadId) {
      const squad = this.coordinatorAgent.getSquad(enemy.squadId);
      if (squad) {
        this.coordinatorAgent.updateMemberPosition(enemy.squadId, enemyId, enemy.position);
        squadTactic = this.coordinatorAgent.planSquadTactic(squad, this.playerPosition);
        this.coordinatorAgent.counterPlayerTactics(squad);
      }
    }

    // Determine new state based on all layers
    const newState = this.determineState(enemy, perception, behavior, canSee, canHear);
    enemy.state = newState;

    // Get target position
    const targetPosition = this.getTargetPosition(enemy, perception, behavior, squadTactic);

    return {
      enemyId,
      newState,
      behavior,
      targetPosition,
      squadTactic
    };
  }

  private buildCombatContext(enemy: Enemy, perception: PerceptionState, allies: Enemy[]): CombatContext {
    const distance = this.calculateDistance(enemy.position, this.playerPosition);
    const enemyCount = 1; // Player
    
    return {
      enemyHealth: enemy.health,
      enemyMaxHealth: enemy.maxHealth,
      allyCount: allies.length,
      enemyCount,
      playerThreatLevel: perception.alertLevel,
      combatDuration: 0, // Would track actual combat duration
      recentCasualties: 0, // Would track from squad
      distanceToPlayer: distance,
      hascover: false, // Would check environment
      isOutnumbered: allies.length < enemyCount
    };
  }

  private determineState(
    enemy: Enemy,
    perception: PerceptionState,
    behavior: ResolvedBehavior,
    canSee: boolean,
    canHear: boolean
  ): EnemyState {
    // Priority: Surrender > Retreat > Combat states
    if (behavior.action === 'surrender') return 'surrender';
    if (behavior.action === 'retreat') return 'retreat';

    // If can see player, engage based on behavior
    if (canSee) {
      if (behavior.action === 'flank') return 'flank';
      if (behavior.action === 'attack') return 'engage';
      if (behavior.action === 'defend') return 'engage';
      return 'engage';
    }

    // If heard but can't see, search
    if (canHear || perception.lastKnownPlayerPosition) {
      return 'searching';
    }

    // If alert but no detection
    if (perception.alertLevel > 0.3) {
      return 'aware';
    }

    return 'idle';
  }

  private getTargetPosition(
    enemy: Enemy,
    perception: PerceptionState,
    behavior: ResolvedBehavior,
    squadTactic: SquadTactic | null
  ): Vector3 | null {
    // If in squad with flanking tactic, use flanking route
    if (squadTactic && enemy.squadId) {
      const squad = this.coordinatorAgent.getSquad(enemy.squadId);
      if (squad) {
        const assignments = this.coordinatorAgent.coordinateFlanking(squad);
        const route = assignments.get(enemy.id);
        if (route && route.length > 0) {
          return route[1]; // Next waypoint
        }
      }
    }

    // Otherwise use last known position or direct engagement
    if (behavior.action === 'search' && perception.lastKnownPlayerPosition) {
      return perception.lastKnownPlayerPosition;
    }

    if (behavior.action === 'attack' || behavior.action === 'flank') {
      return this.playerPosition;
    }

    return null;
  }

  private getAlliesInRange(enemy: Enemy, range: number): Enemy[] {
    const allies: Enemy[] = [];
    for (const other of this.enemies.values()) {
      if (other.id === enemy.id) continue;
      if (other.faction !== enemy.faction) continue;
      if (this.calculateDistance(enemy.position, other.position) <= range) {
        allies.push(other);
      }
    }
    return allies;
  }

  private calculateDistance(a: Vector3, b: Vector3): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
  }

  // Combat feedback
  onEnemyHit(enemyId: string): void {
    this.microAgentSystem.updateAgentWeights(enemyId, 'hit');
  }

  onEnemyMiss(enemyId: string): void {
    this.microAgentSystem.updateAgentWeights(enemyId, 'miss');
  }

  onEnemyDamaged(enemyId: string, damage: number): void {
    const enemy = this.enemies.get(enemyId);
    if (enemy) {
      enemy.health -= damage;
      this.microAgentSystem.updateAgentWeights(enemyId, 'damaged');
    }
  }

  onEnemyKilled(enemyId: string): void {
    const enemy = this.enemies.get(enemyId);
    if (enemy?.squadId) {
      this.coordinatorAgent.reportCasualty(enemy.squadId, enemyId);
    }
    this.removeEnemy(enemyId);
  }

  // Getters for external systems
  getPerceptionState(enemyId: string): PerceptionState | undefined {
    return this.perceptionLayer.getState(enemyId);
  }

  getSquadState(squadId: string): SquadState | undefined {
    return this.coordinatorAgent.getSquad(squadId);
  }

  getPredictedPlayerBehavior(): { likelyAction: string; confidence: number; suggestedCounter: string } {
    return this.coordinatorAgent.predictPlayerBehavior();
  }

  getDifficultyMultiplier(): number {
    return this.coordinatorAgent.getDifficultyMultiplier();
  }
}
