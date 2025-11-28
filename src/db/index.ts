/**
 * Database Module - Surviving The World™
 * Exports all database functionality
 */

export {
  sql,
  checkConnection,
  initializeSchema,
  GameSaveDB,
  PlayerDB,
  LeaderboardDB,
  TelemetryDB
} from './neonClient';

// Re-export default
export { default as NeonDB } from './neonClient';
