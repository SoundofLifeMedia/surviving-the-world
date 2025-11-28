/**
 * Mod System
 * Load, validate, and manage mod data packs
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */

export interface ModManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  gameVersion: string;
  dependencies: string[];
  conflicts: string[];
  loadOrder: number;
  dataFiles: string[];
}

export interface ModData {
  manifest: ModManifest;
  eras?: any[];
  factions?: any[];
  items?: any[];
  npcs?: any[];
  quests?: any[];
  recipes?: any[];
  techs?: any[];
  buildings?: any[];
  strings?: Record<string, Record<string, string>>;
}

export interface ModConflict {
  modId1: string;
  modId2: string;
  type: 'declared' | 'data_overlap';
  details: string;
}

export interface ModValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface LoadedMod {
  manifest: ModManifest;
  data: ModData;
  enabled: boolean;
  loadedAt: number;
}

export class ModSystem {
  private mods: Map<string, LoadedMod> = new Map();
  private loadOrder: string[] = [];
  private gameVersion: string;
  private mergedData: ModData | null = null;

  constructor(gameVersion: string = '1.0.0') {
    this.gameVersion = gameVersion;
  }

  // Load a mod from data
  loadMod(modData: ModData): ModValidationResult {
    const validation = this.validateMod(modData);
    if (!validation.valid) {
      return validation;
    }

    const loadedMod: LoadedMod = {
      manifest: modData.manifest,
      data: modData,
      enabled: true,
      loadedAt: Date.now()
    };

    this.mods.set(modData.manifest.id, loadedMod);
    this.updateLoadOrder();
    this.mergedData = null; // Invalidate cache

    return validation;
  }

  // Validate mod data
  validateMod(modData: ModData): ModValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check manifest
    if (!modData.manifest) {
      errors.push('Missing mod manifest');
      return { valid: false, errors, warnings };
    }

    const m = modData.manifest;
    if (!m.id) errors.push('Missing mod ID');
    if (!m.name) errors.push('Missing mod name');
    if (!m.version) errors.push('Missing mod version');
    if (!m.gameVersion) errors.push('Missing game version requirement');

    // Check game version compatibility
    if (m.gameVersion && !this.isVersionCompatible(m.gameVersion)) {
      warnings.push(`Mod requires game version ${m.gameVersion}, current is ${this.gameVersion}`);
    }

    // Check dependencies
    for (const dep of m.dependencies || []) {
      if (!this.mods.has(dep)) {
        errors.push(`Missing dependency: ${dep}`);
      }
    }

    // Check for conflicts
    for (const conflict of m.conflicts || []) {
      if (this.mods.has(conflict) && this.mods.get(conflict)!.enabled) {
        errors.push(`Conflicts with enabled mod: ${conflict}`);
      }
    }

    // Validate data structures
    if (modData.items) {
      for (const item of modData.items) {
        if (!item.id) errors.push(`Item missing ID`);
        if (!item.name) warnings.push(`Item ${item.id} missing name`);
      }
    }

    if (modData.factions) {
      for (const faction of modData.factions) {
        if (!faction.id) errors.push(`Faction missing ID`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private isVersionCompatible(required: string): boolean {
    const [reqMajor, reqMinor] = required.split('.').map(Number);
    const [gameMajor, gameMinor] = this.gameVersion.split('.').map(Number);
    return gameMajor >= reqMajor && (gameMajor > reqMajor || gameMinor >= reqMinor);
  }


  // Unload a mod
  unloadMod(modId: string): boolean {
    if (!this.mods.has(modId)) return false;
    
    // Check if other mods depend on this
    for (const [id, mod] of this.mods) {
      if (id !== modId && mod.enabled && mod.manifest.dependencies.includes(modId)) {
        console.warn(`Cannot unload ${modId}: ${id} depends on it`);
        return false;
      }
    }

    this.mods.delete(modId);
    this.updateLoadOrder();
    this.mergedData = null;
    return true;
  }

  // Enable/disable mod
  setModEnabled(modId: string, enabled: boolean): boolean {
    const mod = this.mods.get(modId);
    if (!mod) return false;

    if (enabled) {
      // Check dependencies
      for (const dep of mod.manifest.dependencies) {
        const depMod = this.mods.get(dep);
        if (!depMod || !depMod.enabled) {
          console.warn(`Cannot enable ${modId}: dependency ${dep} not enabled`);
          return false;
        }
      }

      // Check conflicts
      for (const conflict of mod.manifest.conflicts) {
        const conflictMod = this.mods.get(conflict);
        if (conflictMod?.enabled) {
          console.warn(`Cannot enable ${modId}: conflicts with ${conflict}`);
          return false;
        }
      }
    } else {
      // Check if other mods depend on this
      for (const [id, otherMod] of this.mods) {
        if (id !== modId && otherMod.enabled && otherMod.manifest.dependencies.includes(modId)) {
          console.warn(`Cannot disable ${modId}: ${id} depends on it`);
          return false;
        }
      }
    }

    mod.enabled = enabled;
    this.mergedData = null;
    return true;
  }

  // Update load order based on dependencies and declared order
  private updateLoadOrder(): void {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (modId: string) => {
      if (visited.has(modId)) return;
      if (visiting.has(modId)) {
        console.warn(`Circular dependency detected involving ${modId}`);
        return;
      }

      visiting.add(modId);
      const mod = this.mods.get(modId);
      if (mod) {
        for (const dep of mod.manifest.dependencies) {
          visit(dep);
        }
      }
      visiting.delete(modId);
      visited.add(modId);
      sorted.push(modId);
    };

    // Sort by declared load order first
    const modIds = Array.from(this.mods.keys()).sort((a, b) => {
      const modA = this.mods.get(a)!;
      const modB = this.mods.get(b)!;
      return modA.manifest.loadOrder - modB.manifest.loadOrder;
    });

    for (const modId of modIds) {
      visit(modId);
    }

    this.loadOrder = sorted;
  }

  // Detect conflicts between mods
  detectConflicts(): ModConflict[] {
    const conflicts: ModConflict[] = [];
    const enabledMods = Array.from(this.mods.values()).filter(m => m.enabled);

    for (let i = 0; i < enabledMods.length; i++) {
      for (let j = i + 1; j < enabledMods.length; j++) {
        const mod1 = enabledMods[i];
        const mod2 = enabledMods[j];

        // Check declared conflicts
        if (mod1.manifest.conflicts.includes(mod2.manifest.id)) {
          conflicts.push({
            modId1: mod1.manifest.id,
            modId2: mod2.manifest.id,
            type: 'declared',
            details: `${mod1.manifest.name} declares conflict with ${mod2.manifest.name}`
          });
        }

        // Check data overlaps
        const overlaps = this.findDataOverlaps(mod1.data, mod2.data);
        for (const overlap of overlaps) {
          conflicts.push({
            modId1: mod1.manifest.id,
            modId2: mod2.manifest.id,
            type: 'data_overlap',
            details: overlap
          });
        }
      }
    }

    return conflicts;
  }

  private findDataOverlaps(data1: ModData, data2: ModData): string[] {
    const overlaps: string[] = [];

    const checkOverlap = (arr1: any[] | undefined, arr2: any[] | undefined, type: string) => {
      if (!arr1 || !arr2) return;
      const ids1 = new Set(arr1.map(x => x.id));
      for (const item of arr2) {
        if (ids1.has(item.id)) {
          overlaps.push(`${type} ID overlap: ${item.id}`);
        }
      }
    };

    checkOverlap(data1.items, data2.items, 'Item');
    checkOverlap(data1.factions, data2.factions, 'Faction');
    checkOverlap(data1.npcs, data2.npcs, 'NPC');
    checkOverlap(data1.quests, data2.quests, 'Quest');
    checkOverlap(data1.recipes, data2.recipes, 'Recipe');
    checkOverlap(data1.techs, data2.techs, 'Tech');
    checkOverlap(data1.eras, data2.eras, 'Era');

    return overlaps;
  }

  // Merge all enabled mod data with base game data
  getMergedData(baseData: ModData): ModData {
    if (this.mergedData) return this.mergedData;

    const merged: ModData = {
      manifest: baseData.manifest,
      eras: [...(baseData.eras || [])],
      factions: [...(baseData.factions || [])],
      items: [...(baseData.items || [])],
      npcs: [...(baseData.npcs || [])],
      quests: [...(baseData.quests || [])],
      recipes: [...(baseData.recipes || [])],
      techs: [...(baseData.techs || [])],
      buildings: [...(baseData.buildings || [])],
      strings: { ...baseData.strings }
    };

    // Apply mods in load order
    for (const modId of this.loadOrder) {
      const mod = this.mods.get(modId);
      if (!mod || !mod.enabled) continue;

      this.mergeModData(merged, mod.data);
    }

    this.mergedData = merged;
    return merged;
  }

  private mergeModData(target: ModData, source: ModData): void {
    const mergeArray = (targetArr: any[], sourceArr: any[] | undefined) => {
      if (!sourceArr) return;
      for (const item of sourceArr) {
        const existingIndex = targetArr.findIndex(x => x.id === item.id);
        if (existingIndex >= 0) {
          // Override existing
          targetArr[existingIndex] = { ...targetArr[existingIndex], ...item };
        } else {
          // Add new
          targetArr.push(item);
        }
      }
    };

    mergeArray(target.eras!, source.eras);
    mergeArray(target.factions!, source.factions);
    mergeArray(target.items!, source.items);
    mergeArray(target.npcs!, source.npcs);
    mergeArray(target.quests!, source.quests);
    mergeArray(target.recipes!, source.recipes);
    mergeArray(target.techs!, source.techs);
    mergeArray(target.buildings!, source.buildings);

    // Merge strings
    if (source.strings) {
      for (const [locale, strings] of Object.entries(source.strings)) {
        if (!target.strings![locale]) {
          target.strings![locale] = {};
        }
        Object.assign(target.strings![locale], strings);
      }
    }
  }

  // Get mod info
  getMod(modId: string): LoadedMod | undefined {
    return this.mods.get(modId);
  }

  getAllMods(): LoadedMod[] {
    return Array.from(this.mods.values());
  }

  getEnabledMods(): LoadedMod[] {
    return Array.from(this.mods.values()).filter(m => m.enabled);
  }

  getLoadOrder(): string[] {
    return [...this.loadOrder];
  }

  // Serialization
  serialize(): string {
    return JSON.stringify({
      enabledMods: Array.from(this.mods.entries())
        .filter(([, m]) => m.enabled)
        .map(([id]) => id),
      loadOrder: this.loadOrder
    });
  }

  deserialize(data: string, availableMods: ModData[]): void {
    const parsed = JSON.parse(data);
    
    // Load all available mods
    for (const modData of availableMods) {
      this.loadMod(modData);
    }

    // Set enabled state
    for (const [modId, mod] of this.mods) {
      mod.enabled = parsed.enabledMods.includes(modId);
    }

    this.mergedData = null;
  }
}
