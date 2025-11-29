/**
 * BlackMarketSystem.ts - Underground Economy
 * Provides: Contraband, fences, sting operations, reputation-based pricing
 * Target: AAA-grade criminal economy
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type ContrabandType =
  | 'stolen_goods'
  | 'weapons'
  | 'drugs'
  | 'forbidden_texts'
  | 'smuggled_goods'
  | 'counterfeit'
  | 'slaves' // Era-dependent
  | 'poisons';

export interface ContrabandItem {
  id: string;
  type: ContrabandType;
  name: string;
  baseValue: number;
  heatGenerated: number; // Heat added when caught
  quantity: number;
  quality: number; // 0-1, affects price
  origin: string; // Where it came from
  isHot: boolean; // Recently stolen, higher risk
  hotDecayTicks: number; // Ticks until no longer "hot"
}

export interface BlackMarketVendor {
  id: string;
  name: string;
  location: Vector3;
  faction: string;
  specialties: ContrabandType[];
  inventory: ContrabandItem[];
  buyPriceMultiplier: number; // How much they pay for goods
  sellPriceMultiplier: number; // How much they charge
  trustRequired: number; // 0-100, player trust needed
  stingRisk: number; // 0-1, chance of police trap
  restockInterval: number; // Ticks between restocks
  lastRestockTick: number;
  isOpen: boolean;
  operatingHours: { start: number; end: number }; // 0-24
}

export interface FencingResult {
  success: boolean;
  goldReceived: number;
  heatGenerated: number;
  stingTriggered: boolean;
  vendorTrustChange: number;
}

export interface PurchaseResult {
  success: boolean;
  goldSpent: number;
  item: ContrabandItem | null;
  stingTriggered: boolean;
}

export interface StingOperation {
  id: string;
  vendorId: string;
  triggeredByPlayerId: string;
  ambushPosition: Vector3;
  guardCount: number;
  tick: number;
  isActive: boolean;
}

export interface PlayerBlackMarketState {
  playerId: string;
  knownVendors: string[];
  vendorTrust: Map<string, number>; // Vendor ID -> Trust (0-100)
  totalContrabandSold: number;
  totalContrabandBought: number;
  stingsEscaped: number;
  stingsCaught: number;
}

export interface ReputationPricing {
  factionId: string;
  reputation: number; // -100 to 100
  priceMultiplier: number;
  accessGranted: boolean;
  exclusiveItems: string[];
}

export interface BlackMarketConfig {
  baseFencePrice: number; // Percentage of item value paid
  hotItemPenalty: number; // Price reduction for hot items
  trustBuildRate: number; // Trust gained per successful deal
  trustLossOnSting: number;
  stingEscapeChance: number;
  vendorRestockBase: number; // Base ticks between restocks
  qualityPriceBonus: number; // Per 0.1 quality above 0.5
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_BLACK_MARKET_CONFIG: BlackMarketConfig = {
  baseFencePrice: 0.4, // 40% of value
  hotItemPenalty: 0.5, // Hot items worth 50% less
  trustBuildRate: 5, // 5 trust per deal
  trustLossOnSting: 30,
  stingEscapeChance: 0.4,
  vendorRestockBase: 1200, // 1 minute at 20 TPS
  qualityPriceBonus: 0.1
};

// ============================================================================
// CONTRABAND DEFINITIONS
// ============================================================================

export const CONTRABAND_DEFINITIONS: Record<ContrabandType, {
  baseValue: number;
  heatGenerated: number;
  legality: number; // 0 = super illegal, 1 = gray area
}> = {
  stolen_goods: { baseValue: 50, heatGenerated: 1, legality: 0.3 },
  weapons: { baseValue: 200, heatGenerated: 2, legality: 0.2 },
  drugs: { baseValue: 150, heatGenerated: 3, legality: 0.1 },
  forbidden_texts: { baseValue: 300, heatGenerated: 2, legality: 0.2 },
  smuggled_goods: { baseValue: 100, heatGenerated: 1, legality: 0.4 },
  counterfeit: { baseValue: 80, heatGenerated: 2, legality: 0.2 },
  slaves: { baseValue: 500, heatGenerated: 5, legality: 0 },
  poisons: { baseValue: 250, heatGenerated: 3, legality: 0.1 }
};

// ============================================================================
// BLACK MARKET SYSTEM
// ============================================================================

export class BlackMarketSystem {
  private vendors: Map<string, BlackMarketVendor> = new Map();
  private playerStates: Map<string, PlayerBlackMarketState> = new Map();
  private activeStings: Map<string, StingOperation> = new Map();
  private reputationPricing: Map<string, ReputationPricing[]> = new Map(); // faction -> pricing tiers
  private config: BlackMarketConfig;
  private idCounter = 0;

  constructor(config: Partial<BlackMarketConfig> = {}) {
    this.config = { ...DEFAULT_BLACK_MARKET_CONFIG, ...config };
  }

  // ============================================================================
  // VENDOR MANAGEMENT
  // ============================================================================

  registerVendor(
    name: string,
    location: Vector3,
    faction: string,
    specialties: ContrabandType[],
    stingRisk: number = 0.1
  ): BlackMarketVendor {
    const id = `vendor_${++this.idCounter}`;
    const vendor: BlackMarketVendor = {
      id,
      name,
      location: { ...location },
      faction,
      specialties,
      inventory: [],
      buyPriceMultiplier: this.config.baseFencePrice,
      sellPriceMultiplier: 1.5,
      trustRequired: 20,
      stingRisk,
      restockInterval: this.config.vendorRestockBase,
      lastRestockTick: 0,
      isOpen: true,
      operatingHours: { start: 20, end: 4 } // Night operations
    };

    // Generate initial inventory
    this.restockVendor(vendor, 0);

    this.vendors.set(id, vendor);
    return vendor;
  }

  getVendor(vendorId: string): BlackMarketVendor | undefined {
    return this.vendors.get(vendorId);
  }

  getAllVendors(): BlackMarketVendor[] {
    return Array.from(this.vendors.values());
  }

  // ============================================================================
  // PLAYER STATE
  // ============================================================================

  getPlayerState(playerId: string): PlayerBlackMarketState {
    if (!this.playerStates.has(playerId)) {
      this.playerStates.set(playerId, {
        playerId,
        knownVendors: [],
        vendorTrust: new Map(),
        totalContrabandSold: 0,
        totalContrabandBought: 0,
        stingsEscaped: 0,
        stingsCaught: 0
      });
    }
    return this.playerStates.get(playerId)!;
  }

  discoverVendor(playerId: string, vendorId: string): boolean {
    const state = this.getPlayerState(playerId);
    if (!state.knownVendors.includes(vendorId)) {
      state.knownVendors.push(vendorId);
      state.vendorTrust.set(vendorId, 0);
      return true;
    }
    return false;
  }

  getVendorTrust(playerId: string, vendorId: string): number {
    const state = this.getPlayerState(playerId);
    return state.vendorTrust.get(vendorId) ?? 0;
  }

  // ============================================================================
  // FENCING (SELLING CONTRABAND)
  // ============================================================================

  fenceItem(
    playerId: string,
    vendorId: string,
    item: ContrabandItem,
    currentTick: number
  ): FencingResult {
    const vendor = this.vendors.get(vendorId);
    if (!vendor || !vendor.isOpen) {
      return { success: false, goldReceived: 0, heatGenerated: 0, stingTriggered: false, vendorTrustChange: 0 };
    }

    const state = this.getPlayerState(playerId);
    const trust = state.vendorTrust.get(vendorId) ?? 0;

    // Check trust requirement
    if (trust < vendor.trustRequired) {
      return { success: false, goldReceived: 0, heatGenerated: 0, stingTriggered: false, vendorTrustChange: 0 };
    }

    // Check for sting operation
    const stingChance = vendor.stingRisk * (item.isHot ? 2 : 1);
    if (Math.random() < stingChance) {
      const sting = this.triggerSting(vendor, playerId, currentTick);
      state.vendorTrust.set(vendorId, Math.max(0, trust - this.config.trustLossOnSting));

      return {
        success: false,
        goldReceived: 0,
        heatGenerated: CONTRABAND_DEFINITIONS[item.type].heatGenerated * 2,
        stingTriggered: true,
        vendorTrustChange: -this.config.trustLossOnSting
      };
    }

    // Calculate price
    let price = this.calculateFencePrice(item, vendor);

    // Apply reputation pricing if applicable
    const repPricing = this.getReputationPricing(playerId, vendor.faction);
    if (repPricing) {
      price *= repPricing.priceMultiplier;
    }

    // Complete transaction
    state.totalContrabandSold++;
    const trustGain = this.config.trustBuildRate;
    state.vendorTrust.set(vendorId, Math.min(100, trust + trustGain));

    return {
      success: true,
      goldReceived: Math.floor(price),
      heatGenerated: item.isHot ? item.heatGenerated : 0,
      stingTriggered: false,
      vendorTrustChange: trustGain
    };
  }

  private calculateFencePrice(item: ContrabandItem, vendor: BlackMarketVendor): number {
    let price = item.baseValue * item.quantity;

    // Vendor buy multiplier
    price *= vendor.buyPriceMultiplier;

    // Specialty bonus
    if (vendor.specialties.includes(item.type)) {
      price *= 1.2;
    }

    // Quality bonus
    if (item.quality > 0.5) {
      price *= 1 + (item.quality - 0.5) * this.config.qualityPriceBonus * 10;
    }

    // Hot item penalty
    if (item.isHot) {
      price *= (1 - this.config.hotItemPenalty);
    }

    return price;
  }

  // ============================================================================
  // PURCHASING
  // ============================================================================

  purchaseItem(
    playerId: string,
    vendorId: string,
    itemId: string,
    currentTick: number
  ): PurchaseResult {
    const vendor = this.vendors.get(vendorId);
    if (!vendor || !vendor.isOpen) {
      return { success: false, goldSpent: 0, item: null, stingTriggered: false };
    }

    const state = this.getPlayerState(playerId);
    const trust = state.vendorTrust.get(vendorId) ?? 0;

    if (trust < vendor.trustRequired) {
      return { success: false, goldSpent: 0, item: null, stingTriggered: false };
    }

    // Find item
    const itemIndex = vendor.inventory.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
      return { success: false, goldSpent: 0, item: null, stingTriggered: false };
    }

    const item = vendor.inventory[itemIndex];

    // Check for sting
    if (Math.random() < vendor.stingRisk) {
      this.triggerSting(vendor, playerId, currentTick);
      return {
        success: false,
        goldSpent: 0,
        item: null,
        stingTriggered: true
      };
    }

    // Calculate price
    let price = item.baseValue * item.quantity * vendor.sellPriceMultiplier;

    // Trust discount
    if (trust > 50) {
      price *= 0.9; // 10% discount for trusted customers
    }

    // Remove from inventory
    vendor.inventory.splice(itemIndex, 1);
    state.totalContrabandBought++;

    return {
      success: true,
      goldSpent: Math.floor(price),
      item,
      stingTriggered: false
    };
  }

  // ============================================================================
  // STING OPERATIONS
  // ============================================================================

  private triggerSting(vendor: BlackMarketVendor, playerId: string, currentTick: number): StingOperation {
    const id = `sting_${++this.idCounter}`;
    const sting: StingOperation = {
      id,
      vendorId: vendor.id,
      triggeredByPlayerId: playerId,
      ambushPosition: { ...vendor.location },
      guardCount: 4 + Math.floor(Math.random() * 4), // 4-8 guards
      tick: currentTick,
      isActive: true
    };

    this.activeStings.set(id, sting);

    // Temporarily close vendor
    vendor.isOpen = false;

    return sting;
  }

  resolveStingEscape(stingId: string, playerId: string): boolean {
    const sting = this.activeStings.get(stingId);
    if (!sting) return false;

    const state = this.getPlayerState(playerId);
    const escaped = Math.random() < this.config.stingEscapeChance;

    if (escaped) {
      state.stingsEscaped++;
    } else {
      state.stingsCaught++;
    }

    sting.isActive = false;

    // Reopen vendor after some time
    const vendor = this.vendors.get(sting.vendorId);
    if (vendor) {
      setTimeout(() => { vendor.isOpen = true; }, 60000); // 1 minute cooldown
    }

    return escaped;
  }

  getActiveStings(): StingOperation[] {
    return Array.from(this.activeStings.values()).filter(s => s.isActive);
  }

  // ============================================================================
  // REPUTATION PRICING
  // ============================================================================

  setReputationPricing(playerId: string, factionId: string, reputation: number): void {
    let pricing: ReputationPricing;

    if (reputation >= 50) {
      pricing = {
        factionId,
        reputation,
        priceMultiplier: 1.3, // Better prices for allies
        accessGranted: true,
        exclusiveItems: ['rare_weapons', 'faction_goods']
      };
    } else if (reputation >= 0) {
      pricing = {
        factionId,
        reputation,
        priceMultiplier: 1.0,
        accessGranted: true,
        exclusiveItems: []
      };
    } else if (reputation >= -50) {
      pricing = {
        factionId,
        reputation,
        priceMultiplier: 0.8, // Worse prices
        accessGranted: true,
        exclusiveItems: []
      };
    } else {
      pricing = {
        factionId,
        reputation,
        priceMultiplier: 0,
        accessGranted: false, // Banned
        exclusiveItems: []
      };
    }

    if (!this.reputationPricing.has(playerId)) {
      this.reputationPricing.set(playerId, []);
    }

    const existing = this.reputationPricing.get(playerId)!;
    const index = existing.findIndex(p => p.factionId === factionId);
    if (index >= 0) {
      existing[index] = pricing;
    } else {
      existing.push(pricing);
    }
  }

  private getReputationPricing(playerId: string, factionId: string): ReputationPricing | null {
    const pricings = this.reputationPricing.get(playerId);
    if (!pricings) return null;
    return pricings.find(p => p.factionId === factionId) ?? null;
  }

  canAccessVendor(playerId: string, vendorId: string): boolean {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) return false;

    const state = this.getPlayerState(playerId);
    if (!state.knownVendors.includes(vendorId)) return false;

    const trust = state.vendorTrust.get(vendorId) ?? 0;
    if (trust < vendor.trustRequired) return false;

    const repPricing = this.getReputationPricing(playerId, vendor.faction);
    if (repPricing && !repPricing.accessGranted) return false;

    return vendor.isOpen;
  }

  // ============================================================================
  // RESTOCKING
  // ============================================================================

  update(currentTick: number): void {
    for (const vendor of this.vendors.values()) {
      if (currentTick - vendor.lastRestockTick >= vendor.restockInterval) {
        this.restockVendor(vendor, currentTick);
      }
    }
  }

  private restockVendor(vendor: BlackMarketVendor, currentTick: number): void {
    vendor.lastRestockTick = currentTick;

    // Generate 3-8 items
    const itemCount = 3 + Math.floor(Math.random() * 6);

    for (let i = 0; i < itemCount; i++) {
      const type = vendor.specialties[Math.floor(Math.random() * vendor.specialties.length)];
      const def = CONTRABAND_DEFINITIONS[type];

      const item: ContrabandItem = {
        id: `item_${++this.idCounter}`,
        type,
        name: `${type.replace('_', ' ')} #${this.idCounter}`,
        baseValue: def.baseValue * (0.8 + Math.random() * 0.4), // ±20% variance
        heatGenerated: def.heatGenerated,
        quantity: 1 + Math.floor(Math.random() * 3),
        quality: 0.3 + Math.random() * 0.7,
        origin: vendor.faction,
        isHot: false,
        hotDecayTicks: 0
      };

      vendor.inventory.push(item);
    }

    // Limit inventory size
    if (vendor.inventory.length > 15) {
      vendor.inventory = vendor.inventory.slice(-15);
    }
  }

  // ============================================================================
  // HOT ITEM TRACKING
  // ============================================================================

  markItemHot(item: ContrabandItem, decayTicks: number = 2400): void { // 2 minutes default
    item.isHot = true;
    item.hotDecayTicks = decayTicks;
  }

  updateHotItems(currentTick: number): void {
    // Would be called on all player inventory items
    // Simplified - actual implementation would track player inventories
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  findNearestVendor(position: Vector3, playerId: string): BlackMarketVendor | null {
    const state = this.getPlayerState(playerId);
    let nearest: BlackMarketVendor | null = null;
    let nearestDist = Infinity;

    for (const vendorId of state.knownVendors) {
      const vendor = this.vendors.get(vendorId);
      if (!vendor || !vendor.isOpen) continue;

      const dist = this.distance(position, vendor.location);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = vendor;
      }
    }

    return nearest;
  }

  private distance(a: Vector3, b: Vector3): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // ============================================================================
  // SERIALIZATION
  // ============================================================================

  serialize(): object {
    return {
      vendors: Array.from(this.vendors.entries()),
      playerStates: Array.from(this.playerStates.entries()).map(([id, state]) => [
        id,
        {
          ...state,
          vendorTrust: Array.from(state.vendorTrust.entries())
        }
      ]),
      activeStings: Array.from(this.activeStings.entries()),
      reputationPricing: Array.from(this.reputationPricing.entries()),
      config: this.config,
      idCounter: this.idCounter
    };
  }

  static deserialize(data: any): BlackMarketSystem {
    const system = new BlackMarketSystem(data.config);
    system.idCounter = data.idCounter || 0;

    for (const [id, vendor] of data.vendors || []) {
      system.vendors.set(id, vendor);
    }

    for (const [id, stateData] of data.playerStates || []) {
      const state: PlayerBlackMarketState = {
        ...stateData,
        vendorTrust: new Map(stateData.vendorTrust)
      };
      system.playerStates.set(id, state);
    }

    for (const [id, sting] of data.activeStings || []) {
      system.activeStings.set(id, sting);
    }

    for (const [id, pricings] of data.reputationPricing || []) {
      system.reputationPricing.set(id, pricings);
    }

    return system;
  }
}

export default BlackMarketSystem;
