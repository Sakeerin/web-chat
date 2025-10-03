#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Bundle analysis configuration
const BUNDLE_SIZE_LIMITS = {
  // Main bundle size limits (in KB)
  main: 500,
  vendor: 1000,
  // Individual chunk size limits
  chunk: 200,
  // Asset size limits
  css: 100,
  image: 500,
}

const PERFORMANCE_BUDGETS = {
  // Performance budget in KB
  total: 2000,
  javascript: 1200,
  css: 200,
  images: 500,
  fonts: 100,
}

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function formatSize(bytes) {
  const kb = bytes / 1024
  return kb < 1024 ? `${kb.toFixed(2)} KB` : `${(kb / 1024).toFixed(2)} MB`
}

function analyzeBundleSize() {
  log('🔍 Analyzing bundle size...', 'blue')
  
  try {
    // Build the project
    log('Building project...', 'yellow')
    execSync('npm run build', { stdio: 'inherit' })
    
    // Read build stats
    const distPath = path.join(process.cwd(), 'dist')
    const assets = []
    
    function scanDirectory(dir, prefix = '') {
      const files = fs.readdirSync(dir)
      
      for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)
        
        if (stat.isDirectory()) {
          scanDirectory(filePath, `${prefix}${file}/`)
        } else {
          const size = stat.size
          const relativePath = `${prefix}${file}`
          const ext = path.extname(file).toLowerCase()
          
          assets.push({
            path: relativePath,
            size,
            type: getAssetType(ext),
            gzipSize: getGzipSize(filePath),
          })
        }
      }
    }
    
    scanDirectory(distPath)
    
    // Analyze assets
    const analysis = analyzeAssets(assets)
    
    // Generate report
    generateReport(analysis)
    
    // Check against budgets
    checkPerformanceBudgets(analysis)
    
  } catch (error) {
    log(`❌ Bundle analysis failed: ${error.message}`, 'red')
    process.exit(1)
  }
}

function getAssetType(ext) {
  const types = {
    '.js': 'javascript',
    '.mjs': 'javascript',
    '.css': 'css',
    '.png': 'image',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.gif': 'image',
    '.svg': 'image',
    '.webp': 'image',
    '.woff': 'font',
    '.woff2': 'font',
    '.ttf': 'font',
    '.eot': 'font',
  }
  
  return types[ext] || 'other'
}

function getGzipSize(filePath) {
  try {
    const zlib = require('zlib')
    const content = fs.readFileSync(filePath)
    return zlib.gzipSync(content).length
  } catch {
    return 0
  }
}

function analyzeAssets(assets) {
  const analysis = {
    total: { size: 0, gzipSize: 0, count: 0 },
    byType: {},
    largest: [],
    chunks: [],
  }
  
  // Group by type
  for (const asset of assets) {
    analysis.total.size += asset.size
    analysis.total.gzipSize += asset.gzipSize
    analysis.total.count++
    
    if (!analysis.byType[asset.type]) {
      analysis.byType[asset.type] = { size: 0, gzipSize: 0, count: 0, files: [] }
    }
    
    analysis.byType[asset.type].size += asset.size
    analysis.byType[asset.type].gzipSize += asset.gzipSize
    analysis.byType[asset.type].count++
    analysis.byType[asset.type].files.push(asset)
  }
  
  // Find largest assets
  analysis.largest = assets
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)
  
  // Identify chunks
  analysis.chunks = assets
    .filter(asset => asset.type === 'javascript')
    .map(asset => ({
      ...asset,
      isVendor: asset.path.includes('vendor') || asset.path.includes('node_modules'),
      isMain: asset.path.includes('main') || asset.path.includes('index'),
    }))
  
  return analysis
}

function generateReport(analysis) {
  log('\n📊 Bundle Analysis Report', 'blue')
  log('=' .repeat(50), 'blue')
  
  // Total size
  log(`\nTotal Bundle Size: ${formatSize(analysis.total.size)} (${formatSize(analysis.total.gzipSize)} gzipped)`)
  log(`Total Files: ${analysis.total.count}`)
  
  // By type
  log('\n📁 Assets by Type:', 'yellow')
  for (const [type, data] of Object.entries(analysis.byType)) {
    const percentage = ((data.size / analysis.total.size) * 100).toFixed(1)
    log(`  ${type.padEnd(12)}: ${formatSize(data.size).padEnd(10)} (${formatSize(data.gzipSize)} gzipped) - ${percentage}% - ${data.count} files`)
  }
  
  // Largest files
  log('\n📈 Largest Assets:', 'yellow')
  for (const asset of analysis.largest) {
    const percentage = ((asset.size / analysis.total.size) * 100).toFixed(1)
    log(`  ${asset.path.padEnd(40)}: ${formatSize(asset.size).padEnd(10)} (${percentage}%)`)
  }
  
  // JavaScript chunks
  if (analysis.chunks.length > 0) {
    log('\n🧩 JavaScript Chunks:', 'yellow')
    for (const chunk of analysis.chunks) {
      const type = chunk.isMain ? 'main' : chunk.isVendor ? 'vendor' : 'chunk'
      log(`  ${chunk.path.padEnd(40)}: ${formatSize(chunk.size).padEnd(10)} (${type})`)
    }
  }
}

function checkPerformanceBudgets(analysis) {
  log('\n🎯 Performance Budget Check:', 'blue')
  
  let hasViolations = false
  
  // Check total budget
  const totalKB = analysis.total.gzipSize / 1024
  if (totalKB > PERFORMANCE_BUDGETS.total) {
    log(`❌ Total bundle size (${formatSize(analysis.total.gzipSize)}) exceeds budget (${PERFORMANCE_BUDGETS.total} KB)`, 'red')
    hasViolations = true
  } else {
    log(`✅ Total bundle size within budget`, 'green')
  }
  
  // Check by type
  for (const [type, budget] of Object.entries(PERFORMANCE_BUDGETS)) {
    if (type === 'total') continue
    
    const typeData = analysis.byType[type]
    if (typeData) {
      const typeKB = typeData.gzipSize / 1024
      if (typeKB > budget) {
        log(`❌ ${type} size (${formatSize(typeData.gzipSize)}) exceeds budget (${budget} KB)`, 'red')
        hasViolations = true
      } else {
        log(`✅ ${type} size within budget`, 'green')
      }
    }
  }
  
  // Check individual chunk sizes
  for (const chunk of analysis.chunks) {
    const chunkKB = chunk.gzipSize / 1024
    const limit = chunk.isVendor ? BUNDLE_SIZE_LIMITS.vendor : 
                  chunk.isMain ? BUNDLE_SIZE_LIMITS.main : BUNDLE_SIZE_LIMITS.chunk
    
    if (chunkKB > limit) {
      log(`⚠️  Chunk ${chunk.path} (${formatSize(chunk.gzipSize)}) exceeds recommended size (${limit} KB)`, 'yellow')
    }
  }
  
  if (hasViolations) {
    log('\n💡 Optimization Suggestions:', 'yellow')
    log('  • Enable code splitting for large components')
    log('  • Use dynamic imports for non-critical features')
    log('  • Optimize images and use modern formats (WebP, AVIF)')
    log('  • Remove unused dependencies')
    log('  • Enable tree shaking')
    log('  • Use a CDN for large libraries')
    
    process.exit(1)
  } else {
    log('\n🎉 All performance budgets are within limits!', 'green')
  }
}

// Generate webpack bundle analyzer report
function generateWebpackAnalyzer() {
  log('\n📊 Generating detailed bundle analysis...', 'blue')
  
  try {
    // Install webpack-bundle-analyzer if not present
    try {
      require.resolve('webpack-bundle-analyzer')
    } catch {
      log('Installing webpack-bundle-analyzer...', 'yellow')
      execSync('npm install --save-dev webpack-bundle-analyzer', { stdio: 'inherit' })
    }
    
    // Generate analysis
    execSync('npx webpack-bundle-analyzer dist/stats.json --mode static --report dist/bundle-report.html --open', { stdio: 'inherit' })
    log('✅ Detailed bundle analysis generated at dist/bundle-report.html', 'green')
  } catch (error) {
    log(`⚠️  Could not generate detailed analysis: ${error.message}`, 'yellow')
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.includes('--detailed')) {
    generateWebpackAnalyzer()
  } else {
    analyzeBundleSize()
  }
}

module.exports = {
  analyzeBundleSize,
  generateWebpackAnalyzer,
  BUNDLE_SIZE_LIMITS,
  PERFORMANCE_BUDGETS,
}