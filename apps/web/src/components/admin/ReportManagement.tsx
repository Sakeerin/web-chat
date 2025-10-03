import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../services/adminApi'
import { Card } from '@ui/components/card'
import { Button } from '@ui/components/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ui/components/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select'

interface Report {
  id: string
  reporterId: string
  reportedUserId: string
  reason: string
  description?: string
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED'
  reviewedBy?: string
  reviewedAt?: string
  resolution?: string
  createdAt: string
  updatedAt: string
  reporter: {
    id: string
    username: string
    name: string
  }
  reported: {
    id: string
    username: string
    name: string
  }
}

export const ReportManagement: React.FC = () => {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)

  const queryClient = useQueryClient()

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['admin', 'reports', page, statusFilter],
    queryFn: () => adminApi.getReports({
      page,
      limit: 20,
      status: statusFilter || undefined,
    }),
  })

  const { data: reportContent } = useQuery({
    queryKey: ['admin', 'report-content', selectedReport?.id],
    queryFn: () => selectedReport ? adminApi.getReportedContent(selectedReport.id) : null,
    enabled: !!selectedReport,
  })

  const reviewMutation = useMutation({
    mutationFn: ({ reportId, status, resolution }: { reportId: string; status: string; resolution?: string }) =>
      adminApi.reviewReport(reportId, { status, resolution }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] })
      setShowReviewModal(false)
      setSelectedReport(null)
    },
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'UNDER_REVIEW':
        return 'bg-blue-100 text-blue-800'
      case 'RESOLVED':
        return 'bg-green-100 text-green-800'
      case 'DISMISSED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleReviewReport = (report: Report) => {
    setSelectedReport(report)
    setShowReviewModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Report Management</h2>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="DISMISSED">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => {
                setStatusFilter('')
                setPage(1)
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Reports Table */}
      <Card>
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading reports...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reporter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reported User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportsData?.reports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {report.reporter.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{report.reporter.username}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {report.reported.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{report.reported.username}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{report.reason}</div>
                      {report.description && (
                        <div className="text-sm text-gray-500 mt-1 max-w-xs truncate">
                          {report.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                        {report.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(report.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedReport(report)}
                      >
                        View Details
                      </Button>
                      {report.status === 'PENDING' || report.status === 'UNDER_REVIEW' ? (
                        <Button
                          size="sm"
                          onClick={() => handleReviewReport(report)}
                        >
                          Review
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {reportsData && reportsData.pages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, reportsData.total)} of {reportsData.total} reports
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
                disabled={page >= reportsData.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Report Details Modal */}
      {selectedReport && !showReviewModal && (
        <Dialog open={true} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Report Details</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Report Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Reporter</h4>
                  <p className="text-sm text-gray-600">
                    {selectedReport.reporter.name} (@{selectedReport.reporter.username})
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Reported User</h4>
                  <p className="text-sm text-gray-600">
                    {selectedReport.reported.name} (@{selectedReport.reported.username})
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Reason</h4>
                  <p className="text-sm text-gray-600">{selectedReport.reason}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Status</h4>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedReport.status)}`}>
                    {selectedReport.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {selectedReport.description && (
                <div>
                  <h4 className="font-medium text-gray-900">Description</h4>
                  <p className="text-sm text-gray-600 mt-1">{selectedReport.description}</p>
                </div>
              )}

              {selectedReport.resolution && (
                <div>
                  <h4 className="font-medium text-gray-900">Resolution</h4>
                  <p className="text-sm text-gray-600 mt-1">{selectedReport.resolution}</p>
                </div>
              )}

              {/* Reported User Activity */}
              {reportContent && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">User Activity</h4>
                  
                  {reportContent.userActivity && (
                    <Card className="p-4">
                      <h5 className="font-medium text-gray-800 mb-2">Account Summary</h5>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>Account created: {formatDate(reportContent.userActivity.createdAt)}</div>
                        <div>Last seen: {formatDate(reportContent.userActivity.lastSeenAt)}</div>
                        <div>Messages sent: {reportContent.userActivity._count.sentMessages}</div>
                        <div>Conversations: {reportContent.userActivity._count.conversationMembers}</div>
                        <div>Reports made: {reportContent.userActivity._count.reportsMade}</div>
                        <div>Reports received: {reportContent.userActivity._count.reportsReceived}</div>
                      </div>
                    </Card>
                  )}

                  {reportContent.messages && reportContent.messages.length > 0 && (
                    <Card className="p-4">
                      <h5 className="font-medium text-gray-800 mb-2">Recent Messages (Last 7 days)</h5>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {reportContent.messages.map((message: any) => (
                          <div key={message.id} className="border-l-2 border-gray-200 pl-3 py-1">
                            <div className="text-xs text-gray-500">
                              {formatDate(message.createdAt)} • {message.conversation.type}
                            </div>
                            <div className="text-sm">{message.content}</div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedReport(null)}>
                  Close
                </Button>
                {(selectedReport.status === 'PENDING' || selectedReport.status === 'UNDER_REVIEW') && (
                  <Button onClick={() => handleReviewReport(selectedReport)}>
                    Review Report
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedReport && (
        <ReviewReportModal
          report={selectedReport}
          onClose={() => {
            setShowReviewModal(false)
            setSelectedReport(null)
          }}
          onReview={(status, resolution) => 
            reviewMutation.mutate({ 
              reportId: selectedReport.id, 
              status, 
              resolution 
            })
          }
        />
      )}
    </div>
  )
}

interface ReviewReportModalProps {
  report: Report
  onClose: () => void
  onReview: (status: string, resolution?: string) => void
}

const ReviewReportModal: React.FC<ReviewReportModalProps> = ({
  report,
  onClose,
  onReview,
}) => {
  const [status, setStatus] = useState<string>('UNDER_REVIEW')
  const [resolution, setResolution] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onReview(status, resolution || undefined)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Report</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">
              Report against: <strong>{report.reported.name}</strong> (@{report.reported.username})
            </p>
            <p className="text-sm text-gray-600">
              Reason: <strong>{report.reason}</strong>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="DISMISSED">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resolution Notes
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describe the action taken or reason for dismissal..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Update Report
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}