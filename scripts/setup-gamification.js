#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🎮 Setting up gamification system demo...\n');

try {
  // Install dependencies if not already installed
  console.log('📦 Checking dependencies...');
  
  // Check if node_modules exists
  const fs = require('fs');
  if (!fs.existsSync('node_modules')) {
    console.log('Installing dependencies...');
    execSync('npm install --no-optional', { stdio: 'inherit' });
  }

  console.log('✅ Dependencies ready');

  // Create database migration for gamification tables
  console.log('\n🗄️ Generating database migration for gamification...');
  
  // Note: This would normally run drizzle generate
  console.log('⚠️  Please run the following command to generate the database migration:');
  console.log('   npm run db:generate');
  console.log('   npm run db:migrate');
  
  console.log('\n🌱 To seed initial gamification data, run:');
  console.log('   npx tsx scripts/gamification/seed-gamification.ts');

  console.log('\n🎯 Gamification Features Available:');
  console.log('   • XP and Level System - Users gain XP and level up');
  console.log('   • Achievement System - Badges for milestones');
  console.log('   • Weekly Challenges - Gamified goals');
  console.log('   • Leaderboards - Community rankings');
  console.log('   • Virtual Rewards - Unlockable customizations');
  console.log('   • Progress Tracking - Enhanced analytics');

  console.log('\n📍 New Routes Added:');
  console.log('   • /dashboard/progress-gamified - Full gamified dashboard');
  console.log('   • /api/gamification/points - Points and XP management');
  console.log('   • /api/gamification/achievements - Achievement system');
  console.log('   • /api/gamification/challenges - Weekly challenges');
  console.log('   • /api/gamification/leaderboard - Community rankings');

  console.log('\n🔄 Automatic Point Awards:');
  console.log('   • Diary Entry: +10 pts, +15 XP');
  console.log('   • Meditation: +15 pts, +20 XP');
  console.log('   • Task Completion: +20 pts, +25 XP');
  console.log('   • Session Attendance: +25 pts, +30 XP');

  console.log('\n✨ Ready to go! The gamification system is now integrated.');
  console.log('   Run `npm run dev` to start the development server.');

} catch (error) {
  console.error('❌ Error setting up gamification:', error.message);
  process.exit(1);
}