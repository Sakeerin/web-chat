import fs from 'fs'
import path from 'path'

export interface TranslationStats {
  language: string
  namespace: string
  totalKeys: number
  translatedKeys: number
  missingKeys: string[]
  completionPercentage: number
}

export interface TranslationWorkflowOptions {
  sourceLanguage: string
  targetLanguages: string[]
  localesDir: string
  namespaces: string[]
}

/**
 * Translation workflow manager for handling multiple languages
 */
export class TranslationManager {
  private options: TranslationWorkflowOptions

  constructor(options: Partial<TranslationWorkflowOptions> = {}) {
    this.options = {
      sourceLanguage: 'en',
      targetLanguages: ['es', 'fr', 'de', 'ar', 'he'],
      localesDir: 'src/i18n/locales',
      namespaces: ['common', 'auth', 'chat', 'settings', 'errors', 'admin'],
      ...options,
    }
  }

  /**
   * Generate translation statistics for all languages
   */
  async generateStats(): Promise<TranslationStats[]> {
    const stats: TranslationStats[] = []

    for (const namespace of this.options.namespaces) {
      // Get source keys
      const sourceKeys = await this.getKeysFromFile(this.options.sourceLanguage, namespace)
      
      for (const language of this.options.targetLanguages) {
        const targetKeys = await this.getKeysFromFile(language, namespace)
        const missingKeys = this.findMissingKeys(sourceKeys, targetKeys)
        
        stats.push({
          language,
          namespace,
          totalKeys: sourceKeys.length,
          translatedKeys: sourceKeys.length - missingKeys.length,
          missingKeys,
          completionPercentage: Math.round(((sourceKeys.length - missingKeys.length) / sourceKeys.length) * 100),
        })
      }
    }

    return stats
  }

  /**
   * Generate missing translations file for translators
   */
  async generateMissingTranslationsFile(): Promise<void> {
    const stats = await this.generateStats()
    const missingTranslations: Record<string, Record<string, string[]>> = {}

    stats.forEach(stat => {
      if (stat.missingKeys.length > 0) {
        if (!missingTranslations[stat.language]) {
          missingTranslations[stat.language] = {}
        }
        missingTranslations[stat.language][stat.namespace] = stat.missingKeys
      }
    })

    // Generate markdown report
    const reportPath = path.join(this.options.localesDir, 'MISSING_TRANSLATIONS.md')
    let report = '# Missing Translations Report\n\n'
    report += `Generated on: ${new Date().toISOString()}\n\n`

    for (const [language, namespaces] of Object.entries(missingTranslations)) {
      report += `## ${language.toUpperCase()}\n\n`
      
      for (const [namespace, keys] of Object.entries(namespaces)) {
        report += `### ${namespace}\n\n`
        keys.forEach(key => {
          report += `- [ ] \`${key}\`\n`
        })
        report += '\n'
      }
    }

    fs.writeFileSync(reportPath, report, 'utf-8')
    console.log(`📝 Missing translations report generated: ${reportPath}`)

    // Generate JSON file for automated tools
    const jsonPath = path.join(this.options.localesDir, 'missing-translations.json')
    fs.writeFileSync(jsonPath, JSON.stringify(missingTranslations, null, 2), 'utf-8')
    console.log(`📄 Missing translations JSON generated: ${jsonPath}`)
  }

  /**
   * Validate all translation files
   */
  async validateTranslations(): Promise<boolean> {
    let isValid = true
    const errors: string[] = []

    for (const namespace of this.options.namespaces) {
      const sourceFile = path.join(this.options.localesDir, this.options.sourceLanguage, `${namespace}.json`)
      
      if (!fs.existsSync(sourceFile)) {
        errors.push(`Source file missing: ${sourceFile}`)
        isValid = false
        continue
      }

      let sourceTranslations: any
      try {
        sourceTranslations = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'))
      } catch (error) {
        errors.push(`Invalid JSON in source file: ${sourceFile}`)
        isValid = false
        continue
      }

      for (const language of this.options.targetLanguages) {
        const targetFile = path.join(this.options.localesDir, language, `${namespace}.json`)
        
        if (!fs.existsSync(targetFile)) {
          errors.push(`Translation file missing: ${targetFile}`)
          isValid = false
          continue
        }

        try {
          const targetTranslations = JSON.parse(fs.readFileSync(targetFile, 'utf-8'))
          const validationErrors = this.validateTranslationStructure(
            sourceTranslations,
            targetTranslations,
            `${language}/${namespace}`
          )
          errors.push(...validationErrors)
          if (validationErrors.length > 0) {
            isValid = false
          }
        } catch (error) {
          errors.push(`Invalid JSON in translation file: ${targetFile}`)
          isValid = false
        }
      }
    }

    if (errors.length > 0) {
      console.error('❌ Translation validation errors:')
      errors.forEach(error => console.error(`  - ${error}`))
    } else {
      console.log('✅ All translations are valid!')
    }

    return isValid
  }

  /**
   * Sync translations from source to target languages
   */
  async syncTranslations(): Promise<void> {
    console.log('🔄 Syncing translations...')

    for (const namespace of this.options.namespaces) {
      const sourceFile = path.join(this.options.localesDir, this.options.sourceLanguage, `${namespace}.json`)
      
      if (!fs.existsSync(sourceFile)) {
        console.warn(`⚠️  Source file not found: ${sourceFile}`)
        continue
      }

      const sourceTranslations = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'))

      for (const language of this.options.targetLanguages) {
        const targetFile = path.join(this.options.localesDir, language, `${namespace}.json`)
        
        // Ensure directory exists
        const targetDir = path.dirname(targetFile)
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true })
        }

        let targetTranslations = {}
        if (fs.existsSync(targetFile)) {
          try {
            targetTranslations = JSON.parse(fs.readFileSync(targetFile, 'utf-8'))
          } catch (error) {
            console.warn(`⚠️  Invalid JSON in ${targetFile}, creating new file`)
          }
        }

        // Merge translations (preserve existing, add missing)
        const mergedTranslations = this.mergeTranslations(sourceTranslations, targetTranslations)
        
        fs.writeFileSync(targetFile, JSON.stringify(mergedTranslations, null, 2), 'utf-8')
        console.log(`✅ Synced ${language}/${namespace}.json`)
      }
    }

    // Copy to public directory for runtime loading
    await this.copyToPublicDirectory()
  }

  /**
   * Copy translation files to public directory
   */
  async copyToPublicDirectory(): Promise<void> {
    const publicDir = 'public/locales'
    
    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    const allLanguages = [this.options.sourceLanguage, ...this.options.targetLanguages]

    for (const language of allLanguages) {
      const langDir = path.join(publicDir, language)
      if (!fs.existsSync(langDir)) {
        fs.mkdirSync(langDir, { recursive: true })
      }

      for (const namespace of this.options.namespaces) {
        const sourceFile = path.join(this.options.localesDir, language, `${namespace}.json`)
        const targetFile = path.join(langDir, `${namespace}.json`)

        if (fs.existsSync(sourceFile)) {
          fs.copyFileSync(sourceFile, targetFile)
        }
      }
    }

    console.log('📁 Translation files copied to public directory')
  }

  /**
   * Get all keys from a translation file
   */
  private async getKeysFromFile(language: string, namespace: string): Promise<string[]> {
    const filePath = path.join(this.options.localesDir, language, `${namespace}.json`)
    
    if (!fs.existsSync(filePath)) {
      return []
    }

    try {
      const translations = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      return this.flattenKeys(translations)
    } catch (error) {
      console.warn(`Failed to parse ${filePath}:`, error)
      return []
    }
  }

  /**
   * Flatten nested translation keys
   */
  private flattenKeys(obj: any, prefix = ''): string[] {
    const keys: string[] = []

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key

      if (typeof value === 'object' && value !== null) {
        keys.push(...this.flattenKeys(value, fullKey))
      } else {
        keys.push(fullKey)
      }
    }

    return keys
  }

  /**
   * Find missing keys between source and target
   */
  private findMissingKeys(sourceKeys: string[], targetKeys: string[]): string[] {
    return sourceKeys.filter(key => !targetKeys.includes(key))
  }

  /**
   * Validate translation structure matches source
   */
  private validateTranslationStructure(
    source: any,
    target: any,
    context: string
  ): string[] {
    const errors: string[] = []

    for (const [key, value] of Object.entries(source)) {
      if (!(key in target)) {
        errors.push(`Missing key in ${context}: ${key}`)
        continue
      }

      if (typeof value === 'object' && value !== null) {
        if (typeof target[key] !== 'object' || target[key] === null) {
          errors.push(`Type mismatch in ${context}: ${key} should be object`)
        } else {
          errors.push(...this.validateTranslationStructure(value, target[key], `${context}.${key}`))
        }
      }
    }

    return errors
  }

  /**
   * Merge translations preserving existing values
   */
  private mergeTranslations(source: any, target: any): any {
    const result = { ...target }

    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'object' && value !== null) {
        result[key] = this.mergeTranslations(value, result[key] || {})
      } else if (!(key in result)) {
        result[key] = value
      }
    }

    return result
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new TranslationManager()
  const command = process.argv[2]

  switch (command) {
    case 'stats':
      manager.generateStats().then(stats => {
        console.table(stats)
      })
      break
    
    case 'missing':
      manager.generateMissingTranslationsFile()
      break
    
    case 'validate':
      manager.validateTranslations().then(isValid => {
        process.exit(isValid ? 0 : 1)
      })
      break
    
    case 'sync':
      manager.syncTranslations()
      break
    
    default:
      console.log('Usage: node translationManager.js [stats|missing|validate|sync]')
      break
  }
}