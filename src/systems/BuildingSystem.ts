/**
 * Building System
 * Handles structure placement, construction, damage, repair, and upgrades
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface ResourceCost {
  itemId: string;
  quantity: number;
}

export interface BuildingConfig {
  id: string;
  name: string;
  category: 'shelter' | 'defense' | 'production' | 'storage' | 'utility';
  maxHealth: number;
  buildTime: number; // seconds
  resourceCost: ResourceCost[];
  size: Vector3;
  providesEffects: string[]; // condition IDs applied when inside
  requiredTech: string | null;
  upgradesTo: string | null;
  repairCostMultiplier: number; // fraction of build cost for full repair
}

export interface Building {
  id: string;
  configId: string;
  name: string;
  location: Vector3;
  health: number;
  maxHealth: number;
  level: number;
  ownerId: string;
  constructionProgress: number; // 0-1, 1 = complete
  isConstructed: boolean;
  createdAt: number;
  lastDamaged: number | null;
}

export interface PlacementValidation {
  valid: boolean;
  reason?: string;
}

export class BuildingSystem {
  private buildings: Map<string, Building> = new Map();
  private buildingConfigs: Map<string, BuildingConfig> = new Map();
  private occupiedCells: Set<string> = new Set();
  private nextBuildingId: number = 1;

  constructor() {
    this.registerDefaultBuildings();
  }

  private registerDefaultBuildings(): void {
    const defaults: BuildingConfig[] = [
      {
        id: 'lean_to',
        name: 'Lean-To Shelter',
        category: 'shelter',
        maxHealth: 50,
        buildTime: 60,
        resourceCost: [{ itemId: 'wood', quantity: 5 }],
        size: { x: 2, y: 2, z: 2 },
        providesEffects: ['sheltered'],
        requiredTech: null,
        upgradesTo: 'wooden_hut',
        repairCostMultiplier: 0.25
      },
      {
        id: 'wooden_hut',
        name: 'Wooden Hut',
        category: 'shelter',
        maxHealth: 150,
        buildTime: 300,
        resourceCost: [{ itemId: 'wood', quantity: 20 }, { itemId: 'rope', quantity: 5 }],
        size: { x: 3, y: 3, z: 3 },
        providesEffects: ['sheltered', 'well_rested'],
        requiredTech: 'basic_construction',
        upgradesTo: 'stone_house',
        repairCostMultiplier: 0.3
      },
      {
        id: 'stone_house',
        name: 'Stone House',
        category: 'shelter',
        maxHealth: 400,
        buildTime: 900,
        resourceCost: [{ itemId: 'stone', quantity: 30 }, { itemId: 'wood', quantity: 15 }],
        size: { x: 4, y: 4, z: 4 },
        providesEffects: ['sheltered', 'well_rested', 'secure'],
        requiredTech: 'masonry',
        upgradesTo: null,
        repairCostMultiplier: 0.35
      },
      {
        id: 'wooden_wall',
        name: 'Wooden Wall',
        category: 'defense',
        maxHealth: 100,
        buildTime: 120,
        resourceCost: [{ itemId: 'wood', quantity: 10 }],
        size: { x: 3, y: 1, z: 3 },
        providesEffects: [],
        requiredTech: null,
        upgradesTo: 'stone_wall',
        repairCostMultiplier: 0.2
      },
      {
        id: 'stone_wall',
        name: 'Stone Wall',
        category: 'defense',
        maxHealth: 300,
        buildTime: 360,
        resourceCost: [{ itemId: 'stone', quantity: 25 }],
        size: { x: 3, y: 1, z: 4 },
        providesEffects: [],
        requiredTech: 'masonry',
        upgradesTo: null,
        repairCostMultiplier: 0.25
      },
      {
        id: 'watchtower',
        name: 'Watchtower',
        category: 'defense',
        maxHealth: 200,
        buildTime: 480,
        resourceCost: [{ itemId: 'wood', quantity: 30 }, { itemId: 'stone', quantity: 10 }],
        size: { x: 2, y: 2, z: 6 },
        providesEffects: ['vigilant'],
        requiredTech: 'fortification',
        upgradesTo: null,
        repairCostMultiplier: 0.3
      },
      {
        id: 'campfire',
        name: 'Campfire',
        category: 'utility',
        maxHealth: 30,
        buildTime: 30,
        resourceCost: [{ itemId: 'wood', quantity: 3 }, { itemId: 'stone', quantity: 2 }],
        size: { x: 1, y: 1, z: 1 },
        providesEffects: ['warm'],
        requiredTech: null,
        upgradesTo: 'forge',
        repairCostMultiplier: 0.5
      },
      {
        id: 'forge',
        name: 'Forge',
        category: 'production',
        maxHealth: 200,
        buildTime: 600,
        resourceCost: [{ itemId: 'stone', quantity: 20 }, { itemId: 'iron', quantity: 10 }],
        size: { x: 3, y: 3, z: 3 },
        providesEffects: ['warm'],
        requiredTech: 'ironworking',
        upgradesTo: null,
        repairCostMultiplier: 0.4
      },
      {
        id: 'storage_shed',
        name: 'Storage Shed',
        category: 'storage',
        maxHealth: 100,
        buildTime: 180,
        resourceCost: [{ itemId: 'wood', quantity: 15 }],
        size: { x: 3, y: 3, z: 2 },
        providesEffects: [],
        requiredTech: null,
        upgradesTo: 'warehouse',
        repairCostMultiplier: 0.25
      },
      {
        id: 'warehouse',
        name: 'Warehouse',
        category: 'storage',
        maxHealth: 250,
        buildTime: 540,
        resourceCost: [{ itemId: 'wood', quantity: 40 }, { itemId: 'stone', quantity: 15 }],
        size: { x: 5, y: 5, z: 4 },
        providesEffects: [],
        requiredTech: 'advanced_construction',
        upgradesTo: null,
        repairCostMultiplier: 0.3
      }
    ];
    defaults.forEach(b => this.buildingConfigs.set(b.id, b));
  }

  registerBuildingConfig(config: BuildingConfig): void {
    this.buildingConfigs.set(config.id, config);
  }

  getBuildingConfig(configId: string): BuildingConfig | undefined {
    return this.buildingConfigs.get(configId);
  }

  getAllBuildingConfigs(): BuildingConfig[] {
    return Array.from(this.buildingConfigs.values());
  }


  private getCellKey(x: number, y: number, z: number): string {
    return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
  }

  private getOccupiedCells(location: Vector3, size: Vector3): string[] {
    const cells: string[] = [];
    for (let x = 0; x < size.x; x++) {
      for (let y = 0; y < size.y; y++) {
        for (let z = 0; z < size.z; z++) {
          cells.push(this.getCellKey(location.x + x, location.y + y, location.z + z));
        }
      }
    }
    return cells;
  }

  validatePlacement(configId: string, location: Vector3, unlockedTech: Set<string>): PlacementValidation {
    const config = this.buildingConfigs.get(configId);
    if (!config) {
      return { valid: false, reason: `Unknown building type: ${configId}` };
    }

    // Check tech requirement
    if (config.requiredTech && !unlockedTech.has(config.requiredTech)) {
      return { valid: false, reason: `Requires technology: ${config.requiredTech}` };
    }

    // Check for overlapping buildings
    const cells = this.getOccupiedCells(location, config.size);
    for (const cell of cells) {
      if (this.occupiedCells.has(cell)) {
        return { valid: false, reason: 'Location overlaps with existing structure' };
      }
    }

    // Check for valid coordinates (non-negative)
    if (location.x < 0 || location.y < 0 || location.z < 0) {
      return { valid: false, reason: 'Invalid placement coordinates' };
    }

    return { valid: true };
  }

  canAfford(configId: string, inventory: Map<string, number>): { canAfford: boolean; missing: ResourceCost[] } {
    const config = this.buildingConfigs.get(configId);
    if (!config) return { canAfford: false, missing: [] };

    const missing: ResourceCost[] = [];
    for (const cost of config.resourceCost) {
      const available = inventory.get(cost.itemId) || 0;
      if (available < cost.quantity) {
        missing.push({ itemId: cost.itemId, quantity: cost.quantity - available });
      }
    }

    return { canAfford: missing.length === 0, missing };
  }

  placeBuilding(
    configId: string,
    location: Vector3,
    ownerId: string,
    unlockedTech: Set<string>
  ): Building | null {
    const validation = this.validatePlacement(configId, location, unlockedTech);
    if (!validation.valid) return null;

    const config = this.buildingConfigs.get(configId)!;
    const buildingId = `building_${this.nextBuildingId++}`;

    const building: Building = {
      id: buildingId,
      configId,
      name: config.name,
      location: { ...location },
      health: config.maxHealth,
      maxHealth: config.maxHealth,
      level: 1,
      ownerId,
      constructionProgress: 0,
      isConstructed: false,
      createdAt: Date.now(),
      lastDamaged: null
    };

    // Mark cells as occupied
    const cells = this.getOccupiedCells(location, config.size);
    cells.forEach(cell => this.occupiedCells.add(cell));

    this.buildings.set(buildingId, building);
    return building;
  }

  updateConstruction(buildingId: string, deltaSeconds: number): boolean {
    const building = this.buildings.get(buildingId);
    if (!building || building.isConstructed) return false;

    const config = this.buildingConfigs.get(building.configId);
    if (!config) return false;

    const progressIncrement = deltaSeconds / config.buildTime;
    building.constructionProgress = Math.min(1, building.constructionProgress + progressIncrement);

    if (building.constructionProgress >= 1) {
      building.isConstructed = true;
      return true; // Construction complete
    }

    return false;
  }

  damageBuilding(buildingId: string, damage: number): { destroyed: boolean; remainingHealth: number } {
    const building = this.buildings.get(buildingId);
    if (!building) return { destroyed: false, remainingHealth: 0 };

    building.health = Math.max(0, building.health - damage);
    building.lastDamaged = Date.now();

    if (building.health <= 0) {
      this.destroyBuilding(buildingId);
      return { destroyed: true, remainingHealth: 0 };
    }

    return { destroyed: false, remainingHealth: building.health };
  }


  repairBuilding(buildingId: string, repairAmount: number): { repaired: boolean; newHealth: number } {
    const building = this.buildings.get(buildingId);
    if (!building || !building.isConstructed) {
      return { repaired: false, newHealth: 0 };
    }

    if (building.health >= building.maxHealth) {
      return { repaired: false, newHealth: building.health };
    }

    building.health = Math.min(building.maxHealth, building.health + repairAmount);
    return { repaired: true, newHealth: building.health };
  }

  getRepairCost(buildingId: string): ResourceCost[] {
    const building = this.buildings.get(buildingId);
    if (!building) return [];

    const config = this.buildingConfigs.get(building.configId);
    if (!config) return [];

    const damagePercent = 1 - (building.health / building.maxHealth);
    return config.resourceCost.map(cost => ({
      itemId: cost.itemId,
      quantity: Math.ceil(cost.quantity * config.repairCostMultiplier * damagePercent)
    })).filter(cost => cost.quantity > 0);
  }

  upgradeBuilding(
    buildingId: string,
    unlockedTech: Set<string>,
    inventory: Map<string, number>
  ): { success: boolean; newBuilding?: Building; reason?: string } {
    const building = this.buildings.get(buildingId);
    if (!building || !building.isConstructed) {
      return { success: false, reason: 'Building not found or not constructed' };
    }

    const currentConfig = this.buildingConfigs.get(building.configId);
    if (!currentConfig || !currentConfig.upgradesTo) {
      return { success: false, reason: 'Building cannot be upgraded' };
    }

    const upgradeConfig = this.buildingConfigs.get(currentConfig.upgradesTo);
    if (!upgradeConfig) {
      return { success: false, reason: 'Upgrade configuration not found' };
    }

    // Check tech requirement
    if (upgradeConfig.requiredTech && !unlockedTech.has(upgradeConfig.requiredTech)) {
      return { success: false, reason: `Requires technology: ${upgradeConfig.requiredTech}` };
    }

    // Check resources
    const affordCheck = this.canAfford(currentConfig.upgradesTo, inventory);
    if (!affordCheck.canAfford) {
      return { success: false, reason: 'Insufficient resources for upgrade' };
    }

    // Perform upgrade
    building.configId = upgradeConfig.id;
    building.name = upgradeConfig.name;
    building.maxHealth = upgradeConfig.maxHealth;
    building.health = upgradeConfig.maxHealth; // Full health on upgrade
    building.level++;
    building.constructionProgress = 0;
    building.isConstructed = false; // Needs construction time

    return { success: true, newBuilding: building };
  }

  destroyBuilding(buildingId: string): boolean {
    const building = this.buildings.get(buildingId);
    if (!building) return false;

    const config = this.buildingConfigs.get(building.configId);
    if (config) {
      const cells = this.getOccupiedCells(building.location, config.size);
      cells.forEach(cell => this.occupiedCells.delete(cell));
    }

    return this.buildings.delete(buildingId);
  }

  getBuilding(buildingId: string): Building | undefined {
    return this.buildings.get(buildingId);
  }

  getBuildingsByOwner(ownerId: string): Building[] {
    return Array.from(this.buildings.values()).filter(b => b.ownerId === ownerId);
  }

  getBuildingsInRadius(center: Vector3, radius: number): Building[] {
    return Array.from(this.buildings.values()).filter(b => {
      const dx = b.location.x - center.x;
      const dy = b.location.y - center.y;
      const dz = b.location.z - center.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz) <= radius;
    });
  }

  getBuildingsByCategory(category: BuildingConfig['category']): Building[] {
    return Array.from(this.buildings.values()).filter(b => {
      const config = this.buildingConfigs.get(b.configId);
      return config?.category === category;
    });
  }

  getEffectsAtLocation(location: Vector3): string[] {
    const effects: string[] = [];
    for (const building of this.buildings.values()) {
      if (!building.isConstructed) continue;
      
      const config = this.buildingConfigs.get(building.configId);
      if (!config) continue;

      // Check if location is within building bounds
      const inBounds = 
        location.x >= building.location.x && location.x < building.location.x + config.size.x &&
        location.y >= building.location.y && location.y < building.location.y + config.size.y &&
        location.z >= building.location.z && location.z < building.location.z + config.size.z;

      if (inBounds) {
        effects.push(...config.providesEffects);
      }
    }
    return [...new Set(effects)]; // Deduplicate
  }

  getAllBuildings(): Building[] {
    return Array.from(this.buildings.values());
  }

  serialize(): string {
    return JSON.stringify({
      buildings: Array.from(this.buildings.entries()),
      nextBuildingId: this.nextBuildingId
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.buildings = new Map(parsed.buildings);
    this.nextBuildingId = parsed.nextBuildingId;

    // Rebuild occupied cells
    this.occupiedCells.clear();
    for (const building of this.buildings.values()) {
      const config = this.buildingConfigs.get(building.configId);
      if (config) {
        const cells = this.getOccupiedCells(building.location, config.size);
        cells.forEach(cell => this.occupiedCells.add(cell));
      }
    }
  }
}
