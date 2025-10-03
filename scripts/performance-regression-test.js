#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Performance thresholds based on requirements
const PERFORMANCE_THRESHOLDS = {
  // API Performance (Requirements 9.1, 9.2)
  api_response_time_p95: 200, // ms
  message_latency_p50: 150, // ms (same region)
  message_latency_p95: 350, // ms
  
  // System Performance (Requirements 9.3, 9.4)
  concurrent_users: 10000,
  messages_per_second: 500,
  error_rate: 0.01, // 1%
  
  // Frontend Performance
  initial_load_time_p95: 1200, // ms (4G)
  search_response_time_p95: 300, // ms
  
  // Resource Usage
  memory_usage_mb: 2048, // 2GB
  cpu_usage_percent: 80,
}

class PerformanceRegressionTest {
  constructor() {
    this.results = {}
    this.baselineFile = path.join(__dirname, '../performance-baseline.json')
    this.reportFile = path.join(__dirname, '../performance-report.json')
  }
  
  async run() {
    console.log('🚀 Starting Performance Regression Test')
    console.log('=====================================')
    
    try {
      // Load baseline if exists
      const baseline = this.loadBaseline()
      
      // Run performance tests
      await this.runLoadTests()
      await this.runFrontendTests()
      
      // Compare with baseline
      const comparison = this.compareWithBaseline(baseline)
      
      // Generate report
      this.generateReport(comparison)
      
      // Check for regressions
      const hasRegressions = this.checkForRegressions(comparison)
      
      if (hasRegressions) {
        console.error('❌ Performance regression detected!')
        process.exit(1)
      } else {
        console.log('✅ No performance regressions detected')
        // Update baseline with current results
        this.updateBaseline()
      }
      
    } catch (error) {
      console.error('❌ Performance test failed:', error.message)
      process.exit(1)
    }
  }
  
  loadBaseline() {
    if (fs.existsSync(this.baselineFile)) {
      const baseline = JSON.parse(fs.readFileSync(this.baselineFile, 'utf8'))
      console.log(`📊 Loaded baseline from ${baseline.timestamp}`)
      return baseline
    }
    
    console.log('📊 No baseline found, will create new baseline')
    return null
  }
  
  async runLoadTests() {
    console.log('\n🔧 Running k6 Load Tests...')
    
    // Start the application
    console.log('Starting application...')
    const appProcess = execSync('docker-compose up -d', { stdio: 'inherit' })
    
    // Wait for application to be ready
    await this.waitForApplication()
    
    try {
      // Run baseline load test
      console.log('Running baseline load test...')
      const baselineResult = execSync(
        'k6 run --out json=baseline-results.json apps/api/k6/load-test.js',
        { encoding: 'utf8', cwd: process.cwd() }
      )
      
      // Run concurrent users test
      console.log('Running concurrent users test...')
      const concurrentResult = execSync(
        'k6 run --out json=concurrent-results.json apps/api/k6/concurrent-users-test.js',
        { encoding: 'utf8', cwd: process.cwd() }
      )
      
      // Run message throughput test
      console.log('Running message throughput test...')
      const throughputResult = execSync(
        'k6 run --out json=throughput-results.json apps/api/k6/message-throughput-test.js',
        { encoding: 'utf8', cwd: process.cwd() }
      )
      
      // Parse results
      this.results.loadTests = this.parseK6Results([
        'baseline-results.json',
        'concurrent-results.json',
        'throughput-results.json'
      ])
      
    } finally {
      // Stop the application
      execSync('docker-compose down', { stdio: 'inherit' })
    }
  }
  
  async runFrontendTests() {
    console.log('\n🌐 Running Frontend Performance Tests...')
    
    // Start application for frontend testing
    execSync('docker-compose up -d', { stdio: 'inherit' })
    await this.waitForApplication()
    
    try {
      // Run Lighthouse CI for performance metrics
      console.log('Running Lighthouse performance audit...')
      const lighthouseResult = execSync(
        'npx @lhci/cli autorun --config=.lighthouserc.json',
        { encoding: 'utf8', cwd: process.cwd() }
      )
      
      // Run Playwright performance tests
      console.log('Running Playwright performance tests...')
      const playwrightResult = execSync(
        'npx playwright test --config=playwright.performance.config.ts',
        { encoding: 'utf8', cwd: 'apps/web' }
      )
      
      this.results.frontendTests = {
        lighthouse: this.parseLighthouseResults(),
        playwright: this.parsePlaywrightResults(),
      }
      
    } finally {
      execSync('docker-compose down', { stdio: 'inherit' })
    }
  }
  
  parseK6Results(resultFiles) {
    const results = {}
    
    resultFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const data = fs.readFileSync(file, 'utf8')
        const lines = data.trim().split('\n')
        const metrics = {}
        
        lines.forEach(line => {
          try {
            const metric = JSON.parse(line)
            if (metric.type === 'Point' && metric.data) {
              const metricName = metric.metric
              if (!metrics[metricName]) {
                metrics[metricName] = []
              }
              metrics[metricName].push(metric.data.value)
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        })
        
        // Calculate aggregated metrics
        Object.keys(metrics).forEach(metricName => {
          const values = metrics[metricName]
          results[metricName] = {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            p95: this.percentile(values, 0.95),
            p50: this.percentile(values, 0.50),
          }
        })
        
        // Clean up result file
        fs.unlinkSync(file)
      }
    })
    
    return results
  }
  
  parseLighthouseResults() {
    // Parse Lighthouse CI results
    const lighthouseDir = '.lighthouseci'
    if (fs.existsSync(lighthouseDir)) {
      const files = fs.readdirSync(lighthouseDir)
      const reportFile = files.find(f => f.endsWith('.json'))
      
      if (reportFile) {
        const report = JSON.parse(fs.readFileSync(path.join(lighthouseDir, reportFile), 'utf8'))
        return {
          performance: report.categories.performance.score * 100,
          fcp: report.audits['first-contentful-paint'].numericValue,
          lcp: report.audits['largest-contentful-paint'].numericValue,
          fid: report.audits['max-potential-fid'].numericValue,
          cls: report.audits['cumulative-layout-shift'].numericValue,
          ttfb: report.audits['server-response-time'].numericValue,
        }
      }
    }
    
    return {}
  }
  
  parsePlaywrightResults() {
    // Parse Playwright test results
    const resultsFile = 'apps/web/test-results/performance-results.json'
    if (fs.existsSync(resultsFile)) {
      return JSON.parse(fs.readFileSync(resultsFile, 'utf8'))
    }
    
    return {}
  }
  
  compareWithBaseline(baseline) {
    if (!baseline) {
      return { isFirstRun: true, current: this.results }
    }
    
    const comparison = {
      isFirstRun: false,
      current: this.results,
      baseline: baseline.results,
      changes: {},
    }
    
    // Compare load test metrics
    if (baseline.results.loadTests && this.results.loadTests) {
      comparison.changes.loadTests = this.compareMetrics(
        baseline.results.loadTests,
        this.results.loadTests
      )
    }
    
    // Compare frontend metrics
    if (baseline.results.frontendTests && this.results.frontendTests) {
      comparison.changes.frontendTests = this.compareMetrics(
        baseline.results.frontendTests,
        this.results.frontendTests
      )
    }
    
    return comparison
  }
  
  compareMetrics(baseline, current) {
    const changes = {}
    
    Object.keys(current).forEach(metricName => {
      if (baseline[metricName]) {
        const baselineValue = baseline[metricName].avg || baseline[metricName]
        const currentValue = current[metricName].avg || current[metricName]
        
        const change = ((currentValue - baselineValue) / baselineValue) * 100
        
        changes[metricName] = {
          baseline: baselineValue,
          current: currentValue,
          change: change,
          isRegression: this.isRegression(metricName, change),
        }
      }
    })
    
    return changes
  }
  
  isRegression(metricName, changePercent) {
    // Define regression thresholds (positive change is bad for most metrics)
    const regressionThresholds = {
      'http_req_duration': 10, // 10% increase in response time is regression
      'message_latency': 10,
      'error_rate': 5, // 5% increase in error rate
      'memory_usage': 15, // 15% increase in memory usage
      'cpu_usage': 15,
      'fcp': 10, // First Contentful Paint
      'lcp': 10, // Largest Contentful Paint
      'fid': 10, // First Input Delay
      'cls': 10, // Cumulative Layout Shift
    }
    
    const threshold = regressionThresholds[metricName] || 10
    return changePercent > threshold
  }
  
  checkForRegressions(comparison) {
    if (comparison.isFirstRun) {
      return false
    }
    
    let hasRegressions = false
    
    // Check load test regressions
    if (comparison.changes.loadTests) {
      Object.keys(comparison.changes.loadTests).forEach(metric => {
        const change = comparison.changes.loadTests[metric]
        if (change.isRegression) {
          console.error(`❌ Regression in ${metric}: ${change.change.toFixed(2)}% increase`)
          hasRegressions = true
        }
      })
    }
    
    // Check frontend test regressions
    if (comparison.changes.frontendTests) {
      Object.keys(comparison.changes.frontendTests).forEach(metric => {
        const change = comparison.changes.frontendTests[metric]
        if (change.isRegression) {
          console.error(`❌ Regression in ${metric}: ${change.change.toFixed(2)}% increase`)
          hasRegressions = true
        }
      })
    }
    
    // Check against absolute thresholds
    hasRegressions = this.checkAbsoluteThresholds() || hasRegressions
    
    return hasRegressions
  }
  
  checkAbsoluteThresholds() {
    let hasViolations = false
    
    // Check API response time
    const apiResponseTime = this.results.loadTests?.['http_req_duration']?.p95
    if (apiResponseTime && apiResponseTime > PERFORMANCE_THRESHOLDS.api_response_time_p95) {
      console.error(`❌ API response time P95 (${apiResponseTime}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.api_response_time_p95}ms)`)
      hasViolations = true
    }
    
    // Check message latency
    const messageLatency = this.results.loadTests?.['message_latency']?.p50
    if (messageLatency && messageLatency > PERFORMANCE_THRESHOLDS.message_latency_p50) {
      console.error(`❌ Message latency P50 (${messageLatency}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.message_latency_p50}ms)`)
      hasViolations = true
    }
    
    // Check frontend performance
    const lcp = this.results.frontendTests?.lighthouse?.lcp
    if (lcp && lcp > PERFORMANCE_THRESHOLDS.initial_load_time_p95) {
      console.error(`❌ LCP (${lcp}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.initial_load_time_p95}ms)`)
      hasViolations = true
    }
    
    return hasViolations
  }
  
  generateReport(comparison) {
    const report = {
      timestamp: new Date().toISOString(),
      commit: process.env.GITHUB_SHA || 'unknown',
      branch: process.env.GITHUB_REF || 'unknown',
      comparison,
      thresholds: PERFORMANCE_THRESHOLDS,
    }
    
    fs.writeFileSync(this.reportFile, JSON.stringify(report, null, 2))
    console.log(`📊 Performance report saved to ${this.reportFile}`)
  }
  
  updateBaseline() {
    const baseline = {
      timestamp: new Date().toISOString(),
      commit: process.env.GITHUB_SHA || 'unknown',
      branch: process.env.GITHUB_REF || 'unknown',
      results: this.results,
    }
    
    fs.writeFileSync(this.baselineFile, JSON.stringify(baseline, null, 2))
    console.log(`📊 Baseline updated: ${this.baselineFile}`)
  }
  
  async waitForApplication() {
    const maxAttempts = 30
    const delay = 2000
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch('http://localhost:3001/health')
        if (response.ok) {
          console.log('✅ Application is ready')
          return
        }
      } catch (error) {
        // Application not ready yet
      }
      
      console.log(`⏳ Waiting for application... (${i + 1}/${maxAttempts})`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    throw new Error('Application failed to start within timeout')
  }
  
  percentile(values, p) {
    const sorted = values.slice().sort((a, b) => a - b)
    const index = Math.ceil(sorted.length * p) - 1
    return sorted[index]
  }
}

// Run the test if called directly
if (require.main === module) {
  const test = new PerformanceRegressionTest()
  test.run().catch(error => {
    console.error('Performance regression test failed:', error)
    process.exit(1)
  })
}

module.exports = PerformanceRegressionTest