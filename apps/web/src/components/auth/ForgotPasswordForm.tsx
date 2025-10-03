import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input, Label, Alert, AlertDescription } from '@ui/components'
import { useAuth } from '@/hooks/useAuth'

interface ForgotPasswordFormData {
  email: string
}

export const ForgotPasswordForm: React.FC = () => {
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: '',
  })

  const {
    requestPasswordReset,
    requestPasswordResetLoading,
    requestPasswordResetError,
    requestPasswordResetSuccess,
  } = useAuth()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    requestPasswordReset(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const isFormValid = formData.email

  if (requestPasswordResetSuccess) {
    return (
      <div className="space-y-6">
        <Alert variant="success">
          <AlertDescription>
            If an account with that email exists, we've sent you a password reset link.
            Please check your email and follow the instructions to reset your password.
          </AlertDescription>
        </Alert>

        <div className="text-center">
          <Link
            to="/login"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {requestPasswordResetError && (
        <Alert variant="destructive">
          <AlertDescription>{requestPasswordResetError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email address"
          disabled={requestPasswordResetLoading}
        />
        <p className="text-sm text-gray-600">
          We'll send you a link to reset your password.
        </p>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={!isFormValid || requestPasswordResetLoading}
      >
        {requestPasswordResetLoading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Sending reset link...
          </div>
        ) : (
          'Send reset link'
        )}
      </Button>

      <div className="text-center">
        <Link
          to="/login"
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          Back to sign in
        </Link>
      </div>
    </form>
  )
}