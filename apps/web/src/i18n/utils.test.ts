import { describe, it, expect } from 'vitest'
import { isRTLLanguage, getLanguageInfo, SUPPORTED_LANGUAGES } from './index'
import { DateFormatter } from './utils/dateFormatter'

describe('I18n Utilities', () => {
  describe('RTL Language Detection', () => {
    it('should correctly identify RTL languages', () => {
      expect(isRTLLanguage('ar')).toBe(true)
      expect(isRTLLanguage('he')).toBe(true)
      expect(isRTLLanguage('en')).toBe(false)
      expect(isRTLLanguage('es')).toBe(false)
      expect(isRTLLanguage('fr')).toBe(false)
      expect(isRTLLanguage('de')).toBe(false)
    })

    it('should handle unknown languages', () => {
      expect(isRTLLanguage('unknown')).toBe(false)
    })
  })

  describe('Language Info', () => {
    it('should return correct language info for supported languages', () => {
      const englishInfo = getLanguageInfo('en')
      expect(englishInfo).toEqual({
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '🇺🇸'
      })

      const arabicInfo = getLanguageInfo('ar')
      expect(arabicInfo).toEqual({
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        flag: '🇸🇦',
        rtl: true
      })
    })

    it('should return undefined for unsupported languages', () => {
      expect(getLanguageInfo('unknown')).toBeUndefined()
    })
  })

  describe('Supported Languages', () => {
    it('should have all required language properties', () => {
      SUPPORTED_LANGUAGES.forEach(lang => {
        expect(lang).toHaveProperty('code')
        expect(lang).toHaveProperty('name')
        expect(lang).toHaveProperty('nativeName')
        expect(lang).toHaveProperty('flag')
        expect(typeof lang.code).toBe('string')
        expect(typeof lang.name).toBe('string')
        expect(typeof lang.nativeName).toBe('string')
        expect(typeof lang.flag).toBe('string')
      })
    })

    it('should have unique language codes', () => {
      const codes = SUPPORTED_LANGUAGES.map(lang => lang.code)
      const uniqueCodes = [...new Set(codes)]
      expect(codes).toHaveLength(uniqueCodes.length)
    })
  })
})

describe('Date Formatter', () => {
  let formatter: DateFormatter

  beforeEach(() => {
    formatter = new DateFormatter('en')
  })

  describe('Duration Formatting', () => {
    it('should format seconds correctly', () => {
      expect(formatter.formatDuration(30)).toBe('0:30')
      expect(formatter.formatDuration(65)).toBe('1:05')
      expect(formatter.formatDuration(125)).toBe('2:05')
      expect(formatter.formatDuration(3661)).toBe('61:01')
    })
  })

  describe('File Size Formatting', () => {
    it('should format file sizes correctly', () => {
      expect(formatter.formatFileSize(0)).toBe('0 B')
      expect(formatter.formatFileSize(1024)).toBe('1.0 KB')
      expect(formatter.formatFileSize(1024 * 1024)).toBe('1.0 MB')
      expect(formatter.formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB')
      expect(formatter.formatFileSize(1536)).toBe('1.5 KB')
    })
  })

  describe('Number Formatting', () => {
    it('should format numbers with locale', () => {
      const enFormatter = new DateFormatter('en')
      const frFormatter = new DateFormatter('fr')
      
      expect(enFormatter.formatNumber(1234.56)).toBe('1,234.56')
      // French uses a narrow no-break space (U+202F) as thousands separator
      expect(frFormatter.formatNumber(1234.56)).toMatch(/1[\s\u202f]234,56/)
    })
  })

  describe('Locale Changes', () => {
    it('should update locale correctly', () => {
      expect(formatter.locale).toBe('en')
      formatter.setLocale('fr')
      expect(formatter.locale).toBe('fr')
    })
  })
})