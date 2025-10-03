import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DateFormatter, getDateFormatter } from '../utils/dateFormatter'

/**
 * Hook for locale-aware date formatting
 */
export function useDateFormatter() {
  const { i18n } = useTranslation()
  
  const formatter = useMemo(() => {
    return getDateFormatter(i18n.language)
  }, [i18n.language])

  // Update formatter when language changes
  useMemo(() => {
    formatter.setLocale(i18n.language)
  }, [formatter, i18n.language])

  return {
    formatter,
    formatDate: formatter.formatDate.bind(formatter),
    formatTime: formatter.formatTime.bind(formatter),
    formatRelativeDate: formatter.formatRelativeDate.bind(formatter),
    formatAbsoluteDate: formatter.formatAbsoluteDate.bind(formatter),
    formatMessageTime: formatter.formatMessageTime.bind(formatter),
    formatLastSeen: formatter.formatLastSeen.bind(formatter),
    formatDuration: formatter.formatDuration.bind(formatter),
    formatFileSize: formatter.formatFileSize.bind(formatter),
    formatNumber: formatter.formatNumber.bind(formatter),
    formatCurrency: formatter.formatCurrency.bind(formatter),
  }
}