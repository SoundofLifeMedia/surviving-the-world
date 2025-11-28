/**
 * Economy System
 * Dynamic supply/demand pricing, trade routes, regional economies
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

export interface RegionalEconomy {
  regionId: string;
  supply: Map<string, number>;
  demand: Map<string, number>;
  basePrice: Map<string, number>;
  productionRate: Map<string, number>;
  consumptionRate: Map<string, number>;
  modifiers: EconomicModifier[];
}

export interface EconomicModifier {
  id: string;
  type: 'war' | 'famine' | 'plague' | 'festival' | 'trade_boom' | 'scarcity';
  affectedItems: string[];
  priceMultiplier: number;
  supplyMultiplier: number;
  demandMultiplier: number;
  duration: number; // days, -1 = permanent
  startDay: number;
}

export interface TradeRoute {
  id: string;
  fromRegion: string;
  toRegion: string;
  items: string[];
  capacity: number;
  travelTime: number; // days
  active: boolean;
  controlledBy: string | null; // faction ID
  tariff: number; // 0-1
}

export interface TradeTransaction {
  id: string;
  buyer: string;
  seller: string;
  regionId: string;
  items: { itemId: string; quantity: number; price: number }[];
  totalValue: number;
  day: number;
}

export class EconomySystem {
  private regions: Map<string, RegionalEconomy> = new Map();
  private tradeRoutes: Map<string, TradeRoute> = new Map();
  private transactions: TradeTransaction[] = [];
  private nextId: number = 1;

  // Price calculation constants
  private readonly BASE_PRICE_MULTIPLIER = 1.0;
  private readonly SCARCITY_FACTOR = 0.5;
  private readonly DEMAND_FACTOR = 0.3;
  private readonly MIN_PRICE_MULTIPLIER = 0.2;
  private readonly MAX_PRICE_MULTIPLIER = 5.0;

  constructor() {
    this.initializeDefaultRegions();
  }


  private initializeDefaultRegions(): void {
    // Default items with base prices
    const defaultItems = [
      { id: 'grain', basePrice: 5 },
      { id: 'bread', basePrice: 8 },
      { id: 'meat', basePrice: 15 },
      { id: 'water', basePrice: 2 },
      { id: 'herbs', basePrice: 10 },
      { id: 'wood', basePrice: 3 },
      { id: 'stone', basePrice: 4 },
      { id: 'iron_ore', basePrice: 20 },
      { id: 'iron', basePrice: 35 },
      { id: 'leather', basePrice: 12 },
      { id: 'cloth', basePrice: 10 },
      { id: 'sword_iron', basePrice: 100 },
      { id: 'leather_armor', basePrice: 80 },
      { id: 'bow_wood', basePrice: 40 },
      { id: 'arrow', basePrice: 2 },
      { id: 'bandage', basePrice: 5 },
      { id: 'gold', basePrice: 1 } // Gold is the currency
    ];

    // Create default regions
    const regions = ['village', 'town', 'castle', 'forest', 'farmland'];
    
    for (const regionId of regions) {
      const economy: RegionalEconomy = {
        regionId,
        supply: new Map(),
        demand: new Map(),
        basePrice: new Map(),
        productionRate: new Map(),
        consumptionRate: new Map(),
        modifiers: []
      };

      for (const item of defaultItems) {
        economy.basePrice.set(item.id, item.basePrice);
        economy.supply.set(item.id, 100);
        economy.demand.set(item.id, 50);
        economy.productionRate.set(item.id, 0);
        economy.consumptionRate.set(item.id, 0);
      }

      // Region-specific adjustments
      this.applyRegionSpecialization(economy, regionId);
      this.regions.set(regionId, economy);
    }

    // Create default trade routes
    this.createTradeRoute('village', 'town', ['grain', 'meat', 'leather'], 50, 1);
    this.createTradeRoute('town', 'castle', ['iron', 'cloth', 'sword_iron'], 30, 2);
    this.createTradeRoute('forest', 'village', ['wood', 'herbs'], 40, 1);
    this.createTradeRoute('farmland', 'village', ['grain', 'water'], 60, 1);
  }

  private applyRegionSpecialization(economy: RegionalEconomy, regionId: string): void {
    switch (regionId) {
      case 'village':
        economy.productionRate.set('grain', 10);
        economy.productionRate.set('bread', 5);
        economy.consumptionRate.set('grain', 5);
        economy.supply.set('grain', 200);
        break;
      case 'town':
        economy.productionRate.set('cloth', 8);
        economy.productionRate.set('leather', 5);
        economy.consumptionRate.set('grain', 15);
        economy.consumptionRate.set('meat', 10);
        economy.demand.set('grain', 100);
        break;
      case 'castle':
        economy.productionRate.set('iron', 5);
        economy.productionRate.set('sword_iron', 2);
        economy.consumptionRate.set('grain', 20);
        economy.consumptionRate.set('meat', 15);
        economy.demand.set('grain', 150);
        economy.demand.set('iron_ore', 80);
        break;
      case 'forest':
        economy.productionRate.set('wood', 15);
        economy.productionRate.set('herbs', 8);
        economy.productionRate.set('meat', 5);
        economy.supply.set('wood', 300);
        economy.supply.set('herbs', 150);
        break;
      case 'farmland':
        economy.productionRate.set('grain', 20);
        economy.productionRate.set('water', 10);
        economy.supply.set('grain', 400);
        economy.supply.set('water', 200);
        break;
    }
  }

  // Price calculation
  getPrice(itemId: string, regionId: string): number {
    const region = this.regions.get(regionId);
    if (!region) return 0;

    const basePrice = region.basePrice.get(itemId) || 10;
    const supply = region.supply.get(itemId) || 1;
    const demand = region.demand.get(itemId) || 1;

    // Supply/demand ratio affects price
    const supplyDemandRatio = demand / Math.max(1, supply);
    let priceMultiplier = this.BASE_PRICE_MULTIPLIER;

    // Scarcity increases price
    if (supply < 20) {
      priceMultiplier += this.SCARCITY_FACTOR * (1 - supply / 20);
    }

    // High demand increases price
    priceMultiplier += this.DEMAND_FACTOR * Math.log(supplyDemandRatio + 1);

    // Apply modifiers
    for (const modifier of region.modifiers) {
      if (modifier.affectedItems.includes(itemId) || modifier.affectedItems.includes('*')) {
        priceMultiplier *= modifier.priceMultiplier;
      }
    }

    // Clamp multiplier
    priceMultiplier = Math.max(this.MIN_PRICE_MULTIPLIER, 
                              Math.min(this.MAX_PRICE_MULTIPLIER, priceMultiplier));

    return Math.round(basePrice * priceMultiplier);
  }

  // Update supply
  updateSupply(regionId: string, itemId: string, delta: number): void {
    const region = this.regions.get(regionId);
    if (!region) return;

    const current = region.supply.get(itemId) || 0;
    region.supply.set(itemId, Math.max(0, current + delta));
  }

  // Update demand
  updateDemand(regionId: string, itemId: string, delta: number): void {
    const region = this.regions.get(regionId);
    if (!region) return;

    const current = region.demand.get(itemId) || 0;
    region.demand.set(itemId, Math.max(0, current + delta));
  }

  // Get supply level
  getSupply(regionId: string, itemId: string): number {
    return this.regions.get(regionId)?.supply.get(itemId) || 0;
  }

  // Get demand level
  getDemand(regionId: string, itemId: string): number {
    return this.regions.get(regionId)?.demand.get(itemId) || 0;
  }


  // Trade route management
  createTradeRoute(
    fromRegion: string,
    toRegion: string,
    items: string[],
    capacity: number,
    travelTime: number
  ): TradeRoute {
    const routeId = `route_${this.nextId++}`;
    const route: TradeRoute = {
      id: routeId,
      fromRegion,
      toRegion,
      items,
      capacity,
      travelTime,
      active: true,
      controlledBy: null,
      tariff: 0
    };

    this.tradeRoutes.set(routeId, route);
    return route;
  }

  disruptTradeRoute(routeId: string): boolean {
    const route = this.tradeRoutes.get(routeId);
    if (!route) return false;
    route.active = false;
    return true;
  }

  restoreTradeRoute(routeId: string): boolean {
    const route = this.tradeRoutes.get(routeId);
    if (!route) return false;
    route.active = true;
    return true;
  }

  setTradeRouteControl(routeId: string, factionId: string | null, tariff: number): void {
    const route = this.tradeRoutes.get(routeId);
    if (route) {
      route.controlledBy = factionId;
      route.tariff = Math.max(0, Math.min(1, tariff));
    }
  }

  getTradeRoutes(regionId?: string): TradeRoute[] {
    const routes = Array.from(this.tradeRoutes.values());
    if (!regionId) return routes;
    return routes.filter(r => r.fromRegion === regionId || r.toRegion === regionId);
  }

  getActiveTradeRoutes(): TradeRoute[] {
    return Array.from(this.tradeRoutes.values()).filter(r => r.active);
  }

  // Execute trade between regions via route
  executeRouteTrade(routeId: string, currentDay: number): void {
    const route = this.tradeRoutes.get(routeId);
    if (!route || !route.active) return;

    const fromRegion = this.regions.get(route.fromRegion);
    const toRegion = this.regions.get(route.toRegion);
    if (!fromRegion || !toRegion) return;

    for (const itemId of route.items) {
      const fromSupply = fromRegion.supply.get(itemId) || 0;
      const toSupply = toRegion.supply.get(itemId) || 0;
      const toDemand = toRegion.demand.get(itemId) || 0;

      // Trade if source has surplus and destination has demand
      if (fromSupply > 50 && toDemand > toSupply) {
        const tradeAmount = Math.min(
          route.capacity,
          fromSupply - 50,
          toDemand - toSupply
        );

        if (tradeAmount > 0) {
          fromRegion.supply.set(itemId, fromSupply - tradeAmount);
          toRegion.supply.set(itemId, toSupply + tradeAmount);
        }
      }
    }
  }

  // Player/faction trade execution
  executeTrade(
    buyer: string,
    seller: string,
    regionId: string,
    items: { itemId: string; quantity: number }[],
    currentDay: number
  ): { success: boolean; transaction?: TradeTransaction; reason?: string } {
    const region = this.regions.get(regionId);
    if (!region) return { success: false, reason: 'Region not found' };

    const transactionItems: { itemId: string; quantity: number; price: number }[] = [];
    let totalValue = 0;

    // Validate and calculate prices
    for (const item of items) {
      const supply = region.supply.get(item.itemId) || 0;
      if (supply < item.quantity) {
        return { success: false, reason: `Insufficient supply of ${item.itemId}` };
      }

      const price = this.getPrice(item.itemId, regionId);
      transactionItems.push({
        itemId: item.itemId,
        quantity: item.quantity,
        price
      });
      totalValue += price * item.quantity;
    }

    // Execute trade
    for (const item of transactionItems) {
      this.updateSupply(regionId, item.itemId, -item.quantity);
      // Increase demand slightly after purchase
      this.updateDemand(regionId, item.itemId, item.quantity * 0.1);
    }

    const transaction: TradeTransaction = {
      id: `transaction_${this.nextId++}`,
      buyer,
      seller,
      regionId,
      items: transactionItems,
      totalValue,
      day: currentDay
    };

    this.transactions.push(transaction);
    return { success: true, transaction };
  }

  // Economic modifiers
  applyModifier(regionId: string, modifier: Omit<EconomicModifier, 'id'>): void {
    const region = this.regions.get(regionId);
    if (!region) return;

    const fullModifier: EconomicModifier = {
      ...modifier,
      id: `modifier_${this.nextId++}`
    };

    region.modifiers.push(fullModifier);
  }

  removeModifier(regionId: string, modifierId: string): boolean {
    const region = this.regions.get(regionId);
    if (!region) return false;

    const index = region.modifiers.findIndex(m => m.id === modifierId);
    if (index >= 0) {
      region.modifiers.splice(index, 1);
      return true;
    }
    return false;
  }

  // Update economy (called each game day)
  update(currentDay: number): void {
    for (const region of this.regions.values()) {
      // Apply production
      for (const [itemId, rate] of region.productionRate) {
        if (rate > 0) {
          const current = region.supply.get(itemId) || 0;
          region.supply.set(itemId, current + rate);
        }
      }

      // Apply consumption
      for (const [itemId, rate] of region.consumptionRate) {
        if (rate > 0) {
          const current = region.supply.get(itemId) || 0;
          region.supply.set(itemId, Math.max(0, current - rate));
        }
      }

      // Remove expired modifiers
      region.modifiers = region.modifiers.filter(m => 
        m.duration === -1 || currentDay - m.startDay < m.duration
      );

      // Natural demand decay
      for (const [itemId, demand] of region.demand) {
        region.demand.set(itemId, Math.max(10, demand * 0.99));
      }
    }

    // Execute trade routes
    for (const route of this.tradeRoutes.values()) {
      if (route.active) {
        this.executeRouteTrade(route.id, currentDay);
      }
    }
  }

  // War effects
  applyWarEffects(regionId: string, currentDay: number): void {
    this.applyModifier(regionId, {
      type: 'war',
      affectedItems: ['*'],
      priceMultiplier: 1.5,
      supplyMultiplier: 0.7,
      demandMultiplier: 1.3,
      duration: -1,
      startDay: currentDay
    });

    // Disrupt trade routes
    for (const route of this.tradeRoutes.values()) {
      if (route.fromRegion === regionId || route.toRegion === regionId) {
        route.active = false;
      }
    }
  }

  // Get regional economy summary
  getRegionSummary(regionId: string): {
    topSupply: { itemId: string; amount: number }[];
    topDemand: { itemId: string; amount: number }[];
    activeModifiers: EconomicModifier[];
  } | null {
    const region = this.regions.get(regionId);
    if (!region) return null;

    const supplyArray = Array.from(region.supply.entries())
      .map(([itemId, amount]) => ({ itemId, amount }))
      .sort((a, b) => b.amount - a.amount);

    const demandArray = Array.from(region.demand.entries())
      .map(([itemId, amount]) => ({ itemId, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      topSupply: supplyArray.slice(0, 5),
      topDemand: demandArray.slice(0, 5),
      activeModifiers: region.modifiers
    };
  }

  // Get transaction history
  getTransactions(regionId?: string, days?: number, currentDay?: number): TradeTransaction[] {
    let filtered = this.transactions;
    
    if (regionId) {
      filtered = filtered.filter(t => t.regionId === regionId);
    }
    
    if (days && currentDay) {
      filtered = filtered.filter(t => currentDay - t.day <= days);
    }

    return filtered;
  }

  // Serialization
  serialize(): string {
    return JSON.stringify({
      regions: Array.from(this.regions.entries()).map(([id, r]) => ({
        ...r,
        supply: Array.from(r.supply.entries()),
        demand: Array.from(r.demand.entries()),
        basePrice: Array.from(r.basePrice.entries()),
        productionRate: Array.from(r.productionRate.entries()),
        consumptionRate: Array.from(r.consumptionRate.entries())
      })),
      tradeRoutes: Array.from(this.tradeRoutes.entries()),
      transactions: this.transactions,
      nextId: this.nextId
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    
    this.regions = new Map(parsed.regions.map((r: any) => [r.regionId, {
      ...r,
      supply: new Map(r.supply),
      demand: new Map(r.demand),
      basePrice: new Map(r.basePrice),
      productionRate: new Map(r.productionRate),
      consumptionRate: new Map(r.consumptionRate)
    }]));
    
    this.tradeRoutes = new Map(parsed.tradeRoutes);
    this.transactions = parsed.transactions;
    this.nextId = parsed.nextId;
  }
}
