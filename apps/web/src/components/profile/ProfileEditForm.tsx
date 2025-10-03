import React, { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent, Alert, AlertDescription } from '@ui/components'
import { apiService, endpoints } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import type { User, UserProfile } from '@shared/types'

interface ProfileEditFormProps {
  user: UserProfile
  onSuccess?: () => void
  onCancel?: () => void
}

interface UpdateProfileData {
  name?: string
  bio?: string
  avatarUrl?: string
}

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  user,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    bio: user.bio || '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl || null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const updateUser = useAuthStore((state) => state.updateUser)

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      return apiService.put<UserProfile>(endpoints.users.updateProfile, data)
    },
    onSuccess: (updatedUser) => {
      // Update auth store
      updateUser({
        name: updatedUser.name,
        bio: updatedUser.bio,
        avatarUrl: updatedUser.avatarUrl,
      })
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
      
      onSuccess?.()
    },
    onError: (error) => {
      console.error('Profile update failed:', error)
      setErrors({ general: error.message || 'Failed to update profile' })
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      // First get presigned URL
      const { uploadUrl, objectKey } = await apiService.post<{
        uploadUrl: string
        objectKey: string
      }>(endpoints.upload.presignedUrl, {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      })

      // Upload to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      // Process the upload
      const result = await apiService.post<{ url: string }>(endpoints.upload.process, {
        objectKey,
      })

      return result.url
    },
    onError: (error) => {
      console.error('Avatar upload failed:', error)
      setErrors({ avatar: error.message || 'Failed to upload avatar' })
    },
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setErrors({ avatar: 'Please select an image file' })
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setErrors({ avatar: 'Image must be smaller than 5MB' })
      return
    }

    setAvatarFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    
    // Clear avatar error
    if (errors.avatar) {
      setErrors(prev => ({ ...prev, avatar: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      let avatarUrl = user.avatarUrl

      // Upload avatar if changed
      if (avatarFile) {
        avatarUrl = await uploadAvatarMutation.mutateAsync(avatarFile)
      }

      // Update profile
      await updateProfileMutation.mutateAsync({
        name: formData.name.trim(),
        bio: formData.bio.trim() || undefined,
        avatarUrl,
      })
    } catch (error) {
      // Error handling is done in mutation onError
    }
  }

  const isLoading = updateProfileMutation.isPending || uploadAvatarMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Avatar Upload */}
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-2xl">👤</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  Change Photo
                </Button>
                {avatarPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAvatarFile(null)
                      setAvatarPreview(user.avatarUrl || null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }}
                    disabled={isLoading}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            {errors.avatar && (
              <p className="text-sm text-red-600">{errors.avatar}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your display name"
              disabled={isLoading}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Tell us about yourself..."
              rows={3}
              maxLength={500}
              disabled={isLoading}
              className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none ${
                errors.bio ? 'border-red-500' : ''
              }`}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{errors.bio && <span className="text-red-600">{errors.bio}</span>}</span>
              <span>{formData.bio.length}/500</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}