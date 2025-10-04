/**
 * Integration Test Runner Configuration
 * Configures and orchestrates all integration testing suites
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run sequentially for integration tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },
  reporter: [
    ['html', { outputFolder: 'test-results/integration-report' }],
    ['json', { outputFile: 'test-results/integration-results.json' }],
    ['junit', { outputFile: 'test-results/integration-junit.xml' }],
    ['line'],
    ['allure-playwright', { outputFolder: 'test-results/allure-results' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000
  },

  projects: [
    // User Workflow Tests
    {
      name: 'user-workflows',
      testDir: './tests/integration',
      testMatch: 'user-workflows.spec.ts',
      use: {
        browserName: 'chromium',
        viewport: { width: 1920, height: 1080 }
      }
    },

    // Cross-Browser Compatibility Tests
    {
      name: 'cross-browser-chrome',
      testDir: './tests/cross-browser',
      use: {
        browserName: 'chromium',
        viewport: { width: 1920, height: 1080 }
      }
    },
    {
      name: 'cross-browser-firefox',
      testDir: './tests/cross-browser',
      use: {
        browserName: 'firefox',
        viewport: { width: 1920, height: 1080 }
      }
    },
    {
      name: 'cross-browser-safari',
      testDir: './tests/cross-browser',
      use: {
        browserName: 'webkit',
        viewport: { width: 1920, height: 1080 }
      }
    },

    // Mobile Responsiveness Tests
    {
      name: 'mobile-iphone',
      testDir: './tests/mobile',
      use: {
        browserName: 'webkit',
        ...require('@playwright/test').devices['iPhone 12']
      }
    },
    {
      name: 'mobile-android',
      testDir: './tests/mobile',
      use: {
        browserName: 'chromium',
        ...require('@playwright/test').devices['Pixel 5']
      }
    },
    {
      name: 'tablet-ipad',
      testDir: './tests/mobile',
      use: {
        browserName: 'webkit',
        ...require('@playwright/test').devices['iPad Pro']
      }
    },

    // Performance Benchmark Tests
    {
      name: 'performance-benchmarks',
      testDir: './tests/performance',
      use: {
        browserName: 'chromium',
        viewport: { width: 1920, height: 1080 }
      }
    },

    // Security Penetration Tests
    {
      name: 'security-tests',
      testDir: './tests/security',
      use: {
        browserName: 'chromium',
        viewport: { width: 1920, height: 1080 }
      }
    },

    // System Validation Tests
    {
      name: 'system-validation',
      testDir: './tests/validation',
      use: {
        browserName: 'chromium',
        viewport: { width: 1920, height: 1080 }
      }
    }
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      NODE_ENV: 'test'
    }
  },

  // Global setup and teardown
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts')
});