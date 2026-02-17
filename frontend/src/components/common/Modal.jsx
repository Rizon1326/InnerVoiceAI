import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { Button } from './Button'

/**
 * Modal/Dialog component
 */
function Modal({ isOpen, onClose, children, className, showCloseButton = true }) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal content */}
      <div
        className={cn(
          'relative z-50 w-full max-w-lg rounded-lg bg-background p-6 shadow-lg animate-in fade-in-0 zoom-in-95 duration-200',
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {showCloseButton && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-4 top-4"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {children}
      </div>
    </div>
  )
}

/**
 * Modal header
 */
function ModalHeader({ className, children, ...props }) {
  return (
    <div className={cn('mb-4 pr-8', className)} {...props}>
      {children}
    </div>
  )
}

/**
 * Modal title
 */
function ModalTitle({ className, children, ...props }) {
  return (
    <h2 className={cn('text-lg font-semibold', className)} {...props}>
      {children}
    </h2>
  )
}

/**
 * Modal description
 */
function ModalDescription({ className, children, ...props }) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </p>
  )
}

/**
 * Modal footer
 */
function ModalFooter({ className, children, ...props }) {
  return (
    <div className={cn('mt-6 flex justify-end gap-3', className)} {...props}>
      {children}
    </div>
  )
}

export { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter }
