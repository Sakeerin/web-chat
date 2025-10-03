import { FullConfig } from '@playwright/test'
import { unlink } from 'fs/promises'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global E2E test teardown...')
  
  try {
    // Clean up authentication state file
    await unlink('e2e/auth-state.json').catch(() => {
      // File might not exist, ignore error
    })
    
    // Additional cleanup can be added here
    // - Clean up test data from database
    // - Reset external service states
    // - Clean up uploaded files
    
    console.log('✅ Global teardown completed successfully')
  } catch (error) {
    console.error('❌ Global teardown failed:', error)
  }
}

export default globalTeardown