import React, { useState } from 'react'
import { Button } from '@ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card'
import { Input } from '@ui/components/input'
import { Label } from '@ui/components/label'

interface ReportUserDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (reason: string, description?: string) => void
  userName: string
  isLoading?: boolean
}

const REPORT_REASONS = [
  'Spam',
  'Harassment',
  'Inappropriate content',
  'Impersonation',
  'Scam or fraud',
  'Hate speech',
  'Violence or threats',
  'Other',
]

export function ReportUserDialog({ 
  isOpen, 
  onClose, 
  onSubmit, 
  userName, 
  isLoading = false 
}: ReportUserDialogProps) {
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const reason = selectedReason === 'Other' ? customReason : selectedReason
    if (!reason.trim()) return
    
    onSubmit(reason.trim(), description.trim() || undefined)
  }

  const handleClose = () => {
    setSelectedReason('')
    setCustomReason('')
    setDescription('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Report {userName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Help us understand what's happening
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Reason selection */}
              <div className="space-y-2">
                <Label>Reason for reporting</Label>
                <div className="space-y-2">
                  {REPORT_REASONS.map((reason) => (
                    <label key={reason} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="reason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom reason input */}
              {selectedReason === 'Other' && (
                <div className="space-y-2">
                  <Label htmlFor="customReason">Please specify</Label>
                  <Input
                    id="customReason"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter reason..."
                    required
                    maxLength={100}
                  />
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Additional details (optional)</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide more context about this report..."
                  className="w-full min-h-[80px] px-3 py-2 text-sm border border-input rounded-md bg-background resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  maxLength={500}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {description.length}/500
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedReason || (selectedReason === 'Other' && !customReason.trim()) || isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Reporting...' : 'Submit Report'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}