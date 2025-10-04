import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@ui/components'
import { SessionManager } from '@/components/auth/SessionManager'
import { TwoFactorAuth } from '@/components/auth/TwoFactorAuth'
import { ProfileManager } from '@/components/profile'
import { NotificationSettings } from '@/components/pwa/NotificationSettings'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { AccessibilitySettings } from '@/components/accessibility/AccessibilitySettings'
import { LanguageSwitcher } from '@/i18n/components/LanguageSwitcher'
import { useAuth } from '@/hooks/useAuth'
import { usePWA } from '@/hooks/usePWA'

type SettingsTab = 'security' | 'sessions' | 'profile' | 'app' | 'accessibility' | 'language'

const SettingsPage: React.FC = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const { user } = useAuth()
  const { isInstallable, isInstalled } = usePWA()

  const tabs = [
    { id: 'profile' as const, label: t('navigation.profile'), icon: '👤' },
    { id: 'security' as const, label: 'Security', icon: '🔒' },
    { id: 'sessions' as const, label: 'Sessions', icon: '📱' },
    { id: 'language' as const, label: 'Language', icon: '🌍' },
    { id: 'accessibility' as const, label: 'Accessibility', icon: '♿' },
    { id: 'app' as const, label: 'App Settings', icon: '⚙️' },
  ]

  const handle2FAEnable = (secret: string, token: string) => {
    // TODO: Implement 2FA enable API call
    console.log('Enable 2FA:', { secret, token })
  }

  const handle2FADisable = () => {
    // TODO: Implement 2FA disable API call
    console.log('Disable 2FA')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{t('navigation.settings')}</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <ProfileManager />
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium">Password</h4>
                          <p className="text-sm text-gray-600">Last changed: Never</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Change Password
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium">Email</h4>
                          <p className="text-sm text-gray-600">{user?.email}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Change Email
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <TwoFactorAuth
                  isEnabled={false} // TODO: Get from user profile
                  onEnable={handle2FAEnable}
                  onDisable={handle2FADisable}
                />
              </div>
            )}

            {activeTab === 'sessions' && (
              <div>
                <SessionManager />
              </div>
            )}

            {activeTab === 'language' && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('language.select')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Choose your preferred language for the interface. The app supports multiple languages including right-to-left (RTL) languages.
                    </p>
                    <LanguageSwitcher 
                      variant="default"
                      showFlag={true}
                      showNativeName={true}
                      className="w-full justify-start"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'accessibility' && (
              <AccessibilitySettings />
            )}

            {activeTab === 'app' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>App Installation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {isInstalled ? (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <span className="text-green-600">✓</span>
                            <span className="text-green-800 font-medium">App is installed</span>
                          </div>
                          <p className="text-sm text-green-700 mt-1">
                            You're using the installed version of Telegram Chat.
                          </p>
                        </div>
                      ) : isInstallable ? (
                        <InstallPrompt className="border-0 bg-transparent p-0" />
                      ) : (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-gray-600">
                            App installation is not available in your current browser.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <NotificationSettings />

                <Card>
                  <CardHeader>
                    <CardTitle>Offline Support</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900">Background Sync</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Messages sent while offline will be automatically synced when you're back online.
                        </p>
                      </div>
                      
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900">Offline Cache</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Recent conversations and messages are cached for offline viewing.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage