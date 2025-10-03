import React from 'react'
import { Button, Card, CardHeader, CardTitle, CardContent, Alert, AlertDescription } from '@ui/components'
import { useAuth } from '@/hooks/useAuth'

interface SessionData {
  id: string
  deviceType: string
  deviceId: string
  ipAddress: string
  userAgent: string
  lastActiveAt: string
  createdAt: string
  isCurrent: boolean
}

const formatDeviceInfo = (session: SessionData) => {
  const userAgent = session.userAgent || ''
  let deviceInfo = 'Unknown Device'
  
  if (userAgent.includes('Chrome')) {
    deviceInfo = 'Chrome Browser'
  } else if (userAgent.includes('Firefox')) {
    deviceInfo = 'Firefox Browser'
  } else if (userAgent.includes('Safari')) {
    deviceInfo = 'Safari Browser'
  } else if (userAgent.includes('Edge')) {
    deviceInfo = 'Edge Browser'
  }

  if (userAgent.includes('Mobile')) {
    deviceInfo += ' (Mobile)'
  }

  return deviceInfo
}

const formatLastActive = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) {
    return 'Just now'
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  } else {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  }
}

export const SessionManager: React.FC = () => {
  const {
    sessions,
    sessionsLoading,
    revokeSession,
    revokeSessionLoading,
    logoutAll,
    logoutAllLoading,
    refetchSessions,
  } = useAuth()

  const handleRevokeSession = (sessionId: string) => {
    if (window.confirm('Are you sure you want to revoke this session?')) {
      revokeSession(sessionId)
    }
  }

  const handleLogoutAll = () => {
    if (window.confirm('Are you sure you want to log out from all devices? This will end all your active sessions.')) {
      logoutAll()
    }
  }

  if (sessionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!sessions || sessions.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No active sessions found.
        </AlertDescription>
      </Alert>
    )
  }

  const currentSession = sessions.find(session => session.isCurrent)
  const otherSessions = sessions.filter(session => !session.isCurrent)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Active Sessions</h3>
        {sessions.length > 1 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogoutAll}
            disabled={logoutAllLoading}
          >
            {logoutAllLoading ? 'Logging out...' : 'Log out all devices'}
          </Button>
        )}
      </div>

      {/* Current Session */}
      {currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Current Session</span>
              <span className="text-sm font-normal text-green-600 bg-green-100 px-2 py-1 rounded">
                Active
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Device:</span>
                <p className="text-gray-600">{formatDeviceInfo(currentSession)}</p>
              </div>
              <div>
                <span className="font-medium">IP Address:</span>
                <p className="text-gray-600">{currentSession.ipAddress}</p>
              </div>
              <div>
                <span className="font-medium">Last Active:</span>
                <p className="text-gray-600">{formatLastActive(currentSession.lastActiveAt)}</p>
              </div>
              <div>
                <span className="font-medium">Started:</span>
                <p className="text-gray-600">{new Date(currentSession.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Sessions */}
      {otherSessions.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Other Sessions</h4>
          {otherSessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm flex-1">
                    <div>
                      <span className="font-medium">Device:</span>
                      <p className="text-gray-600">{formatDeviceInfo(session)}</p>
                    </div>
                    <div>
                      <span className="font-medium">IP Address:</span>
                      <p className="text-gray-600">{session.ipAddress}</p>
                    </div>
                    <div>
                      <span className="font-medium">Last Active:</span>
                      <p className="text-gray-600">{formatLastActive(session.lastActiveAt)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Started:</span>
                      <p className="text-gray-600">{new Date(session.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revokeSessionLoading}
                    className="ml-4"
                  >
                    Revoke
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => refetchSessions()}
          disabled={sessionsLoading}
        >
          Refresh Sessions
        </Button>
      </div>
    </div>
  )
}