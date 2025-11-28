/**
 * UI System
 * Framework for game UI components, HUD, menus, and input handling
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */

// Localization
export interface LocalizedString {
  key: string;
  params?: Record<string, string | number>;
}

export interface StringTable {
  locale: string;
  strings: Map<string, string>;
}

// UI Component base
export interface UIComponent {
  id: string;
  type: string;
  visible: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  children: UIComponent[];
  render(): string;
  update(deltaMs: number): void;
  handleInput(input: InputEvent): boolean;
}

// Input handling
export type InputType = 'keyboard' | 'mouse' | 'controller';
export type InputAction = 'press' | 'release' | 'hold' | 'move';

export interface InputEvent {
  type: InputType;
  action: InputAction;
  key?: string;
  button?: number;
  position?: { x: number; y: number };
  delta?: { x: number; y: number };
}

export interface InputBinding {
  action: string;
  keyboard?: string[];
  controller?: string[];
  mouse?: number[];
}

// HUD Elements
export interface HUDConfig {
  showHealth: boolean;
  showStamina: boolean;
  showHunger: boolean;
  showThirst: boolean;
  showCompass: boolean;
  showMinimap: boolean;
  showQuickSlots: boolean;
  opacity: number;
}

export class UISystem {
  private components: Map<string, UIComponent> = new Map();
  private stringTables: Map<string, StringTable> = new Map();
  private currentLocale: string = 'en';
  private inputBindings: Map<string, InputBinding> = new Map();
  private hudConfig: HUDConfig;
  private activeModal: string | null = null;
  private inputMode: 'keyboard' | 'controller' = 'keyboard';

  constructor() {
    this.hudConfig = this.getDefaultHUDConfig();
    this.registerDefaultBindings();
    this.registerDefaultStrings();
  }


  private getDefaultHUDConfig(): HUDConfig {
    return {
      showHealth: true,
      showStamina: true,
      showHunger: true,
      showThirst: true,
      showCompass: true,
      showMinimap: false,
      showQuickSlots: true,
      opacity: 0.9
    };
  }

  private registerDefaultBindings(): void {
    const bindings: InputBinding[] = [
      { action: 'move_forward', keyboard: ['W', 'ArrowUp'], controller: ['LeftStickUp'] },
      { action: 'move_back', keyboard: ['S', 'ArrowDown'], controller: ['LeftStickDown'] },
      { action: 'move_left', keyboard: ['A', 'ArrowLeft'], controller: ['LeftStickLeft'] },
      { action: 'move_right', keyboard: ['D', 'ArrowRight'], controller: ['LeftStickRight'] },
      { action: 'jump', keyboard: ['Space'], controller: ['A'] },
      { action: 'crouch', keyboard: ['C', 'LeftControl'], controller: ['B'] },
      { action: 'sprint', keyboard: ['LeftShift'], controller: ['LeftStickPress'] },
      { action: 'interact', keyboard: ['E', 'Enter'], controller: ['X'] },
      { action: 'attack_light', keyboard: [], mouse: [0], controller: ['RightTrigger'] },
      { action: 'attack_heavy', keyboard: [], mouse: [1], controller: ['RightBumper'] },
      { action: 'block', keyboard: ['Q'], mouse: [2], controller: ['LeftTrigger'] },
      { action: 'dodge', keyboard: ['LeftAlt'], controller: ['LeftBumper'] },
      { action: 'inventory', keyboard: ['I', 'Tab'], controller: ['Back'] },
      { action: 'map', keyboard: ['M'], controller: ['DPadUp'] },
      { action: 'quest_log', keyboard: ['J'], controller: ['DPadRight'] },
      { action: 'pause', keyboard: ['Escape'], controller: ['Start'] },
      { action: 'quick_slot_1', keyboard: ['1'], controller: ['DPadLeft'] },
      { action: 'quick_slot_2', keyboard: ['2'], controller: ['DPadDown'] },
      { action: 'quick_slot_3', keyboard: ['3'], controller: ['DPadRight'] },
      { action: 'quick_slot_4', keyboard: ['4'], controller: ['DPadUp'] }
    ];

    for (const binding of bindings) {
      this.inputBindings.set(binding.action, binding);
    }
  }

  private registerDefaultStrings(): void {
    const enStrings = new Map<string, string>([
      // HUD
      ['hud.health', 'Health'],
      ['hud.stamina', 'Stamina'],
      ['hud.hunger', 'Hunger'],
      ['hud.thirst', 'Thirst'],
      ['hud.day', 'Day {day}'],
      ['hud.time', '{hour}:00'],
      
      // Menus
      ['menu.main', 'Main Menu'],
      ['menu.continue', 'Continue'],
      ['menu.new_game', 'New Game'],
      ['menu.load_game', 'Load Game'],
      ['menu.settings', 'Settings'],
      ['menu.quit', 'Quit'],
      
      // Inventory
      ['inventory.title', 'Inventory'],
      ['inventory.weight', 'Weight: {current}/{max}'],
      ['inventory.empty', 'Empty'],
      ['inventory.drop', 'Drop'],
      ['inventory.use', 'Use'],
      ['inventory.equip', 'Equip'],
      
      // Crafting
      ['crafting.title', 'Crafting'],
      ['crafting.craft', 'Craft'],
      ['crafting.materials', 'Materials'],
      ['crafting.missing', 'Missing: {item}'],
      
      // Quest
      ['quest.title', 'Quest Log'],
      ['quest.active', 'Active Quests'],
      ['quest.completed', 'Completed'],
      ['quest.failed', 'Failed'],
      ['quest.track', 'Track'],
      
      // Dialogue
      ['dialogue.continue', '[Continue]'],
      ['dialogue.end', '[End Conversation]'],
      
      // Combat
      ['combat.hit', 'Hit!'],
      ['combat.miss', 'Miss'],
      ['combat.critical', 'Critical Hit!'],
      ['combat.blocked', 'Blocked'],
      
      // Status
      ['status.hungry', 'You are hungry'],
      ['status.thirsty', 'You are thirsty'],
      ['status.tired', 'You are tired'],
      ['status.cold', 'You are cold'],
      ['status.hot', 'You are overheating'],
      ['status.bleeding', 'You are bleeding'],
      
      // Prompts
      ['prompt.interact', 'Press {key} to interact'],
      ['prompt.pickup', 'Press {key} to pick up {item}'],
      ['prompt.talk', 'Press {key} to talk'],
      ['prompt.open', 'Press {key} to open'],
      
      // Notifications
      ['notify.item_added', 'Added {item} x{count}'],
      ['notify.item_removed', 'Removed {item} x{count}'],
      ['notify.quest_started', 'Quest Started: {quest}'],
      ['notify.quest_completed', 'Quest Completed: {quest}'],
      ['notify.level_up', 'Level Up!'],
      ['notify.tech_unlocked', 'Technology Unlocked: {tech}'],
      
      // Faction
      ['faction.reputation', 'Reputation: {value}'],
      ['faction.allied', 'Allied'],
      ['faction.friendly', 'Friendly'],
      ['faction.neutral', 'Neutral'],
      ['faction.hostile', 'Hostile'],
      ['faction.at_war', 'At War']
    ]);

    this.stringTables.set('en', { locale: 'en', strings: enStrings });
  }

  // Localization
  getString(key: string, params?: Record<string, string | number>): string {
    const table = this.stringTables.get(this.currentLocale);
    let str = table?.strings.get(key) || key;

    if (params) {
      for (const [param, value] of Object.entries(params)) {
        str = str.replace(`{${param}}`, String(value));
      }
    }

    return str;
  }

  setLocale(locale: string): boolean {
    if (this.stringTables.has(locale)) {
      this.currentLocale = locale;
      return true;
    }
    return false;
  }

  addStringTable(table: StringTable): void {
    this.stringTables.set(table.locale, table);
  }

  getAvailableLocales(): string[] {
    return Array.from(this.stringTables.keys());
  }


  // Input handling
  getBinding(action: string): InputBinding | undefined {
    return this.inputBindings.get(action);
  }

  setBinding(action: string, binding: InputBinding): void {
    this.inputBindings.set(action, binding);
  }

  getActionForInput(input: InputEvent): string | null {
    for (const [action, binding] of this.inputBindings) {
      if (input.type === 'keyboard' && binding.keyboard?.includes(input.key || '')) {
        return action;
      }
      if (input.type === 'controller' && binding.controller?.includes(input.key || '')) {
        return action;
      }
      if (input.type === 'mouse' && binding.mouse?.includes(input.button || -1)) {
        return action;
      }
    }
    return null;
  }

  setInputMode(mode: 'keyboard' | 'controller'): void {
    this.inputMode = mode;
  }

  getInputMode(): 'keyboard' | 'controller' {
    return this.inputMode;
  }

  getPromptKey(action: string): string {
    const binding = this.inputBindings.get(action);
    if (!binding) return '?';

    if (this.inputMode === 'controller' && binding.controller?.length) {
      return binding.controller[0];
    }
    if (binding.keyboard?.length) {
      return binding.keyboard[0];
    }
    if (binding.mouse !== undefined && binding.mouse.length) {
      return `Mouse${binding.mouse[0] + 1}`;
    }
    return '?';
  }

  // HUD configuration
  getHUDConfig(): HUDConfig {
    return { ...this.hudConfig };
  }

  setHUDConfig(config: Partial<HUDConfig>): void {
    this.hudConfig = { ...this.hudConfig, ...config };
  }

  // Modal management
  openModal(modalId: string): void {
    this.activeModal = modalId;
  }

  closeModal(): void {
    this.activeModal = null;
  }

  getActiveModal(): string | null {
    return this.activeModal;
  }

  isModalOpen(): boolean {
    return this.activeModal !== null;
  }

  // Component management
  registerComponent(component: UIComponent): void {
    this.components.set(component.id, component);
  }

  getComponent(id: string): UIComponent | undefined {
    return this.components.get(id);
  }

  removeComponent(id: string): boolean {
    return this.components.delete(id);
  }

  // Contextual prompts
  getContextualPrompt(context: 'interact' | 'pickup' | 'talk' | 'open', params?: Record<string, string>): string {
    const key = this.getPromptKey('interact');
    return this.getString(`prompt.${context}`, { key, ...params });
  }

  // Notification system
  createNotification(type: string, params: Record<string, string | number>): string {
    return this.getString(`notify.${type}`, params);
  }

  // Status messages
  getStatusMessage(status: string): string {
    return this.getString(`status.${status}`);
  }

  // Faction status
  getFactionStatusText(reputation: number): string {
    if (reputation >= 0.7) return this.getString('faction.allied');
    if (reputation >= 0.3) return this.getString('faction.friendly');
    if (reputation >= -0.3) return this.getString('faction.neutral');
    if (reputation >= -0.7) return this.getString('faction.hostile');
    return this.getString('faction.at_war');
  }

  // Format time display
  formatTime(hour: number): string {
    const h = Math.floor(hour);
    return this.getString('hud.time', { hour: h.toString().padStart(2, '0') });
  }

  // Format day display
  formatDay(day: number): string {
    return this.getString('hud.day', { day });
  }

  // Update all components
  update(deltaMs: number): void {
    for (const component of this.components.values()) {
      if (component.visible) {
        component.update(deltaMs);
      }
    }
  }

  // Handle input for all components
  handleInput(input: InputEvent): boolean {
    // Modal gets priority
    if (this.activeModal) {
      const modal = this.components.get(this.activeModal);
      if (modal) {
        return modal.handleInput(input);
      }
    }

    // Then other components
    for (const component of this.components.values()) {
      if (component.visible && component.handleInput(input)) {
        return true;
      }
    }

    return false;
  }

  // Render all visible components
  render(): string[] {
    const output: string[] = [];
    
    for (const component of this.components.values()) {
      if (component.visible) {
        output.push(component.render());
      }
    }

    return output;
  }

  // Serialization for settings
  serializeSettings(): string {
    return JSON.stringify({
      hudConfig: this.hudConfig,
      inputBindings: Array.from(this.inputBindings.entries()),
      currentLocale: this.currentLocale,
      inputMode: this.inputMode
    });
  }

  deserializeSettings(data: string): void {
    const parsed = JSON.parse(data);
    this.hudConfig = parsed.hudConfig;
    this.inputBindings = new Map(parsed.inputBindings);
    this.currentLocale = parsed.currentLocale;
    this.inputMode = parsed.inputMode;
  }
}
