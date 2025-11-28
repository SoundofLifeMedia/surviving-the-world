class FactionManager {
  constructor() {
    this.factions = [];
  }

  load(factionData = []) {
    this.factions = factionData.map(f => ({
      ...f,
      relations: f.relations ? { ...f.relations } : {},
      resources: { ...f.resources },
      goals: [...(f.goals || [])]
    }));
  }

  getFaction(id) {
    return this.factions.find(f => f.id === id);
  }

  adjustAttitude(factionId, delta) {
    const faction = this.getFaction(factionId);
    if (!faction) return;
    faction.attitudeToPlayer = Math.max(-1, Math.min(1, (faction.attitudeToPlayer ?? 0) + delta));
  }

  updateRelations(sourceId, targetId, delta) {
    const source = this.getFaction(sourceId);
    if (!source) return;
    source.relations[targetId] = Math.max(-1, Math.min(1, (source.relations[targetId] ?? 0) + delta));
  }
}

module.exports = new FactionManager();
