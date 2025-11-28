/**
 * Simulation Runner - 100 Users x 1000 Hours
 * Run with: npx ts-node tests/simulation/runSimulation.ts
 */

import { GameSimulation, SimulationResults, SimulationIssue } from './GameSimulation';

async function runSimulation() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     SURVIVING THE WORLD - MASS SIMULATION TEST               ║');
  console.log('║     100 Users x 1000 Hours                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const simulation = new GameSimulation({
    userCount: 100,
    hoursToSimulate: 1000,
    ticksPerHour: 4, // 4 ticks per hour = 15 min intervals
    randomSeed: 42,  // For reproducibility
    verboseLogging: false
  });

  const results = await simulation.run();
  
  printResults(results);
  
  return results;
}

function printResults(results: SimulationResults) {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    SIMULATION RESULTS                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  
  console.log('\n📊 OVERVIEW');
  console.log('─'.repeat(60));
  console.log(`  Total Users:           ${results.totalUsers}`);
  console.log(`  Hours Simulated:       ${results.totalHoursSimulated}`);
  console.log(`  Real Duration:         ${(results.duration / 1000).toFixed(2)}s`);
  console.log(`  Completed At:          ${results.completedAt.toISOString()}`);
  
  console.log('\n👤 PLAYER STATISTICS');
  console.log('─'.repeat(60));
  console.log(`  Total Deaths:          ${results.playerStats.totalDeaths}`);
  console.log(`  Total Kills:           ${results.playerStats.totalKills}`);
  console.log(`  Total Trades:          ${results.playerStats.totalTrades}`);
  console.log(`  Average Playtime:      ${results.playerStats.averagePlaytime.toFixed(1)} hours`);
  console.log(`  Survival Rate:         ${(results.playerStats.survivalRate * 100).toFixed(1)}%`);
  
  console.log('\n💀 DEATH CAUSES');
  console.log('─'.repeat(60));
  console.log(`  Starvation:            ${results.playerStats.deathsByStarvation}`);
  console.log(`  Dehydration:           ${results.playerStats.deathsByDehydration}`);
  console.log(`  Combat:                ${results.playerStats.deathsByCombat}`);
  console.log(`  Hypothermia:           ${results.playerStats.deathsByHypothermia}`);
  console.log(`  Infection:             ${results.playerStats.deathsByInfection}`);
  
  console.log('\n💰 ECONOMY STATISTICS');
  console.log('─'.repeat(60));
  console.log(`  Total Transactions:    ${results.economyStats.totalTransactions}`);
  console.log(`  Total Gold in Circ:    ${results.economyStats.totalGoldCirculated}`);
  console.log(`  Average Wealth:        ${results.economyStats.averagePlayerWealth.toFixed(1)}`);
  console.log(`  Wealth Min:            ${results.economyStats.wealthDistribution.min}`);
  console.log(`  Wealth Max:            ${results.economyStats.wealthDistribution.max}`);
  console.log(`  Wealth Median:         ${results.economyStats.wealthDistribution.median}`);
  
  console.log('\n⚔️  COMBAT STATISTICS');
  console.log('─'.repeat(60));
  console.log(`  Total Battles:         ${results.combatStats.totalBattles}`);
  console.log(`  Player Win Rate:       ${(results.combatStats.playerWinRate * 100).toFixed(1)}%`);
  console.log(`  Most Deadly Faction:   ${results.combatStats.mostDeadlyFaction}`);
  
  console.log('\n🏰 FACTION STATISTICS');
  console.log('─'.repeat(60));
  console.log(`  War Declarations:      ${results.factionStats.warDeclarations}`);
  console.log(`  Escalation Events:     ${results.factionStats.escalationEvents}`);
  console.log('  Average Heat Levels:');
  for (const [faction, heat] of results.factionStats.averageHeatLevel) {
    console.log(`    - ${faction}: ${heat.toFixed(1)}`);
  }
  
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    ISSUES FOUND                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  
  console.log('\n📋 ISSUES BY CATEGORY');
  console.log('─'.repeat(60));
  for (const [category, count] of results.issuesByCategory) {
    console.log(`  ${category}: ${count}`);
  }
  
  console.log(`\n  Total Issues: ${results.issues.length}`);
  console.log(`  Critical Issues: ${results.criticalIssues.length}`);
  
  if (results.criticalIssues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES');
    console.log('─'.repeat(60));
    const uniqueCritical = new Map<string, SimulationIssue>();
    for (const issue of results.criticalIssues) {
      if (!uniqueCritical.has(issue.description)) {
        uniqueCritical.set(issue.description, issue);
      }
    }
    for (const [desc, issue] of uniqueCritical) {
      console.log(`  [${issue.category}] ${desc}`);
      console.log(`    First occurrence: Hour ${issue.hour.toFixed(1)}, User: ${issue.userId}`);
      console.log(`    Context: ${JSON.stringify(issue.context)}`);
      console.log('');
    }
  }
  
  // Print major issues summary
  const majorIssues = results.issues.filter(i => i.severity === 'major');
  if (majorIssues.length > 0) {
    console.log('\n⚠️  MAJOR ISSUES (Sample)');
    console.log('─'.repeat(60));
    const uniqueMajor = new Map<string, { issue: SimulationIssue; count: number }>();
    for (const issue of majorIssues) {
      const existing = uniqueMajor.get(issue.description);
      if (existing) {
        existing.count++;
      } else {
        uniqueMajor.set(issue.description, { issue, count: 1 });
      }
    }
    for (const [desc, { issue, count }] of uniqueMajor) {
      console.log(`  [${issue.category}] ${desc} (${count} occurrences)`);
    }
  }
  
  // Print warnings summary
  const warnings = results.issues.filter(i => i.severity === 'warning');
  if (warnings.length > 0) {
    console.log('\n📝 WARNINGS (Sample)');
    console.log('─'.repeat(60));
    const uniqueWarnings = new Map<string, { issue: SimulationIssue; count: number }>();
    for (const issue of warnings) {
      const key = `${issue.category}:${issue.description.substring(0, 50)}`;
      const existing = uniqueWarnings.get(key);
      if (existing) {
        existing.count++;
      } else {
        uniqueWarnings.set(key, { issue, count: 1 });
      }
    }
    let shown = 0;
    for (const [_, { issue, count }] of uniqueWarnings) {
      if (shown++ >= 10) break;
      console.log(`  [${issue.category}] ${issue.description} (${count}x)`);
    }
  }
  
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    ANALYSIS & RECOMMENDATIONS                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  
  // Analyze and provide recommendations
  const recommendations: string[] = [];
  
  // Death analysis
  const totalDeaths = results.playerStats.totalDeaths;
  if (results.playerStats.deathsByStarvation > totalDeaths * 0.3) {
    recommendations.push('🍞 HIGH STARVATION RATE: Consider increasing food availability or reducing hunger decay rate');
  }
  if (results.playerStats.deathsByDehydration > totalDeaths * 0.3) {
    recommendations.push('💧 HIGH DEHYDRATION RATE: Consider increasing water availability or reducing thirst decay rate');
  }
  if (results.playerStats.deathsByCombat > totalDeaths * 0.5) {
    recommendations.push('⚔️  HIGH COMBAT DEATHS: Consider rebalancing combat difficulty or enemy spawn rates');
  }
  
  // Economy analysis
  if (results.economyStats.wealthDistribution.max > results.economyStats.wealthDistribution.median * 10) {
    recommendations.push('💰 WEALTH INEQUALITY: Large gap between rich and poor players - consider wealth redistribution mechanics');
  }
  
  // Combat analysis
  if (results.combatStats.playerWinRate < 0.3) {
    recommendations.push('🎯 LOW WIN RATE: Players winning less than 30% of battles - combat may be too difficult');
  } else if (results.combatStats.playerWinRate > 0.9) {
    recommendations.push('🎯 HIGH WIN RATE: Players winning over 90% of battles - combat may be too easy');
  }
  
  // Issue analysis
  if (results.criticalIssues.length > 0) {
    recommendations.push('🚨 CRITICAL BUGS: Fix critical issues immediately - they indicate game-breaking problems');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ No major balance issues detected');
  }
  
  console.log('\n');
  for (const rec of recommendations) {
    console.log(`  ${rec}`);
  }
  
  console.log('\n');
  console.log('═'.repeat(62));
  console.log('                    SIMULATION COMPLETE');
  console.log('═'.repeat(62));
  console.log('\n');
}

// Run the simulation
runSimulation().catch(console.error);
