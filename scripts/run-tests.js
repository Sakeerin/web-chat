#!/usr/bin/env node

const { execSync } = require('child_process')
const path = require('path')

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function runCommand(command, options = {}) {
  try {
    log(`Running: ${command}`, 'blue')
    const result = execSync(command, { 
      stdio: 'inherit', 
      encoding: 'utf8',
      ...options 
    })
    return { success: true, result }
  } catch (error) {
    log(`Command failed: ${command}`, 'red')
    return { success: false, error }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const testType = args[0] || 'all'
  
  log('🧪 Running tests...', 'cyan')
  
  switch (testType) {
    case 'api':
      log('🔧 Running API tests...', 'magenta')
      runCommand('npm test', { cwd: path.join(__dirname, '../apps/api') })
      break
      
    case 'web':
      log('⚛️  Running Web tests...', 'magenta')
      runCommand('npm test', { cwd: path.join(__dirname, '../apps/web') })
      break
      
    case 'e2e':
      log('🌐 Running E2E tests...', 'magenta')
      runCommand('npm run test:e2e', { cwd: path.join(__dirname, '../apps/web') })
      break
      
    case 'unit':
      log('🔧 Running API unit tests...', 'magenta')
      runCommand('npm run test:unit', { cwd: path.join(__dirname, '../apps/api') })
      log('⚛️  Running Web unit tests...', 'magenta')
      runCommand('npm run test:unit', { cwd: path.join(__dirname, '../apps/web') })
      break
      
    case 'integration':
      log('🔗 Running API integration tests...', 'magenta')
      runCommand('npm run test:integration', { cwd: path.join(__dirname, '../apps/api') })
      break
      
    case 'coverage':
      log('📊 Running tests with coverage...', 'cyan')
      runCommand('node scripts/test-coverage.js', { cwd: path.join(__dirname, '..') })
      break
      
    case 'all':
    default:
      log('🔧 Running API tests...', 'magenta')
      const apiResult = runCommand('npm test', { cwd: path.join(__dirname, '../apps/api') })
      
      log('⚛️  Running Web tests...', 'magenta')
      const webResult = runCommand('npm test', { cwd: path.join(__dirname, '../apps/web') })
      
      if (apiResult.success && webResult.success) {
        log('✅ All tests passed!', 'green')
      } else {
        log('❌ Some tests failed!', 'red')
        process.exit(1)
      }
      break
  }
}

if (require.main === module) {
  main().catch(error => {
    log(`Script failed: ${error.message}`, 'red')
    process.exit(1)
  })
}

module.exports = { main }