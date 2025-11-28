/**
 * GTA-Style Weapon System
 * AAA-quality shooting mechanics with recoil, spread, and hit detection
 * Requirements: 2.1-2.6, 6.1-6.5
 */

export type WeaponCategory = 'pistol' | 'smg' | 'rifle' | 'shotgun' | 'sniper' | 'explosive' | 'melee';
export type HitLocation = 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';
export type WeaponState = 'ready' | 'firing' | 'reloading' | 'switching' | 'empty';

export interface Vector2 { x: number; y: number; }
export interface Vector3 { x: number; y: number; z: number; }

export interface Weapon {
  id: string;
  name: string;
  category: WeaponCategory;
  damage: number;
  fireRate: number;        // rounds per minute
  magazineSize: number;
  reloadTime: number;      // seconds
  spread: number;          // base accuracy cone (radians)
  recoilPattern: Vector2[];
  range: number;           // effective range in meters
  projectileSpeed: number; // m/s
  automatic: boolean;
  penetration: number;     // armor penetration 0-1
}

export interface FireResult {
  hit: boolean;
  target: string | null;
  hitLocation: HitLocation | null;
  damage: number;
  critical: boolean;
  penetrated: boolean;
  distance: number;
}

export interface Entity {
  id: string;
  position: Vector3;
  health: number;
  armor: number;
  hitbox: HitBox;
}

export interface HitBox {
  head: { center: Vector3; radius: number };
  torso: { center: Vector3; radius: number };
  leftArm: { center: Vector3; radius: number };
  rightArm: { center: Vector3; radius: number };
  leftLeg: { center: Vector3; radius: number };
  rightLeg: { center: Vector3; radius: number };
}

// Hit location damage multipliers (GTA-style)
export const HIT_MULTIPLIERS: Record<HitLocation, number> = {
  head: 3.0,
  torso: 1.0,
  leftArm: 0.5,
  rightArm: 0.5,
  leftLeg: 0.5,
  rightLeg: 0.5
};

// Weapon Database - 15+ weapons
export const WEAPONS: Weapon[] = [
  // PISTOLS
  {
    id: 'pistol_9mm',
    name: '9mm Pistol',
    category: 'pistol',
    damage: 25,
    fireRate: 300,
    magazineSize: 12,
    reloadTime: 1.5,
    spread: 0.02,
    recoilPattern: [{ x: 0, y: 0.5 }, { x: 0.1, y: 0.4 }],
    range: 50,
    projectileSpeed: 400,
    automatic: false,
    penetration: 0.1
  },
  {
    id: 'pistol_combat',
    name: 'Combat Pistol',
    category: 'pistol',
    damage: 30,
    fireRate: 250,
    magazineSize: 16,
    reloadTime: 1.8,
    spread: 0.015,
    recoilPattern: [{ x: 0, y: 0.6 }, { x: -0.1, y: 0.5 }],
    range: 60,
    projectileSpeed: 420,
    automatic: false,
    penetration: 0.15
  },
  {
    id: 'pistol_heavy',
    name: 'Heavy Pistol',
    category: 'pistol',
    damage: 45,
    fireRate: 150,
    magazineSize: 7,
    reloadTime: 2.0,
    spread: 0.025,
    recoilPattern: [{ x: 0, y: 1.2 }, { x: 0.2, y: 0.8 }],
    range: 55,
    projectileSpeed: 450,
    automatic: false,
    penetration: 0.3
  },

  // SMGs
  {
    id: 'smg_micro',
    name: 'Micro SMG',
    category: 'smg',
    damage: 18,
    fireRate: 900,
    magazineSize: 30,
    reloadTime: 2.0,
    spread: 0.04,
    recoilPattern: [{ x: 0.1, y: 0.3 }, { x: -0.1, y: 0.25 }, { x: 0.15, y: 0.35 }],
    range: 40,
    projectileSpeed: 380,
    automatic: true,
    penetration: 0.05
  },
  {
    id: 'smg_mp5',
    name: 'MP5',
    category: 'smg',
    damage: 22,
    fireRate: 750,
    magazineSize: 30,
    reloadTime: 2.2,
    spread: 0.025,
    recoilPattern: [{ x: 0.05, y: 0.35 }, { x: -0.05, y: 0.3 }],
    range: 50,
    projectileSpeed: 400,
    automatic: true,
    penetration: 0.1
  },

  // RIFLES
  {
    id: 'rifle_ak',
    name: 'AK-47',
    category: 'rifle',
    damage: 35,
    fireRate: 600,
    magazineSize: 30,
    reloadTime: 2.5,
    spread: 0.03,
    recoilPattern: [{ x: 0.1, y: 0.8 }, { x: -0.15, y: 0.7 }, { x: 0.2, y: 0.9 }],
    range: 150,
    projectileSpeed: 700,
    automatic: true,
    penetration: 0.4
  },
  {
    id: 'rifle_m4',
    name: 'M4 Carbine',
    category: 'rifle',
    damage: 32,
    fireRate: 700,
    magazineSize: 30,
    reloadTime: 2.3,
    spread: 0.02,
    recoilPattern: [{ x: 0.05, y: 0.6 }, { x: -0.05, y: 0.55 }],
    range: 180,
    projectileSpeed: 750,
    automatic: true,
    penetration: 0.35
  },
  {
    id: 'rifle_assault',
    name: 'Assault Rifle',
    category: 'rifle',
    damage: 30,
    fireRate: 650,
    magazineSize: 30,
    reloadTime: 2.4,
    spread: 0.022,
    recoilPattern: [{ x: 0.08, y: 0.65 }, { x: -0.08, y: 0.6 }],
    range: 160,
    projectileSpeed: 720,
    automatic: true,
    penetration: 0.38
  },

  // SHOTGUNS
  {
    id: 'shotgun_pump',
    name: 'Pump Shotgun',
    category: 'shotgun',
    damage: 80,
    fireRate: 60,
    magazineSize: 8,
    reloadTime: 4.0,
    spread: 0.15,
    recoilPattern: [{ x: 0, y: 2.0 }],
    range: 20,
    projectileSpeed: 300,
    automatic: false,
    penetration: 0.1
  },
  {
    id: 'shotgun_auto',
    name: 'Auto Shotgun',
    category: 'shotgun',
    damage: 60,
    fireRate: 180,
    magazineSize: 8,
    reloadTime: 3.5,
    spread: 0.18,
    recoilPattern: [{ x: 0.1, y: 1.5 }],
    range: 18,
    projectileSpeed: 280,
    automatic: true,
    penetration: 0.08
  },

  // SNIPERS
  {
    id: 'sniper_bolt',
    name: 'Sniper Rifle',
    category: 'sniper',
    damage: 150,
    fireRate: 30,
    magazineSize: 5,
    reloadTime: 3.5,
    spread: 0.001,
    recoilPattern: [{ x: 0, y: 3.0 }],
    range: 500,
    projectileSpeed: 1000,
    automatic: false,
    penetration: 0.8
  },
  {
    id: 'sniper_marksman',
    name: 'Marksman Rifle',
    category: 'sniper',
    damage: 80,
    fireRate: 120,
    magazineSize: 10,
    reloadTime: 2.8,
    spread: 0.005,
    recoilPattern: [{ x: 0.05, y: 1.8 }],
    range: 350,
    projectileSpeed: 900,
    automatic: false,
    penetration: 0.6
  },

  // EXPLOSIVES
  {
    id: 'rpg',
    name: 'RPG-7',
    category: 'explosive',
    damage: 500,
    fireRate: 10,
    magazineSize: 1,
    reloadTime: 5.0,
    spread: 0.01,
    recoilPattern: [{ x: 0, y: 1.5 }],
    range: 200,
    projectileSpeed: 150,
    automatic: false,
    penetration: 1.0
  },
  {
    id: 'grenade_launcher',
    name: 'Grenade Launcher',
    category: 'explosive',
    damage: 300,
    fireRate: 30,
    magazineSize: 6,
    reloadTime: 4.5,
    spread: 0.02,
    recoilPattern: [{ x: 0, y: 1.0 }],
    range: 150,
    projectileSpeed: 80,
    automatic: false,
    penetration: 0.9
  },
  {
    id: 'grenade',
    name: 'Frag Grenade',
    category: 'explosive',
    damage: 300,
    fireRate: 30,
    magazineSize: 1,
    reloadTime: 0,
    spread: 0,
    recoilPattern: [],
    range: 30,
    projectileSpeed: 20,
    automatic: false,
    penetration: 0.5
  },

  // MELEE
  {
    id: 'knife',
    name: 'Combat Knife',
    category: 'melee',
    damage: 50,
    fireRate: 120,
    magazineSize: 999,
    reloadTime: 0,
    spread: 0,
    recoilPattern: [],
    range: 2,
    projectileSpeed: 0,
    automatic: false,
    penetration: 0.2
  },
  {
    id: 'bat',
    name: 'Baseball Bat',
    category: 'melee',
    damage: 40,
    fireRate: 80,
    magazineSize: 999,
    reloadTime: 0,
    spread: 0,
    recoilPattern: [],
    range: 2.5,
    projectileSpeed: 0,
    automatic: false,
    penetration: 0
  }
];

export class WeaponSystemGTA {
  private weapons: Map<string, Weapon> = new Map();
  private currentWeapon: Weapon | null = null;
  private inventory: Map<WeaponCategory, Weapon> = new Map();
  private ammo: Map<string, number> = new Map();
  private currentMagazine: number = 0;
  private state: WeaponState = 'ready';
  private recoilIndex: number = 0;
  private accumulatedRecoil: Vector2 = { x: 0, y: 0 };
  private lastFireTime: number = 0;
  private isAiming: boolean = false;
  private switchStartTime: number = 0;
  private reloadStartTime: number = 0;

  // Timing constants
  private readonly SWITCH_TIME_MS = 500;
  private readonly AIM_SPREAD_REDUCTION = 0.6;
  private readonly AIM_MOVEMENT_PENALTY = 0.4;

  constructor() {
    // Register all weapons
    for (const weapon of WEAPONS) {
      this.weapons.set(weapon.id, weapon);
    }
  }

  // Get weapon by ID
  getWeapon(id: string): Weapon | undefined {
    return this.weapons.get(id);
  }

  // Get all weapons
  getAllWeapons(): Weapon[] {
    return Array.from(this.weapons.values());
  }

  // Equip weapon to inventory slot
  equipWeapon(weaponId: string): boolean {
    const weapon = this.weapons.get(weaponId);
    if (!weapon) return false;

    this.inventory.set(weapon.category, weapon);
    
    // Initialize ammo if not present
    if (!this.ammo.has(weaponId)) {
      this.ammo.set(weaponId, weapon.magazineSize * 3); // Start with 3 mags
    }

    // Auto-equip if no current weapon
    if (!this.currentWeapon) {
      this.currentWeapon = weapon;
      this.currentMagazine = Math.min(weapon.magazineSize, this.ammo.get(weaponId) || 0);
      this.state = 'ready';
    }

    return true;
  }

  // Switch to weapon category
  switchWeapon(category: WeaponCategory): boolean {
    const weapon = this.inventory.get(category);
    if (!weapon || weapon === this.currentWeapon) return false;
    if (this.state === 'switching' || this.state === 'reloading') return false;

    this.state = 'switching';
    this.switchStartTime = Date.now();
    
    // Actual switch happens after SWITCH_TIME_MS
    setTimeout(() => {
      this.currentWeapon = weapon;
      this.currentMagazine = Math.min(weapon.magazineSize, this.ammo.get(weapon.id) || 0);
      this.state = 'ready';
      this.recoilIndex = 0;
      this.accumulatedRecoil = { x: 0, y: 0 };
    }, this.SWITCH_TIME_MS);

    return true;
  }

  // Get switch progress (0-1)
  getSwitchProgress(): number {
    if (this.state !== 'switching') return 1;
    return Math.min(1, (Date.now() - this.switchStartTime) / this.SWITCH_TIME_MS);
  }

  // Fire weapon
  fire(shooterPosition: Vector3, aimDirection: Vector3, targets: Entity[]): FireResult {
    if (!this.currentWeapon) {
      return { hit: false, target: null, hitLocation: null, damage: 0, critical: false, penetrated: false, distance: 0 };
    }

    if (this.state !== 'ready') {
      return { hit: false, target: null, hitLocation: null, damage: 0, critical: false, penetrated: false, distance: 0 };
    }

    if (this.currentMagazine <= 0) {
      this.state = 'empty';
      return { hit: false, target: null, hitLocation: null, damage: 0, critical: false, penetrated: false, distance: 0 };
    }

    // Check fire rate
    const now = Date.now();
    const fireInterval = 60000 / this.currentWeapon.fireRate;
    if (now - this.lastFireTime < fireInterval) {
      return { hit: false, target: null, hitLocation: null, damage: 0, critical: false, penetrated: false, distance: 0 };
    }

    this.lastFireTime = now;
    this.currentMagazine--;
    this.state = 'firing';

    // Calculate spread (reduced when aiming)
    let spread = this.currentWeapon.spread;
    if (this.isAiming) {
      spread *= (1 - this.AIM_SPREAD_REDUCTION);
    }

    // Apply spread to aim direction
    const spreadX = (Math.random() - 0.5) * spread * 2;
    const spreadY = (Math.random() - 0.5) * spread * 2;
    const finalDirection: Vector3 = {
      x: aimDirection.x + spreadX,
      y: aimDirection.y + spreadY,
      z: aimDirection.z
    };

    // Normalize direction
    const mag = Math.sqrt(finalDirection.x ** 2 + finalDirection.y ** 2 + finalDirection.z ** 2);
    finalDirection.x /= mag;
    finalDirection.y /= mag;
    finalDirection.z /= mag;

    // Apply recoil
    this.applyRecoil();

    // Raycast to find hit
    const result = this.raycast(shooterPosition, finalDirection, targets);

    // Reset state after brief firing animation
    setTimeout(() => {
      if (this.state === 'firing') {
        this.state = this.currentMagazine > 0 ? 'ready' : 'empty';
      }
    }, 50);

    return result;
  }

  // Raycast hit detection
  private raycast(origin: Vector3, direction: Vector3, targets: Entity[]): FireResult {
    if (!this.currentWeapon) {
      return { hit: false, target: null, hitLocation: null, damage: 0, critical: false, penetrated: false, distance: 0 };
    }

    let closestHit: { entity: Entity; location: HitLocation; distance: number } | null = null;

    for (const target of targets) {
      // Check each hitbox
      for (const [locationName, hitbox] of Object.entries(target.hitbox)) {
        const location = locationName as HitLocation;
        const hitResult = this.checkSphereIntersection(origin, direction, hitbox.center, hitbox.radius);
        
        if (hitResult.hit && hitResult.distance <= this.currentWeapon.range) {
          if (!closestHit || hitResult.distance < closestHit.distance) {
            closestHit = { entity: target, location, distance: hitResult.distance };
          }
        }
      }
    }

    if (!closestHit) {
      return { hit: false, target: null, hitLocation: null, damage: 0, critical: false, penetrated: false, distance: 0 };
    }

    // Calculate damage
    const baseDamage = this.currentWeapon.damage;
    const locationMultiplier = HIT_MULTIPLIERS[closestHit.location];
    const distanceFalloff = Math.max(0.5, 1 - (closestHit.distance / this.currentWeapon.range) * 0.5);
    
    let damage = Math.floor(baseDamage * locationMultiplier * distanceFalloff);
    
    // Armor penetration
    const penetrated = Math.random() < this.currentWeapon.penetration;
    if (!penetrated && closestHit.entity.armor > 0) {
      damage = Math.floor(damage * (1 - closestHit.entity.armor * 0.5));
    }

    // Ensure minimum damage of 1
    damage = Math.max(1, damage);

    // Critical hit (headshot)
    const critical = closestHit.location === 'head';

    return {
      hit: true,
      target: closestHit.entity.id,
      hitLocation: closestHit.location,
      damage,
      critical,
      penetrated,
      distance: closestHit.distance
    };
  }

  // Sphere intersection test
  private checkSphereIntersection(
    rayOrigin: Vector3,
    rayDirection: Vector3,
    sphereCenter: Vector3,
    sphereRadius: number
  ): { hit: boolean; distance: number } {
    const oc: Vector3 = {
      x: rayOrigin.x - sphereCenter.x,
      y: rayOrigin.y - sphereCenter.y,
      z: rayOrigin.z - sphereCenter.z
    };

    const a = rayDirection.x ** 2 + rayDirection.y ** 2 + rayDirection.z ** 2;
    const b = 2 * (oc.x * rayDirection.x + oc.y * rayDirection.y + oc.z * rayDirection.z);
    const c = oc.x ** 2 + oc.y ** 2 + oc.z ** 2 - sphereRadius ** 2;
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return { hit: false, distance: Infinity };
    }

    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (t < 0) {
      return { hit: false, distance: Infinity };
    }

    return { hit: true, distance: t };
  }

  // Apply recoil
  private applyRecoil(): Vector2 {
    if (!this.currentWeapon || this.currentWeapon.recoilPattern.length === 0) {
      return { x: 0, y: 0 };
    }

    const pattern = this.currentWeapon.recoilPattern;
    const recoil = pattern[this.recoilIndex % pattern.length];
    
    // Add some randomness
    const randomFactor = 0.2;
    const finalRecoil: Vector2 = {
      x: recoil.x + (Math.random() - 0.5) * randomFactor,
      y: recoil.y + (Math.random() - 0.5) * randomFactor
    };

    this.accumulatedRecoil.x += finalRecoil.x;
    this.accumulatedRecoil.y += finalRecoil.y;
    this.recoilIndex++;

    return finalRecoil;
  }

  // Get accumulated recoil (for camera shake)
  getAccumulatedRecoil(): Vector2 {
    return { ...this.accumulatedRecoil };
  }

  // Reset recoil (when not firing)
  resetRecoil(deltaTime: number): void {
    const decayRate = 5; // Per second
    this.accumulatedRecoil.x *= Math.max(0, 1 - decayRate * deltaTime);
    this.accumulatedRecoil.y *= Math.max(0, 1 - decayRate * deltaTime);
    
    if (Math.abs(this.accumulatedRecoil.x) < 0.01) this.accumulatedRecoil.x = 0;
    if (Math.abs(this.accumulatedRecoil.y) < 0.01) this.accumulatedRecoil.y = 0;
    
    if (this.accumulatedRecoil.x === 0 && this.accumulatedRecoil.y === 0) {
      this.recoilIndex = 0;
    }
  }

  // Reload weapon
  reload(): boolean {
    if (!this.currentWeapon) return false;
    if (this.state === 'reloading' || this.state === 'switching') return false;
    if (this.currentMagazine >= this.currentWeapon.magazineSize) return false;

    const totalAmmo = this.ammo.get(this.currentWeapon.id) || 0;
    if (totalAmmo <= 0) return false;

    this.state = 'reloading';
    this.reloadStartTime = Date.now();

    setTimeout(() => {
      if (this.currentWeapon && this.state === 'reloading') {
        const needed = this.currentWeapon.magazineSize - this.currentMagazine;
        const available = this.ammo.get(this.currentWeapon.id) || 0;
        const toLoad = Math.min(needed, available);
        
        this.currentMagazine += toLoad;
        this.ammo.set(this.currentWeapon.id, available - toLoad);
        this.state = 'ready';
      }
    }, this.currentWeapon.reloadTime * 1000);

    return true;
  }

  // Get reload progress (0-1)
  getReloadProgress(): number {
    if (this.state !== 'reloading' || !this.currentWeapon) return 1;
    return Math.min(1, (Date.now() - this.reloadStartTime) / (this.currentWeapon.reloadTime * 1000));
  }

  // Aim down sights
  setAiming(aiming: boolean): void {
    this.isAiming = aiming;
  }

  // Add ammo
  addAmmo(weaponId: string, amount: number): void {
    const current = this.ammo.get(weaponId) || 0;
    this.ammo.set(weaponId, current + amount);
  }

  // Getters
  getCurrentWeapon(): Weapon | null { return this.currentWeapon; }
  getCurrentMagazine(): number { return this.currentMagazine; }
  getTotalAmmo(): number { return this.currentWeapon ? (this.ammo.get(this.currentWeapon.id) || 0) : 0; }
  getState(): WeaponState { return this.state; }
  isAimingDownSights(): boolean { return this.isAiming; }
  getInventory(): Map<WeaponCategory, Weapon> { return new Map(this.inventory); }

  // Calculate damage for a hit (used by external systems)
  calculateDamage(weapon: Weapon, hitLocation: HitLocation, distance: number, targetArmor: number): number {
    const baseDamage = weapon.damage;
    const locationMultiplier = HIT_MULTIPLIERS[hitLocation];
    const distanceFalloff = Math.max(0.5, 1 - (distance / weapon.range) * 0.5);
    
    let damage = Math.floor(baseDamage * locationMultiplier * distanceFalloff);
    
    // Armor reduction
    if (targetArmor > 0) {
      const armorReduction = targetArmor * (1 - weapon.penetration) * 0.5;
      damage = Math.floor(damage * (1 - armorReduction));
    }

    return Math.max(1, damage);
  }

  // Serialize state
  serialize(): object {
    return {
      currentWeaponId: this.currentWeapon?.id || null,
      inventory: Array.from(this.inventory.entries()).map(([cat, w]) => ({ category: cat, weaponId: w.id })),
      ammo: Array.from(this.ammo.entries()),
      currentMagazine: this.currentMagazine
    };
  }

  // Deserialize state
  static deserialize(data: any): WeaponSystemGTA {
    const system = new WeaponSystemGTA();
    
    if (data.inventory) {
      for (const { category, weaponId } of data.inventory) {
        system.equipWeapon(weaponId);
      }
    }
    
    if (data.ammo) {
      for (const [weaponId, amount] of data.ammo) {
        system.ammo.set(weaponId, amount);
      }
    }
    
    if (data.currentWeaponId) {
      const weapon = system.weapons.get(data.currentWeaponId);
      if (weapon) {
        system.currentWeapon = weapon;
        system.currentMagazine = data.currentMagazine || weapon.magazineSize;
      }
    }
    
    return system;
  }
}

export default WeaponSystemGTA;
