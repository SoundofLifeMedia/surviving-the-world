/**
 * Neon Database Client
 * Serverless PostgreSQL connection for Surviving The World™
 * 
 * Setup:
 * 1. Create account at https://console.neon.tech
 * 2. Create database "surviving_the_world"
 * 3. Copy connection string to .env as NEON_DATABASE_URL
 */

import { neon, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Neon is configured with optimal defaults

// Connection string from environment
const DATABASE_URL = process.env.NEON_DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('⚠️ NEON_DATABASE_URL not set - database features disabled');
}

// Create SQL client
export const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

/**
 * Database connection status
 */
export async function checkConnection(): Promise<{ connected: boolean; message: string }> {
  if (!sql) {
    return { connected: false, message: 'Database URL not configured' };
  }
  
  try {
    const result = await sql`SELECT NOW() as time, current_database() as db`;
    return { 
      connected: true, 
      message: `Connected to ${result[0].db} at ${result[0].time}` 
    };
  } catch (error) {
    return { 
      connected: false, 
      message: `Connection failed: ${(error as Error).message}` 
    };
  }
}

/**
 * Initialize database schema
 */
export async function initializeSchema(): Promise<void> {
  if (!sql) {
    console.warn('⚠️ Cannot initialize schema - database not connected');
    return;
  }

  console.log('🗄️ Initializing Neon database schema...');

  // Players table
  await sql`
    CREATE TABLE IF NOT EXISTS players (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE,
      password_hash VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      last_login TIMESTAMP,
      total_playtime_hours DECIMAL(10,2) DEFAULT 0,
      settings JSONB DEFAULT '{}'
    )
  `;

  // Game saves table
  await sql`
    CREATE TABLE IF NOT EXISTS game_saves (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID REFERENCES players(id) ON DELETE CASCADE,
      slot_number INTEGER NOT NULL,
      save_name VARCHAR(100),
      era VARCHAR(50) NOT NULL,
      day_count INTEGER DEFAULT 1,
      playtime_seconds INTEGER DEFAULT 0,
      game_state JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(player_id, slot_number)
    )
  `;

  // Player stats/achievements
  await sql`
    CREATE TABLE IF NOT EXISTS player_stats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID REFERENCES players(id) ON DELETE CASCADE,
      stat_name VARCHAR(50) NOT NULL,
      stat_value DECIMAL(15,2) DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(player_id, stat_name)
    )
  `;

  // Leaderboards
  await sql`
    CREATE TABLE IF NOT EXISTS leaderboards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID REFERENCES players(id) ON DELETE CASCADE,
      category VARCHAR(50) NOT NULL,
      score DECIMAL(15,2) NOT NULL,
      era VARCHAR(50),
      achieved_at TIMESTAMP DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'
    )
  `;

  // Telemetry events
  await sql`
    CREATE TABLE IF NOT EXISTS telemetry_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID REFERENCES players(id) ON DELETE SET NULL,
      event_type VARCHAR(100) NOT NULL,
      event_data JSONB NOT NULL,
      session_id VARCHAR(100),
      timestamp TIMESTAMP DEFAULT NOW()
    )
  `;

  // Create indexes for performance
  await sql`CREATE INDEX IF NOT EXISTS idx_saves_player ON game_saves(player_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_stats_player ON player_stats(player_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_leaderboards_category ON leaderboards(category, score DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_telemetry_type ON telemetry_events(event_type, timestamp)`;

  console.log('✅ Database schema initialized');
}

/**
 * Database operations for game saves
 */
export const GameSaveDB = {
  async save(playerId: string, slot: number, saveName: string, era: string, dayCount: number, playtimeSeconds: number, gameState: object): Promise<string | null> {
    if (!sql) return null;
    
    const result = await sql`
      INSERT INTO game_saves (player_id, slot_number, save_name, era, day_count, playtime_seconds, game_state)
      VALUES (${playerId}::uuid, ${slot}, ${saveName}, ${era}, ${dayCount}, ${playtimeSeconds}, ${JSON.stringify(gameState)}::jsonb)
      ON CONFLICT (player_id, slot_number) 
      DO UPDATE SET 
        save_name = EXCLUDED.save_name,
        era = EXCLUDED.era,
        day_count = EXCLUDED.day_count,
        playtime_seconds = EXCLUDED.playtime_seconds,
        game_state = EXCLUDED.game_state,
        updated_at = NOW()
      RETURNING id
    `;
    return result[0]?.id || null;
  },

  async load(playerId: string, slot: number): Promise<object | null> {
    if (!sql) return null;
    
    const result = await sql`
      SELECT game_state, era, day_count, playtime_seconds, save_name, updated_at
      FROM game_saves 
      WHERE player_id = ${playerId}::uuid AND slot_number = ${slot}
    `;
    return result[0] || null;
  },

  async listSlots(playerId: string): Promise<object[]> {
    if (!sql) return [];
    
    return await sql`
      SELECT slot_number, save_name, era, day_count, playtime_seconds, updated_at
      FROM game_saves 
      WHERE player_id = ${playerId}::uuid
      ORDER BY slot_number
    `;
  },

  async delete(playerId: string, slot: number): Promise<boolean> {
    if (!sql) return false;
    
    const result = await sql`
      DELETE FROM game_saves 
      WHERE player_id = ${playerId}::uuid AND slot_number = ${slot}
      RETURNING id
    `;
    return result.length > 0;
  }
};

/**
 * Database operations for players
 */
export const PlayerDB = {
  async create(username: string, email?: string): Promise<string | null> {
    if (!sql) return null;
    
    const result = await sql`
      INSERT INTO players (username, email)
      VALUES (${username}, ${email || null})
      RETURNING id
    `;
    return result[0]?.id || null;
  },

  async getByUsername(username: string): Promise<object | null> {
    if (!sql) return null;
    
    const result = await sql`
      SELECT id, username, email, created_at, last_login, total_playtime_hours
      FROM players WHERE username = ${username}
    `;
    return result[0] || null;
  },

  async updatePlaytime(playerId: string, hours: number): Promise<void> {
    if (!sql) return;
    
    await sql`
      UPDATE players 
      SET total_playtime_hours = total_playtime_hours + ${hours},
          last_login = NOW()
      WHERE id = ${playerId}::uuid
    `;
  }
};

/**
 * Database operations for leaderboards
 */
export const LeaderboardDB = {
  async submit(playerId: string, category: string, score: number, era?: string, metadata?: object): Promise<void> {
    if (!sql) return;
    
    await sql`
      INSERT INTO leaderboards (player_id, category, score, era, metadata)
      VALUES (${playerId}::uuid, ${category}, ${score}, ${era || null}, ${JSON.stringify(metadata || {})}::jsonb)
    `;
  },

  async getTop(category: string, limit: number = 10): Promise<object[]> {
    if (!sql) return [];
    
    return await sql`
      SELECT l.score, l.era, l.achieved_at, p.username
      FROM leaderboards l
      JOIN players p ON l.player_id = p.id
      WHERE l.category = ${category}
      ORDER BY l.score DESC
      LIMIT ${limit}
    `;
  },

  async getPlayerRank(playerId: string, category: string): Promise<number | null> {
    if (!sql) return null;
    
    const result = await sql`
      SELECT COUNT(*) + 1 as rank
      FROM leaderboards
      WHERE category = ${category}
      AND score > (
        SELECT MAX(score) FROM leaderboards 
        WHERE player_id = ${playerId}::uuid AND category = ${category}
      )
    `;
    return result[0]?.rank || null;
  }
};

/**
 * Database operations for telemetry
 */
export const TelemetryDB = {
  async log(eventType: string, eventData: object, playerId?: string, sessionId?: string): Promise<void> {
    if (!sql) return;
    
    await sql`
      INSERT INTO telemetry_events (player_id, event_type, event_data, session_id)
      VALUES (${playerId ? `${playerId}::uuid` : null}, ${eventType}, ${JSON.stringify(eventData)}::jsonb, ${sessionId || null})
    `;
  },

  async getEvents(eventType: string, limit: number = 100): Promise<object[]> {
    if (!sql) return [];
    
    return await sql`
      SELECT * FROM telemetry_events
      WHERE event_type = ${eventType}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;
  }
};

// Export everything
export default {
  sql,
  checkConnection,
  initializeSchema,
  GameSaveDB,
  PlayerDB,
  LeaderboardDB,
  TelemetryDB
};
