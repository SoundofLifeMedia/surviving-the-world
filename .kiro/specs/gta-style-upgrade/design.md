# Design Document: GTA-Style AAA Upgrade

## Overview

This design transforms "Surviving The World™" from a text-based simulation into a AAA-quality 3D action game inspired by GTA V. The upgrade focuses on:

1. **Third-Person Shooter Mechanics** - Smooth aiming, cover system, weapon variety
2. **Vehicle System** - Realistic driving physics, damage, traffic AI
3. **5-Star Wanted System** - Escalating police response
4. **Open World Population** - Living city with NPCs and traffic
5. **Modern Rendering** - Dynamic lighting, weather, LOD

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      GAME ENGINE (TypeScript)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   INPUT     │  │   PHYSICS   │  │  RENDERING  │              │
│  │  MANAGER    │  │   ENGINE    │  │   SYSTEM    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│  ┌──────▼────────────────▼────────────────▼──────┐              │
│  │              GAME SYSTEMS LAYER                │              │
│  ├───────────────────────────────────────────────┤              │
│  │ PlayerController │ VehicleSystem │ WeaponSystem│              │
│  │ WantedSystem     │ NPCTraffic    │ CoverSystem │              │
│  │ MissionSystem    │ AudioSystem   │ WeatherSys  │              │
│  └───────────────────────────────────────────────┘              │
│                           │                                      │
│  ┌────────────────────────▼──────────────────────┐              │
│  │              EXISTING SYSTEMS                  │              │
│  │ CombatSystem │ HeatSystem │ EconomySystem     │              │
│  │ FactionSystem│ SaveLoad   │ EnemyAIStack      │              │
│  └───────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Player Controller System

```typescript
interface PlayerController {
  position: Vector3;
  rotation: Quaternion;
  velocity: Vector3;
  state: PlayerState;
  
  move(direction: Vector2, deltaTime: number): void;
  sprint(enabled: boolean): void;
  jump(): void;
  crouch(): void;
  enterVehicle(vehicle: Vehicle): void;
  exitVehicle(): void;
  takeCover(coverPoint: CoverPoint): void;
}

type PlayerState = 'onFoot' | 'inVehicle' | 'aiming' | 'cover' | 'ragdoll' | 'swimming';
```

### 2. Weapon System

```typescript
interface Weapon {
  id: string;
  name: string;
  category: WeaponCategory;
  damage: number;
  fireRate: number;        // rounds per minute
  magazineSize: number;
  reloadTime: number;      // seconds
  spread: number;          // base accuracy cone
  recoilPattern: Vector2[];
  range: number;
  projectileSpeed: number;
}

type WeaponCategory = 'pistol' | 'smg' | 'rifle' | 'shotgun' | 'sniper' | 'explosive' | 'melee';

interface WeaponSystem {
  currentWeapon: Weapon | null;
  inventory: Map<WeaponCategory, Weapon>;
  ammo: Map<string, number>;
  
  fire(): FireResult;
  aim(enabled: boolean): void;
  reload(): void;
  switchWeapon(category: WeaponCategory): void;
  applyRecoil(): Vector2;
}

interface FireResult {
  hit: boolean;
  target: Entity | null;
  hitLocation: HitLocation;
  damage: number;
  penetration: boolean;
}

type HitLocation = 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';
```

### 3. Vehicle System

```typescript
interface Vehicle {
  id: string;
  type: VehicleType;
  position: Vector3;
  rotation: Quaternion;
  velocity: Vector3;
  health: number;
  maxHealth: number;
  
  // Physics properties
  mass: number;
  enginePower: number;
  maxSpeed: number;
  handling: number;
  brakeForce: number;
  
  // State
  driver: Entity | null;
  passengers: Entity[];
  damage: VehicleDamage;
}

type VehicleType = 'sedan' | 'sports' | 'suv' | 'truck' | 'motorcycle' | 'boat' | 'helicopter';

interface VehiclePhysics {
  accelerate(throttle: number): void;
  brake(force: number): void;
  steer(angle: number): void;
  applyDamage(impact: CollisionData): void;
  updatePhysics(deltaTime: number): void;
}

interface VehicleDamage {
  engine: number;      // 0-100, affects performance
  body: number;        // 0-100, visual damage
  wheels: number[];    // per-wheel damage
  windows: boolean[];  // broken state
}
```

### 4. Wanted System (5-Star)

```typescript
interface WantedSystem {
  currentLevel: WantedLevel;  // 0-5
  heatDecayTimer: number;
  activeUnits: PoliceUnit[];
  searchArea: Circle;
  
  addHeat(crime: CrimeType): void;
  updateSearch(playerPosition: Vector3): void;
  spawnResponse(): void;
  checkEvasion(): boolean;
  reset(): void;
}

type WantedLevel = 0 | 1 | 2 | 3 | 4 | 5;

type CrimeType = 
  | 'assault'           // +1 star
  | 'carTheft'          // +1 star
  | 'murder'            // +2 stars
  | 'copKill'           // +3 stars
  | 'explosion'         // +2 stars
  | 'bankRobbery';      // +4 stars

interface PoliceResponse {
  level: WantedLevel;
  units: {
    patrol: number;
    swat: number;
    helicopter: number;
    roadblocks: number;
  };
  tactics: PoliceTactic[];
}

const POLICE_RESPONSE: Record<WantedLevel, PoliceResponse> = {
  0: { level: 0, units: { patrol: 0, swat: 0, helicopter: 0, roadblocks: 0 }, tactics: [] },
  1: { level: 1, units: { patrol: 2, swat: 0, helicopter: 0, roadblocks: 0 }, tactics: ['pursue'] },
  2: { level: 2, units: { patrol: 4, swat: 0, helicopter: 0, roadblocks: 1 }, tactics: ['pursue', 'pit'] },
  3: { level: 3, units: { patrol: 6, swat: 2, helicopter: 1, roadblocks: 2 }, tactics: ['pursue', 'pit', 'spike'] },
  4: { level: 4, units: { patrol: 8, swat: 4, helicopter: 2, roadblocks: 3 }, tactics: ['pursue', 'pit', 'spike', 'ram'] },
  5: { level: 5, units: { patrol: 10, swat: 6, helicopter: 3, roadblocks: 4 }, tactics: ['pursue', 'pit', 'spike', 'ram', 'lethal'] }
};
```

### 5. NPC Traffic System

```typescript
interface NPCTrafficSystem {
  pedestrians: Pedestrian[];
  vehicles: TrafficVehicle[];
  spawnPoints: SpawnPoint[];
  
  updateTraffic(playerPosition: Vector3, deltaTime: number): void;
  spawnPedestrian(point: SpawnPoint): Pedestrian;
  spawnVehicle(road: Road): TrafficVehicle;
  handleWitness(npc: Pedestrian, crime: CrimeType): void;
}

interface Pedestrian {
  id: string;
  position: Vector3;
  personality: NPCPersonality;
  schedule: DailySchedule;
  state: PedestrianState;
  
  reactToThreat(threat: Entity): void;
  reactToVehicle(vehicle: Vehicle): void;
}

type PedestrianState = 'walking' | 'running' | 'fleeing' | 'cowering' | 'fighting' | 'dead';
type NPCPersonality = 'coward' | 'normal' | 'aggressive' | 'gangster' | 'cop';
```

### 6. Cover System

```typescript
interface CoverSystem {
  coverPoints: CoverPoint[];
  activeCover: CoverPoint | null;
  
  findNearestCover(position: Vector3, threatDirection: Vector3): CoverPoint | null;
  enterCover(point: CoverPoint): void;
  exitCover(): void;
  peekAndShoot(direction: 'left' | 'right' | 'over'): void;
  blindFire(): void;
}

interface CoverPoint {
  position: Vector3;
  normal: Vector3;        // Direction cover faces
  height: CoverHeight;
  width: number;
  destructible: boolean;
  health: number;
}

type CoverHeight = 'low' | 'high';  // Crouch vs stand
```

## Data Models

### Weapon Database

```typescript
const WEAPONS: Weapon[] = [
  // Pistols
  { id: 'pistol_9mm', name: '9mm Pistol', category: 'pistol', damage: 25, fireRate: 300, magazineSize: 12, reloadTime: 1.5, spread: 0.02, recoilPattern: [{x:0,y:0.5}], range: 50, projectileSpeed: 400 },
  { id: 'pistol_combat', name: 'Combat Pistol', category: 'pistol', damage: 30, fireRate: 250, magazineSize: 16, reloadTime: 1.8, spread: 0.015, recoilPattern: [{x:0,y:0.6}], range: 60, projectileSpeed: 420 },
  
  // SMGs
  { id: 'smg_micro', name: 'Micro SMG', category: 'smg', damage: 18, fireRate: 900, magazineSize: 30, reloadTime: 2.0, spread: 0.04, recoilPattern: [{x:0.1,y:0.3}], range: 40, projectileSpeed: 380 },
  { id: 'smg_mp5', name: 'MP5', category: 'smg', damage: 22, fireRate: 750, magazineSize: 30, reloadTime: 2.2, spread: 0.025, recoilPattern: [{x:0.05,y:0.35}], range: 50, projectileSpeed: 400 },
  
  // Rifles
  { id: 'rifle_ak', name: 'AK-47', category: 'rifle', damage: 35, fireRate: 600, magazineSize: 30, reloadTime: 2.5, spread: 0.03, recoilPattern: [{x:0.1,y:0.8}], range: 150, projectileSpeed: 700 },
  { id: 'rifle_m4', name: 'M4 Carbine', category: 'rifle', damage: 32, fireRate: 700, magazineSize: 30, reloadTime: 2.3, spread: 0.02, recoilPattern: [{x:0.05,y:0.6}], range: 180, projectileSpeed: 750 },
  
  // Shotguns
  { id: 'shotgun_pump', name: 'Pump Shotgun', category: 'shotgun', damage: 80, fireRate: 60, magazineSize: 8, reloadTime: 4.0, spread: 0.15, recoilPattern: [{x:0,y:2.0}], range: 20, projectileSpeed: 300 },
  
  // Snipers
  { id: 'sniper_bolt', name: 'Sniper Rifle', category: 'sniper', damage: 150, fireRate: 30, magazineSize: 5, reloadTime: 3.5, spread: 0.001, recoilPattern: [{x:0,y:3.0}], range: 500, projectileSpeed: 1000 },
  
  // Explosives
  { id: 'rpg', name: 'RPG-7', category: 'explosive', damage: 500, fireRate: 10, magazineSize: 1, reloadTime: 5.0, spread: 0.01, recoilPattern: [{x:0,y:1.5}], range: 200, projectileSpeed: 150 },
  { id: 'grenade', name: 'Frag Grenade', category: 'explosive', damage: 300, fireRate: 30, magazineSize: 1, reloadTime: 0, spread: 0, recoilPattern: [], range: 30, projectileSpeed: 20 }
];
```

### Vehicle Database

```typescript
const VEHICLES: Vehicle[] = [
  { id: 'sedan_basic', type: 'sedan', mass: 1500, enginePower: 150, maxSpeed: 180, handling: 0.7, brakeForce: 0.8 },
  { id: 'sports_coupe', type: 'sports', mass: 1200, enginePower: 400, maxSpeed: 280, handling: 0.9, brakeForce: 0.95 },
  { id: 'suv_offroad', type: 'suv', mass: 2500, enginePower: 250, maxSpeed: 160, handling: 0.5, brakeForce: 0.7 },
  { id: 'truck_pickup', type: 'truck', mass: 2000, enginePower: 200, maxSpeed: 150, handling: 0.6, brakeForce: 0.75 },
  { id: 'motorcycle_sport', type: 'motorcycle', mass: 200, enginePower: 150, maxSpeed: 250, handling: 0.95, brakeForce: 0.85 },
  { id: 'helicopter_news', type: 'helicopter', mass: 3000, enginePower: 800, maxSpeed: 200, handling: 0.6, brakeForce: 0.5 }
];
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Weapon Damage Bounds
*For any* weapon fire event, the calculated damage SHALL be positive and bounded by weapon.damage * 3 (headshot max)
**Validates: Requirements 2.3**

### Property 2: Vehicle Physics Conservation
*For any* vehicle collision, total momentum before collision SHALL equal total momentum after collision (within physics tolerance)
**Validates: Requirements 3.4**

### Property 3: Wanted Level Bounds
*For any* crime event, the wanted level SHALL remain in range [0, 5] and increase monotonically until decay
**Validates: Requirements 4.1, 4.2**

### Property 4: Police Response Scaling
*For any* wanted level N, the police response SHALL include at least N patrol units
**Validates: Requirements 4.2, 4.3, 4.4**

### Property 5: NPC Population Bounds
*For any* game tick in populated area, pedestrian count SHALL be in range [50, 100]
**Validates: Requirements 5.1**

### Property 6: Weapon Switch Timing
*For any* weapon switch, the transition SHALL complete within 500ms
**Validates: Requirements 6.2**

### Property 7: Cover Damage Reduction
*For any* damage event while in cover from covered direction, damage SHALL be reduced by exactly 80%
**Validates: Requirements 2.6**

### Property 8: Vehicle Entry/Exit Timing
*For any* vehicle entry, the transition SHALL complete within 1500ms
**Validates: Requirements 3.1**

### Property 9: Reload Blocking
*For any* reload action, firing SHALL be blocked for exactly weapon.reloadTime seconds
**Validates: Requirements 2.4**

### Property 10: Save/Load Round-Trip
*For any* game state, deserialize(serialize(state)) SHALL produce equivalent state
**Validates: Requirements 10.3**

### Property 11: Evasion Timer Scaling
*For any* wanted level N, evasion time SHALL be exactly N * 60 seconds
**Validates: Requirements 4.5**

### Property 12: Hit Location Damage Multipliers
*For any* hit on 'head', damage multiplier SHALL be exactly 3.0; 'torso' = 1.0; limbs = 0.5
**Validates: Requirements 2.3**

## Error Handling

### Combat Errors
- Invalid target: Return miss result with no damage
- Out of ammo: Auto-switch weapon or play empty click
- Weapon jammed: 5% chance on rapid fire, requires reload

### Vehicle Errors
- No nearby vehicle: Display "No vehicle nearby" message
- Vehicle locked: Require lockpick minigame or break window
- Vehicle destroyed: Eject player with ragdoll

### Wanted System Errors
- Max level exceeded: Clamp to 5 stars
- Invalid crime type: Log warning, default to 1 star

## Testing Strategy

### Unit Testing
- Test each weapon's damage calculation
- Test vehicle physics step function
- Test wanted level transitions
- Test NPC spawn/despawn logic

### Property-Based Testing (fast-check)
- **Property 1**: Generate random weapons and fire events, verify damage bounds
- **Property 2**: Generate random collisions, verify momentum conservation
- **Property 3**: Generate random crime sequences, verify wanted level bounds
- **Property 4**: Generate wanted levels 1-5, verify police unit counts
- **Property 5**: Generate random player positions, verify NPC counts
- **Property 10**: Generate random game states, verify round-trip equality

### Integration Testing
- Full combat scenario: Player vs multiple enemies with cover
- Vehicle chase: Player fleeing from 3-star wanted level
- Mission flow: Start → objectives → completion → rewards

### Performance Testing
- 60 FPS with 100 NPCs and 50 vehicles
- Memory stable over 1-hour play session
- Load times under 5 seconds
