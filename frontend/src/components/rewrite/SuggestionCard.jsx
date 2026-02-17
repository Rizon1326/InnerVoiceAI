import * as React from 'react'
import { cn } from '@/lib/utils'
import { ArrowRight, Loader2 } from 'lucide-react'

/**
 * SuggestionCard Component
 * Clickable suggestion cards that trigger rewrite with specific goal
 * 
 * @param {Object} suggestion - Suggestion object with icon, label, goalId
 * @param {function} onClick - Callback when clicked
 * @param {boolean} isLoading - Loading state
 */
export function SuggestionCard({ suggestion, onClick, isLoading = false }) {
  const { icon, label, description, goalId, color = 'from-primary to-purple-500' } = suggestion

  return (
    <button
      type="button"
      onClick={() => onClick(goalId)}
      disabled={isLoading}
      className={cn(
        'group flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-200',
        'hover:shadow-md hover:border-primary/50 hover:bg-primary/5',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'bg-card',
        isLoading && 'opacity-70 pointer-events-none'
      )}
    >
      {/* Icon with gradient background */}
      <div className={cn(
        'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg',
        'bg-gradient-to-br text-white',
        color
      )}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
          {label}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground truncate">
            {description}
          </p>
        )}
      </div>

      {/* Arrow / Loading */}
      <div className="flex-shrink-0">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        )}
      </div>
    </button>
  )
}

/**
 * SuggestionCards Container
 * Shows contextual suggestions based on detected emotions
 */
export function SuggestionCards({ emotions = {}, onSelect, loadingGoal = null }) {
  // Generate suggestions based on emotions
  const suggestions = React.useMemo(() => {
    const items = []

    // Always show "Make More Positive" as a general option
    items.push({
      icon: '😊',
      label: 'Make it more positive',
      description: 'Add optimism and warmth',
      goalId: 'more_positive',
      color: 'from-pink-500 to-rose-500',
      priority: 1,
    })

    // Show based on detected emotions
    if (emotions.anger > 0.2) {
      items.push({
        icon: '🕊️',
        label: 'Make this less aggressive',
        description: 'Soften confrontational language',
        goalId: 'reduce_aggression',
        color: 'from-green-500 to-emerald-500',
        priority: emotions.anger * 10,
      })
    }

    if (emotions.sadness > 0.2) {
      items.push({
        icon: '☀️',
        label: 'Reduce sadness',
        description: 'Transform to hopeful tone',
        goalId: 'reduce_sadness',
        color: 'from-yellow-500 to-orange-500',
        priority: emotions.sadness * 10,
      })
    }

    if (emotions.fear > 0.2) {
      items.push({
        icon: '💪',
        label: 'Add confidence',
        description: 'Remove anxious undertones',
        goalId: 'more_positive',
        color: 'from-blue-500 to-indigo-500',
        priority: emotions.fear * 8,
      })
    }

    // Always show professional option
    items.push({
      icon: '💼',
      label: 'Rewrite professionally',
      description: 'Polish for business context',
      goalId: 'more_professional',
      color: 'from-blue-500 to-cyan-500',
      priority: 0.5,
    })

    // Sort by priority and take top 4
    return items
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 4)
  }, [emotions])

  if (suggestions.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Quick Improvements
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {suggestions.map((suggestion, index) => (
          <SuggestionCard
            key={`${suggestion.goalId}-${index}`}
            suggestion={suggestion}
            onClick={onSelect}
            isLoading={loadingGoal === suggestion.goalId}
          />
        ))}
      </div>
    </div>
  )
}

export default SuggestionCard
