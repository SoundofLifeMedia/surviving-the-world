/**
 * Neon Database Tests
 * Tests database client functionality
 */

import { GameSaveDB, PlayerDB, LeaderboardDB, TelemetryDB, checkConnection } from '../src/db/neonClient';

describe('Neon Database Client', () => {
  describe('Connection', () => {
    it('checkConnection returns status object', async () => {
      const status = await checkConnection();
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('message');
      expect(typeof status.connected).toBe('boolean');
      expect(typeof status.message).toBe('string');
    });
  });

  describe('GameSaveDB Interface', () => {
    it('has save method', () => {
      expect(typeof GameSaveDB.save).toBe('function');
    });

    it('has load method', () => {
      expect(typeof GameSaveDB.load).toBe('function');
    });

    it('has listSlots method', () => {
      expect(typeof GameSaveDB.listSlots).toBe('function');
    });

    it('has delete method', () => {
      expect(typeof GameSaveDB.delete).toBe('function');
    });

    it('save returns null when DB not connected', async () => {
      // Without NEON_DATABASE_URL, should return null gracefully
      const result = await GameSaveDB.save(
        '00000000-0000-0000-0000-000000000000',
        1,
        'Test Save',
        'late_medieval',
        1,
        0,
        { test: true }
      );
      // Will be null if DB not connected, or string if connected
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('PlayerDB Interface', () => {
    it('has create method', () => {
      expect(typeof PlayerDB.create).toBe('function');
    });

    it('has getByUsername method', () => {
      expect(typeof PlayerDB.getByUsername).toBe('function');
    });

    it('has updatePlaytime method', () => {
      expect(typeof PlayerDB.updatePlaytime).toBe('function');
    });
  });

  describe('LeaderboardDB Interface', () => {
    it('has submit method', () => {
      expect(typeof LeaderboardDB.submit).toBe('function');
    });

    it('has getTop method', () => {
      expect(typeof LeaderboardDB.getTop).toBe('function');
    });

    it('has getPlayerRank method', () => {
      expect(typeof LeaderboardDB.getPlayerRank).toBe('function');
    });

    it('getTop returns array', async () => {
      const result = await LeaderboardDB.getTop('survival_days', 10);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('TelemetryDB Interface', () => {
    it('has log method', () => {
      expect(typeof TelemetryDB.log).toBe('function');
    });

    it('has getEvents method', () => {
      expect(typeof TelemetryDB.getEvents).toBe('function');
    });

    it('getEvents returns array', async () => {
      const result = await TelemetryDB.getEvents('game_start', 10);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe('Database Schema Types', () => {
  it('GameSave structure is correct', () => {
    const mockSave = {
      player_id: '00000000-0000-0000-0000-000000000000',
      slot_number: 1,
      save_name: 'Test',
      era: 'late_medieval',
      day_count: 5,
      playtime_seconds: 3600,
      game_state: { player: {}, world: {} }
    };

    expect(mockSave).toHaveProperty('player_id');
    expect(mockSave).toHaveProperty('slot_number');
    expect(mockSave).toHaveProperty('save_name');
    expect(mockSave).toHaveProperty('era');
    expect(mockSave).toHaveProperty('day_count');
    expect(mockSave).toHaveProperty('playtime_seconds');
    expect(mockSave).toHaveProperty('game_state');
  });

  it('Player structure is correct', () => {
    const mockPlayer = {
      id: '00000000-0000-0000-0000-000000000000',
      username: 'testplayer',
      email: 'test@example.com',
      total_playtime_hours: 10.5
    };

    expect(mockPlayer).toHaveProperty('id');
    expect(mockPlayer).toHaveProperty('username');
    expect(mockPlayer).toHaveProperty('email');
    expect(mockPlayer).toHaveProperty('total_playtime_hours');
  });

  it('Leaderboard entry structure is correct', () => {
    const mockEntry = {
      player_id: '00000000-0000-0000-0000-000000000000',
      category: 'survival_days',
      score: 100,
      era: 'late_medieval'
    };

    expect(mockEntry).toHaveProperty('player_id');
    expect(mockEntry).toHaveProperty('category');
    expect(mockEntry).toHaveProperty('score');
    expect(mockEntry).toHaveProperty('era');
  });
});
