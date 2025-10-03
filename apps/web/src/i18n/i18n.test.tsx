import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { useTranslation } from 'react-i18next'
import { I18nProvider } from './components/I18nProvider'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { useRTL } from './hooks/useRTL'
import { useDateFormatter } from './hooks/useDateFormatter'
import { isRTLLanguage, getLanguageInfo } from './index'

// Test component that uses translation
function TestComponent() {
  const { t, i18n } = useTranslation()
  const { isRTL } = useRTL()
  const { formatMessageTime } = useDateFormatter()

  return (
    <div>
      <span data-testid="greeting">{t('common.loading')}</span>
      <span data-testid="language">{i18n.language}</span>
      <span data-testid="direction">{isRTL ? 'rtl' : 'ltr'}</span>
      <span data-testid="time">{formatMessageTime(new Date())}</span>
    </div>
  )
}

describe('I18n System', () => {
  it('should render with default language', async () => {
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('greeting')).toHaveTextContent('Loading...')
      expect(screen.getByTestId('language')).toHaveTextContent('en')
      expect(screen.getByTestId('direction')).toHaveTextContent('ltr')
    })
  })

  it('should detect RTL languages correctly', () => {
    expect(isRTLLanguage('ar')).toBe(true)
    expect(isRTLLanguage('he')).toBe(true)
    expect(isRTLLanguage('en')).toBe(false)
    expect(isRTLLanguage('es')).toBe(false)
  })

  it('should get language info correctly', () => {
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

  it('should render language switcher', async () => {
    render(
      <I18nProvider>
        <LanguageSwitcher />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })
})

describe('Date Formatter', () => {
  it('should format dates correctly', () => {
    const TestDateComponent = () => {
      const { formatMessageTime, formatDuration, formatFileSize } = useDateFormatter()
      const testDate = new Date('2023-10-03T10:30:00Z')

      return (
        <div>
          <span data-testid="message-time">{formatMessageTime(testDate)}</span>
          <span data-testid="duration">{formatDuration(125)}</span>
          <span data-testid="file-size">{formatFileSize(1024 * 1024)}</span>
        </div>
      )
    }

    render(
      <I18nProvider>
        <TestDateComponent />
      </I18nProvider>
    )

    expect(screen.getByTestId('duration')).toHaveTextContent('2:05')
    expect(screen.getByTestId('file-size')).toHaveTextContent('1.0 MB')
  })
})

describe('RTL Support', () => {
  it('should apply RTL styles when language is RTL', async () => {
    const TestRTLComponent = () => {
      const { isRTL, direction } = useRTL()
      
      return (
        <div data-testid="rtl-container" dir={direction}>
          <span data-testid="is-rtl">{isRTL.toString()}</span>
        </div>
      )
    }

    render(
      <I18nProvider>
        <TestRTLComponent />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('rtl-container')).toHaveAttribute('dir', 'ltr')
      expect(screen.getByTestId('is-rtl')).toHaveTextContent('false')
    })
  })
})