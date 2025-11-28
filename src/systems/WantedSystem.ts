/**
 * Wanted System (GTA-style)
 * Tracks player notoriety with factions, escalating responses
 * Inspired by GTA's police/wanted level mechanics
 */

export type WantedLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface WantedState {
  factionId: string;
  level: WantedLevel;
  heat: number; // 0-100, decays over time
  lastCrimeTime: number;
  searchRadius: number;
  activeHunters: number;
  lastKnownPosition: { x: number; y: number } | null;
}

export interface Crime {
  type: string;
  severity: number; // Heat added
  witnesses: string[];
  location: { x: number; y: number };
  timestamp: number;
}

export interface HunterUnit {
  id: string;
  type: 'patrol' | 'search_party' | 'elite' | 'army';
  count: number;
  equipment: string;
  behavior: 'patrol' | 'search' | 'pursue' | 'surround';
}

export class WantedSystem {
  private wantedStates: Map<string, WantedState> = new Map();
  private crimeLog: Crime[] = [];
  private readonly HEAT_DECAY_RATE = 2; // per minute when hidden
  private readonly HEAT_THRESHOLDS: number[] = [0, 20, 40, 60, 80, 95];

  constructor() {
    this.initializeDefaultFactions();
  }

  private initializeDefaultFactions(): void {
    const factions = ['kingdom_north', 'church_order', 'mercenary_band', 'city_guard'];
    for (const factionId of factions) {
      this.wantedStates.set(factionId, {
        factionId,
        level: 0,
        heat: 0,
        lastCrimeTime: 0,
        searchRadius: 0,
        activeHunters: 0,
        lastKnownPosition: null
      });
    }
  }

  // Commit a crime - adds heat and potentially witnesses
  commitCrime(
    crimeType: string,
    severity: number,
    location: { x: number; y: number },
    affectedFactions: string[],
    witnesses: string[] = []
  ): void {
    const crime: Crime = {
      type: crimeType,
      severity,
      witnesses,
      location,
      timestamp: Date.now()
    };
    this.crimeLog.push(crime);

    // Add heat to affected factions
    for (const factionId of affectedFactions) {
      this.addHeat(factionId, severity, location, witnesses.length > 0);
    }
  }

  private addHeat(
    factionId: string,
    amount: number,
    location: { x: number; y: number },
    witnessed: boolean
  ): void {
    let state = this.wantedStates.get(factionId);
    if (!state) {
      state = {
        factionId,
        level: 0,
        heat: 0,
        lastCrimeTime: 0,
        searchRadius: 0,
        activeHunters: 0,
        lastKnownPosition: null
      };
      this.wantedStates.set(factionId, state);
    }

    // Witnessed crimes add more heat
    const heatMultiplier = witnessed ? 1.5 : 1.0;
    state.heat = Math.min(100, state.heat + amount * heatMultiplier);
    state.lastCrimeTime = Date.now();
    state.lastKnownPosition = location;

    // Update wanted level based on heat
    this.updateWantedLevel(state);
  }

  private updateWantedLevel(state: WantedState): void {
    let newLevel: WantedLevel = 0;
    for (let i = 5; i >= 0; i--) {
      if (state.heat >= this.HEAT_THRESHOLDS[i]) {
        newLevel = i as WantedLevel;
        break;
      }
    }

    if (newLevel !== state.level) {
      state.level = newLevel;
      this.onWantedLevelChange(state);
    }
  }

  private onWantedLevelChange(state: WantedState): void {
    // Configure response based on wanted level
    switch (state.level) {
      case 0:
        state.searchRadius = 0;
        state.activeHunters = 0;
        break;
      case 1: // Minor - Local patrol investigates
        state.searchRadius = 50;
        state.activeHunters = 2;
        break;
      case 2: // Moderate - Search parties deployed
        state.searchRadius = 100;
        state.activeHunters = 5;
        break;
      case 3: // Serious - Aggressive pursuit
        state.searchRadius = 200;
        state.activeHunters = 10;
        break;
      case 4: // Severe - Elite units, roadblocks
        state.searchRadius = 400;
        state.activeHunters = 20;
        break;
      case 5: // Maximum - Full military response
        state.searchRadius = 800;
        state.activeHunters = 50;
        break;
    }
  }

  // Get hunter units for current wanted level
  getHunterUnits(factionId: string): HunterUnit[] {
    const state = this.wantedStates.get(factionId);
    if (!state || state.level === 0) return [];

    const units: HunterUnit[] = [];

    switch (state.level) {
      case 1:
        units.push({ id: 'patrol_1', type: 'patrol', count: 2, equipment: 'basic', behavior: 'search' });
        break;
      case 2:
        units.push({ id: 'patrol_1', type: 'patrol', count: 3, equipment: 'basic', behavior: 'pursue' });
        units.push({ id: 'search_1', type: 'search_party', count: 2, equipment: 'basic', behavior: 'search' });
        break;
      case 3:
        units.push({ id: 'patrol_1', type: 'patrol', count: 4, equipment: 'armed', behavior: 'pursue' });
        units.push({ id: 'search_1', type: 'search_party', count: 4, equipment: 'armed', behavior: 'surround' });
        units.push({ id: 'elite_1', type: 'elite', count: 2, equipment: 'heavy', behavior: 'pursue' });
        break;
      case 4:
        units.push({ id: 'patrol_1', type: 'patrol', count: 6, equipment: 'armed', behavior: 'surround' });
        units.push({ id: 'elite_1', type: 'elite', count: 4, equipment: 'heavy', behavior: 'pursue' });
        units.push({ id: 'elite_2', type: 'elite', count: 4, equipment: 'heavy', behavior: 'surround' });
        break;
      case 5:
        units.push({ id: 'elite_1', type: 'elite', count: 10, equipment: 'heavy', behavior: 'pursue' });
        units.push({ id: 'army_1', type: 'army', count: 20, equipment: 'military', behavior: 'surround' });
        units.push({ id: 'army_2', type: 'army', count: 20, equipment: 'military', behavior: 'pursue' });
        break;
    }

    return units;
  }

  // Update heat decay when player is hidden
  update(deltaMinutes: number, playerPosition: { x: number; y: number }, isHidden: boolean): void {
    for (const state of this.wantedStates.values()) {
      if (state.level === 0) continue;

      if (isHidden) {
        // Decay heat when hidden
        state.heat = Math.max(0, state.heat - this.HEAT_DECAY_RATE * deltaMinutes);
        this.updateWantedLevel(state);
      } else if (state.lastKnownPosition) {
        // Update last known position if player is spotted
        state.lastKnownPosition = playerPosition;
      }
    }
  }

  // Check if player is in search radius
  isInSearchRadius(factionId: string, playerPosition: { x: number; y: number }): boolean {
    const state = this.wantedStates.get(factionId);
    if (!state || !state.lastKnownPosition || state.level === 0) return false;

    const dx = playerPosition.x - state.lastKnownPosition.x;
    const dy = playerPosition.y - state.lastKnownPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= state.searchRadius;
  }

  // Lose wanted level (bribe, escape, time)
  clearWanted(factionId: string): void {
    const state = this.wantedStates.get(factionId);
    if (state) {
      state.heat = 0;
      state.level = 0;
      state.searchRadius = 0;
      state.activeHunters = 0;
      state.lastKnownPosition = null;
    }
  }

  // Pay bribe to reduce wanted level
  payBribe(factionId: string, amount: number): { success: boolean; heatReduced: number } {
    const state = this.wantedStates.get(factionId);
    if (!state) return { success: false, heatReduced: 0 };

    // Bribe effectiveness based on amount and current level
    const effectiveness = Math.min(1, amount / (state.level * 100));
    const heatReduced = state.heat * effectiveness * 0.5;
    
    state.heat = Math.max(0, state.heat - heatReduced);
    this.updateWantedLevel(state);

    return { success: true, heatReduced };
  }

  getWantedLevel(factionId: string): WantedLevel {
    return this.wantedStates.get(factionId)?.level || 0;
  }

  getWantedState(factionId: string): WantedState | undefined {
    return this.wantedStates.get(factionId);
  }

  getAllWantedStates(): WantedState[] {
    return Array.from(this.wantedStates.values());
  }

  getCrimeLog(): Crime[] {
    return [...this.crimeLog];
  }

  serialize(): string {
    return JSON.stringify({
      wantedStates: Array.from(this.wantedStates.entries()),
      crimeLog: this.crimeLog
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.wantedStates = new Map(parsed.wantedStates);
    this.crimeLog = parsed.crimeLog;
  }
}
