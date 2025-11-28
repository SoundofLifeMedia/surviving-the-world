/**
 * Crafting System
 * Recipe-based crafting with stations, timers, and tech unlocks
 */

import { InventorySystem } from './InventorySystem';

export interface Recipe {
  id: string;
  name: string;
  inputs: Array<{ itemId: string; quantity: number }>;
  outputs: Array<{ itemId: string; quantity: number }>;
  craftTimeSeconds: number;
  requiresStation: string | null;
  unlockedBy: string | null;
}

export interface CraftingJob {
  id: string;
  recipeId: string;
  startTime: number;
  endTime: number;
  completed: boolean;
}

export class CraftingSystem {
  private recipes: Map<string, Recipe> = new Map();
  private unlockedRecipes: Set<string> = new Set();
  private activeJobs: Map<string, CraftingJob> = new Map();
  private inventory: InventorySystem;
  private availableStations: Set<string> = new Set();

  constructor(inventory: InventorySystem) {
    this.inventory = inventory;
  }

  registerRecipe(recipe: Recipe): void {
    this.recipes.set(recipe.id, recipe);
    if (!recipe.unlockedBy) this.unlockedRecipes.add(recipe.id);
  }

  addStation(stationId: string): void {
    this.availableStations.add(stationId);
  }

  removeStation(stationId: string): void {
    this.availableStations.delete(stationId);
  }

  unlockRecipe(recipeId: string): void {
    this.unlockedRecipes.add(recipeId);
  }

  getRecipes(): Recipe[] {
    return Array.from(this.recipes.values());
  }

  getAvailableRecipes(): Recipe[] {
    return this.getRecipes().filter(r => this.unlockedRecipes.has(r.id));
  }

  canCraft(recipeId: string): { canCraft: boolean; reason?: string } {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) return { canCraft: false, reason: 'Recipe not found' };
    if (!this.unlockedRecipes.has(recipeId)) return { canCraft: false, reason: 'Recipe not unlocked' };
    if (recipe.requiresStation && !this.availableStations.has(recipe.requiresStation)) {
      return { canCraft: false, reason: `Requires ${recipe.requiresStation}` };
    }

    for (const input of recipe.inputs) {
      if (!this.inventory.hasItem(input.itemId, input.quantity)) {
        return { canCraft: false, reason: `Missing ${input.quantity}x ${input.itemId}` };
      }
    }

    return { canCraft: true };
  }

  startCrafting(recipeId: string): CraftingJob | null {
    const check = this.canCraft(recipeId);
    if (!check.canCraft) return null;

    const recipe = this.recipes.get(recipeId)!;

    // Consume inputs
    for (const input of recipe.inputs) {
      this.inventory.removeItemByTemplate(input.itemId, input.quantity);
    }

    const job: CraftingJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipeId,
      startTime: Date.now(),
      endTime: Date.now() + recipe.craftTimeSeconds * 1000,
      completed: false
    };

    this.activeJobs.set(job.id, job);
    return job;
  }

  updateCrafting(): CraftingJob[] {
    const completed: CraftingJob[] = [];
    const now = Date.now();

    for (const job of this.activeJobs.values()) {
      if (!job.completed && now >= job.endTime) {
        job.completed = true;
        completed.push(job);
      }
    }

    return completed;
  }

  completeCrafting(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (!job || !job.completed) return false;

    const recipe = this.recipes.get(job.recipeId)!;

    // Add outputs
    for (const output of recipe.outputs) {
      this.inventory.addItem(output.itemId, output.quantity);
    }

    this.activeJobs.delete(jobId);
    return true;
  }

  getActiveJobs(): CraftingJob[] {
    return Array.from(this.activeJobs.values());
  }

  serialize(): string {
    return JSON.stringify({
      unlockedRecipes: Array.from(this.unlockedRecipes),
      activeJobs: Array.from(this.activeJobs.entries()),
      availableStations: Array.from(this.availableStations)
    });
  }
}
