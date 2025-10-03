import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/components/card'
import { Button } from '@ui/components/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select'
import { ThemeSwitcher } from './ThemeSwitcher'
import { useAccessibility } from './AccessibilityProvider'

interface AccessibilitySettingsProps {
  className?: string
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({
  className = ''
}) => {
  const { 
    theme, 
    setTheme, 
    prefersReducedMotion, 
    isHighContrast,
    announce 
  } = useAccessibility()

  const handleTestAnnouncement = () => {
    announce('This is a test announcement for screen readers', 'polite')
  }

  const handleUrgentAnnouncement = () => {
    announce('This is an urgent test announcement', 'assertive')
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle>Visual Accessibility</CardTitle>
          <CardDescription>
            Customize the visual appearance for better accessibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <ThemeSwitcher showLabel={true} />
            <p className="text-sm text-muted-foreground mt-2">
              Choose a theme that works best for your vision needs. High contrast mode 
              provides maximum readability.
            </p>
          </div>

          {isHighContrast && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>System High Contrast Detected:</strong> Your system is set to high 
                contrast mode. The app will automatically use high contrast colors.
              </p>
            </div>
          )}

          {prefersReducedMotion && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Reduced Motion Enabled:</strong> Animations and transitions are 
                minimized based on your system preferences.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Screen Reader Support</CardTitle>
          <CardDescription>
            Test and configure screen reader announcements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              The app uses ARIA live regions to announce important updates to screen readers.
              Test the announcement system below:
            </p>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleTestAnnouncement}
                variant="outline"
                aria-describedby="test-announcement-help"
              >
                Test Polite Announcement
              </Button>
              
              <Button 
                onClick={handleUrgentAnnouncement}
                variant="outline"
                aria-describedby="urgent-announcement-help"
              >
                Test Urgent Announcement
              </Button>
            </div>
            
            <div className="mt-2 space-y-1">
              <p id="test-announcement-help" className="text-xs text-muted-foreground">
                Polite announcements don't interrupt current screen reader activity
              </p>
              <p id="urgent-announcement-help" className="text-xs text-muted-foreground">
                Urgent announcements interrupt current screen reader activity
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Screen Reader Features</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• New messages are announced automatically</li>
              <li>• Typing indicators are announced when users start typing</li>
              <li>• Message actions (edit, delete, reply) are announced</li>
              <li>• File uploads and downloads are announced</li>
              <li>• Navigation changes are announced</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keyboard Navigation</CardTitle>
          <CardDescription>
            Information about keyboard shortcuts and navigation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Global Shortcuts</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Skip to main content:</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Tab</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Close modal/dialog:</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Escape</kbd>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Message Composer</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Send message:</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Enter</kbd>
                </div>
                <div className="flex justify-between">
                  <span>New line:</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Shift + Enter</kbd>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Message Editing</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Save edit:</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Enter</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Cancel edit:</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Escape</kbd>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Lists and Menus</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Navigate items:</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">↑ ↓</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Select item:</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Enter / Space</kbd>
                </div>
                <div className="flex justify-between">
                  <span>First item:</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Home</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Last item:</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">End</kbd>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accessibility Compliance</CardTitle>
          <CardDescription>
            Information about accessibility standards and compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" aria-hidden="true" />
              <span className="text-sm">WCAG 2.1 AA compliant color contrast</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" aria-hidden="true" />
              <span className="text-sm">Full keyboard navigation support</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" aria-hidden="true" />
              <span className="text-sm">Screen reader compatible with ARIA labels</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" aria-hidden="true" />
              <span className="text-sm">Respects system accessibility preferences</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" aria-hidden="true" />
              <span className="text-sm">Focus management for dynamic content</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700">
              If you encounter any accessibility issues or have suggestions for improvement, 
              please contact our support team. We're committed to making this application 
              accessible to everyone.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}