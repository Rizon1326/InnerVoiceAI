import * as React from 'react'
import { Button } from '@/components/common'
import { Copy, Check, RefreshCw, Sparkles, Brain } from 'lucide-react'

/**
 * Condense a verbose improvement description into a short, professional phrase.
 * Strips filler words and truncates to the core action.
 */
function condenseLine(text) {
  if (!text || typeof text !== 'string') return text
  // Remove leading bullet / dash / arrow characters
  let s = text.replace(/^[\s\-•→▸]+/, '').trim()
  // Collapse "Replaced X with Y" → "X → Y"
  const replaceMatch = s.match(/^replaced\s+["']?(.+?)["']?\s+with\s+["']?(.+?)["']?\.?$/i)
  if (replaceMatch) return `${replaceMatch[1]} → ${replaceMatch[2]}`
  // Collapse "Transformed X into Y" → "X → Y"
  const transformMatch = s.match(/^transformed\s+(.+?)\s+into\s+(.+?)\.?$/i)
  if (transformMatch) return `${transformMatch[1]} → ${transformMatch[2]}`
  // Collapse "Reframed X from Y to Z" → "Y → Z"
  const reframeMatch = s.match(/^reframed\s+.+?\s+from\s+(.+?)\s+to\s+(.+?)\.?$/i)
  if (reframeMatch) return `${reframeMatch[1]} → ${reframeMatch[2]}`
  // Collapse "Shifted X from Y to Z" → "Y → Z"
  const shiftMatch = s.match(/^shifted\s+.+?\s+from\s+(.+?)\s+to\s+(.+?)\.?$/i)
  if (shiftMatch) return `${shiftMatch[1]} → ${shiftMatch[2]}`
  // Cap length at ~80 chars
  if (s.length > 80) s = s.slice(0, 77) + '…'
  return s
}

/**
 * RewriteResult Component
 * Displays the rewritten text with improvements and copy functionality
 * 
 * @param {Object} result - Rewrite result from API
 * @param {string} selectedGoal - The goal that was used for rewriting
 * @param {function} onCopy - Callback when copy clicked
 * @param {function} onTryAnother - Callback to try another goal
 * @param {function} onAnalyzeThis - Callback to send rewritten text back to Analyze page
 */
export function RewriteResult({ result, selectedGoal, onCopy, onTryAnother, onAnalyzeThis }) {
  const [copied, setCopied] = React.useState(false)
  
  // Handle improvements as array (new format) or object (old format),
  // then condense each item into a short, professional summary.
  const improvements = React.useMemo(() => {
    if (!result) return []
    const rawImprovements = result.improvements || []
    let items = []
    if (Array.isArray(rawImprovements)) {
      items = rawImprovements
    } else if (typeof rawImprovements === 'object') {
      items = Object.entries(rawImprovements).map(([key, value]) => `${key}: ${value}`)
    }
    // Condense verbose improvement strings into concise phrases
    return items.map(s => condenseLine(s))
  }, [result])

  if (!result) return null

  const rewrittenText = result.rewritten || result.rewritten_text || result.text || ''
  const highlightedWords = result.highlighted_words || []
  const changesSummary = result.changes_summary || ''
  const goalApplied = result.goal_applied || selectedGoal

  const handleCopy = () => {
    navigator.clipboard.writeText(rewrittenText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopy?.()
  }

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
            Applied: {getGoalInfo(goalApplied).label}
          </p>
          {changesSummary && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
              {changesSummary}
            </p>
          )}
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
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-green-500" />
            Improvements
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {improvements.map((improvement, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
              >
                {improvement}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Key Word Changes */}
      {highlightedWords.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Key Changes</h4>
          <div className="flex flex-wrap gap-2">
            {highlightedWords.map((wordObj, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                title={typeof wordObj === 'object' ? wordObj.reason : ''}
              >
                {typeof wordObj === 'object' ? wordObj.word : wordObj}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Analyze This Text CTA */}
      {onAnalyzeThis && (
        <button
          type="button"
          onClick={() => onAnalyzeThis(rewrittenText)}
          className="rewrite-cta-btn w-full group relative flex items-center justify-center gap-3 rounded-xl px-5 py-3 text-sm font-semibold overflow-hidden"
        >
          <span className="rewrite-cta-bg absolute inset-0 rounded-xl" />
          <span className="rewrite-cta-shimmer absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100" />
          <span className="relative flex items-center gap-2 text-white">
            <Brain className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
            Analyze This Text
            <span className="text-blue-200 text-xs font-normal">→</span>
          </span>
        </button>
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
    reduce_fear: { label: 'Reduce Fear', icon: '💪' },
    increase_empathy: { label: 'Increase Empathy', icon: '🤗' },
    increase_confidence: { label: 'Increase Confidence', icon: '🦁' },
    reduce_neuroticism: { label: 'Reduce Neuroticism', icon: '🧘' },
    increase_extraversion: { label: 'Increase Extraversion', icon: '🎉' },
    make_concise: { label: 'Make Concise', icon: '✂️' },
    make_friendly: { label: 'Make Friendly', icon: '👋' },
    increase_agreeableness: { label: 'Increase Agreeableness', icon: '🤝' },
    custom: { label: 'Custom Rewrite', icon: '🛠️' },
  }
  return goals[goalId] || { label: goalId, icon: '✨' }
}

export default RewriteResult
