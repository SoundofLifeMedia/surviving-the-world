import { MovementSystem } from '../src/systems/MovementSystem';
import { PerceptionLayer } from '../src/ai/PerceptionLayer';

describe('Stealth and Perception Coupling', () => {
  test('Movement noise increases with speed and sprint', () => {
    const movement = new MovementSystem();
    movement.registerEntity('p1', { x: 0, y: 0, z: 0 });

    const idle = movement.update(
      'p1',
      {
        moveDirection: { x: 0, y: 0 },
        lookDirection: { x: 0, y: 1 },
        sprint: false,
        crouch: false,
        prone: false,
        slide: false,
        vault: false,
        dive: false,
        leanLeft: false,
        leanRight: false,
        aim: false
      },
      100,
      0
    );

    const sprinting = movement.update(
      'p1',
      {
        moveDirection: { x: 1, y: 0 },
        lookDirection: { x: 1, y: 0 },
        sprint: true,
        crouch: false,
        prone: false,
        slide: false,
        vault: false,
        dive: false,
        leanLeft: false,
        leanRight: false,
        aim: false
      },
      100,
      1
    );

    expect(sprinting.noiseLevel).toBeGreaterThan(idle.noiseLevel);
    expect(sprinting.noiseLevel).toBeGreaterThan(0.15);
    expect(sprinting.noiseLevel).toBeLessThanOrEqual(1);
  });

  test('Higher player noise raises detection probability', () => {
    const perception = new PerceptionLayer();
    perception.initializePerception('e1');
    perception.updatePerception('e1', {
      weather: 'clear',
      timeOfDay: 12,
      lighting: 1,
      playerNoise: 0.1,
      playerStance: 'crouching'
    });

    const lowNoise = perception.calculateDetectionProbability(
      'e1',
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 0, z: 0 },
      {
        weather: 'clear',
        timeOfDay: 12,
        lighting: 1,
        playerNoise: 0.1,
        playerStance: 'crouching'
      }
    );

    const highNoise = perception.calculateDetectionProbability(
      'e1',
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 0, z: 0 },
      {
        weather: 'clear',
        timeOfDay: 12,
        lighting: 1,
        playerNoise: 0.9,
        playerStance: 'crouching'
      }
    );

    expect(highNoise).toBeGreaterThan(lowNoise);
    expect(highNoise).toBeLessThanOrEqual(1);
    expect(lowNoise).toBeGreaterThanOrEqual(0);
  });

  test('Prone stance reduces hearing radius compared to standing', () => {
    const perception = new PerceptionLayer();
    perception.initializePerception('e_stand');
    perception.initializePerception('e_prone');

    const standing = perception.updatePerception('e_stand', {
      weather: 'clear',
      timeOfDay: 12,
      lighting: 1,
      playerNoise: 0.2,
      playerStance: 'standing'
    });

    const prone = perception.updatePerception('e_prone', {
      weather: 'clear',
      timeOfDay: 12,
      lighting: 1,
      playerNoise: 0.2,
      playerStance: 'prone'
    });

    expect(prone.hearingRadius).toBeLessThan(standing.hearingRadius);
    expect(prone.hearingRadius).toBeGreaterThan(0);
  });
});
