/**
 * GTA-Style Vehicle System
 * Realistic vehicle physics, damage, and driving mechanics
 * Requirements: 3.1-3.6
 */

export interface Vector3 { x: number; y: number; z: number; }
export interface Quaternion { x: number; y: number; z: number; w: number; }

export type VehicleType = 'sedan' | 'sports' | 'suv' | 'truck' | 'motorcycle' | 'boat' | 'helicopter';
export type VehicleState = 'parked' | 'idle' | 'driving' | 'damaged' | 'destroyed';

export interface VehicleConfig {
  id: string;
  name: string;
  type: VehicleType;
  mass: number;           // kg
  enginePower: number;    // horsepower
  maxSpeed: number;       // km/h
  acceleration: number;   // 0-100 km/h in seconds
  handling: number;       // 0-1 (higher = better)
  brakeForce: number;     // 0-1 (higher = better)
  health: number;         // max health
  seats: number;
  price: number;
}

export interface VehicleDamage {
  engine: number;         // 0-100, affects performance
  body: number;           // 0-100, visual damage
  wheels: number[];       // per-wheel damage (0-100)
  windows: boolean[];     // broken state per window
  doors: boolean[];       // detached state per door
}

export interface Vehicle {
  id: string;
  config: VehicleConfig;
  position: Vector3;
  rotation: Quaternion;
  velocity: Vector3;
  angularVelocity: Vector3;
  health: number;
  fuel: number;           // 0-100
  damage: VehicleDamage;
  state: VehicleState;
  driver: string | null;
  passengers: string[];
  locked: boolean;
  alarm: boolean;
  lights: boolean;
  engine: boolean;
}

export interface CollisionData {
  impactForce: number;
  impactPoint: Vector3;
  impactNormal: Vector3;
  otherVehicle: string | null;
}

// Vehicle Database
export const VEHICLE_CONFIGS: VehicleConfig[] = [
  // SEDANS
  {
    id: 'sedan_basic',
    name: 'Stanier',
    type: 'sedan',
    mass: 1500,
    enginePower: 150,
    maxSpeed: 180,
    acceleration: 12,
    handling: 0.7,
    brakeForce: 0.8,
    health: 1000,
    seats: 4,
    price: 12000
  },
  {
    id: 'sedan_luxury',
    name: 'Oracle',
    type: 'sedan',
    mass: 1800,
    enginePower: 280,
    maxSpeed: 220,
    acceleration: 8,
    handling: 0.75,
    brakeForce: 0.85,
    health: 1000,
    seats: 4,
    price: 80000
  },

  // SPORTS
  {
    id: 'sports_coupe',
    name: 'Comet',
    type: 'sports',
    mass: 1200,
    enginePower: 400,
    maxSpeed: 280,
    acceleration: 4.5,
    handling: 0.9,
    brakeForce: 0.95,
    health: 800,
    seats: 2,
    price: 150000
  },
  {
    id: 'sports_super',
    name: 'Infernus',
    type: 'sports',
    mass: 1100,
    enginePower: 600,
    maxSpeed: 320,
    acceleration: 3.2,
    handling: 0.92,
    brakeForce: 0.98,
    health: 700,
    seats: 2,
    price: 450000
  },

  // SUVs
  {
    id: 'suv_offroad',
    name: 'Baller',
    type: 'suv',
    mass: 2500,
    enginePower: 250,
    maxSpeed: 160,
    acceleration: 10,
    handling: 0.5,
    brakeForce: 0.7,
    health: 1500,
    seats: 4,
    price: 90000
  },

  // TRUCKS
  {
    id: 'truck_pickup',
    name: 'Bobcat',
    type: 'truck',
    mass: 2000,
    enginePower: 200,
    maxSpeed: 150,
    acceleration: 14,
    handling: 0.6,
    brakeForce: 0.75,
    health: 1200,
    seats: 2,
    price: 35000
  },

  // MOTORCYCLES
  {
    id: 'motorcycle_sport',
    name: 'Bati 801',
    type: 'motorcycle',
    mass: 200,
    enginePower: 150,
    maxSpeed: 250,
    acceleration: 3.0,
    handling: 0.95,
    brakeForce: 0.85,
    health: 400,
    seats: 2,
    price: 15000
  },
  {
    id: 'motorcycle_chopper',
    name: 'Daemon',
    type: 'motorcycle',
    mass: 350,
    enginePower: 100,
    maxSpeed: 180,
    acceleration: 6,
    handling: 0.7,
    brakeForce: 0.7,
    health: 500,
    seats: 2,
    price: 25000
  },

  // HELICOPTERS
  {
    id: 'helicopter_news',
    name: 'Maverick',
    type: 'helicopter',
    mass: 3000,
    enginePower: 800,
    maxSpeed: 200,
    acceleration: 8,
    handling: 0.6,
    brakeForce: 0.5,
    health: 1000,
    seats: 4,
    price: 500000
  },

  // BOATS
  {
    id: 'boat_speedboat',
    name: 'Speeder',
    type: 'boat',
    mass: 800,
    enginePower: 300,
    maxSpeed: 120,
    acceleration: 5,
    handling: 0.7,
    brakeForce: 0.3,
    health: 600,
    seats: 4,
    price: 75000
  }
];

export class VehicleSystemGTA {
  private vehicles: Map<string, Vehicle> = new Map();
  private configs: Map<string, VehicleConfig> = new Map();
  private nextVehicleId: number = 1;

  // Physics constants
  private readonly GRAVITY = 9.81;
  private readonly AIR_RESISTANCE = 0.3;
  private readonly ROLLING_RESISTANCE = 0.01;
  private readonly ENTRY_TIME_MS = 1500;
  private readonly EXIT_TIME_MS = 800;

  constructor() {
    // Register all vehicle configs
    for (const config of VEHICLE_CONFIGS) {
      this.configs.set(config.id, config);
    }
  }

  // Spawn a vehicle
  spawnVehicle(configId: string, position: Vector3, rotation?: Quaternion): Vehicle | null {
    const config = this.configs.get(configId);
    if (!config) return null;

    const vehicle: Vehicle = {
      id: `vehicle_${this.nextVehicleId++}`,
      config,
      position: { ...position },
      rotation: rotation || { x: 0, y: 0, z: 0, w: 1 },
      velocity: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
      health: config.health,
      fuel: 100,
      damage: {
        engine: 0,
        body: 0,
        wheels: [0, 0, 0, 0],
        windows: [false, false, false, false, false, false],
        doors: [false, false, false, false]
      },
      state: 'parked',
      driver: null,
      passengers: [],
      locked: false,
      alarm: false,
      lights: false,
      engine: false
    };

    this.vehicles.set(vehicle.id, vehicle);
    return vehicle;
  }

  // Get vehicle by ID
  getVehicle(id: string): Vehicle | undefined {
    return this.vehicles.get(id);
  }

  // Get all vehicles
  getAllVehicles(): Vehicle[] {
    return Array.from(this.vehicles.values());
  }

  // Enter vehicle
  enterVehicle(vehicleId: string, entityId: string, asSeat: number = 0): { success: boolean; timeMs: number } {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return { success: false, timeMs: 0 };
    if (vehicle.locked) return { success: false, timeMs: 0 };
    if (vehicle.state === 'destroyed') return { success: false, timeMs: 0 };

    if (asSeat === 0) {
      // Driver seat
      if (vehicle.driver) return { success: false, timeMs: 0 };
      vehicle.driver = entityId;
      vehicle.state = 'idle';
    } else {
      // Passenger seat
      if (asSeat > vehicle.config.seats) return { success: false, timeMs: 0 };
      if (vehicle.passengers.length >= vehicle.config.seats - 1) return { success: false, timeMs: 0 };
      vehicle.passengers.push(entityId);
    }

    return { success: true, timeMs: this.ENTRY_TIME_MS };
  }

  // Exit vehicle
  exitVehicle(vehicleId: string, entityId: string): { success: boolean; timeMs: number; applyRagdoll: boolean } {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return { success: false, timeMs: 0, applyRagdoll: false };

    const speed = this.getSpeed(vehicle);
    const applyRagdoll = speed > 20; // Ragdoll if moving fast

    if (vehicle.driver === entityId) {
      vehicle.driver = null;
      if (vehicle.passengers.length === 0) {
        vehicle.state = 'parked';
        vehicle.engine = false;
      }
    } else {
      const idx = vehicle.passengers.indexOf(entityId);
      if (idx >= 0) {
        vehicle.passengers.splice(idx, 1);
      }
    }

    return { success: true, timeMs: applyRagdoll ? 0 : this.EXIT_TIME_MS, applyRagdoll };
  }

  // Start/stop engine
  toggleEngine(vehicleId: string): boolean {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle || !vehicle.driver) return false;
    if (vehicle.state === 'destroyed') return false;
    if (vehicle.damage.engine >= 100) return false;

    vehicle.engine = !vehicle.engine;
    vehicle.state = vehicle.engine ? 'idle' : 'parked';
    return vehicle.engine;
  }

  // Apply throttle (0-1)
  accelerate(vehicleId: string, throttle: number): void {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle || !vehicle.engine || !vehicle.driver) return;
    if (vehicle.state === 'destroyed') return;

    throttle = Math.max(0, Math.min(1, throttle));

    // Calculate acceleration based on engine power and damage
    const engineEfficiency = 1 - (vehicle.damage.engine / 100) * 0.8;
    const powerToWeight = (vehicle.config.enginePower * 745.7) / vehicle.config.mass; // Convert HP to watts
    const acceleration = powerToWeight * throttle * engineEfficiency * 0.01;

    // Get forward direction from rotation
    const forward = this.getForwardVector(vehicle.rotation);

    // Apply acceleration
    vehicle.velocity.x += forward.x * acceleration;
    vehicle.velocity.y += forward.y * acceleration;
    vehicle.velocity.z += forward.z * acceleration;

    // Clamp to max speed
    const maxSpeedMs = (vehicle.config.maxSpeed / 3.6) * engineEfficiency;
    const currentSpeed = this.getSpeed(vehicle);
    if (currentSpeed > maxSpeedMs) {
      const scale = maxSpeedMs / currentSpeed;
      vehicle.velocity.x *= scale;
      vehicle.velocity.y *= scale;
      vehicle.velocity.z *= scale;
    }

    vehicle.state = 'driving';
  }

  // Apply brakes (0-1)
  brake(vehicleId: string, force: number): void {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return;

    force = Math.max(0, Math.min(1, force));
    const brakeEfficiency = vehicle.config.brakeForce * (1 - this.getAverageWheelDamage(vehicle) * 0.5);
    const deceleration = force * brakeEfficiency * 20; // m/s^2

    const speed = this.getSpeed(vehicle);
    if (speed > 0) {
      const reduction = Math.min(speed, deceleration * 0.016); // Assuming 60fps
      const scale = (speed - reduction) / speed;
      vehicle.velocity.x *= scale;
      vehicle.velocity.y *= scale;
      vehicle.velocity.z *= scale;
    }
  }

  // Steer (-1 to 1, negative = left)
  steer(vehicleId: string, angle: number): void {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle || !vehicle.engine) return;

    angle = Math.max(-1, Math.min(1, angle));
    const speed = this.getSpeed(vehicle);
    
    // Ackermann steering - turn rate decreases at high speed
    const turnRate = vehicle.config.handling * (1 - speed / (vehicle.config.maxSpeed / 3.6) * 0.5);
    const angularChange = angle * turnRate * 0.05;

    // Apply rotation around Y axis
    vehicle.angularVelocity.y = angularChange * speed * 0.1;
  }

  // Update physics
  updatePhysics(vehicleId: string, deltaTime: number): void {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle || vehicle.state === 'destroyed') return;

    // Apply air resistance
    const speed = this.getSpeed(vehicle);
    if (speed > 0) {
      const dragForce = this.AIR_RESISTANCE * speed * speed / vehicle.config.mass;
      const dragDecel = dragForce * deltaTime;
      const scale = Math.max(0, (speed - dragDecel) / speed);
      vehicle.velocity.x *= scale;
      vehicle.velocity.y *= scale;
      vehicle.velocity.z *= scale;
    }

    // Apply rolling resistance
    if (speed > 0 && vehicle.config.type !== 'helicopter' && vehicle.config.type !== 'boat') {
      const rollingDecel = this.ROLLING_RESISTANCE * this.GRAVITY * deltaTime;
      const scale = Math.max(0, (speed - rollingDecel) / speed);
      vehicle.velocity.x *= scale;
      vehicle.velocity.y *= scale;
      vehicle.velocity.z *= scale;
    }

    // Update position
    vehicle.position.x += vehicle.velocity.x * deltaTime;
    vehicle.position.y += vehicle.velocity.y * deltaTime;
    vehicle.position.z += vehicle.velocity.z * deltaTime;

    // Update rotation from angular velocity
    this.applyAngularVelocity(vehicle, deltaTime);

    // Decay angular velocity
    vehicle.angularVelocity.x *= 0.95;
    vehicle.angularVelocity.y *= 0.95;
    vehicle.angularVelocity.z *= 0.95;

    // Fuel consumption
    if (vehicle.engine && speed > 0) {
      vehicle.fuel -= deltaTime * 0.01 * (speed / 50);
      if (vehicle.fuel <= 0) {
        vehicle.fuel = 0;
        vehicle.engine = false;
        vehicle.state = 'parked';
      }
    }

    // Update state
    if (vehicle.engine && speed > 1) {
      vehicle.state = 'driving';
    } else if (vehicle.engine) {
      vehicle.state = 'idle';
    }
  }

  // Apply collision damage
  applyCollision(vehicleId: string, collision: CollisionData): void {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return;

    const damage = collision.impactForce / 10;

    // Health damage
    vehicle.health -= damage;
    if (vehicle.health <= 0) {
      vehicle.health = 0;
      this.explode(vehicleId);
      return;
    }

    // Component damage based on impact point
    vehicle.damage.body += damage * 0.5;
    vehicle.damage.body = Math.min(100, vehicle.damage.body);

    // Engine damage if front impact
    if (collision.impactNormal.z > 0.5) {
      vehicle.damage.engine += damage * 0.3;
      vehicle.damage.engine = Math.min(100, vehicle.damage.engine);
    }

    // Wheel damage
    const wheelIndex = this.getClosestWheel(vehicle, collision.impactPoint);
    if (wheelIndex >= 0) {
      vehicle.damage.wheels[wheelIndex] += damage * 0.4;
      vehicle.damage.wheels[wheelIndex] = Math.min(100, vehicle.damage.wheels[wheelIndex]);
    }

    // Window break chance
    if (damage > 20) {
      const windowIndex = Math.floor(Math.random() * vehicle.damage.windows.length);
      vehicle.damage.windows[windowIndex] = true;
    }

    // Apply impact to velocity
    const impactVelocity = collision.impactForce / vehicle.config.mass;
    vehicle.velocity.x += collision.impactNormal.x * impactVelocity;
    vehicle.velocity.y += collision.impactNormal.y * impactVelocity;
    vehicle.velocity.z += collision.impactNormal.z * impactVelocity;

    if (vehicle.damage.body > 50 || vehicle.damage.engine > 50) {
      vehicle.state = 'damaged';
    }
  }

  // Explode vehicle
  explode(vehicleId: string): { position: Vector3; radius: number; damage: number } | null {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return null;

    vehicle.state = 'destroyed';
    vehicle.engine = false;
    vehicle.health = 0;
    vehicle.damage.engine = 100;
    vehicle.damage.body = 100;

    // Eject occupants
    const ejectedEntities = [vehicle.driver, ...vehicle.passengers].filter(Boolean);
    vehicle.driver = null;
    vehicle.passengers = [];

    return {
      position: { ...vehicle.position },
      radius: 10,
      damage: 300
    };
  }

  // Repair vehicle
  repair(vehicleId: string, amount: number = 100): void {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle || vehicle.state === 'destroyed') return;

    vehicle.health = Math.min(vehicle.config.health, vehicle.health + amount);
    vehicle.damage.engine = Math.max(0, vehicle.damage.engine - amount);
    vehicle.damage.body = Math.max(0, vehicle.damage.body - amount);
    
    for (let i = 0; i < vehicle.damage.wheels.length; i++) {
      vehicle.damage.wheels[i] = Math.max(0, vehicle.damage.wheels[i] - amount);
    }

    if (vehicle.damage.body < 50 && vehicle.damage.engine < 50) {
      vehicle.state = vehicle.engine ? 'idle' : 'parked';
    }
  }

  // Refuel
  refuel(vehicleId: string, amount: number = 100): void {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return;
    vehicle.fuel = Math.min(100, vehicle.fuel + amount);
  }

  // Helper methods
  private getSpeed(vehicle: Vehicle): number {
    return Math.sqrt(
      vehicle.velocity.x ** 2 +
      vehicle.velocity.y ** 2 +
      vehicle.velocity.z ** 2
    );
  }

  getSpeedKmh(vehicleId: string): number {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return 0;
    return this.getSpeed(vehicle) * 3.6;
  }

  private getForwardVector(rotation: Quaternion): Vector3 {
    // Simplified - assumes Y-up coordinate system
    const sinY = 2 * (rotation.w * rotation.y + rotation.x * rotation.z);
    const cosY = 1 - 2 * (rotation.y ** 2 + rotation.z ** 2);
    return { x: sinY, y: 0, z: cosY };
  }

  private applyAngularVelocity(vehicle: Vehicle, deltaTime: number): void {
    // Simplified rotation update
    const angle = vehicle.angularVelocity.y * deltaTime;
    const cos = Math.cos(angle / 2);
    const sin = Math.sin(angle / 2);
    
    const newW = vehicle.rotation.w * cos - vehicle.rotation.y * sin;
    const newY = vehicle.rotation.w * sin + vehicle.rotation.y * cos;
    
    vehicle.rotation.w = newW;
    vehicle.rotation.y = newY;
    
    // Normalize quaternion
    const mag = Math.sqrt(
      vehicle.rotation.x ** 2 +
      vehicle.rotation.y ** 2 +
      vehicle.rotation.z ** 2 +
      vehicle.rotation.w ** 2
    );
    vehicle.rotation.x /= mag;
    vehicle.rotation.y /= mag;
    vehicle.rotation.z /= mag;
    vehicle.rotation.w /= mag;
  }

  private getAverageWheelDamage(vehicle: Vehicle): number {
    return vehicle.damage.wheels.reduce((a, b) => a + b, 0) / vehicle.damage.wheels.length / 100;
  }

  private getClosestWheel(vehicle: Vehicle, point: Vector3): number {
    // Simplified - return random wheel for now
    return Math.floor(Math.random() * 4);
  }

  // Serialize
  serialize(): object {
    return {
      vehicles: Array.from(this.vehicles.entries()).map(([id, v]) => ({
        id,
        configId: v.config.id,
        position: v.position,
        rotation: v.rotation,
        velocity: v.velocity,
        health: v.health,
        fuel: v.fuel,
        damage: v.damage,
        state: v.state,
        driver: v.driver,
        passengers: v.passengers,
        locked: v.locked,
        engine: v.engine
      })),
      nextVehicleId: this.nextVehicleId
    };
  }

  // Deserialize
  static deserialize(data: any): VehicleSystemGTA {
    const system = new VehicleSystemGTA();
    system.nextVehicleId = data.nextVehicleId || 1;
    
    for (const vData of data.vehicles || []) {
      const config = system.configs.get(vData.configId);
      if (!config) continue;
      
      const vehicle: Vehicle = {
        id: vData.id,
        config,
        position: vData.position,
        rotation: vData.rotation,
        velocity: vData.velocity || { x: 0, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 },
        health: vData.health,
        fuel: vData.fuel,
        damage: vData.damage,
        state: vData.state,
        driver: vData.driver,
        passengers: vData.passengers || [],
        locked: vData.locked || false,
        alarm: false,
        lights: false,
        engine: vData.engine || false
      };
      
      system.vehicles.set(vehicle.id, vehicle);
    }
    
    return system;
  }
}

export default VehicleSystemGTA;
