import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Globe } from 'lucide-react'

import { Button } from '@ui/components/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/components/dropdown-menu'

import { SUPPORTED_LANGUAGES, getLanguageInfo, isRTLLanguage } from '../index'
import { useRTL } from '../hooks/useRTL'

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'icon-only'
  showFlag?: boolean
  showNativeName?: boolean
  className?: string
}

export function LanguageSwitcher({
  variant = 'default',
  showFlag = true,
  showNativeName = true,
  className = '',
}: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation()
  const { isRTL } = useRTL()
  const [isChanging, setIsChanging] = useState(false)

  const currentLanguage = i18n.language
  const currentLanguageInfo = getLanguageInfo(currentLanguage)

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === currentLanguage) return

    setIsChanging(true)
    
    try {
      await i18n.changeLanguage(languageCode)
      
      // Store language preference
      localStorage.setItem('i18nextLng', languageCode)
      
      // Announce language change to screen readers
      const announcement = document.createElement('div')
      announcement.setAttribute('aria-live', 'polite')
      announcement.setAttribute('aria-atomic', 'true')
      announcement.className = 'sr-only'
      
      const newLanguageInfo = getLanguageInfo(languageCode)
      announcement.textContent = t('language.changed', { 
        language: newLanguageInfo?.nativeName || languageCode 
      })
      
      document.body.appendChild(announcement)
      
      setTimeout(() => {
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement)
        }
      }, 2000)

      // Announce RTL change if applicable
      if (isRTLLanguage(languageCode) !== isRTLLanguage(currentLanguage)) {
        setTimeout(() => {
          const rtlAnnouncement = document.createElement('div')
          rtlAnnouncement.setAttribute('aria-live', 'polite')
          rtlAnnouncement.className = 'sr-only'
          rtlAnnouncement.textContent = isRTLLanguage(languageCode)
            ? t('language.rtlEnabled')
            : t('language.rtlDisabled')
          
          document.body.appendChild(rtlAnnouncement)
          
          setTimeout(() => {
            if (document.body.contains(rtlAnnouncement)) {
              document.body.removeChild(rtlAnnouncement)
            }
          }, 2000)
        }, 500)
      }

    } catch (error) {
      console.error('Failed to change language:', error)
    } finally {
      setIsChanging(false)
    }
  }

  const renderTriggerContent = () => {
    if (variant === 'icon-only') {
      return (
        <Globe 
          className="h-4 w-4" 
          aria-label={t('language.current')}
        />
      )
    }

    if (variant === 'compact') {
      return (
        <div className="flex items-center gap-2">
          {showFlag && currentLanguageInfo && (
            <span className="text-sm" role="img" aria-hidden="true">
              {currentLanguageInfo.flag}
            </span>
          )}
          <span className="text-sm font-medium">
            {currentLanguageInfo?.code.toUpperCase() || currentLanguage.toUpperCase()}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2">
        {showFlag && currentLanguageInfo && (
          <span className="text-lg" role="img" aria-hidden="true">
            {currentLanguageInfo.flag}
          </span>
        )}
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">
            {showNativeName && currentLanguageInfo
              ? currentLanguageInfo.nativeName
              : currentLanguageInfo?.name || currentLanguage
            }
          </span>
          {variant === 'default' && (
            <span className="text-xs text-muted-foreground">
              {t('language.current')}
            </span>
          )}
        </div>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`justify-start ${className}`}
          disabled={isChanging}
          aria-label={t('language.select')}
          aria-expanded="false"
          aria-haspopup="menu"
        >
          {renderTriggerContent()}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align={isRTL ? 'end' : 'start'}
        className="w-56"
        role="menu"
        aria-label={t('language.select')}
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center gap-3 cursor-pointer"
            role="menuitem"
            aria-current={language.code === currentLanguage ? 'true' : 'false'}
          >
            <span className="text-lg" role="img" aria-hidden="true">
              {language.flag}
            </span>
            
            <div className="flex flex-col flex-1">
              <span className="font-medium">
                {showNativeName ? language.nativeName : language.name}
              </span>
              {showNativeName && language.nativeName !== language.name && (
                <span className="text-xs text-muted-foreground">
                  {language.name}
                </span>
              )}
            </div>

            {language.rtl && (
              <span className="text-xs text-muted-foreground px-1 py-0.5 bg-muted rounded">
                RTL
              </span>
            )}

            {language.code === currentLanguage && (
              <Check className="h-4 w-4 text-primary" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Compact language switcher for mobile/small spaces
 */
export function CompactLanguageSwitcher(props: Omit<LanguageSwitcherProps, 'variant'>) {
  return <LanguageSwitcher {...props} variant="compact" />
}

/**
 * Icon-only language switcher for minimal UI
 */
export function IconLanguageSwitcher(props: Omit<LanguageSwitcherProps, 'variant'>) {
  return <LanguageSwitcher {...props} variant="icon-only" />
}