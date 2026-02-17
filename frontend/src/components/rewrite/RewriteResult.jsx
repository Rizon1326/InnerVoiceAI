import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/common'
import { Copy, Check, RefreshCw, Sparkles, ArrowRight } from 'lucide-react'

/**
 * RewriteResult Component
 * Displays the rewritten text with improvements and copy functionality
 * 
 * @param {Object} result - Rewrite result from API
 * @param {string} selectedGoal - The goal that was used for rewriting
 * @param {function} onCopy - Callback when copy clicked
 * @param {function} onTryAnother - Callback to try another goal
 */
export function RewriteResult({ result, selectedGoal, onCopy, onTryAnother }) {
  const [copied, setCopied] = React.useState(false)

  if (!result) return null

  const rewrittenText = result.rewritten || result.rewritten_text || result.text || ''
  const improvements = result.improvements || []
  const highlightedWords = result.highlighted_words || []

  const handleCopy = () => {
    navigator.clipboard.writeText(rewrittenText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopy?.()
  }

  // Get goal info for display
  const goalInfo = getGoalInfo(selectedGoal)

  return (
    <div className="space-y-4 fade-in">
      {/* Success Header */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            Text Rewritten Successfully
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">
            Applied: {goalInfo.label}
          </p>
        </div>
      </div>

      {/* Rewritten Text */}
      <div className="relative">
        <div className="p-4 rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {rewrittenText}
          </p>
        </div>

        {/* Gradient accent */}
        <div className="absolute -inset-px rounded-lg bg-gradient-to-r from-primary/20 to-purple-500/20 -z-10 blur-sm" />
      </div>

      {/* Improvements Made */}
      {improvements.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Improvements Made
          </h4>
          <ul className="space-y-1">
            {improvements.map((improvement, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <ArrowRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>{improvement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Word Changes */}
      {highlightedWords.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Key Changes</h4>
          <div className="flex flex-wrap gap-2">
            {highlightedWords.map((word, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary border border-primary/20"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleCopy}
          variant={copied ? 'default' : 'outline'}
          className="flex-1"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Rewritten Text
            </>
          )}
        </Button>

        <Button
          onClick={onTryAnother}
          variant="ghost"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try Another
        </Button>
      </div>
    </div>
  )
}

/**
 * Loading state for rewrite result
 */
export function RewriteResultSkeleton({ selectedGoal }) {
  const goalInfo = getGoalInfo(selectedGoal)

  return (
    <div className="space-y-4 animate-pulse">
      {/* Loading Header */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-primary/50 border-t-primary animate-spin" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">
            Rewriting your text...
          </p>
          <p className="text-xs text-muted-foreground">
            Applying: {goalInfo.label}
          </p>
        </div>
      </div>

      {/* Skeleton content */}
      <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-4/6" />
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
        <span>AI is processing your request</span>
      </div>
    </div>
  )
}

/**
 * Get goal info for display
 */
function getGoalInfo(goalId) {
  const goals = {
    increase_openness: { label: 'Increase Openness', icon: '🎨' },
    decrease_openness: { label: 'Decrease Openness', icon: '🎯' },
    reduce_aggression: { label: 'Reduce Aggressiveness', icon: '🕊️' },
    reduce_sadness: { label: 'Reduce Sadness', icon: '☀️' },
    more_positive: { label: 'Make More Positive', icon: '😊' },
    more_professional: { label: 'Make Professional', icon: '💼' },
  }
  return goals[goalId] || { label: goalId, icon: '✨' }
}

export default RewriteResult
