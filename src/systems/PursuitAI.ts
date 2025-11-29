/**
 * PursuitAI - Tactical police pursuit system for AAA wanted mechanics
 * Feature: enterprise-100-percent
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4
 */

import { Vector3 } from './CoverSystem';

export interface PursuitVehicle {
  id: string;
  vehicleId: string;
  type: 'patrol' | 'interceptor' | 'swat' | 'helicopter';
  state: 'pursuing' | 'blocking' | 'searching' | 'pit_attempt' | 'on_foot';
  targetPlayerId: string;
  officers: string[];
  position: Vector3;
  health: number;
  maxHealth: number;
}

export interface Roadblock {
  id: string;
  position: Vector3;
  vehicles: string[];
  active: boolean;
  direction: Vector3;
}

export interface PursuitState {
  activeVehicles: PursuitVehicle[];
  roadblocks: Roadblock[];
  helicopterActive: boolean;
  helicopterId: string | null;
  lastKnownPlayerPosition: Vector3;
  searchTimer: number;
  isSearching: boolean;
  playerTracked: boolean;
}

export interface PursuitConfig {
  level2: { vehicleCount: number; spawnRadius: number };
  level3: { vehicleCount: number; roadblockEnabled: boolean; roadblockDistance: number };
  level4: { vehicleCount: number; helicopterEnabled: boolean; swatEnabled: boolean };
  level5: { vehicleCount: number; militaryEnabled: boolean; noRetreat: boolean };
  pitManeuver: { minDistance: number; maxDistance: number; successRate: number };
  searchBehavior: { losBreakTime: number; searchDuration: number; searchRadius: number };
}

export class PursuitAI {
  private state: PursuitState;
  private config: PursuitConfig;
  private nextVehicleId = 1;
  private nextRoadblockId = 1;

  static readonly DEFAULT_CONFIG: PursuitConfig = {
    level2: { vehicleCount: 2, spawnRadius: 100 },
    level3: { vehicleCount: 4, roadblockEnabled: true, roadblockDistance: 200 },
    level4: { vehicleCount: 6, helicopterEnabled: true, swatEnabled: true },
    level5: { vehicleCount: 8, militaryEnabled: true, noRetreat: false },
    pitManeuver: { minDistance: 0, maxDistance: 5, successRate: 0.3 },
    searchBehavior: { losBreakTime: 10, searchDuration: 30, searchRadius: 150 }
  };

  constructor(config: Partial<PursuitConfig> = {}) {
    this.config = { ...PursuitAI.DEFAULT_CONFIG, ...config };
    this.state = this.createDefaultState();
  }

  private createDefaultState(): PursuitState {
    return {
      activeVehicles: [],
      roadblocks: [],
      helicopterActive: false,
      helicopterId: null,
      lastKnownPlayerPosition: { x: 0, y: 0, z: 0 },
      searchTimer: 0,
      isSearching: false,
      playerTracked: true
    };
  }

  // State access
  getPursuitState(): PursuitState {
    return { ...this.state };
  }

  isPlayerTracked(): boolean {
    return this.state.playerTracked;
  }

  getActiveVehicleCount(): number {
    return this.state.activeVehicles.length;
  }

  // Spawn management based on wanted level
  updateForWantedLevel(wantedLevel: number, playerPosition: Vector3): void {
    this.state.lastKnownPlayerPosition = { ...playerPosition };
    
    if (wantedLevel < 2) {
      this.clearAllPursuit();
      return;
    }

    // Level 2+: Spawn pursuit vehicles
    const targetCount = this.getTargetVehicleCount(wantedLevel);
    while (this.state.activeVehicles.filter(v => v.type !== 'helicopter').length < targetCount) {
      this.spawnPursuitVehicle(wantedLevel, playerPosition);
    }

    // Level 3+: Enable roadblocks
    if (wantedLevel >= 3 && this.config.level3.roadblockEnabled) {
      if (this.state.roadblocks.filter(r => r.active).length === 0) {
        this.spawnRoadblock(playerPosition, { x: 1, y: 0, z: 0 });
      }
    }

    // Level 4+: Spawn helicopter
    if (wantedLevel >= 4 && this.config.level4.helicopterEnabled && !this.state.helicopterActive) {
      this.spawnHelicopter(playerPosition);
    }
  }

  private getTargetVehicleCount(wantedLevel: number): number {
    switch (wantedLevel) {
      case 2: return this.config.level2.vehicleCount;
      case 3: return this.config.level3.vehicleCount;
      case 4: return this.config.level4.vehicleCount;
      case 5: return this.config.level5.vehicleCount;
      default: return 0;
    }
  }

  spawnPursuitVehicle(wantedLevel: number, playerPosition: Vector3): PursuitVehicle {
    const type = this.getVehicleTypeForLevel(wantedLevel);
    const spawnRadius = this.config.level2.spawnRadius;
    
    const angle = Math.random() * Math.PI * 2;
    const spawnPos: Vector3 = {
      x: playerPosition.x + Math.cos(angle) * spawnRadius,
      y: playerPosition.y,
      z: playerPosition.z + Math.sin(angle) * spawnRadius
    };

    const vehicle: PursuitVehicle = {
      id: `pursuit_${this.nextVehicleId++}`,
      vehicleId: `vehicle_${Date.now()}`,
      type,
      state: 'pursuing',
      targetPlayerId: 'player',
      officers: this.generateOfficers(type),
      position: spawnPos,
      health: type === 'swat' ? 150 : 100,
      maxHealth: type === 'swat' ? 150 : 100
    };

    this.state.activeVehicles.push(vehicle);
    return vehicle;
  }

  private getVehicleTypeForLevel(wantedLevel: number): 'patrol' | 'interceptor' | 'swat' {
    if (wantedLevel >= 4 && this.config.level4.swatEnabled && Math.random() > 0.5) {
      return 'swat';
    }
    if (wantedLevel >= 3 && Math.random() > 0.5) {
      return 'interceptor';
    }
    return 'patrol';
  }

  private generateOfficers(vehicleType: 'patrol' | 'interceptor' | 'swat' | 'helicopter'): string[] {
    const count = vehicleType === 'swat' ? 4 : vehicleType === 'helicopter' ? 2 : 2;
    return Array.from({ length: count }, (_, i) => `officer_${Date.now()}_${i}`);
  }

  spawnRoadblock(playerPosition: Vector3, playerVelocity: Vector3): Roadblock {
    const distance = this.config.level3.roadblockDistance;
    const direction = this.normalize(playerVelocity);
    
    const roadblock: Roadblock = {
      id: `roadblock_${this.nextRoadblockId++}`,
      position: {
        x: playerPosition.x + direction.x * distance,
        y: playerPosition.y,
        z: playerPosition.z + direction.z * distance
      },
      vehicles: [],
      active: true,
      direction
    };

    // Add blocking vehicles
    for (let i = 0; i < 3; i++) {
      roadblock.vehicles.push(`block_vehicle_${Date.now()}_${i}`);
    }

    this.state.roadblocks.push(roadblock);
    return roadblock;
  }

  spawnHelicopter(playerPosition: Vector3): PursuitVehicle {
    const helicopter: PursuitVehicle = {
      id: `helicopter_${this.nextVehicleId++}`,
      vehicleId: `heli_${Date.now()}`,
      type: 'helicopter',
      state: 'pursuing',
      targetPlayerId: 'player',
      officers: this.generateOfficers('helicopter'),
      position: {
        x: playerPosition.x,
        y: playerPosition.y + 100, // Above player
        z: playerPosition.z
      },
      health: 200,
      maxHealth: 200
    };

    this.state.activeVehicles.push(helicopter);
    this.state.helicopterActive = true;
    this.state.helicopterId = helicopter.id;
    
    return helicopter;
  }


  // Tactical behaviors
  attemptPIT(pursuerId: string, targetPosition: Vector3): { attempted: boolean; success: boolean } {
    const pursuer = this.state.activeVehicles.find(v => v.id === pursuerId);
    if (!pursuer || pursuer.type === 'helicopter') {
      return { attempted: false, success: false };
    }

    const distance = this.distance(pursuer.position, targetPosition);
    
    // PIT only within configured distance
    if (distance > this.config.pitManeuver.maxDistance) {
      return { attempted: false, success: false };
    }

    pursuer.state = 'pit_attempt';
    const success = Math.random() < this.config.pitManeuver.successRate;
    
    return { attempted: true, success };
  }

  canAttemptPIT(pursuerId: string, targetPosition: Vector3): boolean {
    const pursuer = this.state.activeVehicles.find(v => v.id === pursuerId);
    if (!pursuer || pursuer.type === 'helicopter') return false;
    
    const distance = this.distance(pursuer.position, targetPosition);
    return distance <= this.config.pitManeuver.maxDistance;
  }

  coordinateRoadblock(playerPosition: Vector3, playerVelocity: Vector3): void {
    // Remove old roadblocks that player has passed
    this.state.roadblocks = this.state.roadblocks.filter(rb => {
      const toRoadblock = {
        x: rb.position.x - playerPosition.x,
        y: rb.position.y - playerPosition.y,
        z: rb.position.z - playerPosition.z
      };
      const dot = this.dotProduct(this.normalize(playerVelocity), this.normalize(toRoadblock));
      return dot > 0; // Keep only roadblocks ahead
    });

    // Spawn new roadblock if needed
    if (this.state.roadblocks.filter(r => r.active).length === 0) {
      this.spawnRoadblock(playerPosition, playerVelocity);
    }
  }

  updateHelicopterTracking(playerPosition: Vector3, isInCoveredArea: boolean): void {
    if (!this.state.helicopterActive || !this.state.helicopterId) return;

    if (isInCoveredArea) {
      // Lose tracking in tunnels/parking structures
      this.state.playerTracked = false;
    } else {
      this.state.playerTracked = true;
      this.state.lastKnownPlayerPosition = { ...playerPosition };
      
      // Relay position to ground units
      this.state.activeVehicles.forEach(v => {
        if (v.type !== 'helicopter' && v.state === 'searching') {
          v.state = 'pursuing';
        }
      });
    }
  }

  // LOS and search behavior
  handleLOSBreak(deltaTime: number): void {
    if (this.state.playerTracked) {
      this.state.searchTimer = 0;
      this.state.isSearching = false;
      return;
    }

    this.state.searchTimer += deltaTime;
    
    if (this.state.searchTimer >= this.config.searchBehavior.losBreakTime) {
      this.state.isSearching = true;
      
      // Switch all vehicles to search mode
      this.state.activeVehicles.forEach(v => {
        if (v.state === 'pursuing') {
          v.state = 'searching';
        }
      });
    }
  }

  setPlayerTracked(tracked: boolean, position?: Vector3): void {
    this.state.playerTracked = tracked;
    if (tracked && position) {
      this.state.lastKnownPlayerPosition = { ...position };
      this.state.searchTimer = 0;
      this.state.isSearching = false;
    }
  }

  // Vehicle disabled handling
  handleVehicleDisabled(vehicleId: string): void {
    const vehicle = this.state.activeVehicles.find(v => v.vehicleId === vehicleId);
    if (!vehicle) return;

    if (vehicle.type === 'helicopter') {
      this.state.helicopterActive = false;
      this.state.helicopterId = null;
    }

    // Officers exit and pursue on foot
    vehicle.state = 'on_foot';
  }

  handlePlayerVehicleDisabled(): void {
    // All nearby pursuit vehicles have officers exit
    this.state.activeVehicles.forEach(v => {
      if (v.type !== 'helicopter' && v.state === 'pursuing') {
        v.state = 'on_foot';
      }
    });
  }

  // Damage handling
  damageVehicle(vehicleId: string, damage: number): boolean {
    const vehicle = this.state.activeVehicles.find(v => v.id === vehicleId);
    if (!vehicle) return false;

    vehicle.health = Math.max(0, vehicle.health - damage);
    
    if (vehicle.health <= 0) {
      this.removeVehicle(vehicleId);
      return true; // Vehicle destroyed
    }

    // Helicopter retreats at low health
    if (vehicle.type === 'helicopter' && vehicle.health < vehicle.maxHealth * 0.3) {
      this.helicopterRetreat();
      return false;
    }

    return false;
  }

  helicopterRetreat(): void {
    if (this.state.helicopterId) {
      this.removeVehicle(this.state.helicopterId);
    }
    this.state.helicopterActive = false;
    this.state.helicopterId = null;
  }

  removeVehicle(vehicleId: string): void {
    const index = this.state.activeVehicles.findIndex(v => v.id === vehicleId);
    if (index !== -1) {
      const vehicle = this.state.activeVehicles[index];
      if (vehicle.type === 'helicopter') {
        this.state.helicopterActive = false;
        this.state.helicopterId = null;
      }
      this.state.activeVehicles.splice(index, 1);
    }
  }

  // Update loop
  updatePursuit(deltaTime: number, playerPosition: Vector3, playerInCoveredArea: boolean): void {
    // Update helicopter tracking
    this.updateHelicopterTracking(playerPosition, playerInCoveredArea);
    
    // Handle LOS break
    this.handleLOSBreak(deltaTime);
    
    // Update vehicle positions (simplified - would integrate with physics)
    this.state.activeVehicles.forEach(v => {
      if (v.state === 'pursuing' && this.state.playerTracked) {
        // Move toward player
        const dir = this.normalize({
          x: playerPosition.x - v.position.x,
          y: playerPosition.y - v.position.y,
          z: playerPosition.z - v.position.z
        });
        const speed = v.type === 'helicopter' ? 50 : 30;
        v.position.x += dir.x * speed * deltaTime;
        v.position.y += dir.y * speed * deltaTime;
        v.position.z += dir.z * speed * deltaTime;
      }
    });
  }

  clearAllPursuit(): void {
    this.state = this.createDefaultState();
  }

  // Utility functions
  private distance(a: Vector3, b: Vector3): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private normalize(v: Vector3): Vector3 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  private dotProduct(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }
}
