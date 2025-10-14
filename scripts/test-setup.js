#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Git Manager Pro setup...\n');

// Test 1: Check if we're in a git repository
console.log('1. Checking git repository...');
try {
  execSync('git rev-parse --git-dir', { stdio: 'pipe' });
  console.log('✅ Git repository detected');
} catch (error) {
  console.log('❌ Not in a git repository');
  console.log('💡 Please run this from a git repository root');
  process.exit(1);
}

// Test 2: Check if TypeScript compiles
console.log('\n2. Testing TypeScript compilation...');
try {
  execSync('npm run build:server', { stdio: 'pipe' });
  console.log('✅ Server TypeScript compilation successful');
} catch (error) {
  console.log('❌ Server TypeScript compilation failed');
  console.log('Error:', error.message);
  process.exit(1);
}

// Test 3: Check if client builds
console.log('\n3. Testing client build...');
try {
  execSync('cd client && npm run build', { stdio: 'pipe' });
  console.log('✅ Client build successful');
} catch (error) {
  console.log('❌ Client build failed');
  console.log('Error:', error.message);
  process.exit(1);
}

// Test 4: Check if CLI works
console.log('\n4. Testing CLI...');
try {
  execSync('node dist/bin/gmp.js --help', { stdio: 'pipe' });
  console.log('✅ CLI help command works');
} catch (error) {
  console.log('❌ CLI not working');
  console.log('Error:', error.message);
  process.exit(1);
}

console.log('\n🎉 All tests passed! Git Manager Pro is ready to use.');
console.log('\nNext steps:');
console.log('1. Run: npm link');
console.log('2. Run: gmp init');
console.log('3. Run: gmp start');
console.log('4. Run: gmp open');
