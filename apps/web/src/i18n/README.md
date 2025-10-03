# Internationalization (i18n) Implementation

This directory contains the complete internationalization implementation for the Telegram Web Chat application, supporting multiple languages including RTL (Right-to-Left) languages.

## Features

- ✅ **React i18next Integration**: Full i18n framework setup with React hooks
- ✅ **Multiple Language Support**: English, Spanish, French, German, Arabic, Hebrew
- ✅ **RTL Language Support**: Proper CSS and layout support for Arabic and Hebrew
- ✅ **Date/Time Localization**: Locale-aware date and time formatting
- ✅ **Language Switching**: User interface for changing languages with persistence
- ✅ **Translation Management**: Tools for extracting, managing, and validating translations
- ✅ **Accessibility**: Screen reader announcements for language changes

## Supported Languages

| Language | Code | Native Name | RTL | Status |
|----------|------|-------------|-----|--------|
| English  | `en` | English     | No  | ✅ Complete |
| Spanish  | `es` | Español     | No  | ✅ Complete |
| French   | `fr` | Français    | No  | ✅ Complete |
| German   | `de` | Deutsch     | No  | ✅ Complete |
| Arabic   | `ar` | العربية     | Yes | ✅ Complete |
| Hebrew   | `he` | עברית       | Yes | ✅ Complete |

## Directory Structure

```
src/i18n/
├── components/
│   ├── I18nProvider.tsx          # Main i18n provider component
│   └── LanguageSwitcher.tsx      # Language selection UI component
├── hooks/
│   ├── useRTL.ts                 # RTL language support hook
│   └── useDateFormatter.ts       # Date formatting hook
├── locales/
│   ├── en/common.json            # English translations
│   ├── es/common.json            # Spanish translations
│   ├── fr/common.json            # French translations
│   ├── de/common.json            # German translations
│   ├── ar/common.json            # Arabic translations
│   └── he/common.json            # Hebrew translations
├── utils/
│   ├── dateFormatter.ts          # Date/time formatting utilities
│   ├── keyExtractor.ts           # Translation key extraction tool
│   └── translationManager.ts     # Translation workflow management
├── index.ts                      # Main i18n configuration
└── README.md                     # This file
```

## Usage

### Basic Translation

```tsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()
  
  return (
    <div>
      <h1>{t('common.loading')}</h1>
      <p>{t('common.error')}</p>
    </div>
  )
}
```

### Language Switching

```tsx
import { LanguageSwitcher } from '@/i18n/components/LanguageSwitcher'

function SettingsPage() {
  return (
    <div>
      <h2>Language Settings</h2>
      <LanguageSwitcher variant="default" showFlag={true} />
    </div>
  )
}
```

### RTL Support

```tsx
import { useRTL } from '@/i18n/hooks/useRTL'

function MyComponent() {
  const { isRTL, direction } = useRTL()
  
  return (
    <div dir={direction} className={isRTL ? 'rtl' : 'ltr'}>
      <p>This text respects RTL languages</p>
    </div>
  )
}
```

### Date Formatting

```tsx
import { useDateFormatter } from '@/i18n/hooks/useDateFormatter'

function MessageItem({ message }) {
  const { formatMessageTime } = useDateFormatter()
  
  return (
    <div>
      <p>{message.content}</p>
      <span>{formatMessageTime(message.createdAt)}</span>
    </div>
  )
}
```

## Translation Management

### Available Scripts

```bash
# Extract translation keys from source code
npm run translations:extract

# Generate translation statistics
npm run translations:stats

# Generate missing translations report
npm run translations:missing

# Validate all translation files
npm run translations:validate

# Sync translations from source to targets
npm run translations:sync

# Run complete translation workflow
npm run translations:all
```

### Adding New Translations

1. **Add translation keys in source code:**
   ```tsx
   const { t } = useTranslation()
   return <button>{t('common.save')}</button>
   ```

2. **Extract keys:**
   ```bash
   npm run translations:extract
   ```

3. **Sync to all languages:**
   ```bash
   npm run translations:sync
   ```

4. **Translate missing keys:**
   - Check `src/i18n/locales/MISSING_TRANSLATIONS.md`
   - Update translation files manually or use translation services

5. **Validate translations:**
   ```bash
   npm run translations:validate
   ```

### Translation Key Conventions

- Use dot notation for nested keys: `common.buttons.save`
- Group related translations: `auth.login.title`, `auth.login.subtitle`
- Use descriptive names: `chat.message.edited` instead of `msg.ed`
- Include context in key names: `navigation.chat` vs `page.chat`

## RTL Language Support

### CSS Classes

The implementation provides several CSS classes for RTL support:

```css
/* Logical properties */
.logical-margin-start { margin-inline-start: 1rem; }
.logical-padding-end { padding-inline-end: 1rem; }

/* Direction-aware positioning */
.absolute-start { /* Adapts to text direction */ }
.absolute-end { /* Adapts to text direction */ }

/* Flexbox RTL support */
.flex-row-rtl { /* Reverses in RTL */ }

/* Icon flipping */
.icon-rtl { /* Flips horizontally in RTL */ }
.icon-no-flip { /* Never flips */ }
```

### RTL-Specific Styling

```tsx
// Component with RTL support
function ChatBubble({ message, isOwn }) {
  const { isRTL } = useRTL()
  
  return (
    <div 
      className={`
        message-bubble 
        ${isOwn ? 'own' : ''} 
        ${isRTL ? 'rtl' : 'ltr'}
      `}
    >
      {message.content}
    </div>
  )
}
```

## Date and Time Formatting

### Locale-Aware Formatting

```tsx
const { formatDate, formatTime, formatRelativeDate } = useDateFormatter()

// Format absolute date
formatDate(new Date(), { includeTime: true, short: false })
// Output: "October 3, 2023 at 14:30" (English)
// Output: "3 octobre 2023 à 14:30" (French)

// Format relative date
formatRelativeDate(new Date(Date.now() - 3600000))
// Output: "1 hour ago" (English)
// Output: "il y a 1 heure" (French)

// Format message time
formatMessageTime(new Date())
// Output: "14:30" (today)
// Output: "Yesterday 14:30" (yesterday)
```

### Supported Formats

- **Message timestamps**: Smart relative formatting
- **Last seen**: "Last seen 5 minutes ago"
- **Duration**: "2:05" for voice messages
- **File sizes**: "1.2 MB" with locale-specific number formatting
- **Dates**: Full locale-aware date formatting

## Accessibility

### Screen Reader Support

- Language changes are announced to screen readers
- RTL direction changes are announced
- All interactive elements have proper ARIA labels
- Language switcher has proper menu semantics

### Keyboard Navigation

- Language switcher is fully keyboard accessible
- Focus management respects RTL layout
- Tab order adapts to text direction

## Performance Considerations

### Lazy Loading

- Translation files are loaded on demand
- Initial bundle includes only essential translations
- Namespace-based code splitting

### Caching

- Browser language detection with localStorage persistence
- Translation files cached by service worker
- Efficient re-rendering with React.memo and useMemo

## Testing

### Unit Tests

```bash
npm run test src/i18n/
```

Tests cover:
- Translation loading and fallbacks
- RTL detection and styling
- Date formatting across locales
- Language switching functionality

### Integration Tests

- End-to-end language switching
- RTL layout validation
- Translation completeness checks

## Contributing

### Adding a New Language

1. Add language to `SUPPORTED_LANGUAGES` in `src/i18n/index.ts`
2. Create translation files in `src/i18n/locales/[lang]/`
3. Add date-fns locale import in `src/i18n/utils/dateFormatter.ts`
4. Update tests and documentation
5. Run translation workflow to validate

### Translation Guidelines

- Keep translations concise and natural
- Maintain consistent terminology across the app
- Consider cultural context, not just literal translation
- Test RTL languages for layout issues
- Validate with native speakers when possible

## Troubleshooting

### Common Issues

1. **Missing translations**: Run `npm run translations:missing` to identify gaps
2. **RTL layout issues**: Check CSS logical properties usage
3. **Date formatting errors**: Verify date-fns locale imports
4. **Performance issues**: Check translation file sizes and loading strategy

### Debug Mode

Enable i18n debug mode in development:

```tsx
// In src/i18n/index.ts
debug: import.meta.env.DEV && true
```

This will log translation key lookups and missing translations to the console.