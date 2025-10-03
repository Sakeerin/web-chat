import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns'
import { enUS, es, fr, de, ar, he } from 'date-fns/locale'

// Locale mapping for date-fns
const LOCALE_MAP = {
  en: enUS,
  es: es,
  fr: fr,
  de: de,
  ar: ar,
  he: he,
} as const

export type SupportedDateLocale = keyof typeof LOCALE_MAP

/**
 * Get date-fns locale object for the given language code
 */
export function getDateLocale(languageCode: string): Locale {
  const locale = LOCALE_MAP[languageCode as SupportedDateLocale]
  return locale || enUS // Fallback to English
}

/**
 * Format date according to locale and context
 */
export interface DateFormatOptions {
  locale?: string
  includeTime?: boolean
  relative?: boolean
  short?: boolean
}

export class DateFormatter {
  private locale: string
  private dateLocale: Locale

  constructor(locale: string = 'en') {
    this.locale = locale
    this.dateLocale = getDateLocale(locale)
  }

  /**
   * Format a date with locale-specific formatting
   */
  formatDate(date: Date | string | number, options: DateFormatOptions = {}): string {
    const dateObj = new Date(date)
    const {
      includeTime = false,
      relative = false,
      short = false,
    } = options

    if (relative) {
      return this.formatRelativeDate(dateObj, { short })
    }

    return this.formatAbsoluteDate(dateObj, { includeTime, short })
  }

  /**
   * Format relative date (e.g., "2 hours ago", "yesterday")
   */
  formatRelativeDate(date: Date, options: { short?: boolean } = {}): string {
    const { short = false } = options

    try {
      // Use smart relative formatting for recent dates
      if (isToday(date)) {
        return format(date, short ? 'HH:mm' : 'HH:mm', { locale: this.dateLocale })
      }

      if (isYesterday(date)) {
        return this.getLocalizedString('common.yesterday')
      }

      if (isThisWeek(date)) {
        return format(date, short ? 'EEE' : 'EEEE', { locale: this.dateLocale })
      }

      if (isThisMonth(date)) {
        return format(date, short ? 'MMM d' : 'MMMM d', { locale: this.dateLocale })
      }

      // For older dates, use distance format
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: this.dateLocale,
      })
    } catch (error) {
      console.warn('Date formatting error:', error)
      return this.formatAbsoluteDate(date, { short: true })
    }
  }

  /**
   * Format absolute date
   */
  formatAbsoluteDate(date: Date, options: { includeTime?: boolean; short?: boolean } = {}): string {
    const { includeTime = false, short = false } = options

    try {
      let formatString: string

      if (short) {
        formatString = includeTime ? 'MMM d, HH:mm' : 'MMM d'
      } else {
        formatString = includeTime ? 'MMMM d, yyyy \'at\' HH:mm' : 'MMMM d, yyyy'
      }

      return format(date, formatString, { locale: this.dateLocale })
    } catch (error) {
      console.warn('Date formatting error:', error)
      return date.toLocaleDateString(this.locale)
    }
  }

  /**
   * Format time only
   */
  formatTime(date: Date | string | number, options: { short?: boolean } = {}): string {
    const dateObj = new Date(date)
    const { short = false } = options

    try {
      const formatString = short ? 'HH:mm' : 'HH:mm:ss'
      return format(dateObj, formatString, { locale: this.dateLocale })
    } catch (error) {
      console.warn('Time formatting error:', error)
      return dateObj.toLocaleTimeString(this.locale)
    }
  }

  /**
   * Format message timestamp for chat interface
   */
  formatMessageTime(date: Date | string | number): string {
    const dateObj = new Date(date)

    if (isToday(dateObj)) {
      return this.formatTime(dateObj, { short: true })
    }

    if (isYesterday(dateObj)) {
      return `${this.getLocalizedString('common.yesterday')} ${this.formatTime(dateObj, { short: true })}`
    }

    if (isThisWeek(dateObj)) {
      return `${format(dateObj, 'EEE', { locale: this.dateLocale })} ${this.formatTime(dateObj, { short: true })}`
    }

    return this.formatAbsoluteDate(dateObj, { includeTime: true, short: true })
  }

  /**
   * Format last seen timestamp
   */
  formatLastSeen(date: Date | string | number): string {
    const dateObj = new Date(date)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) {
      return this.getLocalizedString('common.justNow')
    }

    if (diffInMinutes < 60) {
      return this.getLocalizedString('common.lastSeen', { 
        time: `${diffInMinutes} ${this.getLocalizedString(diffInMinutes === 1 ? 'time.minute' : 'time.minutes')} ${this.getLocalizedString('time.ago')}`
      })
    }

    return this.getLocalizedString('common.lastSeen', {
      time: this.formatRelativeDate(dateObj, { short: true })
    })
  }

  /**
   * Format duration (e.g., for voice messages)
   */
  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    if (minutes === 0) {
      return `0:${remainingSeconds.toString().padStart(2, '0')}`
    }

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    const formatter = new Intl.NumberFormat(this.locale, {
      minimumFractionDigits: unitIndex === 0 ? 0 : 1,
      maximumFractionDigits: unitIndex === 0 ? 0 : 1,
    })

    return `${formatter.format(size)} ${units[unitIndex]}`
  }

  /**
   * Format number with locale-specific formatting
   */
  formatNumber(number: number, options: Intl.NumberFormatOptions = {}): string {
    return new Intl.NumberFormat(this.locale, options).format(number)
  }

  /**
   * Format currency (if needed for premium features)
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency,
    }).format(amount)
  }

  /**
   * Get localized string (placeholder - would integrate with i18n)
   */
  private getLocalizedString(key: string, params?: Record<string, any>): string {
    // This would integrate with the actual i18n system
    // For now, return the key as fallback
    let result = key

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        result = result.replace(`{{${paramKey}}}`, String(value))
      })
    }

    return result
  }

  /**
   * Update locale
   */
  setLocale(locale: string): void {
    this.locale = locale
    this.dateLocale = getDateLocale(locale)
  }
}

// Singleton instance
let dateFormatterInstance: DateFormatter | null = null

/**
 * Get or create date formatter instance
 */
export function getDateFormatter(locale?: string): DateFormatter {
  if (!dateFormatterInstance || (locale && dateFormatterInstance.locale !== locale)) {
    dateFormatterInstance = new DateFormatter(locale)
  }
  return dateFormatterInstance
}

/**
 * Utility functions for common date formatting needs
 */
export const dateUtils = {
  formatMessage: (date: Date | string | number, locale?: string) => 
    getDateFormatter(locale).formatMessageTime(date),
    
  formatLastSeen: (date: Date | string | number, locale?: string) => 
    getDateFormatter(locale).formatLastSeen(date),
    
  formatRelative: (date: Date | string | number, locale?: string) => 
    getDateFormatter(locale).formatRelativeDate(new Date(date)),
    
  formatTime: (date: Date | string | number, locale?: string) => 
    getDateFormatter(locale).formatTime(date, { short: true }),
    
  formatDuration: (seconds: number, locale?: string) => 
    getDateFormatter(locale).formatDuration(seconds),
    
  formatFileSize: (bytes: number, locale?: string) => 
    getDateFormatter(locale).formatFileSize(bytes),
}