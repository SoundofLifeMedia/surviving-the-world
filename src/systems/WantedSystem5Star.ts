/**
 * GTA-Style 5-Star Wanted System
 * Escalating police response based on criminal activity
 * Requirements: 4.1-4.6
 */

export type WantedLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type CrimeType = 
  | 'assault'           // +0.5 star
  | 'carTheft'          // +1 star
  | 'murder'            // +2 stars
  | 'copKill'           // +3 stars
  | 'explosion'         // +2 stars
  | 'bankRobbery'       // +4 stars
  | 'vehicleDestruction'// +1 star
  | 'recklessDriving'   // +0.25 star
  | 'hitAndRun'         // +0.5 star
  | 'trespassing'       // +0.25 star
  | 'weaponDisplay';    // +0.5 star

export type PoliceTactic = 'pursue' | 'pit' | 'spike' | 'ram' | 'lethal' | 'helicopter' | 'roadblock';

export interface Vector3 { x: number; y: number; z: number; }

export interface PoliceUnit {
  id: string;
  type: 'patrol' | 'swat' | 'helicopter' | 'military';
  position: Vector3;
  state: 'responding' | 'pursuing' | 'searching' | 'engaging';
  targetId: string | null;
}

export interface Roadblock {
  id: string;
  position: Vector3;
  direction: Vector3;
  active: boolean;
}

export interface PoliceResponse {
  level: WantedLevel;
  units: {
    patrol: number;
    swat: number;
    helicopter: number;
    military: number;
  };
  tactics: PoliceTactic[];
  searchRadius: number;
  aggressiveness: number; // 0-1
}

// Crime heat values (in stars)
export const CRIME_HEAT: Record<CrimeType, number> = {
  assault: 0.5,
  carTheft: 1,
  murder: 2,
  copKill: 3,
  explosion: 2,
  bankRobbery: 4,
  vehicleDestruction: 1,
  recklessDriving: 0.25,
  hitAndRun: 0.5,
  trespassing: 0.25,
  weaponDisplay: 0.5
};

// Police response per wanted level
export const POLICE_RESPONSE: Record<WantedLevel, PoliceResponse> = {
  0: {
    level: 0,
    units: { patrol: 0, swat: 0, helicopter: 0, military: 0 },
    tactics: [],
    searchRadius: 0,
    aggressiveness: 0
  },
  1: {
    level: 1,
    units: { patrol: 2, swat: 0, helicopter: 0, military: 0 },
    tactics: ['pursue'],
    searchRadius: 100,
    aggressiveness: 0.3
  },
  2: {
    level: 2,
    units: { patrol: 4, swat: 0, helicopter: 0, military: 0 },
    tactics: ['pursue', 'pit'],
    searchRadius: 150,
    aggressiveness: 0.5
  },
  3: {
    level: 3,
    units: { patrol: 6, swat: 2, helicopter: 1, military: 0 },
    tactics: ['pursue', 'pit', 'spike', 'helicopter'],
    searchRadius: 200,
    aggressiveness: 0.7
  },
  4: {
    level: 4,
    units: { patrol: 8, swat: 4, helicopter: 2, military: 0 },
    tactics: ['pursue', 'pit', 'spike', 'ram', 'helicopter', 'roadblock'],
    searchRadius: 300,
    aggressiveness: 0.85
  },
  5: {
    level: 5,
    units: { patrol: 10, swat: 6, helicopter: 3, military: 4 },
    tactics: ['pursue', 'pit', 'spike', 'ram', 'lethal', 'helicopter', 'roadblock'],
    searchRadius: 500,
    aggressiveness: 1.0
  }
};

// Evasion time per star (seconds)
export const EVASION_TIME_PER_STAR = 60;

export interface WantedState {
  level: WantedLevel;
  heat: number;           // Accumulated heat (0-5)
  evasionTimer: number;   // Seconds remaining to lose current star
  lastSeenPosition: Vector3 | null;
  lastSeenTime: number;
  isHidden: boolean;
  activeUnits: PoliceUnit[];
  roadblocks: Roadblock[];
}

export class WantedSystem5Star {
  private state: WantedState;
  private playerPosition: Vector3 = { x: 0, y: 0, z: 0 };
  private nextUnitId: number = 1;
  private nextRoadblockId: number = 1;
  private listeners: ((level: WantedLevel, oldLevel: WantedLevel) => void)[] = [];

  constructor() {
    this.state = {
      level: 0,
      heat: 0,
      evasionTimer: 0,
      lastSeenPosition: null,
      lastSeenTime: 0,
      isHidden: false,
      activeUnits: [],
      roadblocks: []
    };
  }

  // Get current wanted level
  getLevel(): WantedLevel {
    return this.state.level;
  }

  // Get current heat (raw value)
  getHeat(): number {
    return this.state.heat;
  }

  // Get full state
  getState(): WantedState {
    return { ...this.state };
  }

  // Get police response for current level
  getPoliceResponse(): PoliceResponse {
    return POLICE_RESPONSE[this.state.level];
  }

  // Report a crime
  reportCrime(crime: CrimeType, witnessed: boolean = true): void {
    if (!witnessed) return;

    const heatGain = CRIME_HEAT[crime];
    const oldLevel = this.state.level;
    
    this.state.heat = Math.min(5, this.state.heat + heatGain);
    this.state.level = Math.floor(this.state.heat) as WantedLevel;
    this.state.level = Math.min(5, this.state.level) as WantedLevel;
    
    // Reset evasion timer when heat increases
    this.state.evasionTimer = this.state.level * EVASION_TIME_PER_STAR;
    this.state.isHidden = false;
    this.state.lastSeenPosition = { ...this.playerPosition };
    this.state.lastSeenTime = Date.now();

    // Spawn response if level increased
    if (this.state.level > oldLevel) {
      this.spawnPoliceResponse();
      this.notifyListeners(this.state.level, oldLevel);
    }
  }

  // Update player position (for police tracking)
  updatePlayerPosition(position: Vector3): void {
    this.playerPosition = { ...position };
  }

  // Update system (call every frame)
  update(deltaTime: number): void {
    if (this.state.level === 0) return;

    // Check if player is visible to police
    const isVisible = this.checkPlayerVisibility();
    
    if (isVisible) {
      this.state.lastSeenPosition = { ...this.playerPosition };
      this.state.lastSeenTime = Date.now();
      this.state.isHidden = false;
      this.state.evasionTimer = this.state.level * EVASION_TIME_PER_STAR;
    } else {
      this.state.isHidden = true;
      
      // Decrease evasion timer when hidden
      this.state.evasionTimer -= deltaTime;
      
      if (this.state.evasionTimer <= 0) {
        this.reduceWantedLevel();
      }
    }

    // Update police units
    this.updatePoliceUnits(deltaTime);
  }

  // Check if player is visible to any police unit
  private checkPlayerVisibility(): boolean {
    const response = POLICE_RESPONSE[this.state.level];
    
    for (const unit of this.state.activeUnits) {
      const distance = this.calculateDistance(unit.position, this.playerPosition);
      
      // Different detection ranges per unit type
      let detectionRange = response.searchRadius;
      if (unit.type === 'helicopter') detectionRange *= 2;
      if (unit.type === 'swat') detectionRange *= 0.8;
      
      if (distance <= detectionRange) {
        return true;
      }
    }
    
    return false;
  }

  // Reduce wanted level by 1
  private reduceWantedLevel(): void {
    if (this.state.level === 0) return;

    const oldLevel = this.state.level;
    this.state.heat = Math.max(0, this.state.heat - 1);
    this.state.level = Math.floor(this.state.heat) as WantedLevel;
    
    // Reset evasion timer for next level
    if (this.state.level > 0) {
      this.state.evasionTimer = this.state.level * EVASION_TIME_PER_STAR;
    } else {
      this.state.evasionTimer = 0;
      this.clearAllUnits();
    }

    // Despawn excess units
    this.adjustPoliceUnits();
    this.notifyListeners(this.state.level, oldLevel);
  }

  // Spawn police response for current level
  private spawnPoliceResponse(): void {
    const response = POLICE_RESPONSE[this.state.level];
    const currentCounts = this.getUnitCounts();

    // Spawn patrol units
    const patrolNeeded = response.units.patrol - currentCounts.patrol;
    for (let i = 0; i < patrolNeeded; i++) {
      this.spawnUnit('patrol');
    }

    // Spawn SWAT units
    const swatNeeded = response.units.swat - currentCounts.swat;
    for (let i = 0; i < swatNeeded; i++) {
      this.spawnUnit('swat');
    }

    // Spawn helicopters
    const heliNeeded = response.units.helicopter - currentCounts.helicopter;
    for (let i = 0; i < heliNeeded; i++) {
      this.spawnUnit('helicopter');
    }

    // Spawn military (level 5 only)
    const militaryNeeded = response.units.military - currentCounts.military;
    for (let i = 0; i < militaryNeeded; i++) {
      this.spawnUnit('military');
    }

    // Spawn roadblocks at level 4+
    if (this.state.level >= 4 && response.tactics.includes('roadblock')) {
      this.spawnRoadblocks();
    }
  }

  // Spawn a police unit
  private spawnUnit(type: PoliceUnit['type']): void {
    const spawnDistance = 100 + Math.random() * 100;
    const angle = Math.random() * Math.PI * 2;
    
    const unit: PoliceUnit = {
      id: `police_${this.nextUnitId++}`,
      type,
      position: {
        x: this.playerPosition.x + Math.cos(angle) * spawnDistance,
        y: type === 'helicopter' ? 50 : 0,
        z: this.playerPosition.z + Math.sin(angle) * spawnDistance
      },
      state: 'responding',
      targetId: null
    };

    this.state.activeUnits.push(unit);
  }

  // Spawn roadblocks
  private spawnRoadblocks(): void {
    const numRoadblocks = Math.min(3, this.state.level - 3);
    
    for (let i = 0; i < numRoadblocks; i++) {
      const distance = 150 + Math.random() * 100;
      const angle = (i / numRoadblocks) * Math.PI * 2;
      
      const roadblock: Roadblock = {
        id: `roadblock_${this.nextRoadblockId++}`,
        position: {
          x: this.playerPosition.x + Math.cos(angle) * distance,
          y: 0,
          z: this.playerPosition.z + Math.sin(angle) * distance
        },
        direction: { x: -Math.sin(angle), y: 0, z: Math.cos(angle) },
        active: true
      };

      this.state.roadblocks.push(roadblock);
    }
  }

  // Update police unit positions and states
  private updatePoliceUnits(deltaTime: number): void {
    const response = POLICE_RESPONSE[this.state.level];
    
    for (const unit of this.state.activeUnits) {
      const targetPos = this.state.isHidden && this.state.lastSeenPosition
        ? this.state.lastSeenPosition
        : this.playerPosition;

      const distance = this.calculateDistance(unit.position, targetPos);
      
      // Update state based on distance
      if (distance < 20) {
        unit.state = 'engaging';
      } else if (distance < response.searchRadius) {
        unit.state = 'pursuing';
      } else if (this.state.isHidden) {
        unit.state = 'searching';
      } else {
        unit.state = 'responding';
      }

      // Move towards target
      const speed = this.getUnitSpeed(unit.type);
      const direction = this.normalizeVector({
        x: targetPos.x - unit.position.x,
        y: targetPos.y - unit.position.y,
        z: targetPos.z - unit.position.z
      });

      unit.position.x += direction.x * speed * deltaTime;
      unit.position.y += direction.y * speed * deltaTime;
      unit.position.z += direction.z * speed * deltaTime;
    }
  }

  // Get unit speed based on type
  private getUnitSpeed(type: PoliceUnit['type']): number {
    switch (type) {
      case 'patrol': return 30;
      case 'swat': return 25;
      case 'helicopter': return 50;
      case 'military': return 20;
      default: return 25;
    }
  }

  // Adjust police units when level decreases
  private adjustPoliceUnits(): void {
    const response = POLICE_RESPONSE[this.state.level];
    const counts = this.getUnitCounts();

    // Remove excess units
    const removeUnits = (type: PoliceUnit['type'], excess: number) => {
      let removed = 0;
      this.state.activeUnits = this.state.activeUnits.filter(unit => {
        if (unit.type === type && removed < excess) {
          removed++;
          return false;
        }
        return true;
      });
    };

    if (counts.patrol > response.units.patrol) {
      removeUnits('patrol', counts.patrol - response.units.patrol);
    }
    if (counts.swat > response.units.swat) {
      removeUnits('swat', counts.swat - response.units.swat);
    }
    if (counts.helicopter > response.units.helicopter) {
      removeUnits('helicopter', counts.helicopter - response.units.helicopter);
    }
    if (counts.military > response.units.military) {
      removeUnits('military', counts.military - response.units.military);
    }

    // Remove roadblocks at lower levels
    if (this.state.level < 4) {
      this.state.roadblocks = [];
    }
  }

  // Get current unit counts
  private getUnitCounts(): { patrol: number; swat: number; helicopter: number; military: number } {
    const counts = { patrol: 0, swat: 0, helicopter: 0, military: 0 };
    for (const unit of this.state.activeUnits) {
      counts[unit.type]++;
    }
    return counts;
  }

  // Clear all units (when wanted level reaches 0)
  private clearAllUnits(): void {
    this.state.activeUnits = [];
    this.state.roadblocks = [];
  }

  // Reset wanted level (death/arrest)
  reset(): void {
    const oldLevel = this.state.level;
    this.state = {
      level: 0,
      heat: 0,
      evasionTimer: 0,
      lastSeenPosition: null,
      lastSeenTime: 0,
      isHidden: false,
      activeUnits: [],
      roadblocks: []
    };
    
    if (oldLevel > 0) {
      this.notifyListeners(0, oldLevel);
    }
  }

  // Add listener for level changes
  onLevelChange(callback: (level: WantedLevel, oldLevel: WantedLevel) => void): void {
    this.listeners.push(callback);
  }

  // Notify listeners
  private notifyListeners(level: WantedLevel, oldLevel: WantedLevel): void {
    for (const listener of this.listeners) {
      listener(level, oldLevel);
    }
  }

  // Helper: Calculate distance
  private calculateDistance(a: Vector3, b: Vector3): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
  }

  // Helper: Normalize vector
  private normalizeVector(v: Vector3): Vector3 {
    const mag = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
    if (mag === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
  }

  // Get evasion progress (0-1)
  getEvasionProgress(): number {
    if (this.state.level === 0) return 1;
    const totalTime = this.state.level * EVASION_TIME_PER_STAR;
    return 1 - (this.state.evasionTimer / totalTime);
  }

  // Get time remaining to lose current star
  getTimeToLoseStar(): number {
    return Math.max(0, this.state.evasionTimer);
  }

  // Serialize
  serialize(): object {
    return {
      level: this.state.level,
      heat: this.state.heat,
      evasionTimer: this.state.evasionTimer,
      lastSeenPosition: this.state.lastSeenPosition,
      isHidden: this.state.isHidden,
      activeUnits: this.state.activeUnits,
      roadblocks: this.state.roadblocks
    };
  }

  // Deserialize
  static deserialize(data: any): WantedSystem5Star {
    const system = new WantedSystem5Star();
    system.state = {
      level: data.level || 0,
      heat: data.heat || 0,
      evasionTimer: data.evasionTimer || 0,
      lastSeenPosition: data.lastSeenPosition || null,
      lastSeenTime: Date.now(),
      isHidden: data.isHidden || false,
      activeUnits: data.activeUnits || [],
      roadblocks: data.roadblocks || []
    };
    return system;
  }
}

export default WantedSystem5Star;
