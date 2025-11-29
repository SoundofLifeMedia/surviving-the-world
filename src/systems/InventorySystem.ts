/**
 * Inventory System
 * Manages items, weight, encumbrance, durability, stacking
 */

import { ItemConfig } from '../engine/DataLoader';

export interface ItemInstance {
  id: string;
  templateId: string;
  durability: number;
  quantity: number;
  traits: string[];
}

export class InventorySystem {
  private items: Map<string, ItemInstance> = new Map();
  private maxWeight: number;
  private itemConfigs: Map<string, ItemConfig> = new Map();

  constructor(maxWeight: number = 50) {
    this.maxWeight = maxWeight;
  }

  registerItemConfig(config: ItemConfig): void {
    this.itemConfigs.set(config.id, config);
  }

  addItem(templateId: string, quantity: number = 1): boolean {
    const config = this.itemConfigs.get(templateId);
    if (!config) return false;

    // Check if total weight would exceed max
    const newWeight = this.getTotalWeight() + config.weight * quantity;
    if (newWeight > this.maxWeight) return false;

    if (config.stackable) {
      const existing = Array.from(this.items.values()).find(i => i.templateId === templateId);
      if (existing) {
        existing.quantity += quantity;
        return true;
      }
      // Create new stack
      const id = `${templateId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.items.set(id, {
        id,
        templateId,
        durability: config.durability,
        quantity: quantity,
        traits: [...config.traits]
      });
      return true;
    }

    // Non-stackable: create separate instances for each item
    for (let i = 0; i < quantity; i++) {
      const id = `${templateId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}`;
      this.items.set(id, {
        id,
        templateId,
        durability: config.durability,
        quantity: 1,
        traits: [...config.traits]
      });
    }
    return true;
  }

  removeItem(itemId: string, quantity: number = 1): boolean {
    const item = this.items.get(itemId);
    if (!item) return false;

    if (item.quantity <= quantity) {
      this.items.delete(itemId);
    } else {
      item.quantity -= quantity;
    }
    return true;
  }

  removeItemByTemplate(templateId: string, quantity: number = 1): boolean {
    const item = Array.from(this.items.values()).find(i => i.templateId === templateId);
    if (!item || item.quantity < quantity) return false;
    return this.removeItem(item.id, quantity);
  }

  getItem(itemId: string): ItemInstance | null {
    return this.items.get(itemId) || null;
  }

  getItemByTemplate(templateId: string): ItemInstance | null {
    return Array.from(this.items.values()).find(i => i.templateId === templateId) || null;
  }

  getItems(): ItemInstance[] {
    return Array.from(this.items.values());
  }

  getItemCount(templateId: string): number {
    return this.getItems().filter(i => i.templateId === templateId).reduce((sum, i) => sum + i.quantity, 0);
  }

  getTotalWeight(): number {
    return this.getItems().reduce((sum, item) => {
      const config = this.itemConfigs.get(item.templateId);
      return sum + (config ? config.weight * item.quantity : 0);
    }, 0);
  }

  getEncumbrance(): number {
    return Math.min(1, this.getTotalWeight() / this.maxWeight);
  }

  canAddItem(templateId: string, quantity: number = 1): boolean {
    const config = this.itemConfigs.get(templateId);
    if (!config) return false;
    return this.getTotalWeight() + config.weight * quantity <= this.maxWeight;
  }

  updateDurability(itemId: string, delta: number): void {
    const item = this.items.get(itemId);
    if (item) {
      item.durability = Math.max(0, item.durability + delta);
      if (item.durability <= 0) this.items.delete(itemId);
    }
  }

  hasItem(templateId: string, quantity: number = 1): boolean {
    return this.getItemCount(templateId) >= quantity;
  }

  serialize(): string {
    return JSON.stringify({ items: Array.from(this.items.entries()), maxWeight: this.maxWeight });
  }

  static deserialize(json: string, configs: Map<string, ItemConfig>): InventorySystem {
    const data = JSON.parse(json);
    const system = new InventorySystem(data.maxWeight);
    system.itemConfigs = configs;
    system.items = new Map(data.items);
    return system;
  }
}
