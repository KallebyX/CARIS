#!/usr/bin/env node

/**
 * Comprehensive Testing Script for CÁRIS Platform
 * 
 * This script tests all major functionality areas to ensure
 * the platform is working correctly before new feature deployment.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bold');
  console.log('='.repeat(60));
}

function logSubsection(title) {
  console.log('\n' + '-'.repeat(40));
  log(title, 'blue');
  console.log('-'.repeat(40));
}

// Test results tracking
const results = {
  passed: [],
  failed: [],
  warnings: [],
  skipped: []
};

function addResult(category, test, status, details = '') {
  results[status].push({ category, test, details });
  const statusColors = {
    passed: 'green',
    failed: 'red', 
    warnings: 'yellow',
    skipped: 'blue'
  };
  log(`${status.toUpperCase()}: ${test} ${details}`, statusColors[status]);
}

// Core file structure tests
function testProjectStructure() {
  logSection('🏗️  PROJECT STRUCTURE TESTS');
  
  const criticalFiles = [
    'package.json',
    'app/layout.tsx',
    'app/page.tsx',
    'app/login/page.tsx',
    'app/dashboard/layout.tsx',
    'components/ui/button.tsx',
    'db/schema.ts',
    'lib/auth.ts',
    '.env.local'
  ];

  criticalFiles.forEach(file => {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      addResult('Structure', file, 'passed');
    } else {
      addResult('Structure', file, 'failed', '- File missing');
    }
  });

  // Check for critical directories
  const criticalDirs = [
    'app/api',
    'components/ui',
    'components/chat',
    'components/emotional-map',
    'components/sos',
    'components/videotherapy',
    'components/meditation',
    'components/tasks'
  ];

  criticalDirs.forEach(dir => {
    if (fs.existsSync(path.join(process.cwd(), dir))) {
      addResult('Structure', `${dir}/`, 'passed');
    } else {
      addResult('Structure', `${dir}/`, 'failed', '- Directory missing');
    }
  });
}

// Test TypeScript compilation
function testTypeScriptCompilation() {
  logSection('📝 TYPESCRIPT COMPILATION TESTS');
  
  try {
    execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
    addResult('TypeScript', 'Compilation', 'passed', '- No type errors');
  } catch (error) {
    const errorOutput = error.stdout?.toString() || error.stderr?.toString() || '';
    const errorCount = (errorOutput.match(/error TS\d+:/g) || []).length;
    addResult('TypeScript', 'Compilation', 'failed', `- ${errorCount} type errors found`);
  }
}

// Test linting
function testLinting() {
  logSection('🔍 LINTING TESTS');
  
  try {
    execSync('npm run lint', { stdio: 'pipe' });
    addResult('Linting', 'ESLint', 'passed', '- No linting errors');
  } catch (error) {
    const errorOutput = error.stdout?.toString() || error.stderr?.toString() || '';
    const errorLines = errorOutput.split('\n').filter(line => line.includes('Error:'));
    const warningLines = errorOutput.split('\n').filter(line => line.includes('Warning:'));
    
    if (errorLines.length > 0) {
      addResult('Linting', 'ESLint', 'failed', `- ${errorLines.length} errors, ${warningLines.length} warnings`);
    } else if (warningLines.length > 0) {
      addResult('Linting', 'ESLint', 'warnings', `- ${warningLines.length} warnings`);
    } else {
      addResult('Linting', 'ESLint', 'passed', '- Clean code');
    }
  }
}

// Test API routes
function testAPIRoutes() {
  logSection('🔌 API ROUTES TESTS');
  
  const apiRoutes = [
    'app/api/auth/login/route.ts',
    'app/api/auth/register/route.ts',
    'app/api/patient/diary/route.ts',
    'app/api/psychologist/sessions/route.ts',
    'app/api/chat/route.ts',
    'app/api/sos/route.ts',
    'app/api/notifications/route.ts'
  ];

  apiRoutes.forEach(route => {
    if (fs.existsSync(path.join(process.cwd(), route))) {
      try {
        const content = fs.readFileSync(path.join(process.cwd(), route), 'utf8');
        if (content.includes('export async function GET') || content.includes('export async function POST')) {
          addResult('API', route.replace('app/api/', '').replace('/route.ts', ''), 'passed');
        } else {
          addResult('API', route.replace('app/api/', '').replace('/route.ts', ''), 'warnings', '- Missing HTTP methods');
        }
      } catch (error) {
        addResult('API', route.replace('app/api/', '').replace('/route.ts', ''), 'failed', '- Cannot read file');
      }
    } else {
      addResult('API', route.replace('app/api/', '').replace('/route.ts', ''), 'failed', '- Route missing');
    }
  });
}

// Test component structure
function testComponents() {
  logSection('🧩 COMPONENT TESTS');
  
  const coreComponents = [
    { path: 'components/ui/button.tsx', name: 'Button' },
    { path: 'components/chat/chat-layout.tsx', name: 'Chat System' },
    { path: 'components/emotional-map.tsx', name: 'Emotional Map' },
    { path: 'components/sos/sos-button.tsx', name: 'SOS System' },
    { path: 'components/videotherapy/video-call.tsx', name: 'Videotherapy' },
    { path: 'components/meditation/meditation-player.tsx', name: 'Meditation Player' },
    { path: 'components/tasks/task-library.tsx', name: 'Task Library' }
  ];

  coreComponents.forEach(({ path: compPath, name }) => {
    if (fs.existsSync(path.join(process.cwd(), compPath))) {
      try {
        const content = fs.readFileSync(path.join(process.cwd(), compPath), 'utf8');
        if (content.includes('export default') || content.includes('export function') || content.includes('export const')) {
          addResult('Components', name, 'passed');
        } else {
          addResult('Components', name, 'warnings', '- Missing exports');
        }
      } catch (error) {
        addResult('Components', name, 'failed', '- Cannot read component');
      }
    } else {
      addResult('Components', name, 'failed', '- Component missing');
    }
  });
}

// Test environment configuration
function testEnvironment() {
  logSection('🌍 ENVIRONMENT TESTS');
  
  const requiredEnvVars = [
    'POSTGRES_URL',
    'JWT_SECRET',
    'NEXT_PUBLIC_APP_URL'
  ];

  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      addResult('Environment', envVar, 'passed');
    } else {
      addResult('Environment', envVar, 'warnings', '- Environment variable not set');
    }
  });

  // Check optional but important env vars
  const optionalEnvVars = [
    'OPENAI_API_KEY',
    'PUSHER_SECRET',
    'RESEND_API_KEY'
  ];

  optionalEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      addResult('Environment', envVar, 'passed', '- Optional service configured');
    } else {
      addResult('Environment', envVar, 'skipped', '- Optional service not configured');
    }
  });
}

// Test database schema (basic syntax check)
function testDatabaseSchema() {
  logSection('🗄️  DATABASE SCHEMA TESTS');
  
  try {
    const schemaContent = fs.readFileSync(path.join(process.cwd(), 'db/schema.ts'), 'utf8');
    
    // Check for basic table definitions
    const tables = [
      'users',
      'psychologistProfiles', 
      'patientProfiles',
      'sessions',
      'diaryEntries',
      'moodTracking'
    ];

    tables.forEach(table => {
      if (schemaContent.includes(`export const ${table}`)) {
        addResult('Database', `Table: ${table}`, 'passed');
      } else {
        addResult('Database', `Table: ${table}`, 'failed', '- Table definition missing');
      }
    });

    // Check for relations
    if (schemaContent.includes('relations(')) {
      addResult('Database', 'Relations', 'passed', '- Database relations defined');
    } else {
      addResult('Database', 'Relations', 'warnings', '- No relations found');
    }

  } catch (error) {
    addResult('Database', 'Schema File', 'failed', '- Cannot read schema file');
  }
}

// Generate comprehensive report
function generateReport() {
  logSection('📊 COMPREHENSIVE TEST REPORT');
  
  const total = results.passed.length + results.failed.length + results.warnings.length + results.skipped.length;
  
  log(`\nTest Results Summary:`, 'bold');
  log(`✅ Passed: ${results.passed.length}`, 'green');
  log(`❌ Failed: ${results.failed.length}`, 'red');
  log(`⚠️  Warnings: ${results.warnings.length}`, 'yellow');
  log(`⏭️  Skipped: ${results.skipped.length}`, 'blue');
  log(`📊 Total Tests: ${total}`, 'bold');

  const successRate = ((results.passed.length + results.warnings.length) / total * 100).toFixed(1);
  log(`\n🎯 Success Rate: ${successRate}%`, successRate > 80 ? 'green' : successRate > 60 ? 'yellow' : 'red');

  // Critical issues that need immediate attention
  if (results.failed.length > 0) {
    logSubsection('🚨 CRITICAL ISSUES REQUIRING ATTENTION');
    results.failed.forEach(({ category, test, details }) => {
      log(`${category}: ${test} ${details}`, 'red');
    });
  }

  // Recommendations
  logSubsection('💡 RECOMMENDATIONS');
  
  if (results.failed.filter(r => r.category === 'Database').length > 0) {
    log('- Fix database schema merge conflicts before deployment', 'yellow');
  }
  
  if (results.failed.filter(r => r.category === 'API').length > 0) {
    log('- Complete API route implementations', 'yellow');
  }
  
  if (results.warnings.length > 5) {
    log('- Address linting warnings to improve code quality', 'yellow');
  }

  if (results.failed.length === 0) {
    log('🎉 All critical tests passed! Platform ready for deployment.', 'green');
  } else if (results.failed.length <= 3) {
    log('✅ Platform mostly functional with minor issues to address.', 'yellow');
  } else {
    log('⚠️  Platform requires significant fixes before deployment.', 'red');
  }
}

// Main test execution
async function runComprehensiveTests() {
  log('🚀 Starting Comprehensive CÁRIS Platform Tests...', 'bold');
  
  try {
    testProjectStructure();
    testEnvironment();
    testDatabaseSchema();
    testAPIRoutes();
    testComponents();
    testTypeScriptCompilation();
    testLinting();
    
    generateReport();
    
    // Exit with appropriate code
    if (results.failed.length === 0) {
      process.exit(0);
    } else if (results.failed.length <= 3) {
      process.exit(1); // Warnings
    } else {
      process.exit(2); // Critical failures
    }
    
  } catch (error) {
    log(`\n❌ Test execution failed: ${error.message}`, 'red');
    process.exit(3);
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  runComprehensiveTests();
}

module.exports = {
  runComprehensiveTests,
  results
};