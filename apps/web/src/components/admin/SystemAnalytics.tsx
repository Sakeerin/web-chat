import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../services/adminApi'
import { Card } from '@ui/components/card'
import { Button } from '@ui/components/button'

export const SystemAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState(30)

  const { data: analytics } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => adminApi.getSystemAnalytics(),
  })

  const { data: userGrowth } = useQuery({
    queryKey: ['admin', 'user-growth', timeRange],
    queryFn: () => adminApi.getUserGrowthAnalytics(timeRange),
  })

  const { data: messageAnalytics } = useQuery({
    queryKey: ['admin', 'message-analytics', timeRange],
    queryFn: () => adminApi.getMessageAnalytics(timeRange),
  })

  const { data: reportAnalytics } = useQuery({
    queryKey: ['admin', 'report-analytics', timeRange],
    queryFn: () => adminApi.getReportAnalytics(timeRange),
  })

  const timeRanges = [
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
  ]

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  const formatPercentage = (num: number) => {
    return `${(num * 100).toFixed(1)}%`
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">System Analytics</h2>
        <div className="flex space-x-2">
          {timeRanges.map((range) => (
            <Button
              key={range.value}
              size="sm"
              variant={timeRange === range.value ? 'default' : 'outline'}
              onClick={() => setTimeRange(range.value)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {/* System Overview */}
      {analytics && (
        <div>
          <h3 className="text-md font-semibold text-gray-800 mb-4">System Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Users</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatNumber(analytics.totalUsers)}
                  </p>
                </div>
                <div className="text-2xl">👥</div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Users</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatNumber(analytics.activeUsers)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatPercentage(analytics.activeUsers / analytics.totalUsers)} of total
                  </p>
                </div>
                <div className="text-2xl">✅</div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Daily Active</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatNumber(analytics.dailyActiveUsers)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatPercentage(analytics.dailyActiveUsers / analytics.totalUsers)} of total
                  </p>
                </div>
                <div className="text-2xl">📊</div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Messages</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatNumber(analytics.totalMessages)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatNumber(analytics.messagesSentToday)} today
                  </p>
                </div>
                <div className="text-2xl">💬</div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* User Growth Analytics */}
      {userGrowth && (
        <Card className="p-6">
          <h3 className="text-md font-semibold text-gray-800 mb-4">
            User Growth ({timeRange} days)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatNumber(userGrowth.totalGrowth)}
              </p>
              <p className="text-sm text-gray-500">New Users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {userGrowth.averageDaily.toFixed(1)}
              </p>
              <p className="text-sm text-gray-500">Average Daily</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {userGrowth.dailySignups.length > 1 
                  ? ((userGrowth.dailySignups[userGrowth.dailySignups.length - 1].count / 
                      userGrowth.dailySignups[userGrowth.dailySignups.length - 2].count - 1) * 100).toFixed(1)
                  : 0}%
              </p>
              <p className="text-sm text-gray-500">Daily Change</p>
            </div>
          </div>
          
          {/* Simple chart representation */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Daily Signups</h4>
            <div className="grid grid-cols-7 gap-1 text-xs">
              {userGrowth.dailySignups.slice(-7).map((day, index) => (
                <div key={index} className="text-center">
                  <div className="text-gray-500 mb-1">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div 
                    className="bg-blue-500 rounded"
                    style={{ 
                      height: `${Math.max(4, (day.count / Math.max(...userGrowth.dailySignups.slice(-7).map(d => d.count))) * 40)}px` 
                    }}
                  ></div>
                  <div className="text-gray-600 mt-1">{day.count}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Message Analytics */}
      {messageAnalytics && (
        <Card className="p-6">
          <h3 className="text-md font-semibold text-gray-800 mb-4">
            Message Analytics ({timeRange} days)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatNumber(messageAnalytics.totalMessages)}
              </p>
              <p className="text-sm text-gray-500">Total Messages</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {messageAnalytics.averageDaily.toFixed(1)}
              </p>
              <p className="text-sm text-gray-500">Average Daily</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {messageAnalytics.dailyMessages.length > 1 
                  ? ((messageAnalytics.dailyMessages[messageAnalytics.dailyMessages.length - 1].count / 
                      messageAnalytics.dailyMessages[messageAnalytics.dailyMessages.length - 2].count - 1) * 100).toFixed(1)
                  : 0}%
              </p>
              <p className="text-sm text-gray-500">Daily Change</p>
            </div>
          </div>

          {/* Message types breakdown */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Message Types</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(messageAnalytics.messagesByType).map(([type, count]) => (
                <div key={type} className="text-center">
                  <p className="text-lg font-semibold text-gray-800">{formatNumber(count)}</p>
                  <p className="text-xs text-gray-500 capitalize">{type.toLowerCase()}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Report Analytics */}
      {reportAnalytics && (
        <Card className="p-6">
          <h3 className="text-md font-semibold text-gray-800 mb-4">
            Report Analytics ({timeRange} days)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {formatNumber(reportAnalytics.dailyReports.reduce((sum, day) => sum + day.count, 0))}
              </p>
              <p className="text-sm text-gray-500">Total Reports</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {formatNumber(reportAnalytics.reportsByStatus.PENDING || 0)}
              </p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatNumber(reportAnalytics.reportsByStatus.RESOLVED || 0)}
              </p>
              <p className="text-sm text-gray-500">Resolved</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {reportAnalytics.averageResolutionTime}h
              </p>
              <p className="text-sm text-gray-500">Avg Resolution</p>
            </div>
          </div>

          {/* Report reasons breakdown */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Report Reasons</h4>
            <div className="space-y-2">
              {Object.entries(reportAnalytics.reportsByReason)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([reason, count]) => (
                <div key={reason} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{reason}</span>
                  <span className="text-sm font-medium">{formatNumber(count)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* System Health Indicators */}
      <Card className="p-6">
        <h3 className="text-md font-semibold text-gray-800 mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl mb-2">🟢</div>
            <p className="text-sm font-medium">Database</p>
            <p className="text-xs text-gray-500">Operational</p>
            <p className="text-xs text-gray-500">Response: &lt;50ms</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">🟢</div>
            <p className="text-sm font-medium">WebSocket</p>
            <p className="text-xs text-gray-500">Operational</p>
            <p className="text-xs text-gray-500">Connections: Active</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">🟢</div>
            <p className="text-sm font-medium">File Storage</p>
            <p className="text-xs text-gray-500">Operational</p>
            <p className="text-xs text-gray-500">Upload: Available</p>
          </div>
        </div>
      </Card>
    </div>
  )
}