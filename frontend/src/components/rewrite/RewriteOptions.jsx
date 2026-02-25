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
 * @param {Object} personality - OCEAN personality trait scores (0-100)
 * @param {Object} sentiment - Sentiment data { label, score, scores }
 */
export function RewriteOptions({ selectedGoal, onSelect, isLoading = false, emotions = {}, personality = {}, sentiment = {} }) {
  // Sort goals based on detected emotions, personality traits, and sentiment
  const sortedGoals = React.useMemo(() => {
    const goals = [...IMPROVEMENT_GOALS]
    
    const sentimentScore = sentiment.score ?? 0
    const sentimentLabel = sentiment.label || 'neutral'
    
    // Calculate relevance score for each goal based on the full analysis
    goals.forEach(goal => {
      let relevance = 0
      
      // Emotion-based relevance
      if (goal.id === 'reduce_sadness' && emotions.sadness > 0.2) {
        relevance = emotions.sadness * 10
      }
      if (goal.id === 'reduce_aggression' && emotions.anger > 0.2) {
        relevance = emotions.anger * 10
      }
      if (goal.id === 'more_positive' && (emotions.sadness > 0.2 || emotions.fear > 0.2 || sentimentLabel === 'negative')) {
        relevance = Math.max(emotions.sadness || 0, emotions.fear || 0, sentimentLabel === 'negative' ? 0.6 : 0) * 8
      }
      if (goal.id === 'reduce_fear' && emotions.fear > 0.2) {
        relevance = emotions.fear * 10
      }
      if (goal.id === 'increase_confidence' && emotions.fear > 0.15) {
        relevance = emotions.fear * 7
      }
      
      // Personality-based relevance (personality scores are 0-100)
      if (goal.id === 'increase_openness' && personality.openness < 40) {
        relevance = Math.max(relevance, (100 - personality.openness) / 10)
      }
      if (goal.id === 'decrease_openness' && personality.openness > 75) {
        relevance = Math.max(relevance, personality.openness / 12)
      }
      if (goal.id === 'reduce_neuroticism' && personality.neuroticism > 60) {
        relevance = Math.max(relevance, personality.neuroticism / 10)
      }
      if (goal.id === 'increase_extraversion' && personality.extraversion < 35) {
        relevance = Math.max(relevance, (100 - personality.extraversion) / 12)
      }
      if (goal.id === 'increase_agreeableness' && personality.agreeableness < 40) {
        relevance = Math.max(relevance, (100 - personality.agreeableness) / 10)
      }
      if (goal.id === 'increase_empathy' && personality.agreeableness < 45) {
        relevance = Math.max(relevance, (100 - personality.agreeableness) / 12)
      }
      
      // Sentiment-based relevance
      if (goal.id === 'make_friendly' && sentimentLabel === 'negative') {
        relevance = Math.max(relevance, Math.abs(sentimentScore) * 5)
      }
      if (goal.id === 'more_professional') {
        // Small baseline relevance — always somewhat useful
        relevance = Math.max(relevance, 0.5)
      }
      
      goal._relevance = relevance
    })
    
    // Sort by relevance (higher first), then maintain original order
    return goals.sort((a, b) => b._relevance - a._relevance)
  }, [emotions, personality, sentiment])

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Select Improvement Goal
      </h3>
      
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
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
        'relative flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all duration-200',
        'hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
        isSelected 
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
          : 'border-border bg-card',
        isLoading && 'opacity-70 pointer-events-none'
      )}
    >
      {/* Recommended badge */}
      {isRecommended && !isSelected && (
        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-px text-[8px] font-bold rounded-full bg-orange-500 text-white leading-tight">
          ★
        </span>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <span className="absolute top-1 right-1">
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
          ) : (
            <Check className="h-3 w-3 text-primary" />
          )}
        </span>
      )}

      {/* Icon */}
      <span className="text-lg mb-1">{goal.icon}</span>

      {/* Label */}
      <span className={cn(
        'text-[11px] font-medium leading-tight',
        isSelected && 'text-primary'
      )}>
        {goal.label}
      </span>

      {/* Gradient accent */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-0.5 rounded-b-lg bg-gradient-to-r opacity-0 transition-opacity',
          goal.color,
          isSelected && 'opacity-100'
        )}
      />
    </button>
  )
}

export default RewriteOptions
