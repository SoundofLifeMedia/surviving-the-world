/**
 * Quest System
 * Template-driven dynamic quest generation based on world state
 */

import { WorldState } from '../engine/WorldState';

export interface QuestTemplate {
  id: string;
  type: string;
  triggers: string[];
  roles: Record<string, string>;
  steps: string[];
  outcomes: {
    success: { worldEffects: string[]; rewards: Record<string, number> };
    failure: { worldEffects: string[]; penalties: Record<string, number> };
  };
}

export interface Quest {
  id: string;
  templateId: string;
  title: string;
  description: string;
  assignedRoles: Record<string, string>;
  steps: QuestStep[];
  currentStep: number;
  status: 'active' | 'completed' | 'failed';
  startTime: number;
}

export interface QuestStep {
  id: string;
  description: string;
  completed: boolean;
  objectives: QuestObjective[];
}

export interface QuestObjective {
  type: 'talk' | 'collect' | 'deliver' | 'kill' | 'travel' | 'protect';
  target: string;
  quantity: number;
  current: number;
}

export class QuestSystem {
  private templates: Map<string, QuestTemplate> = new Map();
  private activeQuests: Map<string, Quest> = new Map();
  private completedQuests: Set<string> = new Set();

  registerTemplate(template: QuestTemplate): void {
    this.templates.set(template.id, template);
  }

  evaluateTriggers(worldState: WorldState): string[] {
    const triggered: string[] = [];

    for (const [id, template] of this.templates) {
      if (this.activeQuests.has(id) || this.completedQuests.has(id)) continue;

      let allTriggersMatch = true;
      for (const trigger of template.triggers) {
        if (!this.evaluateTrigger(trigger, worldState)) {
          allTriggersMatch = false;
          break;
        }
      }

      if (allTriggersMatch) triggered.push(id);
    }

    return triggered;
  }

  private evaluateTrigger(trigger: string, worldState: WorldState): boolean {
    // Parse trigger expressions like "famine_risk > 0.7"
    const match = trigger.match(/(\w+)\s*(>|<|>=|<=|==)\s*([\d.]+)/);
    if (!match) return false;

    const [, key, op, valueStr] = match;
    const value = parseFloat(valueStr);

    // Get value from world state
    let actual: number | undefined;
    if (key === 'dayCount') actual = worldState.dayCount;
    else if (key === 'threatLevel') actual = worldState.globalThreatLevel;
    else if (key === 'famine_risk') {
      // Check era modifiers (simplified)
      actual = 0.5; // Default, would come from era config
    }

    if (actual === undefined) return false;

    switch (op) {
      case '>': return actual > value;
      case '<': return actual < value;
      case '>=': return actual >= value;
      case '<=': return actual <= value;
      case '==': return actual === value;
      default: return false;
    }
  }

  generateQuest(templateId: string, worldState: WorldState): Quest | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const quest: Quest = {
      id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      templateId,
      title: this.generateTitle(template),
      description: this.generateDescription(template),
      assignedRoles: this.assignRoles(template, worldState),
      steps: template.steps.map((step, i) => ({
        id: `step_${i}`,
        description: step,
        completed: false,
        objectives: this.generateObjectives(step)
      })),
      currentStep: 0,
      status: 'active',
      startTime: Date.now()
    };

    this.activeQuests.set(quest.id, quest);
    return quest;
  }

  private generateTitle(template: QuestTemplate): string {
    const titles: Record<string, string> = {
      'fetch_food_for_famine': 'The Hungry Village',
      'defend_settlement': 'Under Siege',
      'escort_merchant': 'Safe Passage'
    };
    return titles[template.id] || `Quest: ${template.id}`;
  }

  private generateDescription(template: QuestTemplate): string {
    return `Complete the following objectives to succeed.`;
  }

  private assignRoles(template: QuestTemplate, worldState: WorldState): Record<string, string> {
    const assigned: Record<string, string> = {};
    for (const [role, requirement] of Object.entries(template.roles)) {
      // Simplified role assignment
      assigned[role] = `npc_${role}_${Math.floor(Math.random() * 100)}`;
    }
    return assigned;
  }

  private generateObjectives(step: string): QuestObjective[] {
    // Parse step to generate objectives
    if (step.includes('talk')) {
      return [{ type: 'talk', target: 'npc', quantity: 1, current: 0 }];
    } else if (step.includes('travel')) {
      return [{ type: 'travel', target: 'location', quantity: 1, current: 0 }];
    } else if (step.includes('acquire') || step.includes('collect')) {
      return [{ type: 'collect', target: 'item', quantity: 10, current: 0 }];
    } else if (step.includes('deliver') || step.includes('return')) {
      return [{ type: 'deliver', target: 'npc', quantity: 1, current: 0 }];
    }
    return [];
  }

  updateObjective(questId: string, objectiveType: string, target: string, amount: number = 1): boolean {
    const quest = this.activeQuests.get(questId);
    if (!quest || quest.status !== 'active') return false;

    const step = quest.steps[quest.currentStep];
    if (!step) return false;

    for (const obj of step.objectives) {
      if (obj.type === objectiveType && obj.target === target) {
        obj.current = Math.min(obj.quantity, obj.current + amount);
        if (obj.current >= obj.quantity) {
          this.checkStepCompletion(quest);
        }
        return true;
      }
    }
    return false;
  }

  private checkStepCompletion(quest: Quest): void {
    const step = quest.steps[quest.currentStep];
    if (step.objectives.every(o => o.current >= o.quantity)) {
      step.completed = true;
      quest.currentStep++;

      if (quest.currentStep >= quest.steps.length) {
        this.completeQuest(quest.id, true);
      }
    }
  }

  completeQuest(questId: string, success: boolean): void {
    const quest = this.activeQuests.get(questId);
    if (!quest) return;

    quest.status = success ? 'completed' : 'failed';
    this.completedQuests.add(quest.templateId);
    this.activeQuests.delete(questId);
  }

  getActiveQuests(): Quest[] {
    return Array.from(this.activeQuests.values());
  }

  getQuest(questId: string): Quest | undefined {
    return this.activeQuests.get(questId);
  }

  serialize(): string {
    return JSON.stringify({
      activeQuests: Array.from(this.activeQuests.entries()),
      completedQuests: Array.from(this.completedQuests)
    });
  }
}
