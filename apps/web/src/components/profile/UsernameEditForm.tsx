import React, { useState, useEffect, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent, Alert, AlertDescription } from '@ui/components'
import { apiService, endpoints } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import type { UserProfile, UsernameAvailability } from '@shared/types'

interface UsernameEditFormProps {
  user: UserProfile
  onSuccess?: () => void
  onCancel?: () => void
}

export const UsernameEditForm: React.FC<UsernameEditFormProps> = ({
  user,
  onSuccess,
  onCancel,
}) => {
  const [username, setUsername] = useState(user.username || '')
  const [availability, setAvailability] = useState<UsernameAvailability | null>(null)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasChecked, setHasChecked] = useState(false)
  
  const queryClient = useQueryClient()
  const updateUser = useAuthStore((state) => state.updateUser)

  const updateUsernameMutation = useMutation({
    mutationFn: async (newUsername: string) => {
      return apiService.put<UserProfile>(endpoints.users.updateProfile, {
        username: newUsername,
      })
    },
    onSuccess: (updatedUser) => {
      // Update auth store
      updateUser({
        username: updatedUser.username,
      })
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
      
      onSuccess?.()
    },
    onError: (error) => {
      console.error('Username update failed:', error)
      setErrors({ general: error.message || 'Failed to update username' })
    },
  })

  const checkAvailability = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck === user.username) {
      setAvailability(null)
      setHasChecked(false)
      return
    }

    // Validate format first
    if (usernameToCheck.length < 3) {
      setAvailability({ available: false })
      setHasChecked(true)
      return
    }

    if (usernameToCheck.length > 30) {
      setAvailability({ available: false })
      setHasChecked(true)
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(usernameToCheck)) {
      setAvailability({ available: false })
      setHasChecked(true)
      return
    }

    setIsCheckingAvailability(true)
    
    try {
      const result = await apiService.post<UsernameAvailability>(
        endpoints.users.checkUsername,
        { username: usernameToCheck }
      )
      setAvailability(result)
      setHasChecked(true)
    } catch (error) {
      console.error('Username check failed:', error)
      setAvailability({ available: false })
      setHasChecked(true)
    } finally {
      setIsCheckingAvailability(false)
    }
  }, [user.username])

  // Debounced availability check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkAvailability(username.toLowerCase().trim())
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [username, checkAvailability])

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '')
    setUsername(value)
    setHasChecked(false)
    
    // Clear errors when user starts typing
    if (errors.username) {
      setErrors(prev => ({ ...prev, username: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const trimmedUsername = username.trim()

    // Validation
    if (!trimmedUsername) {
      setErrors({ username: 'Username is required' })
      return
    }

    if (trimmedUsername === user.username) {
      setErrors({ username: 'This is already your current username' })
      return
    }

    if (trimmedUsername.length < 3) {
      setErrors({ username: 'Username must be at least 3 characters long' })
      return
    }

    if (trimmedUsername.length > 30) {
      setErrors({ username: 'Username must be no more than 30 characters long' })
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setErrors({ username: 'Username can only contain letters, numbers, and underscores' })
      return
    }

    if (!availability?.available) {
      setErrors({ username: 'This username is not available' })
      return
    }

    try {
      await updateUsernameMutation.mutateAsync(trimmedUsername)
    } catch (error) {
      // Error handling is done in mutation onError
    }
  }

  const getAvailabilityMessage = () => {
    if (!hasChecked || !username || username === user.username) return null
    
    if (isCheckingAvailability) {
      return <span className="text-gray-500">Checking availability...</span>
    }

    if (username.length < 3) {
      return <span className="text-red-600">Username must be at least 3 characters long</span>
    }

    if (username.length > 30) {
      return <span className="text-red-600">Username must be no more than 30 characters long</span>
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return <span className="text-red-600">Username can only contain letters, numbers, and underscores</span>
    }

    if (availability?.available) {
      return <span className="text-green-600">✓ Username is available</span>
    } else {
      return (
        <div className="text-red-600">
          <span>✗ Username is not available</span>
          {availability?.suggestions && availability.suggestions.length > 0 && (
            <div className="mt-1 text-sm">
              Suggestions: {availability.suggestions.join(', ')}
            </div>
          )}
        </div>
      )
    }
  }

  const isLoading = updateUsernameMutation.isPending
  const canSubmit = username.trim() !== user.username && availability?.available && !isLoading

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Username</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                @
              </span>
              <Input
                id="username"
                name="username"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Enter your username"
                disabled={isLoading}
                className={`pl-8 ${errors.username ? 'border-red-500' : ''}`}
                maxLength={30}
              />
            </div>
            
            {/* Availability status */}
            <div className="min-h-[20px] text-sm">
              {getAvailabilityMessage()}
            </div>
            
            {errors.username && (
              <p className="text-sm text-red-600">{errors.username}</p>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-600">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Important Note
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Changing your username will update how others can find and mention you. 
                    Your current username (@{user.username}) will become available for others to use.
                  </p>
                </div>
              </div>
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
              disabled={!canSubmit}
            >
              {isLoading ? 'Updating...' : 'Update Username'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}