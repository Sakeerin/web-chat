import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/performance',
  fullyParallel: false, // Run performance tests sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for consistent performance measurements
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/performance-results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium-performance',
      use: { 
        ...devices['Desktop Chrome'],
        // Disable cache for consistent measurements
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})