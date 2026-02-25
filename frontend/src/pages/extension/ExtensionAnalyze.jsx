import * as React from 'react'
import { useAnalysis } from '@/hooks'
import { useToast } from '@/components/common/Toast'
import { Button, Textarea, Badge, Select, Tabs, TabPanel } from '@/components/common'
import { getEmotionEmoji, cn } from '@/lib/utils'
import { IMPROVEMENT_GOALS } from '@/stores/analysisStore'
import { analysisService } from '@/services'
import { Brain, Wand2, Sparkles, Copy, Check, RefreshCw, Loader2, Globe, Send, X, MessageSquarePlus } from 'lucide-react'

/**
 * Extension Analyze view - Compact text analysis
 */
export default function ExtensionAnalyze() {
  const [activeTab, setActiveTab] = React.useState('analyze')
  const [pendingText, setPendingText] = React.useState('')
  const toast = useToast()

  // Check for pending text from context menu (right-click → "Analyze/Rewrite with InnerVoice AI")
  React.useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['pendingText', 'pendingAction', 'pendingTimestamp'], (result) => {
        const { pendingText: text, pendingAction, pendingTimestamp } = result
        // Only use if set within the last 10 seconds
        if (text && (Date.now() - (pendingTimestamp || 0)) < 10000) {
          setPendingText(text)
          if (pendingAction === 'rewrite') setActiveTab('rewrite')
          // Clear so it doesn't replay on next popup open
          chrome.storage.local.remove(['pendingText', 'pendingAction', 'pendingTimestamp'])
        }
      })
    }
  }, [])

  const tabs = [
    { value: 'analyze', label: 'Analyze' },
    { value: 'rewrite', label: 'Rewrite' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex bg-muted rounded-lg p-1 mb-3">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'flex-1 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeTab === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'analyze' ? (
        <AnalyzeView toast={toast} pendingText={activeTab === 'analyze' ? pendingText : ''} />
      ) : (
        <RewriteView toast={toast} pendingText={activeTab === 'rewrite' ? pendingText : ''} />
      )}
    </div>
  )
}

/**
 * Analyze view content
 */
function AnalyzeView({ toast, pendingText }) {
  const { analyze, result, isLoading, reset } = useAnalysis()
  const [text, setText] = React.useState('')
  const [copied, setCopied] = React.useState(false)

  // Auto-fill text from context menu
  React.useEffect(() => {
    if (pendingText) {
      setText(pendingText)
    }
  }, [pendingText])

  const handleAnalyze = async () => {
    if (text.length < 10) {
      toast.error('Error', 'Please enter at least 10 characters.')
      return
    }
    try {
      await analyze(text)
      toast.success('Done', 'Analysis complete!')
    } catch (error) {
      toast.error('Error', error.message)
    }
  }

  const copyResults = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Input */}
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to analyze..."
          className="min-h-[100px] text-sm resize-none"
          disabled={isLoading}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{text.length}/5000</span>
          <div className="flex gap-2">
            {result && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            <Button size="sm" onClick={handleAnalyze} disabled={isLoading || text.length < 10}>
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3 mr-1" />
              )}
              Analyze
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-3 flex-1 overflow-y-auto space-y-3">
          {/* Extract analysis from nested response */}
          {(() => {
            const analysis = result.analysis || result
            const sentiment = analysis.sentiment || {}
            const emotions = analysis.emotions || {}
            
            // Get sentiment interpretation
            const score = sentiment.score || 0
            const getSentimentEmoji = (s) => {
              if (s >= 0.5) return '🌟'
              if (s >= 0.1) return '😊'
              if (s >= -0.1) return '😐'
              if (s >= -0.5) return '😔'
              return '😢'
            }
            
            // Get dominant emotion
            const emotionEntries = Object.entries(emotions).filter(([k, v]) => k !== 'neutral' && v > 0)
            const sortedEmotions = emotionEntries.sort((a, b) => b[1] - a[1]).slice(0, 4)
            
            return (
              <>
                {/* Sentiment Card */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-transparent border">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getSentimentEmoji(score)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Sentiment</span>
                        <Badge 
                          variant={score > 0 ? 'success' : score < 0 ? 'destructive' : 'secondary'} 
                          className="text-xs"
                        >
                          {sentiment.label || (score > 0 ? 'Positive' : score < 0 ? 'Negative' : 'Neutral')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div 
                            className={cn(
                              'h-full rounded-full transition-all',
                              score > 0 ? 'bg-green-500' : score < 0 ? 'bg-red-500' : 'bg-gray-400'
                            )}
                            style={{ width: `${Math.abs(score) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold">{(score * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emotions */}
                {sortedEmotions.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <span className="text-xs font-medium text-muted-foreground block mb-2">Top Emotions</span>
                    <div className="space-y-2">
                      {sortedEmotions.map(([emotion, value]) => (
                        <div key={emotion} className="flex items-center gap-2">
                          <span className="text-sm">{getEmotionEmoji(emotion)}</span>
                          <span className="text-xs capitalize flex-1">{emotion}</span>
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${value * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {(value * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Copy Button */}
                <Button variant="outline" size="sm" className="w-full" onClick={copyResults}>
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? 'Copied' : 'Copy Results'}
                </Button>
              </>
            )
          })()}
        </div>
      )}

      {/* Empty State */}
      {!result && !isLoading && (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <Brain className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              Enter text above to analyze emotions
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Rewrite view content — mirrors web app RewritePage features
 * Includes: improvement goals grid, custom instruction, language selector, rich results
 */
function RewriteView({ toast, pendingText }) {
  const [text, setText] = React.useState('')
  const [selectedGoal, setSelectedGoal] = React.useState(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [result, setResult] = React.useState(null)
  const [copied, setCopied] = React.useState(false)
  const [customInstruction, setCustomInstruction] = React.useState('')
  const [rewriteLanguage, setRewriteLanguage] = React.useState('auto')
  const [showAllGoals, setShowAllGoals] = React.useState(false)

  // Auto-fill text from context menu
  React.useEffect(() => {
    if (pendingText) {
      setText(pendingText)
    }
  }, [pendingText])

  const hasText = text.trim().length >= 10

  /**
   * Handle rewrite with a selected improvement goal
   */
  const handleGoalRewrite = async (goalId) => {
    if (!hasText) {
      toast.error('Text too short', 'Please enter at least 10 characters.')
      return
    }
    setSelectedGoal(goalId)
    setIsLoading(true)
    setResult(null)
    try {
      const response = await analysisService.rewriteText({
        text,
        goal: goalId,
        style: goalId,
        custom_instruction: customInstruction.trim() || undefined,
        language: rewriteLanguage !== 'auto' ? rewriteLanguage : undefined,
      })
      const data = response.data || response
      setResult(data)
      toast.success('Rewrite Complete', 'Your text has been transformed!')
    } catch (error) {
      toast.error('Rewrite Failed', error.message || 'Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle custom instruction rewrite
   */
  const handleCustomRewrite = async () => {
    if (!hasText) {
      toast.error('Text too short', 'Please enter at least 10 characters.')
      return
    }
    if (!customInstruction.trim()) {
      toast.error('No instruction', 'Please write how you want the text rewritten.')
      return
    }
    setSelectedGoal('custom')
    setIsLoading(true)
    setResult(null)
    try {
      const response = await analysisService.rewriteText({
        text,
        goal: 'custom',
        style: 'custom',
        custom_instruction: customInstruction.trim(),
        language: rewriteLanguage !== 'auto' ? rewriteLanguage : undefined,
      })
      const data = response.data || response
      setResult(data)
      toast.success('Rewrite Complete', 'Your text has been transformed!')
    } catch (error) {
      toast.error('Rewrite Failed', error.message || 'Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setSelectedGoal(null)
  }

  const rewrittenText = result?.rewritten || result?.rewritten_text || result?.text || ''
  const improvements = React.useMemo(() => {
    if (!result) return []
    const raw = result.improvements || []
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'object') return Object.entries(raw).map(([k, v]) => `${k}: ${v}`)
    return []
  }, [result])
  const highlightedWords = result?.highlighted_words || []
  const goalApplied = result?.goal_applied || selectedGoal

  const copyText = () => {
    navigator.clipboard.writeText(rewrittenText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied!', 'Rewritten text copied to clipboard.')
  }

  // Show 6 goals initially, expand to all on click
  const visibleGoals = showAllGoals ? IMPROVEMENT_GOALS : IMPROVEMENT_GOALS.slice(0, 6)

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      {/* Input */}
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter or paste text to rewrite..."
          className="min-h-20 text-sm resize-none"
          disabled={isLoading}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{text.length} chars</span>
          {result && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-6 px-2 text-xs">
              <RefreshCw className="h-3 w-3 mr-1" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* Language Selector */}
      {hasText && !result && (
        <div className="mt-3 space-y-1.5">
          <h4 className="text-[11px] font-semibold flex items-center gap-1.5 text-muted-foreground">
            <Globe className="h-3 w-3" />
            Output Language
          </h4>
          <div className="flex gap-1.5">
            {[
              { value: 'auto', label: '🔄 Auto' },
              { value: 'en', label: '🇬🇧 English' },
              { value: 'bn', label: '🇧🇩 বাংলা' },
            ].map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => setRewriteLanguage(lang.value)}
                className={cn(
                  'flex-1 px-2 py-1.5 text-[11px] font-medium rounded-md border transition-all',
                  rewriteLanguage === lang.value
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                    : 'border-border bg-card hover:bg-primary/5 hover:border-primary/40 text-muted-foreground'
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Instruction */}
      {hasText && !result && (
        <div className="mt-3 space-y-1.5">
          <h4 className="text-[11px] font-semibold flex items-center gap-1.5 text-muted-foreground">
            <MessageSquarePlus className="h-3 w-3" />
            Custom Instruction <span className="font-normal">(optional)</span>
          </h4>
          <div className="relative">
            <Textarea
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder='e.g. "make it formal", "sadness komau"...'
              className="min-h-14 resize-none text-xs pr-8"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && customInstruction.trim()) {
                  handleCustomRewrite()
                }
              }}
            />
            {customInstruction && (
              <button
                onClick={() => setCustomInstruction('')}
                className="absolute top-1.5 right-1.5 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {/* Quick chips */}
          <div className="flex flex-wrap gap-1">
            {[
              { label: '😢 More sadness', value: 'increase sadness' },
              { label: '✨ ইতিবাচক', value: 'আরও ইতিবাচক করো' },
              { label: '💼 Formal', value: 'make it more formal and professional' },
            ].map((chip) => (
              <button
                key={chip.value}
                onClick={() => setCustomInstruction(chip.value)}
                className={cn(
                  'px-2 py-1 text-[10px] font-medium rounded-md border transition-all',
                  customInstruction === chip.value
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border/60 bg-card hover:bg-primary/10 hover:border-primary/40 text-muted-foreground'
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
          {customInstruction.trim() && (
            <Button
              onClick={handleCustomRewrite}
              disabled={isLoading}
              size="sm"
              className="w-full gap-1.5 h-7 text-xs"
            >
              {isLoading && selectedGoal === 'custom' ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Rewriting...</>
              ) : (
                <><Send className="h-3 w-3" /> Rewrite with Instruction</>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Improvement Goals Grid */}
      {hasText && !result && (
        <div className="mt-3 space-y-1.5">
          <h4 className="text-[11px] font-semibold flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Or Select Improvement Goal
          </h4>
          <div className="grid grid-cols-3 gap-1.5">
            {visibleGoals.map((goal) => (
              <button
                key={goal.id}
                type="button"
                onClick={() => handleGoalRewrite(goal.id)}
                disabled={isLoading}
                className={cn(
                  'relative flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all duration-200',
                  'hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                  isLoading && selectedGoal === goal.id
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border bg-card',
                  isLoading && selectedGoal !== goal.id && 'opacity-50 pointer-events-none'
                )}
              >
                {isLoading && selectedGoal === goal.id && (
                  <span className="absolute top-1 right-1">
                    <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />
                  </span>
                )}
                <span className="text-base mb-0.5">{goal.icon}</span>
                <span className="text-[10px] font-medium leading-tight">{goal.label}</span>
              </button>
            ))}
          </div>
          {IMPROVEMENT_GOALS.length > 6 && (
            <button
              onClick={() => setShowAllGoals(!showAllGoals)}
              className="w-full text-[10px] text-primary hover:text-primary/80 font-medium py-1 transition-colors"
            >
              {showAllGoals ? 'Show Less' : `Show All (${IMPROVEMENT_GOALS.length} goals)`}
            </button>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !result && (
        <div className="mt-3 space-y-2 animate-pulse">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-primary">Rewriting...</p>
              <p className="text-[10px] text-muted-foreground">
                Applying: {getGoalLabel(selectedGoal)}
              </p>
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-muted/30 space-y-1.5">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-5/6" />
            <div className="h-3 bg-muted rounded w-4/6" />
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="inline-flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            AI is processing
          </div>
        </div>
      )}

      {/* Rich Result Display */}
      {result && rewrittenText && (
        <div className="mt-3 flex-1 overflow-y-auto space-y-2">
          {/* Success Header */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-green-800 dark:text-green-300">
                Rewritten Successfully
              </p>
              <p className="text-[10px] text-green-600 dark:text-green-400 truncate">
                Applied: {getGoalLabel(goalApplied)}
              </p>
            </div>
          </div>

          {/* Rewritten Text */}
          <div className="relative">
            <div className="p-3 rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{rewrittenText}</p>
            </div>
          </div>

          {/* Improvements */}
          {improvements.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                Improvements
              </h4>
              <div className="flex flex-wrap gap-1">
                {improvements.slice(0, 5).map((imp, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 text-[10px] rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                  >
                    {typeof imp === 'string' && imp.length > 40 ? imp.slice(0, 37) + '…' : imp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Word Changes */}
          {highlightedWords.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-semibold text-muted-foreground">Key Changes</h4>
              <div className="flex flex-wrap gap-1">
                {highlightedWords.slice(0, 6).map((wordObj, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 text-[10px] rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                    title={typeof wordObj === 'object' ? wordObj.reason : ''}
                  >
                    {typeof wordObj === 'object' ? wordObj.word : wordObj}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant={copied ? 'default' : 'outline'} size="sm" className="flex-1 h-7 text-xs" onClick={copyText}>
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleReset}>
              <RefreshCw className="h-3 w-3" /> Try Another
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !isLoading && !hasText && (
        <div className="flex-1 flex items-center justify-center text-center mt-6">
          <div>
            <Wand2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              Enter text above to see rewrite options
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Get human-readable label for a goal ID
 */
function getGoalLabel(goalId) {
  const goal = IMPROVEMENT_GOALS.find(g => g.id === goalId)
  if (goal) return `${goal.icon} ${goal.label}`
  if (goalId === 'custom') return '🛠️ Custom Rewrite'
  return goalId || 'Unknown'
}
