import * as React from 'react'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { TOAST_CONFIG } from '@/lib/config'

// Toast Context
const ToastContext = React.createContext(null)

/**
 * Toast Provider component
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([])

  const addToast = React.useCallback(({ type = 'info', title, message, duration = TOAST_CONFIG.DURATION }) => {
    const id = Date.now()
    
    setToasts((prev) => {
      const newToasts = [...prev, { id, type, title, message }]
      // Keep only the last MAX_TOASTS
      if (newToasts.length > TOAST_CONFIG.MAX_TOASTS) {
        return newToasts.slice(-TOAST_CONFIG.MAX_TOASTS)
      }
      return newToasts
    })

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }, [])

  const removeToast = React.useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const toast = React.useMemo(() => ({
    success: (title, message) => addToast({ type: 'success', title, message }),
    error: (title, message) => addToast({ type: 'error', title, message }),
    warning: (title, message) => addToast({ type: 'warning', title, message }),
    info: (title, message) => addToast({ type: 'info', title, message }),
    dismiss: removeToast,
  }), [addToast, removeToast])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  )
}

/**
 * Hook to use toast notifications
 */
export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

/**
 * Toast container component
 */
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  )
}

/**
 * Individual toast component
 */
function Toast({ type, title, message, onDismiss }) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }

  const styles = {
    success: 'border-green-500/50 bg-green-50 dark:bg-green-950/20',
    error: 'border-red-500/50 bg-red-50 dark:bg-red-950/20',
    warning: 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20',
    info: 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/20',
  }

  const iconStyles = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
  }

  const Icon = icons[type]

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-in slide-in-from-right-full duration-300 min-w-[300px] max-w-[400px]',
        styles[type]
      )}
      role="alert"
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', iconStyles[type])} />
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium text-foreground">{title}</p>}
        {message && <p className="text-sm text-muted-foreground mt-1">{message}</p>}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss toast"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export { Toast }
