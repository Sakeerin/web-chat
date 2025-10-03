import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../services/adminApi'
import { Card } from '@ui/components/card'
import { Button } from '@ui/components/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ui/components/dialog'

interface AuditLog {
  id: string
  adminId: string
  action: string
  resource: string
  resourceId?: string
  details: Record<string, any>
  createdAt: string
}

export const AuditLogs: React.FC = () => {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [resourceFilter, setResourceFilter] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', page, actionFilter, resourceFilter],
    queryFn: () => adminApi.getAuditLogs({
      page,
      limit: 20,
      action: actionFilter || undefined,
      resource: resourceFilter || undefined,
    }),
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getActionColor = (action: string) => {
    if (action.includes('SUSPENDED') || action.includes('BANNED')) {
      return 'bg-red-100 text-red-800'
    }
    if (action.includes('DELETED')) {
      return 'bg-orange-100 text-orange-800'
    }
    if (action.includes('RESOLVED') || action.includes('UNSUSPENDED')) {
      return 'bg-green-100 text-green-800'
    }
    if (action.includes('REVIEWED') || action.includes('UPDATED')) {
      return 'bg-blue-100 text-blue-800'
    }
    return 'bg-gray-100 text-gray-800'
  }

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Audit Logs</h2>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All actions</option>
              <option value="USER_SUSPENDED">User Suspended</option>
              <option value="USER_BANNED">User Banned</option>
              <option value="USER_UNSUSPENDED">User Unsuspended</option>
              <option value="USER_ROLE_UPDATED">Role Updated</option>
              <option value="MESSAGE_DELETED">Message Deleted</option>
              <option value="CONVERSATION_DELETED">Conversation Deleted</option>
              <option value="REPORT_REVIEWED">Report Reviewed</option>
              <option value="REPORT_RESOLVED">Report Resolved</option>
              <option value="REPORT_DISMISSED">Report Dismissed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resource
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
            >
              <option value="">All resources</option>
              <option value="user">User</option>
              <option value="message">Message</option>
              <option value="conversation">Conversation</option>
              <option value="report">Report</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => {
                setActionFilter('')
                setResourceFilter('')
                setPage(1)
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading audit logs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logsData?.logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.adminId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{log.resource}</div>
                        {log.resourceId && (
                          <div className="text-xs text-gray-500 font-mono">
                            {log.resourceId.substring(0, 8)}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate">
                        {log.details.reason || log.details.oldRole || log.details.status || 'No details'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLog(log)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {logsData && logsData.pages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, logsData.total)} of {logsData.total} logs
            </div>
            <div className="space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page >= logsData.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Log Details Modal */}
      {selectedLog && (
        <Dialog open={true} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Audit Log Details</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Timestamp</h4>
                  <p className="text-sm text-gray-600">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Admin ID</h4>
                  <p className="text-sm text-gray-600 font-mono">{selectedLog.adminId}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Action</h4>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(selectedLog.action)}`}>
                    {formatAction(selectedLog.action)}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Resource</h4>
                  <p className="text-sm text-gray-600">{selectedLog.resource}</p>
                </div>
              </div>

              {selectedLog.resourceId && (
                <div>
                  <h4 className="font-medium text-gray-900">Resource ID</h4>
                  <p className="text-sm text-gray-600 font-mono">{selectedLog.resourceId}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium text-gray-900">Details</h4>
                <div className="mt-2 bg-gray-50 rounded-md p-3">
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedLog(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}