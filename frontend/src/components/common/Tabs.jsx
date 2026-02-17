import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Tabs component
 */
function Tabs({ tabs, activeTab, onChange, className, variant = 'default' }) {
  const variants = {
    default: 'border-b',
    pills: 'bg-muted p-1 rounded-lg',
    underline: '',
  }

  const tabVariants = {
    default: (isActive) =>
      cn(
        'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
        isActive
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
      ),
    pills: (isActive) =>
      cn(
        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
        isActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      ),
    underline: (isActive) =>
      cn(
        'px-4 py-2 text-sm font-medium transition-colors',
        isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      ),
  }

  return (
    <div className={cn('flex', variants[variant], className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.value}
          onClick={() => onChange(tab.value)}
          className={tabVariants[variant](activeTab === tab.value)}
          disabled={tab.disabled}
        >
          {tab.icon && <tab.icon className="h-4 w-4 mr-2 inline-block" />}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Tab panel content wrapper
 */
function TabPanel({ children, value, activeTab, className }) {
  if (value !== activeTab) return null

  return (
    <div role="tabpanel" className={cn('mt-4', className)}>
      {children}
    </div>
  )
}

export { Tabs, TabPanel }
