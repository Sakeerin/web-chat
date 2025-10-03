import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AdminDashboard } from '../components/admin/AdminDashboard'
import { UserManagement } from '../components/admin/UserManagement'
import { ReportManagement } from '../components/admin/ReportManagement'
import { AuditLogs } from '../components/admin/AuditLogs'
import { SystemAnalytics } from '../components/admin/SystemAnalytics'
import { Button } from '@ui/components/button'
import { Card } from '@ui/components/card'

type AdminTab = 'dashboard' | 'users' | 'reports' | 'audit' | 'analytics'

export const AdminPage: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')

  // Check if user has admin/moderator permissions
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return <Navigate to="/" replace />
  }

  const tabs = [
    { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: '📊' },
    { id: 'users' as AdminTab, label: 'Users', icon: '👥' },
    { id: 'reports' as AdminTab, label: 'Reports', icon: '🚨' },
    { id: 'audit' as AdminTab, label: 'Audit Logs', icon: '📋' },
    { id: 'analytics' as AdminTab, label: 'Analytics', icon: '📈' },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />
      case 'users':
        return <UserManagement />
      case 'reports':
        return <ReportManagement />
      case 'audit':
        return <AuditLogs />
      case 'analytics':
        return <SystemAnalytics />
      default:
        return <AdminDashboard />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-500">
                Manage users, content, and system settings
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Logged in as {user.name} ({user.role})
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-6">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <Card className="p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </Button>
                ))}
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}