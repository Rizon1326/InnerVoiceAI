import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground border border-primary hover:bg-primary/90 hover:border-primary/70 hover:shadow-md hover:shadow-primary/25',
        destructive: 'bg-destructive text-destructive-foreground border border-destructive hover:bg-destructive/90 hover:border-destructive/70 hover:shadow-md hover:shadow-destructive/25',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/60',
        secondary: 'bg-secondary text-secondary-foreground border border-secondary hover:bg-secondary/80 hover:border-secondary/60 hover:shadow-sm',
        ghost: 'border border-transparent hover:bg-accent hover:text-accent-foreground hover:border-border',
        link: 'border border-transparent text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

/**
 * Button component with multiple variants and sizes
 */
const Button = React.forwardRef(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
