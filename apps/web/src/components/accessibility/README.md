# Accessibility Implementation

This directory contains the comprehensive accessibility implementation for the Telegram-like web chat application. The implementation follows WCAG 2.1 AA guidelines and provides full keyboard navigation, screen reader support, and high contrast themes.

## Features Implemented

### 1. ARIA Labels and Roles ✅

- **Message Items**: Each message has proper ARIA roles (`article` for regular messages, `status` for system messages)
- **Interactive Elements**: All buttons, inputs, and interactive elements have descriptive ARIA labels
- **Form Controls**: All form inputs are properly labeled with `aria-label` or associated `<label>` elements
- **Navigation**: Proper landmark roles for main content areas
- **Live Regions**: ARIA live regions for real-time message updates and announcements

### 2. Keyboard Navigation ✅

- **Tab Navigation**: All interactive elements are keyboard accessible with proper tab order
- **Arrow Key Navigation**: Lists and menus support arrow key navigation
- **Activation Keys**: Enter and Space keys activate buttons and interactive elements
- **Escape Key**: Closes modals, dialogs, and cancels operations
- **Focus Management**: Proper focus management for dynamic content and modals
- **Focus Trapping**: Modal dialogs trap focus within their boundaries

### 3. Focus Management ✅

- **Visual Focus Indicators**: Clear focus indicators that meet contrast requirements
- **Focus Restoration**: Focus is restored to appropriate elements after modal closure
- **Skip Links**: "Skip to main content" link for keyboard users
- **Focus Trapping**: Implemented in modals and dialogs
- **Dynamic Content**: Focus management when content changes dynamically

### 4. ARIA Live Regions ✅

- **Message Announcements**: New messages are announced to screen readers
- **Typing Indicators**: Typing status is announced when users start/stop typing
- **Action Feedback**: User actions (send, edit, delete) are announced
- **Error Messages**: Form errors and system errors are announced
- **Status Updates**: Connection status and other important updates

### 5. High Contrast Mode ✅

- **System Detection**: Automatically detects system high contrast preferences
- **Manual Toggle**: Users can manually switch to high contrast theme
- **Enhanced Borders**: Stronger borders and outlines in high contrast mode
- **Color Compliance**: All color combinations meet WCAG AA contrast requirements
- **Status Indicators**: High contrast versions of status indicators and icons

### 6. Theme Support ✅

- **Light Theme**: Default light theme with accessible colors
- **Dark Theme**: Dark theme with proper contrast ratios
- **High Contrast Theme**: Maximum contrast for users with visual impairments
- **System Preference Detection**: Respects user's system theme preferences
- **Persistent Settings**: Theme choice is saved and restored

## Components

### AccessibilityProvider
Central provider that manages accessibility state and preferences.

```tsx
import { AccessibilityProvider } from '@/components/accessibility/AccessibilityProvider'

function App() {
  return (
    <AccessibilityProvider>
      {/* Your app content */}
    </AccessibilityProvider>
  )
}
```

### ThemeSwitcher
Component for switching between themes with accessibility support.

```tsx
import { ThemeSwitcher } from '@/components/accessibility/ThemeSwitcher'

<ThemeSwitcher showLabel={true} />
```

### KeyboardNavigation
Wrapper component that adds keyboard navigation to lists and menus.

```tsx
import { KeyboardNavigation } from '@/components/accessibility/KeyboardNavigation'

<KeyboardNavigation
  items={items}
  onSelect={handleSelect}
  onEscape={handleEscape}
>
  {/* Your list items */}
</KeyboardNavigation>
```

### AccessibilitySettings
Complete settings panel for accessibility preferences.

```tsx
import { AccessibilitySettings } from '@/components/accessibility/AccessibilitySettings'

<AccessibilitySettings />
```

## Hooks

### useAccessibility
Main hook for accessing accessibility context.

```tsx
import { useAccessibility } from '@/components/accessibility/AccessibilityProvider'

function MyComponent() {
  const { announce, theme, setTheme, prefersReducedMotion } = useAccessibility()
  
  const handleAction = () => {
    // Announce to screen readers
    announce('Action completed successfully', 'polite')
  }
  
  return (
    <div data-theme={theme}>
      {/* Component content */}
    </div>
  )
}
```

### useFocusManagement
Hook for managing focus within components.

```tsx
import { useFocusManagement } from '@/hooks/useAccessibility'

function Modal() {
  const { trapFocus } = useFocusManagement()
  const modalRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (modalRef.current) {
      const cleanup = trapFocus(modalRef.current)
      return cleanup
    }
  }, [trapFocus])
  
  return <div ref={modalRef}>{/* Modal content */}</div>
}
```

### useAriaLive
Hook for making announcements to screen readers.

```tsx
import { useAriaLive } from '@/hooks/useAccessibility'

function MessageComposer() {
  const { announce, LiveRegion } = useAriaLive()
  
  const handleSend = () => {
    announce('Message sent', 'polite')
  }
  
  return (
    <div>
      {/* Component content */}
      <LiveRegion />
    </div>
  )
}
```

## Utilities

### Accessibility Utilities
Helper functions for accessibility features.

```tsx
import {
  formatMessageForScreenReader,
  formatTypingIndicator,
  getContrastRatio,
  meetsContrastRequirement,
  isActivationKey,
  generateId
} from '@/utils/accessibility'

// Format message for screen reader
const announcement = formatMessageForScreenReader(
  'Alice',
  'Hello world',
  new Date(),
  false
)

// Check color contrast
const hasGoodContrast = meetsContrastRequirement('#000000', '#ffffff', 'AA')

// Handle keyboard events
const handleKeyDown = (e: KeyboardEvent) => {
  if (isActivationKey(e)) {
    // Handle activation
  }
}
```

## Styling

### CSS Classes
Accessibility-specific CSS classes are available:

```css
/* Screen reader only content */
.sr-only

/* Focus indicators */
.focus-ring
.focus-ring-inset

/* Skip links */
.skip-link

/* High contrast mode */
[data-theme="high-contrast"]

/* Reduced motion */
[data-reduced-motion="true"]
```

### Theme Variables
CSS custom properties for theming:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 0%;
  --ring: 0 0% 0%;
  /* ... other theme variables */
}

[data-theme="high-contrast"] {
  --background: 0 0% 100%;
  --foreground: 0 0% 0%;
  --ring: 0 0% 0%;
  /* High contrast overrides */
}
```

## Testing

### Automated Testing
Run accessibility tests:

```bash
# Run accessibility utility tests
npm test src/utils/accessibility.test.ts

# Run accessibility component tests
npm test src/components/accessibility

# Run full accessibility audit (requires running app)
node scripts/accessibility-audit.js
```

### Manual Testing Checklist

#### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Use arrow keys in lists and menus
- [ ] Press Enter/Space to activate buttons
- [ ] Press Escape to close modals
- [ ] Navigate to skip link with Tab

#### Screen Reader Testing
- [ ] Test with NVDA (Windows)
- [ ] Test with JAWS (Windows)
- [ ] Test with VoiceOver (macOS)
- [ ] Test with TalkBack (Android)
- [ ] Verify announcements for new messages
- [ ] Verify form labels are read correctly

#### Visual Testing
- [ ] Test with high contrast mode
- [ ] Test with 200% zoom
- [ ] Test with reduced motion enabled
- [ ] Verify focus indicators are visible
- [ ] Check color contrast ratios

## Browser Support

The accessibility features are supported in:

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (with some limitations on older versions)
- **Mobile browsers**: Basic support

## Compliance

This implementation meets the following standards:

- **WCAG 2.1 AA**: All guidelines are followed
- **Section 508**: US federal accessibility requirements
- **EN 301 549**: European accessibility standard
- **ADA**: Americans with Disabilities Act compliance

## Known Limitations

1. **Voice Control**: Limited support for voice navigation commands
2. **Switch Navigation**: Basic support, may need enhancement for complex switch users
3. **Cognitive Accessibility**: Some features could be enhanced for cognitive disabilities

## Future Enhancements

1. **Voice Commands**: Add support for voice navigation
2. **Cognitive Aids**: Add reading aids and simplified interfaces
3. **Customization**: More granular accessibility customization options
4. **AI Assistance**: AI-powered accessibility features

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/)
- [Accessibility Developer Guide](https://www.accessibility-developer-guide.com/)

## Contributing

When adding new features, please ensure:

1. All interactive elements are keyboard accessible
2. Proper ARIA labels and roles are used
3. Color contrast meets WCAG AA requirements
4. Focus management is implemented correctly
5. Screen reader announcements are appropriate
6. Tests are added for accessibility features

For questions or issues, please refer to the accessibility team or create an issue with the "accessibility" label.