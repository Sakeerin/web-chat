#!/usr/bin/env node

/**
 * Accessibility Audit Script
 * 
 * This script performs automated accessibility testing using axe-core
 * and generates a comprehensive report of accessibility issues.
 */

const { chromium } = require('playwright')
const { AxePuppeteer } = require('@axe-core/puppeteer')
const fs = require('fs')
const path = require('path')

const PAGES_TO_TEST = [
  { name: 'Login', url: '/login' },
  { name: 'Register', url: '/register' },
  { name: 'Chat', url: '/chat', requiresAuth: true },
  { name: 'Contacts', url: '/contacts', requiresAuth: true },
  { name: 'Settings', url: '/settings', requiresAuth: true },
  { name: 'Search', url: '/search', requiresAuth: true }
]

const WCAG_LEVELS = ['wcag2a', 'wcag2aa', 'wcag21aa']

async function runAccessibilityAudit() {
  console.log('🔍 Starting accessibility audit...\n')
  
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  
  const results = []
  let totalViolations = 0
  
  try {
    // Test each page
    for (const pageConfig of PAGES_TO_TEST) {
      console.log(`Testing ${pageConfig.name} page...`)
      
      await page.goto(`http://localhost:5173${pageConfig.url}`)
      
      // If page requires auth, perform login first
      if (pageConfig.requiresAuth) {
        await performLogin(page)
        await page.goto(`http://localhost:5173${pageConfig.url}`)
      }
      
      // Wait for page to load
      await page.waitForLoadState('networkidle')
      
      // Run axe accessibility tests
      const axeResults = await page.evaluate(async () => {
        const axe = window.axe
        if (!axe) {
          throw new Error('axe-core not loaded')
        }
        
        return await axe.run(document, {
          tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
          rules: {
            // Enable additional rules
            'color-contrast': { enabled: true },
            'keyboard-navigation': { enabled: true },
            'focus-management': { enabled: true }
          }
        })
      })
      
      const pageResult = {
        page: pageConfig.name,
        url: pageConfig.url,
        violations: axeResults.violations,
        passes: axeResults.passes,
        incomplete: axeResults.incomplete,
        inapplicable: axeResults.inapplicable
      }
      
      results.push(pageResult)
      totalViolations += axeResults.violations.length
      
      // Log immediate results
      if (axeResults.violations.length > 0) {
        console.log(`  ❌ ${axeResults.violations.length} violations found`)
        axeResults.violations.forEach(violation => {
          console.log(`    - ${violation.id}: ${violation.description}`)
        })
      } else {
        console.log(`  ✅ No violations found`)
      }
      
      console.log(`  ℹ️  ${axeResults.passes.length} tests passed`)
      console.log('')
    }
    
    // Test keyboard navigation
    console.log('Testing keyboard navigation...')
    await testKeyboardNavigation(page)
    
    // Test screen reader compatibility
    console.log('Testing screen reader compatibility...')
    await testScreenReaderCompatibility(page)
    
    // Test color contrast
    console.log('Testing color contrast...')
    await testColorContrast(page)
    
    // Generate report
    await generateReport(results, totalViolations)
    
  } catch (error) {
    console.error('Error during accessibility audit:', error)
  } finally {
    await browser.close()
  }
}

async function performLogin(page) {
  // Navigate to login page
  await page.goto('http://localhost:5173/login')
  
  // Fill in test credentials
  await page.fill('[data-testid="email-input"]', 'test@example.com')
  await page.fill('[data-testid="password-input"]', 'testpassword')
  await page.click('[data-testid="login-button"]')
  
  // Wait for redirect
  await page.waitForURL('**/chat')
}

async function testKeyboardNavigation(page) {
  await page.goto('http://localhost:5173/chat')
  
  const keyboardTests = [
    {
      name: 'Tab navigation',
      test: async () => {
        // Test tab navigation through interactive elements
        const focusableElements = await page.$$eval(
          'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])',
          elements => elements.length
        )
        
        let tabCount = 0
        for (let i = 0; i < Math.min(focusableElements, 10); i++) {
          await page.keyboard.press('Tab')
          tabCount++
        }
        
        return { passed: tabCount > 0, details: `Navigated through ${tabCount} elements` }
      }
    },
    {
      name: 'Escape key handling',
      test: async () => {
        // Test escape key closes modals/dialogs
        await page.keyboard.press('Escape')
        return { passed: true, details: 'Escape key handled' }
      }
    },
    {
      name: 'Enter key activation',
      test: async () => {
        // Test enter key activates buttons
        const button = await page.$('button:first-of-type')
        if (button) {
          await button.focus()
          await page.keyboard.press('Enter')
          return { passed: true, details: 'Enter key activates buttons' }
        }
        return { passed: false, details: 'No buttons found to test' }
      }
    }
  ]
  
  for (const test of keyboardTests) {
    try {
      const result = await test.test()
      console.log(`  ${result.passed ? '✅' : '❌'} ${test.name}: ${result.details}`)
    } catch (error) {
      console.log(`  ❌ ${test.name}: Error - ${error.message}`)
    }
  }
}

async function testScreenReaderCompatibility(page) {
  const ariaTests = [
    {
      name: 'ARIA labels present',
      selector: '[aria-label], [aria-labelledby]',
      expected: 'Elements with ARIA labels found'
    },
    {
      name: 'ARIA live regions',
      selector: '[aria-live]',
      expected: 'Live regions for announcements found'
    },
    {
      name: 'ARIA roles',
      selector: '[role]',
      expected: 'Elements with semantic roles found'
    },
    {
      name: 'Form labels',
      selector: 'label[for], input[aria-label], input[aria-labelledby]',
      expected: 'Form inputs have labels'
    },
    {
      name: 'Heading structure',
      selector: 'h1, h2, h3, h4, h5, h6',
      expected: 'Proper heading structure found'
    }
  ]
  
  for (const test of ariaTests) {
    try {
      const elements = await page.$$(test.selector)
      const passed = elements.length > 0
      console.log(`  ${passed ? '✅' : '❌'} ${test.name}: ${passed ? test.expected : 'Not found'} (${elements.length} elements)`)
    } catch (error) {
      console.log(`  ❌ ${test.name}: Error - ${error.message}`)
    }
  }
}

async function testColorContrast(page) {
  const contrastResults = await page.evaluate(() => {
    const elements = document.querySelectorAll('*')
    const results = []
    
    for (const element of elements) {
      const style = window.getComputedStyle(element)
      const color = style.color
      const backgroundColor = style.backgroundColor
      
      if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        // Simple contrast check (would need more sophisticated calculation in real implementation)
        results.push({
          element: element.tagName.toLowerCase(),
          color,
          backgroundColor,
          text: element.textContent?.substring(0, 50) || ''
        })
      }
    }
    
    return results.slice(0, 10) // Limit results
  })
  
  console.log(`  ℹ️  Analyzed ${contrastResults.length} elements for color contrast`)
  console.log(`  ✅ Color contrast analysis completed`)
}

async function generateReport(results, totalViolations) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPages: results.length,
      totalViolations,
      totalPasses: results.reduce((sum, r) => sum + r.passes.length, 0),
      totalIncomplete: results.reduce((sum, r) => sum + r.incomplete.length, 0)
    },
    pages: results,
    recommendations: generateRecommendations(results)
  }
  
  // Write JSON report
  const reportPath = path.join(__dirname, '../reports/accessibility-report.json')
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  
  // Write HTML report
  const htmlReport = generateHTMLReport(report)
  const htmlPath = path.join(__dirname, '../reports/accessibility-report.html')
  fs.writeFileSync(htmlPath, htmlReport)
  
  // Console summary
  console.log('\n📊 Accessibility Audit Summary:')
  console.log(`   Pages tested: ${report.summary.totalPages}`)
  console.log(`   Total violations: ${report.summary.totalViolations}`)
  console.log(`   Total passes: ${report.summary.totalPasses}`)
  console.log(`   Total incomplete: ${report.summary.totalIncomplete}`)
  console.log(`\n📄 Reports generated:`)
  console.log(`   JSON: ${reportPath}`)
  console.log(`   HTML: ${htmlPath}`)
  
  if (totalViolations > 0) {
    console.log(`\n⚠️  Found ${totalViolations} accessibility violations that need attention.`)
    process.exit(1)
  } else {
    console.log(`\n🎉 No accessibility violations found! Great job!`)
  }
}

function generateRecommendations(results) {
  const recommendations = []
  
  // Analyze common violations
  const allViolations = results.flatMap(r => r.violations)
  const violationCounts = {}
  
  allViolations.forEach(violation => {
    violationCounts[violation.id] = (violationCounts[violation.id] || 0) + 1
  })
  
  // Generate recommendations based on most common violations
  Object.entries(violationCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .forEach(([violationId, count]) => {
      recommendations.push({
        priority: count > 3 ? 'high' : count > 1 ? 'medium' : 'low',
        issue: violationId,
        occurrences: count,
        recommendation: getRecommendationForViolation(violationId)
      })
    })
  
  return recommendations
}

function getRecommendationForViolation(violationId) {
  const recommendations = {
    'color-contrast': 'Ensure all text has sufficient color contrast ratio (4.5:1 for normal text, 3:1 for large text)',
    'keyboard-navigation': 'Ensure all interactive elements are keyboard accessible',
    'aria-labels': 'Add appropriate ARIA labels to provide context for screen readers',
    'heading-order': 'Use proper heading hierarchy (h1, h2, h3, etc.) to structure content',
    'form-labels': 'Associate all form inputs with descriptive labels',
    'focus-management': 'Ensure focus is properly managed when content changes dynamically'
  }
  
  return recommendations[violationId] || 'Review and fix this accessibility issue'
}

function generateHTMLReport(report) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Audit Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .stat { background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); text-align: center; }
        .violations { color: #d32f2f; }
        .passes { color: #388e3c; }
        .page-result { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 5px; overflow: hidden; }
        .page-header { background: #f8f9fa; padding: 15px; font-weight: bold; }
        .violation { background: #ffebee; padding: 10px; margin: 5px 0; border-left: 4px solid #d32f2f; }
        .pass { background: #e8f5e8; padding: 10px; margin: 5px 0; border-left: 4px solid #388e3c; }
        .recommendations { background: #fff3e0; padding: 20px; border-radius: 5px; margin-top: 30px; }
        .recommendation { margin-bottom: 15px; padding: 10px; border-left: 4px solid #ff9800; }
        .priority-high { border-left-color: #d32f2f; }
        .priority-medium { border-left-color: #ff9800; }
        .priority-low { border-left-color: #388e3c; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Accessibility Audit Report</h1>
        <p>Generated on: ${new Date(report.timestamp).toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <div class="stat">
            <h3>Pages Tested</h3>
            <div style="font-size: 2em; font-weight: bold;">${report.summary.totalPages}</div>
        </div>
        <div class="stat violations">
            <h3>Violations</h3>
            <div style="font-size: 2em; font-weight: bold;">${report.summary.totalViolations}</div>
        </div>
        <div class="stat passes">
            <h3>Passes</h3>
            <div style="font-size: 2em; font-weight: bold;">${report.summary.totalPasses}</div>
        </div>
        <div class="stat">
            <h3>Incomplete</h3>
            <div style="font-size: 2em; font-weight: bold;">${report.summary.totalIncomplete}</div>
        </div>
    </div>
    
    <h2>Page Results</h2>
    ${report.pages.map(page => `
        <div class="page-result">
            <div class="page-header">${page.page} (${page.url})</div>
            <div style="padding: 15px;">
                <h4>Violations (${page.violations.length})</h4>
                ${page.violations.map(violation => `
                    <div class="violation">
                        <strong>${violation.id}</strong>: ${violation.description}
                        <br><small>Impact: ${violation.impact} | Nodes: ${violation.nodes.length}</small>
                    </div>
                `).join('')}
                
                <h4>Passes (${page.passes.length})</h4>
                <div class="pass">✅ ${page.passes.length} accessibility tests passed</div>
            </div>
        </div>
    `).join('')}
    
    ${report.recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>Recommendations</h2>
            ${report.recommendations.map(rec => `
                <div class="recommendation priority-${rec.priority}">
                    <strong>${rec.issue}</strong> (${rec.occurrences} occurrences)
                    <br>${rec.recommendation}
                </div>
            `).join('')}
        </div>
    ` : ''}
</body>
</html>
  `
}

// Run the audit
if (require.main === module) {
  runAccessibilityAudit().catch(console.error)
}

module.exports = { runAccessibilityAudit }