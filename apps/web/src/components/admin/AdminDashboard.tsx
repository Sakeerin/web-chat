import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../services/adminApi'
import { Card } from '@ui/components/card'
import { Button } from '@ui/components/button'

export const AdminDashboard: React.FC = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => adminApi.getSystemAnalytics(),
  })

  const { data: auditSummary } = useQuery({
    queryKey: ['admin', 'audit-summary'],
    queryFn: () => adminApi.getSystemAuditSummary(),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const stats = [
    {
      title: 'Total Users',
      value: analytics?.totalUsers || 0,
      icon: '👥',
      color: 'text-blue-600',
    },
    {
      title: 'Active Users',
      value: analytics?.activeUsers || 0,
      icon: '✅',
      color: 'text-green-600',
    },
    {
      title: 'Suspended Users',
      value: analytics?.suspendedUsers || 0,
      icon: '⚠️',
      color: 'text-yellow-600',
    },
    {
      title: 'Daily Active Users',
      value: analytics?.dailyActiveUsers || 0,
      icon: '📊',
      color: 'text-purple-600',
    },
    {
      title: 'Total Messages',
      value: analytics?.totalMessages || 0,
      icon: '💬',
      color: 'text-blue-600',
    },
    {
      title: 'Messages Today',
      value: analytics?.messagesSentToday || 0,
      icon: '📈',
      color: 'text-green-600',
    },
    {
      title: 'Pending Reports',
      value: analytics?.pendingReports || 0,
      icon: '🚨',
      color: 'text-red-600',
    },
    {
      title: 'Reports Today',
      value: analytics?.reportsToday || 0,
      icon: '📋',
      color: 'text-orange-600',
    },
  ]

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div className="text-2xl">{stat.icon}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admin Actions Summary */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Admin Activity
          </h3>
          {auditSummary ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Actions (7 days)</span>
                <span className="font-semibold">{auditSummary.totalActions}</span>
              </div>
              {Object.entries(auditSummary.actionsByType).map(([action, count]) => (
                <div key={action} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {action.replace(/_/g, ' ').toLowerCase()}
                  </span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent activity</p>
          )}
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <span className="mr-2">👥</span>
              View All Users
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <span className="mr-2">🚨</span>
              Review Pending Reports
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <span className="mr-2">📋</span>
              View Audit Logs
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <span className="mr-2">📈</span>
              System Analytics
            </Button>
          </div>
        </Card>
      </div>

      {/* System Health */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl mb-2">🟢</div>
            <p className="text-sm font-medium">Database</p>
            <p className="text-xs text-gray-500">Operational</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">🟢</div>
            <p className="text-sm font-medium">WebSocket</p>
            <p className="text-xs text-gray-500">Operational</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">🟢</div>
            <p className="text-sm font-medium">File Storage</p>
            <p className="text-xs text-gray-500">Operational</p>
          </div>
        </div>
      </Card>
    </div>
  )
}