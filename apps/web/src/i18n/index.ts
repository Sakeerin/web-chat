import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'

// Import translation resources
import enTranslations from './locales/en/common.json'
import esTranslations from './locales/es/common.json'
import frTranslations from './locales/fr/common.json'
import deTranslations from './locales/de/common.json'
import arTranslations from './locales/ar/common.json'
import heTranslations from './locales/he/common.json'

// Language configuration
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', rtl: true },
] as const

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]['code']

// RTL languages
export const RTL_LANGUAGES = ['ar', 'he'] as const

// Check if language is RTL
export const isRTLLanguage = (language: string): boolean => {
  return RTL_LANGUAGES.includes(language as any)
}

// Get language info
export const getLanguageInfo = (code: string) => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code)
}

// Initialize i18next
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Fallback language
    fallbackLng: 'en',
    
    // Debug mode (only in development)
    debug: import.meta.env.DEV,
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    
    // Backend options for loading translations
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      addPath: '/locales/{{lng}}/{{ns}}.missing.json',
    },
    
    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // Resources (embedded for faster initial load)
    resources: {
      en: { common: enTranslations },
      es: { common: esTranslations },
      fr: { common: frTranslations },
      de: { common: deTranslations },
      ar: { common: arTranslations },
      he: { common: heTranslations },
    },
    
    // Default namespace
    defaultNS: 'common',
    
    // Namespaces
    ns: ['common', 'auth', 'chat', 'settings', 'errors'],
    
    // React options
    react: {
      useSuspense: false, // We'll handle loading states manually
      bindI18n: 'languageChanged',
      bindI18nStore: '',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em'],
    },
    
    // Pluralization
    pluralSeparator: '_',
    contextSeparator: '_',
    
    // Performance optimizations
    load: 'languageOnly', // Don't load country-specific variants
    preload: ['en'], // Preload English
    
    // Key separator
    keySeparator: '.',
    nsSeparator: ':',
  })

export default i18n