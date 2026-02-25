import * as React from 'react'
import { cn } from '@/lib/utils'
import { IMPROVEMENT_GOALS } from '@/stores/analysisStore'
import { Check, Loader2 } from 'lucide-react'

/**
 * RewriteOptions Component
 * Grid of improvement goal options for text rewriting
 * 
 * @param {string} selectedGoal - Currently selected goal ID
 * @param {function} onSelect - Callback when goal is selected
 * @param {boolean} isLoading - Loading state
 * @param {Object} emotions - Emotion scores to show relevant suggestions first
 */
export function RewriteOptions({ selectedGoal, onSelect, isLoading = false, emotions = {} }) {
  // Sort goals based on detected emotions (show most relevant first)
  const sortedGoals = React.useMemo(() => {
    const goals = [...IMPROVEMENT_GOALS]
    
    // Calculate relevance score for each goal based on detected emotions
    goals.forEach(goal => {
      let relevance = 0
      
      if (goal.id === 'reduce_sadness' && emotions.sadness > 0.2) {
        relevance = emotions.sadness * 10
      }
      if (goal.id === 'reduce_aggression' && emotions.anger > 0.2) {
        relevance = emotions.anger * 10
      }
      if (goal.id === 'more_positive' && (emotions.sadness > 0.2 || emotions.fear > 0.2)) {
        relevance = Math.max(emotions.sadness || 0, emotions.fear || 0) * 8
      }
      
      goal._relevance = relevance
    })
    
    // Sort by relevance (higher first), then maintain original order
    return goals.sort((a, b) => b._relevance - a._relevance)
  }, [emotions])

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Select Improvement Goal
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {sortedGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            isSelected={selectedGoal === goal.id}
            isLoading={isLoading && selectedGoal === goal.id}
            onClick={() => onSelect(goal.id)}
            isRecommended={goal._relevance > 0}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Individual Goal Card
 */
function GoalCard({ goal, isSelected, isLoading, onClick, isRecommended }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        'relative flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200',
        'hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        isSelected 
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
          : 'border-border bg-card',
        isLoading && 'opacity-70 pointer-events-none'
      )}
    >
      {/* Recommended badge */}
      {isRecommended && !isSelected && (
        <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-500 text-white">
          Suggested
        </span>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <span className="absolute top-2 right-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Check className="h-4 w-4 text-primary" />
          )}
        </span>
      )}

      {/* Icon */}
      <span className="text-2xl mb-2">{goal.icon}</span>

      {/* Label */}
      <span className={cn(
        'text-sm font-medium',
        isSelected && 'text-primary'
      )}>
        {goal.label}
      </span>

      {/* Gradient accent */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-1 rounded-b-xl bg-gradient-to-r opacity-0 transition-opacity',
          goal.color,
          isSelected && 'opacity-100'
        )}
      />
    </button>
  )
}

export default RewriteOptions
