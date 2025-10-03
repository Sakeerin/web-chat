import React, { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { Button } from '@ui/components/button'
import { MediaPreview, FileAttachmentPreview } from './MediaPreview'
import { uploadApiService } from '@/services/uploadApi'
import { useAccessibility } from '@/components/accessibility/AccessibilityProvider'
import { 
  formatMessageForScreenReader, 
  formatAttachmentForScreenReader,
  getMessageAriaRole,
  generateId 
} from '@/utils/accessibility'

import type { MessageWithRelations } from '@shared/types'

interface MessageItemProps {
  message: MessageWithRelations
  isOwn: boolean
  showAvatar?: boolean
  onEdit?: (messageId: string, content: string) => void
  onDelete?: (messageId: string) => void
  onReply?: (message: MessageWithRelations) => void
  className?: string
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isOwn,
  showAvatar = true,
  onEdit,
  onDelete,
  onReply,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [showActions, setShowActions] = useState(false)
  const editInputRef = useRef<HTMLTextAreaElement>(null)
  const { announce } = useAccessibility()
  
  // Generate unique IDs for accessibility
  const messageId = generateId('message')
  const editId = generateId('edit-input')
  const actionsId = generateId('message-actions')


  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.setSelectionRange(editContent.length, editContent.length)
    }
  }, [isEditing, editContent.length])

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(message.id, editContent.trim())
      announce('Message edited', 'polite')
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditContent(message.content)
    setIsEditing(false)
    announce('Edit cancelled', 'polite')
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id)
      announce('Message deleted', 'polite')
    }
  }

  const handleReply = () => {
    if (onReply) {
      onReply(message)
      announce(`Replying to message from ${message.sender.name}`, 'polite')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const messageDate = new Date(date)
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return format(messageDate, 'HH:mm')
    } else if (diffInHours < 24 * 7) {
      return format(messageDate, 'EEE HH:mm')
    } else {
      return format(messageDate, 'MMM d, HH:mm')
    }
  }

  const renderMessageContent = () => {
    if (message.isDeleted) {
      return (
        <div className="italic text-gray-500 text-sm">
          This message was deleted
        </div>
      )
    }

    if (isEditing) {
      return (
        <div className="space-y-2" role="form" aria-label="Edit message">
          <label htmlFor={editId} className="sr-only">
            Edit message content
          </label>
          <textarea
            id={editId}
            ref={editInputRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={Math.min(editContent.split('\n').length + 1, 6)}
            aria-label="Message content"
            aria-describedby={`${editId}-help`}
          />
          <div id={`${editId}-help`} className="sr-only">
            Press Enter to save, Escape to cancel
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleEdit}
              aria-label="Save edited message"
            >
              Save
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleCancelEdit}
              aria-label="Cancel editing"
            >
              Cancel
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-1">
        {message.replyTo && (
          <div 
            className="border-l-2 border-gray-300 pl-2 mb-2"
            role="blockquote"
            aria-label={`Replying to ${message.replyTo.sender.name}`}
          >
            <div className="text-xs text-gray-500 font-medium">
              {message.replyTo.sender.name}
            </div>
            <div className="text-sm text-gray-600 truncate">
              {message.replyTo.content}
            </div>
          </div>
        )}
        
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>
        
        {message.attachments && message.attachments.length > 0 && (
          <div 
            className="mt-2 space-y-2"
            role="group"
            aria-label={`${message.attachments.length} attachment${message.attachments.length === 1 ? '' : 's'}`}
          >
            {message.attachments.map((attachment: any, index: number) => {
              const fileType = uploadApiService.getFileTypeFromMime(attachment.mimeType)
              const attachmentLabel = formatAttachmentForScreenReader(
                attachment.fileName,
                attachment.sizeBytes,
                attachment.mimeType
              )
              
              if (fileType === 'image' || fileType === 'video' || fileType === 'audio') {
                return (
                  <MediaPreview
                    key={attachment.id}
                    src={`/api/files/${attachment.objectKey}`}
                    type={fileType}
                    fileName={attachment.fileName}
                    fileSize={attachment.sizeBytes}
                    width={attachment.width}
                    height={attachment.height}
                    duration={attachment.durationMs}
                    thumbnailSrc={attachment.thumbnailKey ? `/api/files/${attachment.thumbnailKey}` : undefined}
                    className="max-w-sm"
                    aria-label={attachmentLabel}
                    onDownload={() => {
                      const link = document.createElement('a')
                      link.href = `/api/files/${attachment.objectKey}`
                      link.download = attachment.fileName
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      announce(`Downloading ${attachment.fileName}`, 'polite')
                    }}
                  />
                )
              } else {
                return (
                  <FileAttachmentPreview
                    key={attachment.id}
                    fileName={attachment.fileName}
                    fileSize={attachment.sizeBytes}
                    mimeType={attachment.mimeType}
                    downloadUrl={`/api/files/${attachment.objectKey}`}
                    className="max-w-sm"
                    aria-label={attachmentLabel}
                  />
                )
              }
            })}
          </div>
        )}
      </div>
    )
  }

  // Create screen reader friendly message description
  const messageDescription = formatMessageForScreenReader(
    message.sender.name,
    message.content,
    new Date(message.createdAt),
    isOwn
  )

  return (
    <div
      id={messageId}
      className={`group flex gap-3 px-4 py-2 hover:bg-gray-50 message-item ${className}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      role={getMessageAriaRole(message.type)}
      aria-label={messageDescription}
      tabIndex={0}
    >
      {/* Avatar */}
      {showAvatar && (
        <div className="flex-shrink-0">
          {message.sender.avatarUrl ? (
            <img
              src={message.sender.avatarUrl}
              alt={`${message.sender.name}'s avatar`}
              className="w-8 h-8 rounded-full"
              role="img"
            />
          ) : (
            <div 
              className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600"
              role="img"
              aria-label={`${message.sender.name}'s avatar`}
            >
              {message.sender.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Message content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-baseline gap-2 mb-1">
          <span 
            className="font-medium text-sm text-gray-900"
            aria-label={`Message from ${message.sender.name}`}
          >
            {message.sender.name}
          </span>
          <time 
            className="text-xs text-gray-500"
            dateTime={message.createdAt.toISOString()}
            aria-label={`Sent at ${formatTime(message.createdAt)}`}
          >
            {formatTime(message.createdAt)}
          </time>
          {message.isEdited && (
            <span 
              className="text-xs text-gray-400"
              aria-label="This message was edited"
            >
              (edited)
            </span>
          )}
        </div>

        {/* Content */}
        <div aria-live="polite" aria-atomic="true">
          {renderMessageContent()}
        </div>
      </div>

      {/* Actions */}
      {showActions && !message.isDeleted && !isEditing && (
        <div 
          id={actionsId}
          className="flex-shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          role="toolbar"
          aria-label="Message actions"
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReply}
            className="h-6 w-6 p-0"
            aria-label={`Reply to message from ${message.sender.name}`}
            title="Reply"
          >
            <span aria-hidden="true">↩️</span>
          </Button>
          
          {isOwn && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="h-6 w-6 p-0"
                aria-label="Edit this message"
                title="Edit"
              >
                <span aria-hidden="true">✏️</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                aria-label="Delete this message"
                title="Delete"
              >
                <span aria-hidden="true">🗑️</span>
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}