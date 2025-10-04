import React from 'react'
import { Card, CardContent } from '@ui/components'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

const ForgotPasswordPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <ForgotPasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ForgotPasswordPage