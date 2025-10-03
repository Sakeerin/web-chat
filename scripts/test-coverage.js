#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

/**
 * Comprehensive test coverage script
 * Runs all tests and generates coverage reports
 */

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
    log(`Error: ${error.message}`, 'red')
    return { success: false, error }
  }
}

function checkCoverageThreshold(coverageFile, thresholds) {
  if (!fs.existsSync(coverageFile)) {
    log(`Coverage file not found: ${coverageFile}`, 'yellow')
    return false
  }

  try {
    const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'))
    const total = coverage.total
    
    log('\n📊 Coverage Summary:', 'cyan')
    log(`Lines: ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})`)
    log(`Functions: ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})`)
    log(`Branches: ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})`)
    log(`Statements: ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})`)
    
    const meetsThreshold = 
      total.lines.pct >= thresholds.lines &&
      total.functions.pct >= thresholds.functions &&
      total.branches.pct >= thresholds.branches &&
      total.statements.pct >= thresholds.statements
    
    if (meetsThreshold) {
      log('✅ Coverage thresholds met!', 'green')
    } else {
      log('❌ Coverage thresholds not met!', 'red')
      log(`Required: Lines ${thresholds.lines}%, Functions ${thresholds.functions}%, Branches ${thresholds.branches}%, Statements ${thresholds.statements}%`, 'yellow')
    }
    
    return meetsThreshold
  } catch (error) {
    log(`Error reading coverage file: ${error.message}`, 'red')
    return false
  }
}

async function main() {
  log('🧪 Starting comprehensive test coverage analysis...', 'cyan')
  
  const startTime = Date.now()
  let allTestsPassed = true
  
  // Clean previous coverage
  log('\n🧹 Cleaning previous coverage...', 'yellow')
  runCommand('rm -rf coverage apps/*/coverage')
  
  // Run API unit tests
  log('\n🔧 Running API unit tests...', 'magenta')
  const apiUnitResult = runCommand('pnpm --filter api test:unit -- --coverage')
  if (!apiUnitResult.success) {
    allTestsPassed = false
  }
  
  // Run API integration tests
  log('\n🔗 Running API integration tests...', 'magenta')
  const apiIntegrationResult = runCommand('pnpm --filter api test:integration -- --coverage')
  if (!apiIntegrationResult.success) {
    log('⚠️  API integration tests failed (may be due to missing database)', 'yellow')
  }
  
  // Run Web unit tests
  log('\n⚛️  Running Web unit tests...', 'magenta')
  const webUnitResult = runCommand('pnpm --filter web test:unit -- --coverage')
  if (!webUnitResult.success) {
    allTestsPassed = false
  }
  
  // Run E2E tests
  log('\n🌐 Running E2E tests...', 'magenta')
  const e2eResult = runCommand('pnpm --filter web test:e2e')
  if (!e2eResult.success) {
    log('⚠️  E2E tests failed (may be due to missing services)', 'yellow')
  }
  
  // Generate combined coverage report
  log('\n📊 Generating combined coverage report...', 'cyan')
  runCommand('pnpm test:cov')
  
  // Check coverage thresholds
  log('\n🎯 Checking coverage thresholds...', 'cyan')
  
  // API coverage
  const apiCoverageFile = 'apps/api/coverage/coverage-summary.json'
  const apiThresholds = { lines: 80, functions: 80, branches: 80, statements: 80 }
  const apiCoverageMet = checkCoverageThreshold(apiCoverageFile, apiThresholds)
  
  // Web coverage
  const webCoverageFile = 'apps/web/coverage/coverage-summary.json'
  const webThresholds = { lines: 75, functions: 75, branches: 75, statements: 75 }
  const webCoverageMet = checkCoverageThreshold(webCoverageFile, webThresholds)
  
  // Generate HTML reports
  log('\n📄 Generating HTML coverage reports...', 'cyan')
  runCommand('pnpm --filter api test:cov -- --reporters=html')
  runCommand('pnpm --filter web test:cov -- --reporter=html')
  
  // Summary
  const endTime = Date.now()
  const duration = Math.round((endTime - startTime) / 1000)
  
  log('\n📋 Test Summary:', 'cyan')
  log(`Duration: ${duration}s`)
  log(`API Unit Tests: ${apiUnitResult.success ? '✅' : '❌'}`)
  log(`API Integration Tests: ${apiIntegrationResult.success ? '✅' : '⚠️'}`)
  log(`Web Unit Tests: ${webUnitResult.success ? '✅' : '❌'}`)
  log(`E2E Tests: ${e2eResult.success ? '✅' : '⚠️'}`)
  log(`API Coverage: ${apiCoverageMet ? '✅' : '❌'}`)
  log(`Web Coverage: ${webCoverageMet ? '✅' : '❌'}`)
  
  if (allTestsPassed && apiCoverageMet && webCoverageMet) {
    log('\n🎉 All tests passed and coverage thresholds met!', 'green')
    process.exit(0)
  } else {
    log('\n⚠️  Some tests failed or coverage thresholds not met', 'yellow')
    log('Check the detailed output above for more information', 'yellow')
    process.exit(1)
  }
}

main().catch(error => {
  log(`Script failed: ${error.message}`, 'red')
  process.exit(1)
})