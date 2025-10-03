import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global E2E test setup...')
  
  // Launch browser for setup
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Wait for the application to be ready
    console.log('⏳ Waiting for application to be ready...')
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    
    // Create test user for authenticated tests
    console.log('👤 Creating test user...')
    await page.goto('http://localhost:3000/register')
    
    // Fill registration form
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'TestPassword123!')
    await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!')
    await page.fill('[data-testid="username-input"]', 'testuser')
    await page.fill('[data-testid="name-input"]', 'Test User')
    
    // Submit registration
    await page.click('[data-testid="register-button"]')
    
    // Wait for successful registration
    await page.waitForURL('**/login', { timeout: 10000 })
    
    // Login with test user
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'TestPassword123!')
    await page.click('[data-testid="login-button"]')
    
    // Wait for successful login
    await page.waitForURL('**/chat', { timeout: 10000 })
    
    // Save authentication state
    await page.context().storageState({ path: 'e2e/auth-state.json' })
    
    console.log('✅ Global setup completed successfully')
    
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    // Don't fail the entire test suite if setup fails
    console.log('⚠️  Continuing with tests (some may fail without proper setup)')
  } finally {
    await browser.close()
  }
}

export default globalSetup