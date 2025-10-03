import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background relative',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary focus:underline',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Loading state - shows spinner and disables interaction
   */
  loading?: boolean
  /**
   * Icon to display before text
   */
  icon?: React.ReactNode
  /**
   * Icon to display after text
   */
  iconAfter?: React.ReactNode
  /**
   * Screen reader only text for additional context
   */
  srText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    loading = false,
    icon,
    iconAfter,
    srText,
    children,
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
          </div>
        )}
        
        <div className={cn('flex items-center gap-2', loading && 'opacity-0')}>
          {icon && (
            <span className="flex-shrink-0" aria-hidden="true">
              {icon}
            </span>
          )}
          
          {children && (
            <span>{children}</span>
          )}
          
          {iconAfter && (
            <span className="flex-shrink-0" aria-hidden="true">
              {iconAfter}
            </span>
          )}
        </div>
        
        {srText && (
          <span className="sr-only">{srText}</span>
        )}
        
        {loading && (
          <span className="sr-only">Loading</span>
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }