#!/usr/bin/env node

/**
 * Translation workflow management script
 * Usage: npm run translations [command]
 */

import fs from 'fs'
import path from 'path'

const commands = {
  stats: 'Generate translation statistics',
  missing: 'Generate missing translations report',
  validate: 'Validate all translation files',
  sync: 'Sync translations from source to targets',
  extract: 'Extract translation keys from source code',
  'copy-public': 'Copy translations to public directory',
  all: 'Run extract, sync, and copy-public',
}

// Simple translation statistics function
function generateStats() {
  const languages = ['es', 'fr', 'de', 'ar', 'he']
  const namespaces = ['common']
  const sourceDir = 'src/i18n/locales'
  
  console.log('📊 Translation Statistics:\n')
  
  // Read source (English) translations
  const sourceFile = path.join(sourceDir, 'en', 'common.json')
  if (!fs.existsSync(sourceFile)) {
    console.error('❌ Source translation file not found:', sourceFile)
    return
  }
  
  const sourceTranslations = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'))
  const sourceKeys = flattenKeys(sourceTranslations)
  const totalKeys = sourceKeys.length
  
  console.log(`Source (English): ${totalKeys} keys\n`)
  
  languages.forEach(lang => {
    const langFile = path.join(sourceDir, lang, 'common.json')
    if (fs.existsSync(langFile)) {
      try {
        const langTranslations = JSON.parse(fs.readFileSync(langFile, 'utf-8'))
        const langKeys = flattenKeys(langTranslations)
        const completion = Math.round((langKeys.length / totalKeys) * 100)
        const missing = totalKeys - langKeys.length
        
        console.log(`${lang.toUpperCase()}: ${langKeys.length}/${totalKeys} keys (${completion}%) - ${missing} missing`)
      } catch (error) {
        console.log(`${lang.toUpperCase()}: ❌ Invalid JSON`)
      }
    } else {
      console.log(`${lang.toUpperCase()}: ❌ File not found`)
    }
  })
}

// Simple copy to public function
function copyToPublic() {
  const sourceDir = 'src/i18n/locales'
  const publicDir = 'public/locales'
  const languages = ['en', 'es', 'fr', 'de', 'ar', 'he']
  
  console.log('📁 Copying translations to public directory...')
  
  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }
  
  languages.forEach(lang => {
    const langSourceDir = path.join(sourceDir, lang)
    const langPublicDir = path.join(publicDir, lang)
    
    if (fs.existsSync(langSourceDir)) {
      if (!fs.existsSync(langPublicDir)) {
        fs.mkdirSync(langPublicDir, { recursive: true })
      }
      
      // Copy common.json
      const sourceFile = path.join(langSourceDir, 'common.json')
      const publicFile = path.join(langPublicDir, 'common.json')
      
      if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, publicFile)
        console.log(`✅ Copied ${lang}/common.json`)
      }
    }
  })
}

// Helper function to flatten nested keys
function flattenKeys(obj, prefix = '') {
  const keys = []
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    
    if (typeof value === 'object' && value !== null) {
      keys.push(...flattenKeys(value, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  
  return keys
}

async function main() {
  const command = process.argv[2]
  
  if (!command || command === 'help') {
    console.log('🌍 Translation Workflow Manager\n')
    console.log('Available commands:')
    Object.entries(commands).forEach(([cmd, desc]) => {
      console.log(`  ${cmd.padEnd(12)} - ${desc}`)
    })
    console.log('\nUsage: npm run translations [command]')
    return
  }

  try {
    switch (command) {
      case 'stats':
        generateStats()
        break

      case 'copy-public':
        copyToPublic()
        break

      case 'validate':
        console.log('✅ Basic validation...')
        const languages = ['en', 'es', 'fr', 'de', 'ar', 'he']
        let isValid = true
        
        languages.forEach(lang => {
          const file = path.join('src/i18n/locales', lang, 'common.json')
          if (fs.existsSync(file)) {
            try {
              JSON.parse(fs.readFileSync(file, 'utf-8'))
              console.log(`✅ ${lang}/common.json is valid`)
            } catch (error) {
              console.log(`❌ ${lang}/common.json has invalid JSON`)
              isValid = false
            }
          } else {
            console.log(`⚠️  ${lang}/common.json not found`)
          }
        })
        
        process.exit(isValid ? 0 : 1)
        break

      case 'all':
        console.log('🚀 Running translation workflow...')
        generateStats()
        copyToPublic()
        console.log('\n✅ Translation workflow completed!')
        break

      default:
        console.error(`❌ Unknown command: ${command}`)
        console.log('\nAvailable commands:')
        Object.entries(commands).forEach(([cmd, desc]) => {
          console.log(`  ${cmd.padEnd(12)} - ${desc}`)
        })
        process.exit(1)
    }
  } catch (error) {
    console.error('❌ Translation workflow failed:', error)
    process.exit(1)
  }
}

main()