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
  const [activeCategory, setActiveCategory] = React.useState('sentiment')

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
          {(() => {
            const analysis = result.analysis || result
            const sentiment = analysis.sentiment || {}
            const emotions = analysis.emotions || {}
            const personality = analysis.personality || {}
            const contextAnalysis = result.context_analysis || null

            // Sentiment interpretation
            const score = sentiment.score || 0
            const sentimentLabel = (sentiment.label || '').toLowerCase()
            const getSentimentEmoji = (label, s) => {
              if (label === 'positive') return s >= 0.75 ? '🌟' : '😊'
              if (label === 'negative') return s >= 0.75 ? '😢' : '😔'
              return '😐'
            }

            // Emotions sorted
            const emotionEntries = Object.entries(emotions).filter(([k, v]) => k !== 'neutral' && v > 0)
            const sortedEmotions = emotionEntries.sort((a, b) => b[1] - a[1])
            const dominantEmotion = sortedEmotions[0]?.[0] || 'neutral'

            const categories = [
              { id: 'sentiment', label: 'Sentiment', icon: '💚' },
              { id: 'emotion', label: 'Emotions', icon: '🎭' },
              { id: 'personality', label: 'Personality', icon: '🧠' },
            ]

            return (
              <>
                {/* Context Analysis badges (language, tone) */}
                {contextAnalysis && (
                  <div className="flex flex-wrap gap-1">
                    {contextAnalysis.detected_language && (
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400">
                        {contextAnalysis.detected_language === 'Bangla' ? '🇧🇩' : contextAnalysis.detected_language === 'Banglish' ? '🔤' : '🇬🇧'} {contextAnalysis.detected_language}
                      </span>
                    )}
                    {contextAnalysis.detected_tone && (
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400">
                        {contextAnalysis.detected_tone === 'friendly' ? '😊' : contextAnalysis.detected_tone === 'serious' ? '🧐' : contextAnalysis.detected_tone === 'humorous' ? '😂' : contextAnalysis.detected_tone === 'sarcastic' ? '😏' : '😐'} {contextAnalysis.detected_tone}
                      </span>
                    )}
                    {contextAnalysis.emotion_label && (
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400">
                        {getEmotionEmoji(contextAnalysis.emotion_label)} {contextAnalysis.emotion_label}
                      </span>
                    )}
                  </div>
                )}

                {/* Category Selector Tabs */}
                <div className="flex bg-muted rounded-lg p-0.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-semibold rounded-md transition-all',
                        activeCategory === cat.id
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <span>{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Sentiment Panel */}
                {activeCategory === 'sentiment' && (
                  <div className="space-y-2 fade-in">
                    {/* Overall Sentiment */}
                    <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-transparent border">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{getSentimentEmoji(sentimentLabel, score)}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Sentiment</span>
                            <Badge
                              variant={sentimentLabel === 'positive' ? 'success' : sentimentLabel === 'negative' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {sentiment.label || 'Neutral'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  sentimentLabel === 'positive' ? 'bg-green-500' : sentimentLabel === 'negative' ? 'bg-red-500' : 'bg-gray-400'
                                )}
                                style={{ width: `${Math.abs(score) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold">{(score * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sentiment Breakdown */}
                    {sentiment.scores && (
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { key: 'positive', label: 'Positive', color: 'bg-green-500', icon: '👍' },
                          { key: 'neutral', label: 'Neutral', color: 'bg-gray-400', icon: '➖' },
                          { key: 'negative', label: 'Negative', color: 'bg-red-500', icon: '👎' },
                        ].map(({ key, label, color, icon }) => (
                          <div key={key} className="rounded-lg border bg-card p-2 text-center">
                            <div className="text-sm mb-0.5">{icon}</div>
                            <div className="text-sm font-bold">
                              {((sentiment.scores[key] || 0) * 100).toFixed(0)}%
                            </div>
                            <div className="text-[10px] text-muted-foreground">{label}</div>
                            <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all', color)}
                                style={{ width: `${(sentiment.scores[key] || 0) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Emotion Panel */}
                {activeCategory === 'emotion' && (
                  <div className="space-y-2 fade-in">
                    {/* Emotion Cards Grid */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { key: 'joy', emoji: '😄', color: 'from-yellow-400 to-orange-400' },
                        { key: 'sadness', emoji: '😢', color: 'from-blue-400 to-indigo-400' },
                        { key: 'anger', emoji: '😠', color: 'from-red-400 to-rose-500' },
                        { key: 'fear', emoji: '😨', color: 'from-purple-400 to-violet-500' },
                        { key: 'surprise', emoji: '😲', color: 'from-pink-400 to-fuchsia-500' },
                        { key: 'neutral', emoji: '😐', color: 'from-gray-400 to-slate-500' },
                      ].map(({ key, emoji, color }) => {
                        const value = emotions[key] || 0
                        const isHighest = key === dominantEmotion
                        return (
                          <div
                            key={key}
                            className={cn(
                              'rounded-lg border p-2 transition-all',
                              isHighest ? 'ring-1 ring-amber-500/40 bg-amber-500/5 border-amber-500/20' : 'bg-card'
                            )}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-sm">{emoji}</span>
                              <span className="text-xs font-medium capitalize">
                                {key}
                                {isHighest && <span className="ml-0.5 text-[10px] text-amber-500">★</span>}
                              </span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {(value * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', color)}
                                style={{ width: `${value * 100}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Dominant emotion insight */}
                    <div className="rounded-lg border bg-gradient-to-r from-amber-500/5 to-transparent p-2">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="text-amber-500">•</span>
                        Dominant: <strong className="text-foreground capitalize">{dominantEmotion}</strong>
                        {' '}({((emotions[dominantEmotion] || 0) * 100).toFixed(0)}%)
                      </p>
                    </div>
                  </div>
                )}

                {/* Personality Panel */}
                {activeCategory === 'personality' && (
                  <div className="space-y-2 fade-in">
                    {Object.keys(personality).length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No personality data available.</p>
                    ) : (
                      <>
                        <div className="space-y-2">
                          {[
                            { key: 'openness', label: 'Openness', desc: 'Creativity & curiosity', icon: '🎨' },
                            { key: 'conscientiousness', label: 'Conscientiousness', desc: 'Organization & reliability', icon: '📋' },
                            { key: 'extraversion', label: 'Extraversion', desc: 'Social energy', icon: '🗣️' },
                            { key: 'agreeableness', label: 'Agreeableness', desc: 'Cooperation & trust', icon: '🤝' },
                            { key: 'neuroticism', label: 'Neuroticism', desc: 'Emotional stability', icon: '🧘' },
                          ].map(({ key, label, desc, icon }) => {
                            const value = personality[key] || 0
                            const normalizedValue = value > 1 ? value : value * 100
                            return (
                              <div key={key} className="flex items-center gap-2">
                                <span className="text-base">{icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center mb-0.5">
                                    <span className="text-xs font-medium truncate">{label}</span>
                                    <span className="text-xs font-bold text-violet-500">{normalizedValue.toFixed(0)}%</span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                                      style={{ width: `${normalizedValue}%` }}
                                    />
                                  </div>
                                  <div className="text-[10px] text-muted-foreground mt-0.5">{desc}</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Personality insights */}
                        {(personality.openness > 70 || personality.agreeableness > 70 || personality.neuroticism > 60) && (
                          <div className="rounded-lg border bg-gradient-to-r from-violet-500/5 to-transparent p-2 space-y-0.5">
                            {personality.openness > 70 && (
                              <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                <span className="text-violet-500">•</span>
                                High openness — creative and innovative thinking
                              </p>
                            )}
                            {personality.agreeableness > 70 && (
                              <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                <span className="text-violet-500">•</span>
                                Strong agreeableness — collaborative and empathetic
                              </p>
                            )}
                            {personality.neuroticism > 60 && (
                              <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                <span className="text-violet-500">•</span>
                                Elevated neuroticism — may benefit from calming techniques
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
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
