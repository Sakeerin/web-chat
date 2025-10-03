import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@ui/components/button'
import { Textarea } from '@ui/components/textarea'
import { socketService } from '@/services/socket'
import { FileUploadButton, FileUploadZone } from './FileUploadZone'
import { UploadProgressList } from './UploadProgress'
import { useFileUpload } from '@/hooks/useFileUpload'
import { useAccessibility } from '@/components/accessibility/AccessibilityProvider'
import { generateId } from '@/utils/accessibility'

import type { MessageWithRelations } from '@shared/types'

interface MessageComposerProps {
  conversationId: string
  replyTo?: MessageWithRelations | null
  onSend: (content: string, replyToId?: string, attachments?: string[]) => void
  onCancelReply?: () => void
  className?: string
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  conversationId,
  replyTo,
  onSend,
  onCancelReply,
  className = ''
}) => {
  const [content, setContent] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showUploadZone, setShowUploadZone] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const { announce } = useAccessibility()
  
  // Generate unique IDs for accessibility
  const textareaId = generateId('message-input')
  const replyId = generateId('reply-preview')
  const uploadId = generateId('upload-zone')

  // File upload functionality
  const {
    uploads,
    uploadFiles,
    removeUpload,
    cancelUpload,
    retryUpload,
    clearCompleted
  } = useFileUpload({
    onSuccess: (result) => {
      console.log('File uploaded successfully:', result)
    },
    onError: (error) => {
      console.error('File upload failed:', error)
    }
  })


  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [content, adjustTextareaHeight])

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true)
      socketService.startTyping(conversationId)
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      socketService.stopTyping(conversationId)
    }, 3000)
  }, [conversationId, isTyping])

  const handleTypingStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    if (isTyping) {
      setIsTyping(false)
      socketService.stopTyping(conversationId)
    }
  }, [conversationId, isTyping])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setContent(value)
    
    if (value.trim()) {
      handleTypingStart()
    } else {
      handleTypingStop()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    const trimmedContent = content.trim()
    const completedUploads = uploads.filter(upload => upload.status === 'completed')
    
    if (!trimmedContent && completedUploads.length === 0) return

    // Process markdown-like formatting
    const processedContent = trimmedContent ? processMarkdown(trimmedContent) : ''
    
    // Get attachment IDs from completed uploads
    const attachmentIds = completedUploads
      .map(upload => upload.result?.objectKey)
      .filter(Boolean) as string[]
    
    onSend(processedContent, replyTo?.id, attachmentIds)
    setContent('')
    handleTypingStop()
    
    // Clear completed uploads after sending
    clearCompleted()
    
    // Announce message sent for screen readers
    announce('Message sent', 'polite')
    
    // Focus back to textarea
    textareaRef.current?.focus()
  }

  const processMarkdown = (text: string): string => {
    // Basic markdown processing for bold, italic, code
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    // Handle file paste
    const items = e.clipboardData.items
    const files: File[] = []
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item && item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          files.push(file)
        }
      }
    }
    
    if (files.length > 0) {
      uploadFiles(files)
    }
  }

  const handleFilesSelected = (files: File[]) => {
    uploadFiles(files)
    setShowUploadZone(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setShowUploadZone(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    // Only hide if leaving the composer area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setShowUploadZone(false)
    }
  }

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      handleTypingStop()
    }
  }, [handleTypingStop])

  const hasContent = content.trim() || uploads.some(upload => upload.status === 'completed')

  return (
    <div 
      className={`border-t border-gray-200 bg-white ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      role="region"
      aria-label="Message composer"
    >
      {/* Reply preview */}
      {replyTo && (
        <div 
          id={replyId}
          className="px-4 py-2 bg-gray-50 border-b border-gray-200"
          role="region"
          aria-label="Reply preview"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 font-medium">
                Replying to {replyTo.sender.name}
              </div>
              <div className="text-sm text-gray-600 truncate">
                {replyTo.content}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancelReply}
              className="ml-2 h-6 w-6 p-0"
              aria-label="Cancel reply"
            >
              ✕
            </Button>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div 
          className="px-4 py-2 border-b border-gray-200"
          role="region"
          aria-label="File upload progress"
        >
          <UploadProgressList
            uploads={uploads}
            onCancel={cancelUpload}
            onRetry={retryUpload}
            onRemove={removeUpload}
            onClearCompleted={clearCompleted}
          />
        </div>
      )}

      {/* Upload zone overlay */}
      {showUploadZone && (
        <div 
          id={uploadId}
          className="px-4 py-2 border-b border-gray-200"
          role="region"
          aria-label="File drop zone"
        >
          <FileUploadZone
            onFilesSelected={handleFilesSelected}
            className="h-32"
          />
        </div>
      )}

      {/* Composer */}
      <div className="p-4">
        <div className="flex gap-3 items-end">
          {/* File upload button */}
          <FileUploadButton
            onFilesSelected={handleFilesSelected}
            variant="ghost"
            size="default"
            aria-label="Attach files"
          />

          {/* Text input */}
          <div className="flex-1">
            <label htmlFor={textareaId} className="sr-only">
              Type your message
            </label>
            <textarea
              id={textareaId}
              ref={textareaRef}
              value={content}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Type a message... (Use **bold**, *italic*, `code`)"
              className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
              aria-describedby={replyTo ? replyId : undefined}
              aria-label="Message input"
            />
            
            {/* Formatting help */}
            <div 
              className="text-xs text-gray-400 mt-1"
              id={`${textareaId}-help`}
              role="note"
            >
              **bold** *italic* `code` • Enter to send, Shift+Enter for new line • Drag files or paste images
            </div>
          </div>

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={!hasContent}
            className="h-10 px-4"
            aria-label={hasContent ? 'Send message' : 'Send message (disabled, no content)'}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}