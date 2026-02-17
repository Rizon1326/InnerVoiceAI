import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Progress bar component
 */
function Progress({ value = 0, max = 100, className, showLabel = false, variant = 'default' }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    destructive: 'bg-destructive',
  }

  return (
    <div className={cn('relative', className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            'h-full transition-all duration-300',
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="absolute right-0 top-0 -mt-5 text-xs text-muted-foreground">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}

/**
 * Circular progress indicator
 */
function CircularProgress({ value = 0, size = 60, strokeWidth = 4, className }) {
  const percentage = Math.min(Math.max(value, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-300"
        />
      </svg>
      <span className="absolute text-sm font-medium">{Math.round(percentage)}%</span>
    </div>
  )
}

export { Progress, CircularProgress }
