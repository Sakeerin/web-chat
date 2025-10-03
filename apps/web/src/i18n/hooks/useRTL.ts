import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { isRTLLanguage } from '../index'

/**
 * Hook for managing RTL (Right-to-Left) language support
 */
export function useRTL() {
  const { i18n } = useTranslation()
  const currentLanguage = i18n.language
  const isRTL = isRTLLanguage(currentLanguage)

  useEffect(() => {
    // Update document direction
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = currentLanguage

    // Update body class for CSS targeting
    document.body.classList.toggle('rtl', isRTL)
    document.body.classList.toggle('ltr', !isRTL)

    // Update CSS custom property for dynamic styling
    document.documentElement.style.setProperty('--text-direction', isRTL ? 'rtl' : 'ltr')
    document.documentElement.style.setProperty('--start', isRTL ? 'right' : 'left')
    document.documentElement.style.setProperty('--end', isRTL ? 'left' : 'right')

    // Announce direction change to screen readers
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = isRTL 
      ? 'Text direction changed to right-to-left' 
      : 'Text direction changed to left-to-right'
    
    document.body.appendChild(announcement)
    
    // Remove announcement after screen readers have processed it
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)

  }, [currentLanguage, isRTL])

  return {
    isRTL,
    direction: isRTL ? 'rtl' : 'ltr',
    textAlign: isRTL ? 'right' : 'left',
    marginStart: isRTL ? 'marginRight' : 'marginLeft',
    marginEnd: isRTL ? 'marginLeft' : 'marginRight',
    paddingStart: isRTL ? 'paddingRight' : 'paddingLeft',
    paddingEnd: isRTL ? 'paddingLeft' : 'paddingRight',
    borderStart: isRTL ? 'borderRight' : 'borderLeft',
    borderEnd: isRTL ? 'borderLeft' : 'borderRight',
    start: isRTL ? 'right' : 'left',
    end: isRTL ? 'left' : 'right',
  }
}