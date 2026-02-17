import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

/**
 * Accordion component for collapsible sections
 */
function Accordion({ items, defaultOpen, allowMultiple = false, className }) {
  const [openItems, setOpenItems] = React.useState(
    defaultOpen ? (Array.isArray(defaultOpen) ? defaultOpen : [defaultOpen]) : []
  )

  const toggleItem = (value) => {
    if (allowMultiple) {
      setOpenItems((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      )
    } else {
      setOpenItems((prev) => (prev.includes(value) ? [] : [value]))
    }
  }

  return (
    <div className={cn('space-y-1', className)}>
      {items.map((item) => (
        <AccordionItem
          key={item.value}
          isOpen={openItems.includes(item.value)}
          onToggle={() => toggleItem(item.value)}
          {...item}
        />
      ))}
    </div>
  )
}

/**
 * Individual accordion item
 */
function AccordionItem({ title, content, isOpen, onToggle, disabled }) {
  return (
    <div className="border rounded-md">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent transition-colors',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        aria-expanded={isOpen}
      >
        <span>{title}</span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-3 pt-0 text-sm text-muted-foreground animate-in fade-in-0 slide-in-from-top-1">
          {content}
        </div>
      )}
    </div>
  )
}

export { Accordion, AccordionItem }
