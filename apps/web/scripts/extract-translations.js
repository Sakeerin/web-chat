#!/usr/bin/env node

/**
 * Translation key extraction script
 * Usage: npm run extract-translations
 */

import { TranslationKeyExtractor } from '../src/i18n/utils/keyExtractor.js'

async function main() {
  console.log('🔍 Extracting translation keys...')
  
  const extractor = new TranslationKeyExtractor({
    srcDir: 'src',
    outputDir: 'src/i18n/locales',
    extensions: ['ts', 'tsx'],
    namespaces: ['common', 'auth', 'chat', 'settings', 'errors', 'admin'],
    defaultNamespace: 'common',
  })

  try {
    await extractor.extractKeys()
    extractor.generateMissingKeysReport()
    
    console.log('\n✅ Translation key extraction completed!')
    console.log('📝 Check the generated files in src/i18n/locales/')
    console.log('🔄 Don\'t forget to copy updated files to public/locales/ for runtime loading')
  } catch (error) {
    console.error('❌ Translation key extraction failed:', error)
    process.exit(1)
  }
}

main()