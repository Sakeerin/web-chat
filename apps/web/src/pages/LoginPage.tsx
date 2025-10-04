import React from 'react'
import { Card, CardContent } from '@ui/components'
import { LoginForm } from '@/components/auth/LoginForm'

const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Welcome to Telegram Web Chat
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage