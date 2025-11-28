#!/usr/bin/env ts-node
/**
 * Database Initialization Script
 * Run: npx ts-node scripts/initDatabase.ts
 */

import { checkConnection, initializeSchema } from '../src/db/neonClient';

async function main() {
  console.log('🎮 SURVIVING THE WORLD™ - Database Setup');
  console.log('=========================================\n');

  // Check connection
  console.log('📡 Checking database connection...');
  const status = await checkConnection();
  
  if (!status.connected) {
    console.error('❌ ' + status.message);
    console.log('\n📋 Setup Instructions:');
    console.log('1. Go to https://console.neon.tech');
    console.log('2. Create a new project');
    console.log('3. Create database "surviving_the_world"');
    console.log('4. Copy connection string');
    console.log('5. Create .env file with: NEON_DATABASE_URL=your_connection_string');
    process.exit(1);
  }

  console.log('✅ ' + status.message);

  // Initialize schema
  console.log('\n🗄️ Initializing database schema...');
  await initializeSchema();

  console.log('\n🎉 Database setup complete!');
  console.log('\nTables created:');
  console.log('  - players');
  console.log('  - game_saves');
  console.log('  - player_stats');
  console.log('  - leaderboards');
  console.log('  - telemetry_events');
}

main().catch(console.error);
