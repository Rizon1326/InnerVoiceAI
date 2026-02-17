import * as React from 'react'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/utils'

/**
 * Avatar component with fallback to initials
 */
function Avatar({ src, alt, name, size = 'default', className }) {
  const [imageError, setImageError] = React.useState(false)

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    default: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  }

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={alt || name}
        onError={() => setImageError(true)}
        className={cn(
          'rounded-full object-cover',
          sizeClasses[size],
          className
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium',
        sizeClasses[size],
        className
      )}
    >
      {getInitials(name || alt || 'U')}
    </div>
  )
}

/**
 * Avatar with status indicator
 */
function AvatarWithStatus({ src, name, status = 'offline', size = 'default', className }) {
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-red-500',
    away: 'bg-yellow-500',
  }

  return (
    <div className={cn('relative inline-block', className)}>
      <Avatar src={src} name={name} size={size} />
      <span
        className={cn(
          'absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-background',
          statusColors[status]
        )}
      />
    </div>
  )
}

export { Avatar, AvatarWithStatus }
