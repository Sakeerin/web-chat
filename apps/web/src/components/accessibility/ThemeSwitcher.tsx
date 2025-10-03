import React, { useState } from 'react'
import { Button } from '@ui/components/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select'
import { useAccessibility } from './AccessibilityProvider'
import { Moon, Sun, Contrast } from 'lucide-react'

interface ThemeSwitcherProps {
  className?: string
  showLabel?: boolean
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  className = '',
  showLabel = true
}) => {
  const { theme, setTheme, isHighContrast } = useAccessibility()
  const [isOpen, setIsOpen] = useState(false)

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'high-contrast', label: 'High Contrast', icon: Contrast }
  ] as const

  const currentTheme = themes.find(t => t.value === theme) || themes[0]
  const CurrentIcon = currentTheme.icon

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'high-contrast') => {
    setTheme(newTheme)
    setIsOpen(false)
    
    // Announce theme change to screen readers
    const announcement = `Theme changed to ${themes.find(t => t.value === newTheme)?.label}`
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', 'polite')
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    liveRegion.textContent = announcement
    document.body.appendChild(liveRegion)
    
    setTimeout(() => {
      document.body.removeChild(liveRegion)
    }, 1000)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <label htmlFor="theme-selector" className="text-sm font-medium">
          Theme:
        </label>
      )}
      
      <Select
        value={theme}
        onValueChange={handleThemeChange}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger 
          id="theme-selector"
          className="w-[140px]"
          aria-label={`Current theme: ${currentTheme.label}. Click to change theme.`}
        >
          <div className="flex items-center gap-2">
            <CurrentIcon className="h-4 w-4" aria-hidden="true" />
            <SelectValue />
          </div>
        </SelectTrigger>
        
        <SelectContent role="listbox" aria-label="Theme options">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon
            return (
              <SelectItem
                key={themeOption.value}
                value={themeOption.value}
                role="option"
                aria-selected={theme === themeOption.value}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{themeOption.label}</span>
                  {theme === themeOption.value && (
                    <span className="sr-only">(current)</span>
                  )}
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
      
      {isHighContrast && (
        <div className="text-xs text-muted-foreground">
          <span className="sr-only">System high contrast mode detected</span>
          <Contrast className="h-3 w-3" aria-label="High contrast mode active" />
        </div>
      )}
    </div>
  )
}

interface QuickThemeToggleProps {
  className?: string
}

export const QuickThemeToggle: React.FC<QuickThemeToggleProps> = ({
  className = ''
}) => {
  const { theme, setTheme } = useAccessibility()

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'high-contrast' : 'light'
    setTheme(nextTheme)
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return Sun
      case 'dark':
        return Moon
      case 'high-contrast':
        return Contrast
      default:
        return Sun
    }
  }

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Switch to dark theme'
      case 'dark':
        return 'Switch to high contrast theme'
      case 'high-contrast':
        return 'Switch to light theme'
      default:
        return 'Switch theme'
    }
  }

  const Icon = getThemeIcon()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={className}
      aria-label={getThemeLabel()}
      title={getThemeLabel()}
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">{getThemeLabel()}</span>
    </Button>
  )
}