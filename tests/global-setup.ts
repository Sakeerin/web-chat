/**
 * Global Test Setup
 * Prepares the test environment before running integration tests
 */

import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');

  // Create test results directory
  const testResultsDir = 'test-results';
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }

  // Create test fixtures directory
  const fixturesDir = 'tests/fixtures';
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  // Create test fixture files
  await createTestFixtures(fixturesDir);

  // Setup test database
  console.log('📊 Setting up test database...');
  try {
    execSync('pnpm db:reset --force', { stdio: 'inherit' });
    execSync('pnpm db:seed', { stdio: 'inherit' });
    console.log('✅ Test database setup complete');
  } catch (error) {
    console.warn('⚠️ Database setup failed, continuing with existing data');
  }

  // Start services if not already running
  console.log('🔧 Checking required services...');
  try {
    // Check if Redis is running
    execSync('redis-cli ping', { stdio: 'pipe' });
    console.log('✅ Redis is running');
  } catch (error) {
    console.log('🔄 Starting Redis...');
    try {
      execSync('redis-server --daemonize yes', { stdio: 'inherit' });
    } catch (redisError) {
      console.warn('⚠️ Could not start Redis automatically');
    }
  }

  // Warm up the application
  console.log('🔥 Warming up application...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto(config.projects[0].use?.baseURL || 'http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('✅ Application warmed up successfully');
  } catch (error) {
    console.warn('⚠️ Application warmup failed:', error);
  } finally {
    await browser.close();
  }

  // Create test report directory structure
  const reportDirs = [
    'test-results/integration-report',
    'test-results/cross-browser-report',
    'test-results/mobile-report',
    'test-results/performance-report',
    'test-results/security-report',
    'test-results/validation-report',
    'test-results/allure-results'
  ];

  reportDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  console.log('✅ Global test setup complete');
}

async function createTestFixtures(fixturesDir: string) {
  console.log('📁 Creating test fixtures...');

  // Create test avatar image (1x1 pixel PNG)
  const testAvatarPath = path.join(fixturesDir, 'test-avatar.jpg');
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type, etc.
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0x99, 0x01, 0x01, 0x01, 0x00, 0x00, // image data
    0xFE, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // image data
    0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00, // IEND chunk
    0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  fs.writeFileSync(testAvatarPath, pngData);

  // Create test image (same as avatar for simplicity)
  const testImagePath = path.join(fixturesDir, 'test-image.jpg');
  fs.writeFileSync(testImagePath, pngData);

  // Create test video file (minimal MP4 header)
  const testVideoPath = path.join(fixturesDir, 'test-video.mp4');
  const mp4Data = Buffer.from([
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // ftyp box
    0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00, // isom brand
    0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32, // compatible brands
    0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31, // more brands
    0x00, 0x00, 0x00, 0x08, 0x66, 0x72, 0x65, 0x65  // free box
  ]);
  fs.writeFileSync(testVideoPath, mp4Data);

  // Create test document
  const testDocPath = path.join(fixturesDir, 'test-document.txt');
  fs.writeFileSync(testDocPath, 'This is a test document for file upload testing.');

  console.log('✅ Test fixtures created');
}

export default globalSetup;