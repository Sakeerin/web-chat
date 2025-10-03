import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

interface TranslationKey {
  key: string
  defaultValue?: string
  namespace?: string
  file: string
  line: number
}

interface ExtractionOptions {
  srcDir: string
  outputDir: string
  extensions: string[]
  namespaces: string[]
  defaultNamespace: string
}

/**
 * Extract translation keys from source files
 */
export class TranslationKeyExtractor {
  private options: ExtractionOptions
  private extractedKeys: Map<string, TranslationKey[]> = new Map()

  constructor(options: Partial<ExtractionOptions> = {}) {
    this.options = {
      srcDir: 'src',
      outputDir: 'src/i18n/locales',
      extensions: ['ts', 'tsx', 'js', 'jsx'],
      namespaces: ['common', 'auth', 'chat', 'settings', 'errors'],
      defaultNamespace: 'common',
      ...options,
    }
  }

  /**
   * Extract all translation keys from source files
   */
  async extractKeys(): Promise<void> {
    const pattern = `${this.options.srcDir}/**/*.{${this.options.extensions.join(',')}}`
    const files = await glob(pattern)

    for (const file of files) {
      await this.extractFromFile(file)
    }

    await this.generateTranslationFiles()
  }

  /**
   * Extract keys from a single file
   */
  private async extractFromFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    // Regex patterns for different translation function calls
    const patterns = [
      // t('key'), t("key")
      /\bt\s*\(\s*['"`]([^'"`]+)['"`]/g,
      // t('key', { defaultValue: 'value' })
      /\bt\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{[^}]*defaultValue\s*:\s*['"`]([^'"`]+)['"`]/g,
      // useTranslation('namespace').t('key')
      /useTranslation\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\.t\s*\(\s*['"`]([^'"`]+)['"`]/g,
      // i18n.t('namespace:key')
      /i18n\.t\s*\(\s*['"`]([^'"`]+)['"`]/g,
    ]

    lines.forEach((line, lineIndex) => {
      patterns.forEach(pattern => {
        let match
        while ((match = pattern.exec(line)) !== null) {
          const key = match[1]
          const defaultValue = match[2]
          const namespace = this.extractNamespace(key) || this.options.defaultNamespace

          const translationKey: TranslationKey = {
            key: this.cleanKey(key),
            defaultValue,
            namespace,
            file: filePath,
            line: lineIndex + 1,
          }

          this.addKey(namespace, translationKey)
        }
      })
    })
  }

  /**
   * Extract namespace from key (e.g., 'auth:login' -> 'auth')
   */
  private extractNamespace(key: string): string | undefined {
    const parts = key.split(':')
    return parts.length > 1 ? parts[0] : undefined
  }

  /**
   * Clean key by removing namespace prefix
   */
  private cleanKey(key: string): string {
    const parts = key.split(':')
    return parts.length > 1 ? parts[1] : key
  }

  /**
   * Add key to the extracted keys map
   */
  private addKey(namespace: string, key: TranslationKey): void {
    if (!this.extractedKeys.has(namespace)) {
      this.extractedKeys.set(namespace, [])
    }

    const keys = this.extractedKeys.get(namespace)!
    const existingKey = keys.find(k => k.key === key.key)

    if (!existingKey) {
      keys.push(key)
    }
  }

  /**
   * Generate translation files for all namespaces
   */
  private async generateTranslationFiles(): Promise<void> {
    for (const [namespace, keys] of this.extractedKeys) {
      await this.generateNamespaceFile(namespace, keys)
    }
  }

  /**
   * Generate translation file for a specific namespace
   */
  private async generateNamespaceFile(namespace: string, keys: TranslationKey[]): Promise<void> {
    const translations: Record<string, any> = {}

    keys.forEach(key => {
      this.setNestedValue(translations, key.key, key.defaultValue || key.key)
    })

    // Generate for each supported language
    const languages = ['en', 'es', 'fr', 'de', 'ar', 'he']
    
    for (const lang of languages) {
      const outputPath = path.join(this.options.outputDir, lang, `${namespace}.json`)
      
      // Load existing translations if file exists
      let existingTranslations = {}
      if (fs.existsSync(outputPath)) {
        try {
          existingTranslations = JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
        } catch (error) {
          console.warn(`Failed to parse existing translations for ${lang}/${namespace}:`, error)
        }
      }

      // Merge with existing translations (preserve existing values)
      const mergedTranslations = this.mergeTranslations(existingTranslations, translations)

      // Ensure directory exists
      const dir = path.dirname(outputPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // Write the file
      fs.writeFileSync(outputPath, JSON.stringify(mergedTranslations, null, 2), 'utf-8')
      console.log(`Generated ${outputPath} with ${keys.length} keys`)
    }
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    let current = obj

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key]
    }

    current[keys[keys.length - 1]] = value
  }

  /**
   * Merge translations, preserving existing values
   */
  private mergeTranslations(existing: any, extracted: any): any {
    const result = { ...existing }

    for (const [key, value] of Object.entries(extracted)) {
      if (typeof value === 'object' && value !== null) {
        result[key] = this.mergeTranslations(result[key] || {}, value)
      } else if (!(key in result)) {
        result[key] = value
      }
    }

    return result
  }

  /**
   * Generate missing keys report
   */
  generateMissingKeysReport(): void {
    const languages = ['en', 'es', 'fr', 'de', 'ar', 'he']
    const report: Record<string, string[]> = {}

    for (const [namespace, keys] of this.extractedKeys) {
      for (const lang of languages) {
        const filePath = path.join(this.options.outputDir, lang, `${namespace}.json`)
        
        if (fs.existsSync(filePath)) {
          try {
            const translations = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
            const missingKeys = keys.filter(key => !this.hasNestedKey(translations, key.key))
            
            if (missingKeys.length > 0) {
              const reportKey = `${lang}/${namespace}`
              report[reportKey] = missingKeys.map(k => k.key)
            }
          } catch (error) {
            console.error(`Error reading ${filePath}:`, error)
          }
        }
      }
    }

    if (Object.keys(report).length > 0) {
      console.log('\n=== Missing Translation Keys ===')
      for (const [file, keys] of Object.entries(report)) {
        console.log(`\n${file}:`)
        keys.forEach(key => console.log(`  - ${key}`))
      }
    } else {
      console.log('\n✅ All translation keys are present!')
    }
  }

  /**
   * Check if nested key exists in object
   */
  private hasNestedKey(obj: any, path: string): boolean {
    const keys = path.split('.')
    let current = obj

    for (const key of keys) {
      if (typeof current !== 'object' || current === null || !(key in current)) {
        return false
      }
      current = current[key]
    }

    return true
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const extractor = new TranslationKeyExtractor()
  
  extractor.extractKeys().then(() => {
    extractor.generateMissingKeysReport()
    console.log('\n✅ Translation key extraction completed!')
  }).catch(error => {
    console.error('❌ Translation key extraction failed:', error)
    process.exit(1)
  })
}