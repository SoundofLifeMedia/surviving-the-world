/**
 * World State Manager
 * Maintains global simulation state - time, weather, factions, regions, threat level
 */

export interface WeatherState {
  type: 'clear' | 'rain' | 'snow' | 'storm' | 'heat';
  intensity: number; // 0-1
  temperature: number; // Celsius
  duration: number; // Hours remaining
}

export interface RegionState {
  id: string;
  name: string;
  biome: string;
  resources: Record<string, number>;
  population: number;
  controllingFaction: string;
  threatLevel: number;
}

export interface FactionState {
  id: string;
  resources: { food: number; gold: number; manpower: number };
  attitudeToPlayer: number;
  relations: Map<string, number>;
  activeGoals: string[];
  atWar: string[];
  allies: string[];
}

export interface WorldState {
  currentEraId: string;
  timeOfDay: number; // 0-24
  dayCount: number;
  weather: WeatherState;
  factions: Map<string, FactionState>;
  regions: Map<string, RegionState>;
  globalThreatLevel: number; // 0-1
  activeEvents: string[];
}

export type WorldEventType = 'time_advance' | 'weather_change' | 'faction_update' | 'region_update' | 'event_trigger' | 'threat_change';

export interface WorldEvent {
  type: WorldEventType;
  data: any;
  timestamp: number;
}

type EventCallback = (event: WorldEvent) => void;

/**
 * World State Manager Class
 */
export class WorldStateManager {
  private state: WorldState;
  private listeners: Map<WorldEventType, EventCallback[]> = new Map();

  constructor(eraId: string) {
    this.state = {
      currentEraId: eraId,
      timeOfDay: 6, // Start at 6 AM
      dayCount: 1,
      weather: { type: 'clear', intensity: 0, temperature: 15, duration: 24 },
      factions: new Map(),
      regions: new Map(),
      globalThreatLevel: 0.3,
      activeEvents: []
    };
  }

  getState(): WorldState { return this.state; }
  getTimeOfDay(): number { return this.state.timeOfDay; }
  getDayCount(): number { return this.state.dayCount; }
  getWeather(): WeatherState { return this.state.weather; }
  getThreatLevel(): number { return this.state.globalThreatLevel; }

  advanceTime(hours: number): void {
    this.state.timeOfDay += hours;
    while (this.state.timeOfDay >= 24) {
      this.state.timeOfDay -= 24;
      this.state.dayCount++;
      this.onNewDay();
    }
    this.state.weather.duration -= hours;
    if (this.state.weather.duration <= 0) this.generateWeather();
    this.emit({ type: 'time_advance', data: { hours, timeOfDay: this.state.timeOfDay, dayCount: this.state.dayCount }, timestamp: Date.now() });
  }

  setWeather(weather: WeatherState): void {
    this.state.weather = weather;
    this.emit({ type: 'weather_change', data: weather, timestamp: Date.now() });
  }

  private generateWeather(): void {
    const types: WeatherState['type'][] = ['clear', 'rain', 'snow', 'storm', 'heat'];
    const type = types[Math.floor(Math.random() * types.length)];
    const temps: Record<string, number> = { clear: 18, rain: 12, snow: -5, storm: 8, heat: 35 };
    this.setWeather({ type, intensity: Math.random(), temperature: temps[type] + (Math.random() * 10 - 5), duration: 6 + Math.random() * 18 });
  }

  updateFaction(factionId: string, update: Partial<FactionState>): void {
    const faction = this.state.factions.get(factionId);
    if (faction) {
      Object.assign(faction, update);
      this.emit({ type: 'faction_update', data: { factionId, update }, timestamp: Date.now() });
    }
  }

  addFaction(faction: FactionState): void {
    this.state.factions.set(faction.id, faction);
  }

  getFaction(factionId: string): FactionState | undefined {
    return this.state.factions.get(factionId);
  }

  updateRegion(regionId: string, update: Partial<RegionState>): void {
    const region = this.state.regions.get(regionId);
    if (region) {
      Object.assign(region, update);
      this.emit({ type: 'region_update', data: { regionId, update }, timestamp: Date.now() });
    }
  }

  addRegion(region: RegionState): void {
    this.state.regions.set(region.id, region);
  }

  getRegion(regionId: string): RegionState | undefined {
    return this.state.regions.get(regionId);
  }

  calculateThreatLevel(): number {
    let threat = 0.1;
    for (const faction of this.state.factions.values()) {
      threat += faction.atWar.length * 0.1;
      threat += (1 - faction.attitudeToPlayer) * 0.05;
    }
    this.state.globalThreatLevel = Math.min(1, Math.max(0, threat));
    this.emit({ type: 'threat_change', data: { threatLevel: this.state.globalThreatLevel }, timestamp: Date.now() });
    return this.state.globalThreatLevel;
  }

  triggerEvent(eventId: string): void {
    if (!this.state.activeEvents.includes(eventId)) {
      this.state.activeEvents.push(eventId);
      this.emit({ type: 'event_trigger', data: { eventId }, timestamp: Date.now() });
    }
  }

  private onNewDay(): void {
    for (const faction of this.state.factions.values()) {
      faction.resources.food -= faction.resources.manpower * 0.5;
    }
    this.calculateThreatLevel();
  }

  on(type: WorldEventType, callback: EventCallback): void {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type)!.push(callback);
  }

  private emit(event: WorldEvent): void {
    this.listeners.get(event.type)?.forEach(cb => cb(event));
  }

  serialize(): string {
    return JSON.stringify({
      ...this.state,
      factions: Array.from(this.state.factions.entries()),
      regions: Array.from(this.state.regions.entries())
    });
  }

  static deserialize(json: string): WorldStateManager {
    const data = JSON.parse(json);
    const manager = new WorldStateManager(data.currentEraId);
    manager.state = {
      ...data,
      factions: new Map(data.factions),
      regions: new Map(data.regions)
    };
    return manager;
  }
}
