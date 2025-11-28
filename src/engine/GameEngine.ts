/**
 * Game Engine - Main integration layer for Surviving The World™
 * Wires together: Enemy AI Stack, Heat System, Player Progression, Replayability
 * Game Loop: LOAD → INIT → SIMULATE → RENDER → SAVE → LOOP
 * Requirements: 1.1, 1.2, 1.3
 */

import { EnemyAIStack, Enemy, WorldContext, AIUpdateResult } from '../ai/EnemyAIStack';
import { HeatSystem, EscalationTier } from '../systems/HeatSystem';
import { PlayerProgressionSystem, ProgressionStats, ProgressionBonuses } from '../systems/PlayerProgressionSystem';
import { ReplayabilityEngine, WorldModifier } from '../systems/ReplayabilityEngine';
import { WorldStateManager, WorldState } from './WorldState';

export interface GameState {
  phase: 'loading' | 'initializing' | 'simulating' | 'rendering' | 'saving';
  dayCount: number;
  timeOfDay: number;
  isPaused: boolean;
}

export interface Player {
  id: string;
  position: { x: number; y: number; z: number };
  health: number;
  stamina: number;
  noise: number;
  stance: 'standing' | 'crouching' | 'prone';
}

export type GameEventType = 'enemy_spawned' | 'enemy_killed' | 'faction_escalation' | 
  'player_unlock' | 'world_modifier' | 'day_changed' | 'combat_started' | 'combat_ended';

export interface GameEvent {
  type: GameEventType;
  data: any;
  timestamp: number;
}


export class GameEngine {
  // Core Systems
  private enemyAI: EnemyAIStack;
  private heatSystem: HeatSystem;
  private progressionSystem: PlayerProgressionSystem;
  private replayabilityEngine: ReplayabilityEngine;
  private worldState: WorldStateManager;

  // Game State
  private gameState: GameState;
  private player: Player;
  private lastUpdateTime: number = 0;
  private eventListeners: Map<GameEventType, ((event: GameEvent) => void)[]> = new Map();

  constructor(eraId: string, worldSeed?: number) {
    // Initialize all systems
    this.enemyAI = new EnemyAIStack();
    this.heatSystem = new HeatSystem();
    this.progressionSystem = new PlayerProgressionSystem();
    this.replayabilityEngine = new ReplayabilityEngine(worldSeed);
    this.worldState = new WorldStateManager(eraId);

    this.gameState = {
      phase: 'loading',
      dayCount: 1,
      timeOfDay: 6,
      isPaused: false
    };

    this.player = {
      id: 'player_1',
      position: { x: 0, y: 0, z: 0 },
      health: 100,
      stamina: 100,
      noise: 0,
      stance: 'standing'
    };

    this.setupSystemConnections();
  }

  private setupSystemConnections(): void {
    // Connect heat system escalation to game events
    this.heatSystem.onEscalation((factionId, tier, responses) => {
      this.emit({ type: 'faction_escalation', data: { factionId, tier, responses }, timestamp: Date.now() });
      
      // Spawn reinforcements on escalation
      if (tier === 'hunting' || tier === 'war') {
        this.spawnFactionReinforcements(factionId, tier);
      }
    });

    // Connect progression unlocks to game events
    this.progressionSystem.onUnlock((playerId, unlock) => {
      this.emit({ type: 'player_unlock', data: { playerId, unlock }, timestamp: Date.now() });
    });

    // Connect world state time changes
    this.worldState.on('time_advance', (event) => {
      if (event.data.dayCount > this.gameState.dayCount) {
        this.gameState.dayCount = event.data.dayCount;
        this.onNewDay();
      }
      this.gameState.timeOfDay = event.data.timeOfDay;
    });
  }

  // Game Loop
  async initialize(): Promise<void> {
    this.gameState.phase = 'initializing';
    
    // Initialize player progression
    this.progressionSystem.initializePlayer(this.player.id);
    
    // Initialize factions with heat tracking
    const factions = ['kingdom_north', 'church_order', 'mercenary_band', 'bandits'];
    for (const faction of factions) {
      this.heatSystem.initializeFaction(faction);
      this.worldState.addFaction({
        id: faction,
        resources: { food: 1000, gold: 500, manpower: 100 },
        attitudeToPlayer: 0,
        relations: new Map(),
        activeGoals: [],
        atWar: [],
        allies: []
      });
    }

    // Apply initial world modifier
    const modifier = this.replayabilityEngine.generateRandomModifier();
    this.emit({ type: 'world_modifier', data: modifier, timestamp: Date.now() });

    this.gameState.phase = 'simulating';
    this.lastUpdateTime = Date.now();
  }

  update(deltaTime: number): void {
    if (this.gameState.isPaused) return;
    
    this.gameState.phase = 'simulating';

    // Update world context for AI
    const weather = this.worldState.getWeather();
    this.enemyAI.updateWorldContext({
      weather: weather.type as any,
      timeOfDay: this.worldState.getTimeOfDay(),
      lighting: this.calculateLighting()
    });

    // Update player state in AI
    this.enemyAI.updatePlayerPosition(this.player.position);
    this.enemyAI.updatePlayerNoise(this.player.noise);
    this.enemyAI.updatePlayerStance(this.player.stance);

    // Update all enemies
    const aiResults: AIUpdateResult[] = [];
    // Would iterate through all enemies here

    // Update world state time
    this.worldState.advanceTime(deltaTime / 3600); // Convert to hours

    // Update world modifiers
    this.replayabilityEngine.updateModifiers(Date.now());

    // Decay heat over time
    for (const faction of ['kingdom_north', 'church_order', 'mercenary_band', 'bandits']) {
      this.heatSystem.decreaseHeat(faction, deltaTime / 3600);
    }

    // Update player progression (time-based gains)
    this.progressionSystem.recordTimeBasedGains(this.player.id, deltaTime / 60);

    this.gameState.phase = 'rendering';
  }

  private calculateLighting(): number {
    const time = this.worldState.getTimeOfDay();
    if (time >= 6 && time < 18) return 1.0;
    if (time >= 18 && time < 20) return 0.7;
    if (time >= 20 || time < 5) return 0.3;
    return 0.7;
  }

  private onNewDay(): void {
    this.emit({ type: 'day_changed', data: { day: this.gameState.dayCount }, timestamp: Date.now() });
    
    // Chance for new world modifier
    if (Math.random() < 0.3) {
      const modifier = this.replayabilityEngine.generateRandomModifier();
      this.emit({ type: 'world_modifier', data: modifier, timestamp: Date.now() });
    }

    // Record survival for progression
    this.progressionSystem.recordAction(this.player.id, 'surviving', 1);
  }

  // Player Actions
  playerAttack(targetId: string): void {
    this.progressionSystem.recordAction(this.player.id, 'combat', 1);
    this.replayabilityEngine.recordPlayerPattern(this.player.id, 'aggressive');
    this.enemyAI.recordPlayerAction({ type: 'attack', timestamp: Date.now(), success: true });
  }

  playerStealth(): void {
    this.player.stance = 'crouching';
    this.player.noise = 0.1;
    this.replayabilityEngine.recordPlayerPattern(this.player.id, 'stealth_heavy');
  }

  playerRun(): void {
    this.player.stance = 'standing';
    this.player.noise = 0.8;
    this.progressionSystem.recordAction(this.player.id, 'running', 1);
  }

  playerTrade(npcId: string): void {
    this.progressionSystem.recordAction(this.player.id, 'trading', 1);
  }

  playerCraft(itemId: string): void {
    this.progressionSystem.recordAction(this.player.id, 'crafting', 1);
  }

  playerHunt(targetId: string): void {
    this.progressionSystem.recordAction(this.player.id, 'hunting', 1);
  }

  // Faction Interactions
  commitHostileAct(factionId: string, actionType: string, targetId?: string): void {
    this.heatSystem.increaseHeat(factionId, actionType, targetId);
    this.replayabilityEngine.persistFactionMemory(factionId, actionType);
  }

  allyWithFaction(factionId: string): void {
    this.heatSystem.applyAllianceBonus(factionId, this.player.id);
  }

  // Enemy Management
  spawnEnemy(enemy: Enemy): void {
    this.enemyAI.registerEnemy(enemy);
    this.emit({ type: 'enemy_spawned', data: enemy, timestamp: Date.now() });
  }

  spawnProceduralSquad(regionId: string, difficulty: number): string[] {
    const squadIds = this.replayabilityEngine.generateProceduralSquad(regionId, difficulty);
    const squadId = `squad_${Date.now()}`;
    
    const enemies: Enemy[] = squadIds.map((id, index) => ({
      id,
      position: { x: Math.random() * 50, y: 0, z: Math.random() * 50 },
      facing: { x: 1, y: 0, z: 0 },
      health: 100,
      maxHealth: 100,
      faction: 'bandits',
      state: 'idle' as const
    }));

    for (const enemy of enemies) {
      this.spawnEnemy(enemy);
    }

    this.enemyAI.createSquad(squadId, squadIds);
    return squadIds;
  }

  private spawnFactionReinforcements(factionId: string, tier: EscalationTier): void {
    const count = tier === 'war' ? 6 : 3;
    const squadIds: string[] = [];

    for (let i = 0; i < count; i++) {
      const enemy: Enemy = {
        id: `${factionId}_reinforcement_${Date.now()}_${i}`,
        position: { x: Math.random() * 100 - 50, y: 0, z: Math.random() * 100 - 50 },
        facing: { x: 0, y: 0, z: 1 },
        health: 100,
        maxHealth: 100,
        faction: factionId,
        state: 'aware'
      };
      this.spawnEnemy(enemy);
      squadIds.push(enemy.id);
    }

    if (squadIds.length >= 3) {
      this.enemyAI.createSquad(`${factionId}_reinforcement_squad_${Date.now()}`, squadIds);
    }
  }

  killEnemy(enemyId: string): void {
    const enemy = this.enemyAI.getEnemy(enemyId);
    if (enemy) {
      this.commitHostileAct(enemy.faction, 'kill_guard');
      this.enemyAI.onEnemyKilled(enemyId);
      this.emit({ type: 'enemy_killed', data: { enemyId, faction: enemy.faction }, timestamp: Date.now() });
    }
  }

  // Event System
  on(type: GameEventType, callback: (event: GameEvent) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(callback);
  }

  private emit(event: GameEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const callback of listeners) {
        callback(event);
      }
    }
  }

  // Getters
  getGameState(): GameState { return this.gameState; }
  getPlayer(): Player { return this.player; }
  getPlayerStats(): ProgressionStats | undefined { return this.progressionSystem.getStats(this.player.id); }
  getPlayerBonuses(): ProgressionBonuses { return this.progressionSystem.getProgressionBonuses(this.player.id); }
  getFactionHeat(factionId: string) { return this.heatSystem.getHeatState(factionId); }
  getActiveModifiers(): WorldModifier[] { return this.replayabilityEngine.getActiveModifiers(); }
  getWorldSeed(): number { return this.replayabilityEngine.getWorldSeed(); }
  getDifficultyMultiplier(): number { return this.enemyAI.getDifficultyMultiplier(); }

  // Save/Load
  serialize(): string {
    return JSON.stringify({
      gameState: this.gameState,
      player: this.player,
      worldState: this.worldState.serialize(),
      heatSystem: this.heatSystem.serialize(),
      progression: this.progressionSystem.serialize(this.player.id),
      replayability: this.replayabilityEngine.serialize()
    });
  }

  deserialize(json: string): void {
    const data = JSON.parse(json);
    this.gameState = data.gameState;
    this.player = data.player;
    this.worldState = WorldStateManager.deserialize(data.worldState);
    this.heatSystem.deserialize(data.heatSystem);
    this.progressionSystem.deserialize(this.player.id, data.progression);
    this.replayabilityEngine.deserialize(data.replayability);
  }

  pause(): void { this.gameState.isPaused = true; }
  resume(): void { this.gameState.isPaused = false; }
}
