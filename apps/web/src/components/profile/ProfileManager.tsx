import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@ui/components'
import { apiService, endpoints } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { ProfileEditForm } from './ProfileEditForm'
import { UsernameEditForm } from './UsernameEditForm'
import { PrivacySettings } from './PrivacySettings'
import { AvatarCropper } from './AvatarCropper'
import type { UserProfile } from '@shared/types'

type ProfileView = 'overview' | 'edit-profile' | 'edit-username' | 'privacy' | 'crop-avatar'

export const ProfileManager: React.FC = () => {
  const [currentView, setCurrentView] = useState<ProfileView>('overview')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const user = useAuthStore((state) => state.user)

  // Fetch full user profile with privacy settings
  const { data: userProfile, isLoading, error } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      return apiService.get<UserProfile>(endpoints.users.profile)
    },
    enabled: !!user,
  })

  const handleAvatarFileSelect = (file: File) => {
    setAvatarFile(file)
    setCurrentView('crop-avatar')
  }

  const handleCropComplete = (croppedFile: File) => {
    // This would typically upload the cropped file
    // For now, we'll just go back to the edit form
    setAvatarFile(croppedFile)
    setCurrentView('edit-profile')
  }

  const handleSuccess = () => {
    setCurrentView('overview')
    setAvatarFile(null)
  }

  const handleCancel = () => {
    setCurrentView('overview')
    setAvatarFile(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !userProfile) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-red-600">Failed to load profile information</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
              variant="outline"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render different views
  if (currentView === 'edit-profile') {
    return (
      <ProfileEditForm
        user={userProfile}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    )
  }

  if (currentView === 'edit-username') {
    return (
      <UsernameEditForm
        user={userProfile}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    )
  }

  if (currentView === 'privacy') {
    return (
      <PrivacySettings
        user={userProfile}
        onSuccess={handleSuccess}
      />
    )
  }

  if (currentView === 'crop-avatar' && avatarFile) {
    return (
      <AvatarCropper
        imageFile={avatarFile}
        onCropComplete={handleCropComplete}
        onCancel={handleCancel}
      />
    )
  }

  // Overview view
  return (
    <div className="space-y-6">
      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
                {userProfile.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt="Profile picture"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-3xl">👤</span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{userProfile.name}</h3>
                <p className="text-gray-600">@{userProfile.username}</p>
                {userProfile.bio && (
                  <p className="text-gray-700 mt-2">{userProfile.bio}</p>
                )}
              </div>

              <div className="text-sm text-gray-500">
                <p>Email: {userProfile.email}</p>
                <p>Member since: {new Date(userProfile.createdAt).toLocaleDateString()}</p>
                <p>Last seen: {new Date(userProfile.lastSeenAt).toLocaleString()}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => setCurrentView('edit-profile')}
                >
                  Edit Profile
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentView('edit-username')}
                >
                  Change Username
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentView('privacy')}
                >
                  Privacy Settings
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Last Seen Visibility</h4>
              <p className="text-sm text-gray-600 capitalize">
                {userProfile.privacySettings.lastSeenVisibility}
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Read Receipts</h4>
              <p className="text-sm text-gray-600 capitalize">
                {userProfile.privacySettings.readReceiptsVisibility}
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Online Status</h4>
              <p className="text-sm text-gray-600">
                {userProfile.privacySettings.showOnlineStatus ? 'Visible' : 'Hidden'}
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Contact Requests</h4>
              <p className="text-sm text-gray-600">
                {userProfile.privacySettings.allowContactRequests ? 'Allowed' : 'Disabled'}
              </p>
            </div>
          </div>
          
          <div className="mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentView('privacy')}
            >
              Manage Privacy Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}