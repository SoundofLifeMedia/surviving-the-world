const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../../data');

class WorldStateManager {
  constructor() {
    this.state = {
      currentEraId: null,
      timeOfDay: 6,
      dayCount: 0,
      weather: {
        condition: 'clear',
        temperature: 20
      },
      factions: [],
      regions: [],
      globalThreatLevel: 0
    };
  }

  loadEra(eraId) {
    const eraConfigPath = path.join(DATA_DIR, 'eras', `${eraId}.json`);
    if (!fs.existsSync(eraConfigPath)) {
      throw new Error(`Era config missing: ${eraConfigPath}`);
    }

    const eraConfig = JSON.parse(fs.readFileSync(eraConfigPath, 'utf-8'));
    this.state.currentEraId = eraId;
    this.state.timeOfDay = eraConfig.startTime || 6;
    this.state.dayCount = 0;
    this.state.weather = eraConfig.startWeather || { condition: 'clear', temperature: 20 };
    this.state.globalThreatLevel = eraConfig.global_modifiers?.threatLevel || 0;
    this.state.regions = (eraConfig.regions || []).map((region) => ({
      ...region,
      resources: { ...region.resources }
    }));
    this.state.factions = (eraConfig.factions || []).map((faction) => ({
      ...faction,
      resources: { ...faction.resources }
    }));
  }

  tick(hours = 1) {
    this.state.dayCount += hours / 24;
    this.state.timeOfDay = ((this.state.timeOfDay + hours) % 24 + 24) % 24;
    this._decayThreat();
  }

  _decayThreat() {
    this.state.globalThreatLevel = Math.max(0, this.state.globalThreatLevel - 0.001);
  }

  logState() {
    return {
      era: this.state.currentEraId,
      day: Math.floor(this.state.dayCount),
      time: this.state.timeOfDay.toFixed(2),
      weather: this.state.weather,
      threat: this.state.globalThreatLevel
    };
  }
}

module.exports = new WorldStateManager();
