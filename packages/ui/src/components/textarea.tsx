import React from 'react'
import { cn } from '../utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Error message to display
   */
  error?: string
  /**
   * Helper text to display below textarea
   */
  helperText?: string
  /**
   * Label for the textarea
   */
  label?: string
  /**
   * Whether the textarea is required
   */
  required?: boolean
  /**
   * Character count display
   */
  maxLength?: number
  /**
   * Show character count
   */
  showCharCount?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    error,
    helperText,
    label,
    required,
    maxLength,
    showCharCount,
    value,
    id,
    ...props 
  }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`
    const errorId = error ? `${textareaId}-error` : undefined
    const helperTextId = helperText ? `${textareaId}-helper` : undefined
    const charCountId = showCharCount ? `${textareaId}-char-count` : undefined
    const describedBy = [errorId, helperTextId, charCountId].filter(Boolean).join(' ')
    
    const currentLength = typeof value === 'string' ? value.length : 0

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={textareaId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
            {required && (
              <span className="text-destructive ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}
        
        <textarea
          id={textareaId}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy || undefined}
          aria-required={required}
          maxLength={maxLength}
          value={value}
          {...props}
        />
        
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {error && (
              <p 
                id={errorId}
                className="text-sm text-destructive"
                role="alert"
                aria-live="polite"
              >
                {error}
              </p>
            )}
            
            {helperText && !error && (
              <p 
                id={helperTextId}
                className="text-sm text-muted-foreground"
              >
                {helperText}
              </p>
            )}
          </div>
          
          {showCharCount && maxLength && (
            <p 
              id={charCountId}
              className={cn(
                'text-sm text-muted-foreground',
                currentLength > maxLength * 0.9 && 'text-yellow-600',
                currentLength >= maxLength && 'text-destructive'
              )}
              aria-live="polite"
            >
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }