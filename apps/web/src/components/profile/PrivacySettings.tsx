import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Card, CardHeader, CardTitle, CardContent, Alert, AlertDescription, Label } from '@ui/components'
import { apiService, endpoints } from '@/services/api'
import type { UserProfile, PrivacySettings as PrivacySettingsType } from '@shared/types'

interface PrivacySettingsProps {
  user: UserProfile
  onSuccess?: () => void
}

enum LastSeenVisibility {
  EVERYONE = 'everyone',
  CONTACTS = 'contacts',
  NOBODY = 'nobody',
}

enum ReadReceiptsVisibility {
  EVERYONE = 'everyone',
  CONTACTS = 'contacts',
  NOBODY = 'nobody',
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({
  user,
  onSuccess,
}) => {
  const [settings, setSettings] = useState<PrivacySettingsType>(user.privacySettings)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const queryClient = useQueryClient()

  const updatePrivacyMutation = useMutation({
    mutationFn: async (newSettings: Partial<PrivacySettingsType>) => {
      return apiService.put<PrivacySettingsType>('/users/me/privacy', newSettings)
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
      queryClient.invalidateQueries({ queryKey: ['user', 'privacy'] })
      
      onSuccess?.()
    },
    onError: (error) => {
      console.error('Privacy settings update failed:', error)
      setErrors({ general: error.message || 'Failed to update privacy settings' })
    },
  })

  const handleSettingChange = (key: keyof PrivacySettingsType, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    
    // Clear error when user makes changes
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      await updatePrivacyMutation.mutateAsync(settings)
    } catch (error) {
      // Error handling is done in mutation onError
    }
  }

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(user.privacySettings)
  const isLoading = updatePrivacyMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Last Seen Visibility */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Who can see when you were last online?</Label>
            <div className="space-y-2">
              {Object.values(LastSeenVisibility).map((option) => (
                <label key={option} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="lastSeenVisibility"
                    value={option}
                    checked={settings.lastSeenVisibility === option}
                    onChange={(e) => handleSettingChange('lastSeenVisibility', e.target.value)}
                    disabled={isLoading}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium capitalize">{option}</div>
                    <div className="text-sm text-gray-500">
                      {option === 'everyone' && 'Anyone can see when you were last online'}
                      {option === 'contacts' && 'Only your contacts can see when you were last online'}
                      {option === 'nobody' && 'No one can see when you were last online'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Read Receipts Visibility */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Who can see your read receipts?</Label>
            <div className="space-y-2">
              {Object.values(ReadReceiptsVisibility).map((option) => (
                <label key={option} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="readReceiptsVisibility"
                    value={option}
                    checked={settings.readReceiptsVisibility === option}
                    onChange={(e) => handleSettingChange('readReceiptsVisibility', e.target.value)}
                    disabled={isLoading}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium capitalize">{option}</div>
                    <div className="text-sm text-gray-500">
                      {option === 'everyone' && 'Anyone can see when you\'ve read their messages'}
                      {option === 'contacts' && 'Only your contacts can see when you\'ve read their messages'}
                      {option === 'nobody' && 'No one can see when you\'ve read their messages'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
              <strong>Note:</strong> If you disable read receipts, you won't be able to see read receipts from others either.
            </div>
          </div>

          {/* Online Status */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Online Status</Label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showOnlineStatus}
                onChange={(e) => handleSettingChange('showOnlineStatus', e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <div className="font-medium">Show when I'm online</div>
                <div className="text-sm text-gray-500">
                  Let others see when you're currently active
                </div>
              </div>
            </label>
          </div>

          {/* Contact Requests */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Contact Requests</Label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowContactRequests}
                onChange={(e) => handleSettingChange('allowContactRequests', e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <div className="font-medium">Allow contact requests</div>
                <div className="text-sm text-gray-500">
                  Let others send you contact requests to start conversations
                </div>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSettings(user.privacySettings)}
              disabled={isLoading || !hasChanges}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !hasChanges}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}