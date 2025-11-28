/**
 * Game Simulation - 100 Users x 1000 Hours
 * Simulates player behavior, tracks issues, and generates reports
 */

import { GameEngine, Player, GameEvent } from '../../src/engine/GameEngine';
import { PlayerSystem, PlayerStats, ThresholdEvent } from '../../src/systems/PlayerSystem';
import { CombatSystem, CombatEntity, CombatResult } from '../../src/systems/CombatSystem';
import { EconomySystem } from '../../src/systems/EconomySystem';
import { InventorySystem } from '../../src/systems/InventorySystem';
import { HeatSystem, EscalationTier } from '../../src/systems/HeatSystem';

// Simulation Configuration
export interface SimulationConfig {
  userCount: number;
  hoursToSimulate: number;
  ticksPerHour: number;
  randomSeed?: number;
  verboseLogging: boolean;
}

// Player Behavior Profiles
export type PlayerProfile = 'aggressive' | 'stealth' | 'trader' | 'explorer' | 'balanced';

// Simulated User
export interface SimulatedUser {
  id: string;
  profile: PlayerProfile;
  playerSystem: PlayerSystem;
  inventory: InventorySystem;
  gold: number;
  hoursPlayed: number;
  deaths: number;
  kills: number;
  trades: number;
  crafts: number;
  factionRelations: Map<string, number>;
  events: SimulationEvent[];
  issues: SimulationIssue[];
}

// Events tracked during simulation
export interface SimulationEvent {
  hour: number;
  type: string;
  details: any;
}

// Issues/bugs found during simulation
export interface SimulationIssue {
  hour: number;
  userId: string;
  severity: 'critical' | 'major' | 'minor' | 'warning';
  category: string;
  description: string;
  context: any;
}

// Simulation Results
export interface SimulationResults {
  totalHoursSimulated: number;
  totalUsers: number;
  completedAt: Date;
  duration: number; // ms
  
  // Player Statistics
  playerStats: {
    totalDeaths: number;
    totalKills: number;
    totalTrades: number;
    averagePlaytime: number;
    survivalRate: number;
    deathsByStarvation: number;
    deathsByDehydration: number;
    deathsByCombat: number;
    deathsByHypothermia: number;
    deathsByInfection: number;
  };
  
  // Economy Statistics
  economyStats: {
    totalTransactions: number;
    totalGoldCirculated: number;
    averagePlayerWealth: number;
    wealthDistribution: { min: number; max: number; median: number };
    priceVolatility: Map<string, number>;
    supplyShortages: string[];
  };
  
  // Combat Statistics
  combatStats: {
    totalBattles: number;
    playerWinRate: number;
    averageDamagePerFight: number;
    mostDeadlyFaction: string;
    surrenderRate: number;
  };
  
  // Faction Statistics
  factionStats: {
    averageHeatLevel: Map<string, number>;
    warDeclarations: number;
    escalationEvents: number;
  };
  
  // Issues Found
  issues: SimulationIssue[];
  issuesByCategory: Map<string, number>;
  criticalIssues: SimulationIssue[];
}



/**
 * Main Simulation Class
 */
export class GameSimulation {
  private config: SimulationConfig;
  private users: SimulatedUser[] = [];
  private economySystem: EconomySystem;
  private combatSystem: CombatSystem;
  private heatSystem: HeatSystem;
  private issues: SimulationIssue[] = [];
  private rng: () => number;
  
  // Tracking
  private totalDeaths = 0;
  private totalKills = 0;
  private totalTrades = 0;
  private totalBattles = 0;
  private deathCauses = { starvation: 0, dehydration: 0, combat: 0, hypothermia: 0, infection: 0 };
  private factionHeatHistory: Map<string, number[]> = new Map();
  private escalationCount = 0;
  private warCount = 0;
  
  constructor(config: SimulationConfig) {
    this.config = config;
    this.economySystem = new EconomySystem();
    this.combatSystem = new CombatSystem();
    this.heatSystem = new HeatSystem();
    
    // Seeded random for reproducibility
    this.rng = this.createSeededRandom(config.randomSeed || Date.now());
    
    // Initialize factions
    const factions = ['kingdom_north', 'church_order', 'mercenary_band', 'bandits'];
    for (const faction of factions) {
      this.heatSystem.initializeFaction(faction);
      this.factionHeatHistory.set(faction, []);
    }
  }
  
  private createSeededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }
  
  private getRandomProfile(): PlayerProfile {
    const profiles: PlayerProfile[] = ['aggressive', 'stealth', 'trader', 'explorer', 'balanced'];
    return profiles[Math.floor(this.rng() * profiles.length)];
  }
  
  /**
   * Initialize all simulated users
   */
  initializeUsers(): void {
    console.log(`Initializing ${this.config.userCount} users...`);
    
    for (let i = 0; i < this.config.userCount; i++) {
      const profile = this.getRandomProfile();
      const inventory = new InventorySystem(50);
      
      // Register basic items
      this.registerBasicItems(inventory);
      
      // Give starting items based on profile
      this.giveStartingItems(inventory, profile);
      
      const user: SimulatedUser = {
        id: `user_${i + 1}`,
        profile,
        playerSystem: new PlayerSystem(),
        inventory,
        gold: 50 + Math.floor(this.rng() * 100),
        hoursPlayed: 0,
        deaths: 0,
        kills: 0,
        trades: 0,
        crafts: 0,
        factionRelations: new Map([
          ['kingdom_north', 0],
          ['church_order', 0],
          ['mercenary_band', 0],
          ['bandits', -20]
        ]),
        events: [],
        issues: []
      };
      
      this.users.push(user);
    }
    
    console.log(`Users initialized. Profile distribution:`);
    const profileCounts = new Map<PlayerProfile, number>();
    for (const user of this.users) {
      profileCounts.set(user.profile, (profileCounts.get(user.profile) || 0) + 1);
    }
    for (const [profile, count] of profileCounts) {
      console.log(`  ${profile}: ${count}`);
    }
  }
  
  private registerBasicItems(inventory: InventorySystem): void {
    const items = [
      { id: 'bread', name: 'Bread', weight: 0.5, durability: 100, stackable: true, traits: ['food'] },
      { id: 'water', name: 'Water', weight: 1, durability: 100, stackable: true, traits: ['drink'] },
      { id: 'bandage', name: 'Bandage', weight: 0.2, durability: 100, stackable: true, traits: ['medical'] },
      { id: 'sword_iron', name: 'Iron Sword', weight: 3, durability: 200, stackable: false, traits: ['weapon', 'melee'] },
      { id: 'bow_wood', name: 'Wooden Bow', weight: 2, durability: 150, stackable: false, traits: ['weapon', 'ranged'] },
      { id: 'leather_armor', name: 'Leather Armor', weight: 5, durability: 150, stackable: false, traits: ['armor'] },
      { id: 'herbs', name: 'Herbs', weight: 0.1, durability: 100, stackable: true, traits: ['medical', 'crafting'] },
      { id: 'wood', name: 'Wood', weight: 2, durability: 100, stackable: true, traits: ['crafting'] },
      { id: 'iron_ore', name: 'Iron Ore', weight: 3, durability: 100, stackable: true, traits: ['crafting'] },
    ];
    
    for (const item of items) {
      inventory.registerItemConfig(item as any);
    }
  }
  
  private giveStartingItems(inventory: InventorySystem, profile: PlayerProfile): void {
    // Everyone gets basics
    inventory.addItem('bread', 5);
    inventory.addItem('water', 3);
    inventory.addItem('bandage', 2);
    
    switch (profile) {
      case 'aggressive':
        inventory.addItem('sword_iron', 1);
        inventory.addItem('leather_armor', 1);
        break;
      case 'stealth':
        inventory.addItem('bow_wood', 1);
        break;
      case 'trader':
        inventory.addItem('herbs', 10);
        inventory.addItem('wood', 5);
        break;
      case 'explorer':
        inventory.addItem('bread', 5);
        inventory.addItem('water', 5);
        break;
      case 'balanced':
        inventory.addItem('sword_iron', 1);
        break;
    }
  }

  
  /**
   * Run the full simulation
   */
  async run(): Promise<SimulationResults> {
    const startTime = Date.now();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`STARTING SIMULATION: ${this.config.userCount} users x ${this.config.hoursToSimulate} hours`);
    console.log(`${'='.repeat(60)}\n`);
    
    this.initializeUsers();
    
    const totalTicks = this.config.hoursToSimulate * this.config.ticksPerHour;
    const hoursPerTick = 1 / this.config.ticksPerHour;
    
    let lastProgressReport = 0;
    
    for (let tick = 0; tick < totalTicks; tick++) {
      const currentHour = tick / this.config.ticksPerHour;
      
      // Progress reporting every 100 hours
      if (Math.floor(currentHour) >= lastProgressReport + 100) {
        lastProgressReport = Math.floor(currentHour);
        const aliveCount = this.users.filter(u => u.playerSystem.isAlive()).length;
        console.log(`Hour ${lastProgressReport}/${this.config.hoursToSimulate} - ${aliveCount} users alive`);
      }
      
      // Simulate each user
      for (const user of this.users) {
        if (!user.playerSystem.isAlive()) {
          // Respawn dead users after some time
          if (this.rng() < 0.01) {
            this.respawnUser(user);
          }
          continue;
        }
        
        this.simulateUserTick(user, currentHour, hoursPerTick);
      }
      
      // Update global systems
      if (tick % this.config.ticksPerHour === 0) {
        this.economySystem.update(Math.floor(currentHour / 24));
        this.updateFactionHeat(currentHour);
      }
    }
    
    const endTime = Date.now();
    return this.generateResults(endTime - startTime);
  }
  
  /**
   * Simulate one tick for a user
   */
  private simulateUserTick(user: SimulatedUser, hour: number, deltaHours: number): void {
    user.hoursPlayed += deltaHours;
    
    // Update player stats (hunger, thirst, etc.)
    user.playerSystem.updateStats(deltaHours);
    
    // Check for threshold events
    const thresholds = user.playerSystem.checkThresholds();
    this.handleThresholdEvents(user, thresholds, hour);
    
    // Check for death
    if (!user.playerSystem.isAlive()) {
      this.handleDeath(user, hour);
      return;
    }
    
    // Perform actions based on profile
    this.performProfileActions(user, hour, deltaHours);
    
    // Random events
    this.handleRandomEvents(user, hour);
    
    // Validate game state for issues
    this.validateUserState(user, hour);
  }
  
  private handleThresholdEvents(user: SimulatedUser, events: ThresholdEvent[], hour: number): void {
    for (const event of events) {
      if (event.threshold === 'critical') {
        // Try to address critical needs
        if (event.stat === 'hunger' && user.inventory.hasItem('bread')) {
          user.inventory.removeItemByTemplate('bread', 1);
          user.playerSystem.modifyStat('hunger', 30);
          user.events.push({ hour, type: 'ate_food', details: { stat: event.stat } });
        } else if (event.stat === 'thirst' && user.inventory.hasItem('water')) {
          user.inventory.removeItemByTemplate('water', 1);
          user.playerSystem.modifyStat('thirst', 40);
          user.events.push({ hour, type: 'drank_water', details: { stat: event.stat } });
        } else if (event.stat === 'health' && user.inventory.hasItem('bandage')) {
          user.inventory.removeItemByTemplate('bandage', 1);
          user.playerSystem.modifyStat('health', 20);
          user.events.push({ hour, type: 'used_bandage', details: {} });
        }
      }
    }
  }
  
  private handleDeath(user: SimulatedUser, hour: number): void {
    user.deaths++;
    this.totalDeaths++;
    
    const stats = user.playerSystem.getStats();
    let cause = 'unknown';
    
    if (stats.hunger <= 0) {
      cause = 'starvation';
      this.deathCauses.starvation++;
    } else if (stats.thirst <= 0) {
      cause = 'dehydration';
      this.deathCauses.dehydration++;
    } else if (stats.bodyTemperature < 35) {
      cause = 'hypothermia';
      this.deathCauses.hypothermia++;
    } else if (stats.infection > 80) {
      cause = 'infection';
      this.deathCauses.infection++;
    } else {
      cause = 'combat';
      this.deathCauses.combat++;
    }
    
    user.events.push({ hour, type: 'death', details: { cause, stats } });
    
    if (this.config.verboseLogging) {
      console.log(`  [${user.id}] Died at hour ${hour.toFixed(1)} - Cause: ${cause}`);
    }
  }
  
  private respawnUser(user: SimulatedUser): void {
    user.playerSystem = new PlayerSystem();
    user.gold = Math.floor(user.gold * 0.5); // Lose half gold on death
    
    // Reset inventory with basics
    const inventory = new InventorySystem(50);
    this.registerBasicItems(inventory);
    this.giveStartingItems(inventory, user.profile);
    user.inventory = inventory;
  }

  
  /**
   * Perform actions based on player profile
   */
  private performProfileActions(user: SimulatedUser, hour: number, deltaHours: number): void {
    const actionChance = deltaHours * 0.5; // Base chance per tick
    
    switch (user.profile) {
      case 'aggressive':
        if (this.rng() < actionChance * 0.3) {
          this.simulateCombat(user, hour);
        }
        break;
        
      case 'stealth':
        if (this.rng() < actionChance * 0.1) {
          this.simulateStealthAction(user, hour);
        }
        break;
        
      case 'trader':
        if (this.rng() < actionChance * 0.4) {
          this.simulateTrade(user, hour);
        }
        break;
        
      case 'explorer':
        if (this.rng() < actionChance * 0.2) {
          this.simulateExploration(user, hour);
        }
        break;
        
      case 'balanced':
        const roll = this.rng();
        if (roll < actionChance * 0.15) {
          this.simulateCombat(user, hour);
        } else if (roll < actionChance * 0.3) {
          this.simulateTrade(user, hour);
        }
        break;
    }
    
    // Everyone occasionally needs supplies
    if (this.rng() < actionChance * 0.1) {
      this.simulateResupply(user, hour);
    }
  }
  
  /**
   * Simulate combat encounter
   */
  private simulateCombat(user: SimulatedUser, hour: number): void {
    this.totalBattles++;
    
    // Create enemy
    const factions = ['kingdom_north', 'church_order', 'mercenary_band', 'bandits'];
    const enemyFaction = factions[Math.floor(this.rng() * factions.length)];
    
    const enemy: CombatEntity = {
      id: `enemy_${Date.now()}_${Math.random()}`,
      name: `${enemyFaction} soldier`,
      health: 80 + Math.floor(this.rng() * 40),
      maxHealth: 100,
      armor: 5 + Math.floor(this.rng() * 10),
      morale: 70 + Math.floor(this.rng() * 30),
      faction: enemyFaction,
      weapon: { id: 'sword', name: 'Sword', type: 'melee', damage: 15, attackSpeed: 1, range: 2 },
      state: 'engage'
    };
    
    const player: CombatEntity = {
      id: user.id,
      name: user.id,
      health: user.playerSystem.getStat('health'),
      maxHealth: user.playerSystem.getStat('maxHealth'),
      armor: user.inventory.hasItem('leather_armor') ? 10 : 0,
      morale: user.playerSystem.getStat('morale'),
      faction: 'player',
      weapon: user.inventory.hasItem('sword_iron') 
        ? { id: 'sword_iron', name: 'Iron Sword', type: 'melee', damage: 20, attackSpeed: 1, range: 2 }
        : { id: 'fists', name: 'Fists', type: 'melee', damage: 5, attackSpeed: 1.5, range: 1 },
      state: 'engage'
    };
    
    this.combatSystem.registerEntity(enemy);
    this.combatSystem.registerEntity(player);
    
    // Simulate combat rounds
    let rounds = 0;
    const maxRounds = 20;
    let playerWon = false;
    
    while (rounds < maxRounds && enemy.health > 0 && player.health > 0) {
      rounds++;
      
      // Player attacks
      const playerResult = this.combatSystem.attack(user.id, enemy.id, this.rng() < 0.3 ? 'heavy' : 'light');
      
      if (enemy.health <= 0) {
        playerWon = true;
        break;
      }
      
      // Enemy attacks
      const enemyResult = this.combatSystem.attack(enemy.id, user.id, this.rng() < 0.2 ? 'heavy' : 'light');
      
      // Apply damage to player system
      if (enemyResult.hit) {
        user.playerSystem.modifyStat('health', -enemyResult.damage);
        player.health = user.playerSystem.getStat('health');
      }
      
      // Check morale
      const moraleCheck = this.combatSystem.checkMorale(enemy.id);
      if (moraleCheck.shouldFlee || moraleCheck.shouldSurrender) {
        playerWon = true;
        break;
      }
    }
    
    // Record results
    if (playerWon) {
      user.kills++;
      this.totalKills++;
      user.gold += 10 + Math.floor(this.rng() * 20);
      
      // Increase heat with faction
      this.heatSystem.increaseHeat(enemyFaction, 'kill_guard');
      user.factionRelations.set(enemyFaction, (user.factionRelations.get(enemyFaction) || 0) - 15);
    }
    
    user.events.push({
      hour,
      type: 'combat',
      details: {
        enemy: enemyFaction,
        won: playerWon,
        rounds,
        healthRemaining: user.playerSystem.getStat('health')
      }
    });
    
    // Cleanup
    this.combatSystem.removeEntity(enemy.id);
    this.combatSystem.removeEntity(player.id);
    
    // Check for combat-related issues
    if (rounds >= maxRounds) {
      this.reportIssue({
        hour,
        userId: user.id,
        severity: 'minor',
        category: 'combat',
        description: 'Combat exceeded maximum rounds without resolution',
        context: { rounds, playerHealth: player.health, enemyHealth: enemy.health }
      });
    }
  }
  
  /**
   * Simulate stealth action
   */
  private simulateStealthAction(user: SimulatedUser, hour: number): void {
    const success = this.rng() < 0.7;
    
    if (success) {
      user.gold += 5 + Math.floor(this.rng() * 15);
      user.events.push({ hour, type: 'stealth_success', details: {} });
    } else {
      // Got caught - take damage and increase heat
      user.playerSystem.modifyStat('health', -10);
      const faction = 'kingdom_north';
      this.heatSystem.increaseHeat(faction, 'steal');
      user.events.push({ hour, type: 'stealth_failed', details: { faction } });
    }
  }

  
  /**
   * Simulate trading
   */
  private simulateTrade(user: SimulatedUser, hour: number): void {
    const regions = ['village', 'town', 'castle'];
    const region = regions[Math.floor(this.rng() * regions.length)];
    
    // Decide to buy or sell
    const isBuying = this.rng() < 0.5;
    
    if (isBuying) {
      // Buy supplies
      const items = ['bread', 'water', 'bandage', 'herbs'];
      const item = items[Math.floor(this.rng() * items.length)];
      const price = this.economySystem.getPrice(item, region);
      const quantity = Math.min(5, Math.floor(user.gold / price));
      
      if (quantity > 0 && user.inventory.canAddItem(item, quantity)) {
        const result = this.economySystem.executeTrade(
          user.id, 'merchant', region,
          [{ itemId: item, quantity }],
          Math.floor(hour / 24)
        );
        
        if (result.success) {
          user.gold -= result.transaction!.totalValue;
          user.inventory.addItem(item, quantity);
          user.trades++;
          this.totalTrades++;
          
          user.events.push({
            hour,
            type: 'trade_buy',
            details: { item, quantity, price: result.transaction!.totalValue, region }
          });
        } else {
          // Track trade failures
          this.reportIssue({
            hour,
            userId: user.id,
            severity: 'warning',
            category: 'economy',
            description: `Trade failed: ${result.reason}`,
            context: { item, quantity, region, userGold: user.gold }
          });
        }
      }
    } else {
      // Sell items
      const sellableItems = user.inventory.getItems().filter(i => 
        ['herbs', 'wood', 'iron_ore'].includes(i.templateId)
      );
      
      if (sellableItems.length > 0) {
        const item = sellableItems[Math.floor(this.rng() * sellableItems.length)];
        const price = this.economySystem.getPrice(item.templateId, region);
        const quantity = Math.min(item.quantity, 3);
        
        user.inventory.removeItem(item.id, quantity);
        user.gold += price * quantity;
        user.trades++;
        this.totalTrades++;
        
        // Update economy supply
        this.economySystem.updateSupply(region, item.templateId, quantity);
        
        user.events.push({
          hour,
          type: 'trade_sell',
          details: { item: item.templateId, quantity, price: price * quantity, region }
        });
      }
    }
  }
  
  /**
   * Simulate exploration
   */
  private simulateExploration(user: SimulatedUser, hour: number): void {
    const outcomes = ['found_items', 'found_gold', 'encounter', 'nothing', 'injury'];
    const outcome = outcomes[Math.floor(this.rng() * outcomes.length)];
    
    switch (outcome) {
      case 'found_items':
        const items = ['herbs', 'wood', 'bread'];
        const item = items[Math.floor(this.rng() * items.length)];
        if (user.inventory.canAddItem(item, 2)) {
          user.inventory.addItem(item, 2);
        }
        break;
        
      case 'found_gold':
        user.gold += 5 + Math.floor(this.rng() * 20);
        break;
        
      case 'encounter':
        if (this.rng() < 0.5) {
          this.simulateCombat(user, hour);
        }
        break;
        
      case 'injury':
        user.playerSystem.modifyStat('health', -5 - Math.floor(this.rng() * 10));
        break;
    }
    
    // Exploration uses stamina
    user.playerSystem.modifyStat('stamina', -10);
    
    user.events.push({ hour, type: 'exploration', details: { outcome } });
  }
  
  /**
   * Simulate resupply
   */
  private simulateResupply(user: SimulatedUser, hour: number): void {
    const stats = user.playerSystem.getStats();
    
    // Buy food if hungry
    if (stats.hunger < 50 && user.gold >= 10) {
      const price = this.economySystem.getPrice('bread', 'village');
      if (user.gold >= price * 3) {
        user.gold -= price * 3;
        user.inventory.addItem('bread', 3);
        user.events.push({ hour, type: 'resupply', details: { item: 'bread', quantity: 3 } });
      }
    }
    
    // Buy water if thirsty
    if (stats.thirst < 50 && user.gold >= 5) {
      const price = this.economySystem.getPrice('water', 'village');
      if (user.gold >= price * 3) {
        user.gold -= price * 3;
        user.inventory.addItem('water', 3);
        user.events.push({ hour, type: 'resupply', details: { item: 'water', quantity: 3 } });
      }
    }
  }
  
  /**
   * Handle random events
   */
  private handleRandomEvents(user: SimulatedUser, hour: number): void {
    // Weather effects
    if (this.rng() < 0.001) {
      const weatherEvents = ['storm', 'heatwave', 'cold_snap'];
      const event = weatherEvents[Math.floor(this.rng() * weatherEvents.length)];
      
      switch (event) {
        case 'storm':
          user.playerSystem.modifyStat('morale', -10);
          break;
        case 'heatwave':
          user.playerSystem.modifyStat('thirst', -20);
          break;
        case 'cold_snap':
          user.playerSystem.modifyStat('bodyTemperature', -2);
          break;
      }
      
      user.events.push({ hour, type: 'weather_event', details: { event } });
    }
    
    // Disease chance
    if (this.rng() < 0.0005) {
      user.playerSystem.modifyStat('infection', 20 + Math.floor(this.rng() * 30));
      user.events.push({ hour, type: 'disease', details: {} });
    }
    
    // Faction events
    for (const [faction, relation] of user.factionRelations) {
      const heatState = this.heatSystem.getHeatState(faction);
      if (heatState && heatState.escalationTier === 'hunting' && this.rng() < 0.01) {
        // Bounty hunters attack
        this.simulateCombat(user, hour);
        user.events.push({ hour, type: 'bounty_attack', details: { faction } });
      }
    }
  }

  
  /**
   * Update faction heat levels
   */
  private updateFactionHeat(hour: number): void {
    const factions = ['kingdom_north', 'church_order', 'mercenary_band', 'bandits'];
    
    for (const faction of factions) {
      this.heatSystem.decreaseHeat(faction, 1);
      
      const state = this.heatSystem.getHeatState(faction);
      if (state) {
        this.factionHeatHistory.get(faction)?.push(state.heatLevel);
        
        if (state.escalationTier === 'war') {
          this.warCount++;
        }
        if (state.escalationTier !== 'calm') {
          this.escalationCount++;
        }
      }
    }
  }
  
  /**
   * Validate user state for issues
   */
  private validateUserState(user: SimulatedUser, hour: number): void {
    const stats = user.playerSystem.getStats();
    
    // Check for impossible states
    if (stats.health < 0) {
      this.reportIssue({
        hour,
        userId: user.id,
        severity: 'critical',
        category: 'player_stats',
        description: 'Health dropped below 0 without triggering death',
        context: { stats }
      });
    }
    
    if (stats.health > stats.maxHealth) {
      this.reportIssue({
        hour,
        userId: user.id,
        severity: 'major',
        category: 'player_stats',
        description: 'Health exceeded maxHealth',
        context: { health: stats.health, maxHealth: stats.maxHealth }
      });
    }
    
    if (stats.stamina > stats.maxStamina) {
      this.reportIssue({
        hour,
        userId: user.id,
        severity: 'major',
        category: 'player_stats',
        description: 'Stamina exceeded maxStamina',
        context: { stamina: stats.stamina, maxStamina: stats.maxStamina }
      });
    }
    
    // Check for negative gold
    if (user.gold < 0) {
      this.reportIssue({
        hour,
        userId: user.id,
        severity: 'major',
        category: 'economy',
        description: 'Player gold went negative',
        context: { gold: user.gold }
      });
      user.gold = 0; // Fix it
    }
    
    // Check inventory weight
    const weight = user.inventory.getTotalWeight();
    if (weight > 50) {
      this.reportIssue({
        hour,
        userId: user.id,
        severity: 'minor',
        category: 'inventory',
        description: 'Inventory exceeded max weight',
        context: { weight, maxWeight: 50 }
      });
    }
    
    // Check for stat values out of expected range
    if (stats.hunger > 100 || stats.thirst > 100 || stats.morale > 100) {
      this.reportIssue({
        hour,
        userId: user.id,
        severity: 'minor',
        category: 'player_stats',
        description: 'Stat exceeded 100',
        context: { hunger: stats.hunger, thirst: stats.thirst, morale: stats.morale }
      });
    }
    
    // Check for NaN values
    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === 'number' && isNaN(value)) {
        this.reportIssue({
          hour,
          userId: user.id,
          severity: 'critical',
          category: 'player_stats',
          description: `NaN detected in stat: ${key}`,
          context: { stats }
        });
      }
    }
  }
  
  /**
   * Report an issue
   */
  private reportIssue(issue: SimulationIssue): void {
    this.issues.push(issue);
    
    const user = this.users.find(u => u.id === issue.userId);
    if (user) {
      user.issues.push(issue);
    }
    
    if (this.config.verboseLogging && issue.severity === 'critical') {
      console.log(`  [CRITICAL] ${issue.description} - ${issue.userId} at hour ${issue.hour}`);
    }
  }
  
  /**
   * Generate final results
   */
  private generateResults(durationMs: number): SimulationResults {
    console.log(`\n${'='.repeat(60)}`);
    console.log('GENERATING RESULTS...');
    console.log(`${'='.repeat(60)}\n`);
    
    // Calculate player statistics
    const aliveUsers = this.users.filter(u => u.playerSystem.isAlive());
    const totalPlaytime = this.users.reduce((sum, u) => sum + u.hoursPlayed, 0);
    
    // Calculate wealth distribution
    const wealths = this.users.map(u => u.gold).sort((a, b) => a - b);
    const medianWealth = wealths[Math.floor(wealths.length / 2)];
    
    // Calculate faction heat averages
    const avgHeat = new Map<string, number>();
    for (const [faction, history] of this.factionHeatHistory) {
      if (history.length > 0) {
        avgHeat.set(faction, history.reduce((a, b) => a + b, 0) / history.length);
      }
    }
    
    // Find most deadly faction
    const factionKills = new Map<string, number>();
    for (const user of this.users) {
      for (const event of user.events) {
        if (event.type === 'combat' && !event.details.won) {
          const faction = event.details.enemy;
          factionKills.set(faction, (factionKills.get(faction) || 0) + 1);
        }
      }
    }
    let mostDeadlyFaction = 'none';
    let maxKills = 0;
    for (const [faction, kills] of factionKills) {
      if (kills > maxKills) {
        maxKills = kills;
        mostDeadlyFaction = faction;
      }
    }
    
    // Count issues by category
    const issuesByCategory = new Map<string, number>();
    for (const issue of this.issues) {
      issuesByCategory.set(issue.category, (issuesByCategory.get(issue.category) || 0) + 1);
    }
    
    const results: SimulationResults = {
      totalHoursSimulated: this.config.hoursToSimulate,
      totalUsers: this.config.userCount,
      completedAt: new Date(),
      duration: durationMs,
      
      playerStats: {
        totalDeaths: this.totalDeaths,
        totalKills: this.totalKills,
        totalTrades: this.totalTrades,
        averagePlaytime: totalPlaytime / this.config.userCount,
        survivalRate: aliveUsers.length / this.config.userCount,
        deathsByStarvation: this.deathCauses.starvation,
        deathsByDehydration: this.deathCauses.dehydration,
        deathsByCombat: this.deathCauses.combat,
        deathsByHypothermia: this.deathCauses.hypothermia,
        deathsByInfection: this.deathCauses.infection
      },
      
      economyStats: {
        totalTransactions: this.totalTrades,
        totalGoldCirculated: this.users.reduce((sum, u) => sum + u.gold, 0),
        averagePlayerWealth: wealths.reduce((a, b) => a + b, 0) / wealths.length,
        wealthDistribution: {
          min: wealths[0],
          max: wealths[wealths.length - 1],
          median: medianWealth
        },
        priceVolatility: new Map(),
        supplyShortages: []
      },
      
      combatStats: {
        totalBattles: this.totalBattles,
        playerWinRate: this.totalKills / Math.max(1, this.totalBattles),
        averageDamagePerFight: 0,
        mostDeadlyFaction,
        surrenderRate: 0
      },
      
      factionStats: {
        averageHeatLevel: avgHeat,
        warDeclarations: this.warCount,
        escalationEvents: this.escalationCount
      },
      
      issues: this.issues,
      issuesByCategory,
      criticalIssues: this.issues.filter(i => i.severity === 'critical')
    };
    
    return results;
  }
}
