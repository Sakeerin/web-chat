import { useState } from 'react'
import { Button } from '@ui/components/button'
import { Card, CardContent } from '@ui/components/card'
import { useBlockUser, useReportUser } from '@/hooks/useContacts'
import type { Contact } from '@/types/contacts'
import { ReportUserDialog } from './ReportUserDialog'

interface ContactActionsProps {
  contact: Contact
  onRemove: () => void
  onBlock: () => void
  onReport: () => void
}

export function ContactActions({ contact, onRemove, onBlock, onReport }: ContactActionsProps) {
  const [showActions, setShowActions] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  
  const blockUserMutation = useBlockUser()
  const reportUserMutation = useReportUser()

  const handleBlock = async () => {
    const reason = window.prompt('Reason for blocking (optional):')
    
    try {
      await blockUserMutation.mutateAsync({
        userId: contact.id,
        ...(reason && { reason }),
      })
      onBlock()
      setShowActions(false)
    } catch (error) {
      console.error('Failed to block user:', error)
      alert('Failed to block user. Please try again.')
    }
  }

  const handleReport = () => {
    setShowReportDialog(true)
    setShowActions(false)
  }

  const handleReportSubmit = async (reason: string, description?: string) => {
    try {
      await reportUserMutation.mutateAsync({
        userId: contact.id,
        reason,
        ...(description && { description }),
      })
      onReport()
      setShowReportDialog(false)
      alert('User reported successfully.')
    } catch (error) {
      console.error('Failed to report user:', error)
      alert('Failed to report user. Please try again.')
    }
  }

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setShowActions(!showActions)
          }}
          className="h-8 w-8 p-0"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zM12 13a1 1 0 110-2 1 1 0 010 2zM12 20a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </Button>

        {showActions && (
          <Card className="absolute right-0 top-full mt-1 w-48 z-50 shadow-lg">
            <CardContent className="p-2">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove()
                    setShowActions(false)
                  }}
                  className="w-full justify-start text-left"
                >
                  Remove Contact
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleBlock()
                  }}
                  className="w-full justify-start text-left text-orange-600 hover:text-orange-700"
                  disabled={blockUserMutation.isPending}
                >
                  {blockUserMutation.isPending ? 'Blocking...' : 'Block User'}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReport()
                  }}
                  className="w-full justify-start text-left text-destructive hover:text-destructive/90"
                >
                  Report User
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Click outside to close */}
      {showActions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowActions(false)}
        />
      )}

      <ReportUserDialog
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        onSubmit={handleReportSubmit}
        userName={contact.name}
        isLoading={reportUserMutation.isPending}
      />
    </>
  )
}