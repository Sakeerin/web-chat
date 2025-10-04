/**
 * Cross-Browser Testing Configuration
 * Tests frontend compatibility across different browsers and devices
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './cross-browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'test-results/cross-browser-report' }],
    ['json', { outputFile: 'test-results/cross-browser-results.json' }],
    ['junit', { outputFile: 'test-results/cross-browser-junit.xml' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    // Desktop Browsers
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'edge-desktop',
      use: { 
        ...devices['Desktop Edge'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    // Mobile Browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'mobile-samsung',
      use: { ...devices['Galaxy S21'] },
    },

    // Tablet Browsers
    {
      name: 'tablet-chrome',
      use: { ...devices['iPad Pro'] },
    },
    {
      name: 'tablet-safari',
      use: { ...devices['iPad Air'] },
    },

    // Different Screen Sizes
    {
      name: 'small-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 }
      },
    },
    {
      name: 'large-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 }
      },
    },

    // High DPI Displays
    {
      name: 'retina-display',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 2
      },
    }
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});