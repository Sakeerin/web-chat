import React, { useState } from 'react'
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent, Alert, AlertDescription } from '@ui/components'

interface TwoFactorAuthProps {
  isEnabled: boolean
  onEnable: (secret: string, token: string) => void
  onDisable: () => void
  loading?: boolean
  error?: string
}

export const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({
  isEnabled,
  onEnable,
  onDisable,
  loading = false,
  error,
}) => {
  const [step, setStep] = useState<'setup' | 'verify'>('setup')
  const [verificationCode, setVerificationCode] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [secret, setSecret] = useState('')

  const handleEnable2FA = async () => {
    // In a real implementation, this would call the API to generate QR code
    // For now, we'll simulate the setup process
    setQrCodeUrl('https://via.placeholder.com/200x200?text=QR+Code')
    setSecret('JBSWY3DPEHPK3PXP') // Example secret
    setStep('verify')
  }

  const handleVerify = () => {
    if (verificationCode.length === 6) {
      onEnable(secret, verificationCode)
    }
  }

  const handleDisable = () => {
    if (window.confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      onDisable()
    }
  }

  if (isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Two-Factor Authentication</span>
            <span className="text-sm font-normal text-green-600 bg-green-100 px-2 py-1 rounded">
              Enabled
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Two-factor authentication is currently enabled for your account. This adds an extra layer of security.
          </p>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            variant="destructive"
            onClick={handleDisable}
            disabled={loading}
          >
            {loading ? 'Disabling...' : 'Disable 2FA'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'setup' && (
          <>
            <p className="text-sm text-gray-600">
              Add an extra layer of security to your account by enabling two-factor authentication.
            </p>
            
            <Alert>
              <AlertDescription>
                <strong>Note:</strong> 2FA setup is currently in development. This is a preview of the interface.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleEnable2FA}
              disabled={loading}
            >
              {loading ? 'Setting up...' : 'Enable 2FA'}
            </Button>
          </>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Step 1: Scan QR Code</h4>
              <p className="text-sm text-gray-600 mb-4">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              <div className="flex justify-center">
                <img
                  src={qrCodeUrl}
                  alt="2FA QR Code"
                  className="border rounded"
                />
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Step 2: Enter Verification Code</h4>
              <p className="text-sm text-gray-600 mb-4">
                Enter the 6-digit code from your authenticator app
              </p>
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-lg tracking-widest"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={handleVerify}
                disabled={verificationCode.length !== 6 || loading}
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep('setup')}
                disabled={loading}
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}