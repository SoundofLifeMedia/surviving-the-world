/**
 * Save/Load System
 * Serializes and deserializes complete game state
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

export interface SaveMetadata {
  slotId: string;
  name: string;
  timestamp: number;
  era: string;
  dayCount: number;
  playTime: number; // seconds
  version: string;
  checksum: string;
}

export interface SaveData {
  metadata: SaveMetadata;
  worldState: any;
  playerData: any;
  factions: any;
  npcs: any;
  quests: any;
  buildings: any;
  economy: any;
  techTree: any;
  choices: any;
  conditions: any;
}

export interface SaveSlot {
  slotId: string;
  metadata: SaveMetadata | null;
  isEmpty: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class SaveLoadSystem {
  private readonly SAVE_VERSION = '1.0.0';
  private readonly MAX_SLOTS = 10;
  private readonly AUTOSAVE_SLOT = 'autosave';
  
  private storage: Map<string, string> = new Map(); // In-memory storage (would be file system in real impl)
  private lastAutosave: number = 0;
  private autosaveInterval: number = 300; // seconds

  constructor() {
    // Initialize empty slots
    for (let i = 1; i <= this.MAX_SLOTS; i++) {
      const slotId = `slot_${i}`;
      if (!this.storage.has(slotId)) {
        this.storage.set(slotId, '');
      }
    }
  }

  // Save game to slot
  save(
    slotId: string,
    name: string,
    gameState: {
      worldState: any;
      playerData: any;
      factions: any;
      npcs: any;
      quests: any;
      buildings: any;
      economy: any;
      techTree: any;
      choices: any;
      conditions: any;
    },
    era: string,
    dayCount: number,
    playTime: number
  ): { success: boolean; error?: string } {
    try {
      const metadata: SaveMetadata = {
        slotId,
        name,
        timestamp: Date.now(),
        era,
        dayCount,
        playTime,
        version: this.SAVE_VERSION,
        checksum: '' // Will be calculated
      };

      const saveData: SaveData = {
        metadata,
        ...gameState
      };

      // Calculate checksum
      const dataString = JSON.stringify(saveData);
      metadata.checksum = this.calculateChecksum(dataString);
      saveData.metadata = metadata;

      // Serialize and store
      const finalData = JSON.stringify(saveData);
      this.storage.set(slotId, finalData);

      return { success: true };
    } catch (error) {
      return { success: false, error: `Save failed: ${error}` };
    }
  }


  // Load game from slot
  load(slotId: string): { success: boolean; data?: SaveData; error?: string } {
    try {
      const dataString = this.storage.get(slotId);
      if (!dataString) {
        return { success: false, error: 'Save slot is empty' };
      }

      const saveData: SaveData = JSON.parse(dataString);

      // Validate
      const validation = this.validateSave(slotId);
      if (!validation.valid) {
        return { success: false, error: `Invalid save: ${validation.errors.join(', ')}` };
      }

      // Version check
      if (saveData.metadata.version !== this.SAVE_VERSION) {
        // Could implement migration here
        console.warn(`Save version mismatch: ${saveData.metadata.version} vs ${this.SAVE_VERSION}`);
      }

      return { success: true, data: saveData };
    } catch (error) {
      return { success: false, error: `Load failed: ${error}` };
    }
  }

  // Get all save slots
  getSaveSlots(): SaveSlot[] {
    const slots: SaveSlot[] = [];

    for (let i = 1; i <= this.MAX_SLOTS; i++) {
      const slotId = `slot_${i}`;
      const dataString = this.storage.get(slotId);

      if (dataString) {
        try {
          const saveData: SaveData = JSON.parse(dataString);
          slots.push({
            slotId,
            metadata: saveData.metadata,
            isEmpty: false
          });
        } catch {
          slots.push({ slotId, metadata: null, isEmpty: true });
        }
      } else {
        slots.push({ slotId, metadata: null, isEmpty: true });
      }
    }

    // Add autosave slot
    const autosaveData = this.storage.get(this.AUTOSAVE_SLOT);
    if (autosaveData) {
      try {
        const saveData: SaveData = JSON.parse(autosaveData);
        slots.unshift({
          slotId: this.AUTOSAVE_SLOT,
          metadata: saveData.metadata,
          isEmpty: false
        });
      } catch {
        slots.unshift({ slotId: this.AUTOSAVE_SLOT, metadata: null, isEmpty: true });
      }
    }

    return slots;
  }

  // Delete save
  deleteSave(slotId: string): boolean {
    if (this.storage.has(slotId)) {
      this.storage.set(slotId, '');
      return true;
    }
    return false;
  }

  // Validate save data
  validateSave(slotId: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const dataString = this.storage.get(slotId);
    if (!dataString) {
      return { valid: false, errors: ['Save slot is empty'], warnings: [] };
    }

    try {
      const saveData: SaveData = JSON.parse(dataString);

      // Check required fields
      if (!saveData.metadata) errors.push('Missing metadata');
      if (!saveData.worldState) errors.push('Missing world state');
      if (!saveData.playerData) errors.push('Missing player data');
      if (!saveData.factions) errors.push('Missing factions');
      if (!saveData.npcs) errors.push('Missing NPCs');
      if (!saveData.quests) errors.push('Missing quests');

      // Validate checksum
      if (saveData.metadata) {
        const storedChecksum = saveData.metadata.checksum;
        saveData.metadata.checksum = '';
        const calculatedChecksum = this.calculateChecksum(JSON.stringify(saveData));
        
        if (storedChecksum !== calculatedChecksum) {
          errors.push('Checksum mismatch - save may be corrupted');
        }
        
        saveData.metadata.checksum = storedChecksum;
      }

      // Version warning
      if (saveData.metadata?.version !== this.SAVE_VERSION) {
        warnings.push(`Save version ${saveData.metadata?.version} differs from current ${this.SAVE_VERSION}`);
      }

      return { valid: errors.length === 0, errors, warnings };
    } catch (error) {
      return { valid: false, errors: [`Parse error: ${error}`], warnings: [] };
    }
  }

  // Autosave
  autoSave(
    gameState: {
      worldState: any;
      playerData: any;
      factions: any;
      npcs: any;
      quests: any;
      buildings: any;
      economy: any;
      techTree: any;
      choices: any;
      conditions: any;
    },
    era: string,
    dayCount: number,
    playTime: number
  ): { success: boolean; error?: string } {
    return this.save(
      this.AUTOSAVE_SLOT,
      'Autosave',
      gameState,
      era,
      dayCount,
      playTime
    );
  }

  // Check if autosave is due
  shouldAutosave(currentTime: number): boolean {
    return currentTime - this.lastAutosave >= this.autosaveInterval * 1000;
  }

  // Update autosave timestamp
  markAutosaved(): void {
    this.lastAutosave = Date.now();
  }

  // Set autosave interval
  setAutosaveInterval(seconds: number): void {
    this.autosaveInterval = Math.max(60, seconds); // Minimum 60 seconds
  }

  // Calculate simple checksum
  private calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Export save to string (for backup/sharing)
  exportSave(slotId: string): string | null {
    const dataString = this.storage.get(slotId);
    if (!dataString) return null;
    
    // Base64 encode for safe transport
    return btoa(dataString);
  }

  // Import save from string
  importSave(slotId: string, encodedData: string): { success: boolean; error?: string } {
    try {
      const dataString = atob(encodedData);
      const saveData: SaveData = JSON.parse(dataString);

      // Validate structure
      if (!saveData.metadata || !saveData.worldState || !saveData.playerData) {
        return { success: false, error: 'Invalid save data structure' };
      }

      // Update slot ID in metadata
      saveData.metadata.slotId = slotId;

      this.storage.set(slotId, JSON.stringify(saveData));
      return { success: true };
    } catch (error) {
      return { success: false, error: `Import failed: ${error}` };
    }
  }

  // Get save metadata without loading full data
  getMetadata(slotId: string): SaveMetadata | null {
    const dataString = this.storage.get(slotId);
    if (!dataString) return null;

    try {
      const saveData: SaveData = JSON.parse(dataString);
      return saveData.metadata;
    } catch {
      return null;
    }
  }

  // Check if slot exists and has data
  hasData(slotId: string): boolean {
    const data = this.storage.get(slotId);
    return !!data && data.length > 0;
  }

  // Get next available slot
  getNextAvailableSlot(): string | null {
    for (let i = 1; i <= this.MAX_SLOTS; i++) {
      const slotId = `slot_${i}`;
      if (!this.hasData(slotId)) {
        return slotId;
      }
    }
    return null;
  }

  // Copy save to another slot
  copySave(fromSlot: string, toSlot: string): boolean {
    const data = this.storage.get(fromSlot);
    if (!data) return false;

    try {
      const saveData: SaveData = JSON.parse(data);
      saveData.metadata.slotId = toSlot;
      saveData.metadata.timestamp = Date.now();
      this.storage.set(toSlot, JSON.stringify(saveData));
      return true;
    } catch {
      return false;
    }
  }

  // Get storage size (for UI display)
  getStorageInfo(): { used: number; total: number; slots: number } {
    let used = 0;
    let slotsUsed = 0;

    for (const [, value] of this.storage) {
      if (value) {
        used += value.length;
        slotsUsed++;
      }
    }

    return {
      used,
      total: this.MAX_SLOTS,
      slots: slotsUsed
    };
  }
}
