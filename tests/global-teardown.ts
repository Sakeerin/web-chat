/**
 * Global Test Teardown
 * Cleans up after integration tests complete
 */

import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');

  // Generate test summary report
  await generateTestSummary();

  // Clean up test data
  console.log('🗑️ Cleaning up test data...');
  try {
    // Reset test database to clean state
    execSync('pnpm db:reset --force', { stdio: 'pipe' });
    console.log('✅ Test database cleaned');
  } catch (error) {
    console.warn('⚠️ Database cleanup failed:', error);
  }

  // Archive test results
  console.log('📦 Archiving test results...');
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveDir = `test-results/archive/${timestamp}`;
    
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    // Copy important test results to archive
    const filesToArchive = [
      'test-results/integration-results.json',
      'test-results/integration-junit.xml',
      'test-results/test-summary.json'
    ];

    filesToArchive.forEach(file => {
      if (fs.existsSync(file)) {
        const fileName = path.basename(file);
        fs.copyFileSync(file, path.join(archiveDir, fileName));
      }
    });

    console.log(`✅ Test results archived to ${archiveDir}`);
  } catch (error) {
    console.warn('⚠️ Test result archiving failed:', error);
  }

  // Clean up temporary files
  console.log('🧽 Cleaning up temporary files...');
  try {
    const tempDirs = [
      'tests/fixtures',
      'test-results/screenshots',
      'test-results/videos',
      'test-results/traces'
    ];

    tempDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    console.log('✅ Temporary files cleaned');
  } catch (error) {
    console.warn('⚠️ Temporary file cleanup failed:', error);
  }

  console.log('✅ Global test teardown complete');
}

async function generateTestSummary() {
  console.log('📊 Generating test summary...');

  try {
    const summaryData = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        ci: !!process.env.CI
      },
      testSuites: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: 0
    };

    // Read integration test results if available
    const resultsFiles = [
      'test-results/integration-results.json',
      'test-results/cross-browser-results.json',
      'test-results/mobile-results.json',
      'test-results/performance-results.json',
      'test-results/security-results.json',
      'test-results/validation-results.json'
    ];

    for (const resultsFile of resultsFiles) {
      if (fs.existsSync(resultsFile)) {
        try {
          const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
          
          if (results.suites) {
            summaryData.testSuites.push({
              name: path.basename(resultsFile, '.json'),
              tests: results.suites.length,
              passed: results.suites.filter((s: any) => s.outcome === 'passed').length,
              failed: results.suites.filter((s: any) => s.outcome === 'failed').length,
              duration: results.stats?.duration || 0
            });
          }
        } catch (error) {
          console.warn(`⚠️ Could not parse ${resultsFile}:`, error);
        }
      }
    }

    // Calculate totals
    summaryData.totalTests = summaryData.testSuites.reduce((sum, suite) => sum + suite.tests, 0);
    summaryData.passedTests = summaryData.testSuites.reduce((sum, suite) => sum + suite.passed, 0);
    summaryData.failedTests = summaryData.testSuites.reduce((sum, suite) => sum + suite.failed, 0);
    summaryData.duration = summaryData.testSuites.reduce((sum, suite) => sum + suite.duration, 0);

    // Write summary
    fs.writeFileSync(
      'test-results/test-summary.json',
      JSON.stringify(summaryData, null, 2)
    );

    // Generate human-readable summary
    const readableSummary = `
# Integration Test Summary

**Generated:** ${summaryData.timestamp}
**Environment:** ${summaryData.environment.platform} ${summaryData.environment.arch} (Node ${summaryData.environment.nodeVersion})
**CI:** ${summaryData.environment.ci ? 'Yes' : 'No'}

## Overall Results
- **Total Tests:** ${summaryData.totalTests}
- **Passed:** ${summaryData.passedTests} (${((summaryData.passedTests / summaryData.totalTests) * 100).toFixed(1)}%)
- **Failed:** ${summaryData.failedTests} (${((summaryData.failedTests / summaryData.totalTests) * 100).toFixed(1)}%)
- **Skipped:** ${summaryData.skippedTests}
- **Duration:** ${(summaryData.duration / 1000).toFixed(2)}s

## Test Suites
${summaryData.testSuites.map(suite => `
### ${suite.name}
- Tests: ${suite.tests}
- Passed: ${suite.passed}
- Failed: ${suite.failed}
- Duration: ${(suite.duration / 1000).toFixed(2)}s
`).join('')}

## Test Reports
- HTML Report: \`test-results/integration-report/index.html\`
- JSON Results: \`test-results/integration-results.json\`
- JUnit XML: \`test-results/integration-junit.xml\`
- Allure Report: \`test-results/allure-results/\`
`;

    fs.writeFileSync('test-results/TEST-SUMMARY.md', readableSummary);

    console.log('✅ Test summary generated');
    console.log(`📈 Results: ${summaryData.passedTests}/${summaryData.totalTests} tests passed`);
  } catch (error) {
    console.warn('⚠️ Test summary generation failed:', error);
  }
}

export default globalTeardown;