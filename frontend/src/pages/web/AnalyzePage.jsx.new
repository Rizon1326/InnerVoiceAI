import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { analyzeTextSchema } from '@/lib/validations'
import { useAnalysis } from '@/hooks'
import { useAnalysisStore } from '@/stores'
import { useToast } from '@/components/common/Toast'
import {
  Textarea,
  FormField,
  Skeleton,
} from '@/components/common'
import { cn } from '@/lib/utils'
import {
  Sparkles,
  MessageCircle,
  SmilePlus,
  BrainCircuit,
  Check,
  ChevronRight,
  Lightbulb,
  Search,
  PenLine,
} from 'lucide-react'

// ============================================
// Bubble Animation Styles (injected via style tag)
// ============================================

const bubbleStyles = `
@keyframes bubbleIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes bubbleInPanel {
  0% {
    opacity: 0;
    transform: scale(0.5) translateY(20px);
  }
  60% {
    opacity: 1;
    transform: scale(1.03) translateY(-4px);
  }
  80% {
    transform: scale(0.98) translateY(2px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.bubble-animate {
  animation: bubbleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bubble-animate-panel {
  animation: bubbleInPanel 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bubble-animate-delay-1 { animation-delay: 0.08s; opacity: 0; }
.bubble-animate-delay-2 { animation-delay: 0.16s; opacity: 0; }
.bubble-animate-delay-3 { animation-delay: 0.24s; opacity: 0; }
`

// ============================================
// Constants
// ============================================

const ANALYSIS_CATEGORIES = [
  {
    id: 'sentiment',
    label: 'Sentiment Analysis',
    description: 'Positive · Neutral · Negative scoring',
    icon: MessageCircle,
    emoji: '💬',
    color: 'from-emerald-500 to-teal-500',
    borderColor: 'border-emerald-500/40',
    glowColor: 'shadow-emerald-500/20',
    textColor: 'text-emerald-400',
  },
  {
    id: 'emotion',
    label: 'Emotion Analysis',
    description: 'Joy · Sadness · Anger · Fear · Surprise',
    icon: SmilePlus,
    emoji: '🎭',
    color: 'from-amber-500 to-orange-500',
    borderColor: 'border-amber-500/40',
    glowColor: 'shadow-amber-500/20',
    textColor: 'text-amber-400',
  },
  {
    id: 'personality',
    label: 'Personality Insights',
    description: 'Big Five · OCEAN personality model',
    icon: BrainCircuit,
    emoji: '🧠',
    color: 'from-pink-500 to-rose-500',
    borderColor: 'border-pink-500/40',
    glowColor: 'shadow-pink-500/20',
    textColor: 'text-pink-400',
  },
]

const EMOTION_CONFIG = [
  { key: 'surprise', emoji: '😮', color: 'stroke-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  { key: 'neutral', emoji: '😐', color: 'stroke-gray-400', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/30' },
  { key: 'joy', emoji: '😊', color: 'stroke-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  { key: 'sadness', emoji: '😢', color: 'stroke-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  { key: 'anger', emoji: '😠', color: 'stroke-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  { key: 'fear', emoji: '😨', color: 'stroke-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
]

const PERSONALITY_TRAITS = [
  { key: 'openness', label: 'Openness', desc: 'Creativity & curiosity', emoji: '🎨', color: 'bg-emerald-500' },
  { key: 'conscientiousness', label: 'Conscientiousness', desc: 'Organization & reliability', emoji: '📋', color: 'bg-teal-500' },
  { key: 'extraversion', label: 'Extraversion', desc: 'Social energy & assertiveness', emoji: '💧', color: 'bg-sky-500' },
  { key: 'agreeableness', label: 'Agreeableness', desc: 'Cooperation & trust', emoji: '🤝', color: 'bg-yellow-500' },
  { key: 'neuroticism', label: 'Neuroticism', desc: 'Emotional sensitivity', emoji: '🧘', color: 'bg-orange-500' },
]

// ============================================
// SVG Circular Progress Component
// ============================================

function CircularProgressRing({ value, size = 90, strokeWidth = 6, color = 'stroke-primary', children, className }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-all duration-1000 ease-out', color)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

// ============================================
// Main Page Component
// ============================================

/**
 * Analyze page - Two-panel layout with text input on left and results on right
 */
export default function AnalyzePage() {
  const toast = useToast()

  return (
    <>
      <style>{bubbleStyles}</style>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-foreground">Text Anal</span>
              <span className="text-emerald-400">ysis</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              AI-powered emotional insights · sentiment · personality
            </p>
          </div>
        </div>

        {/* Main Content */}
        <AnalyzeContent toast={toast} />
      </div>
    </>
  )
}

// ============================================
// Content Component
// ============================================

function AnalyzeContent({ toast }) {
  const navigate = useNavigate()
  const { analyze, result, isLoading, reset } = useAnalysis()
  const { originalText, setOriginalText, setAnalysisResult } = useAnalysisStore()
  const [activeCategory, setActiveCategory] = React.useState(null)
  const [analyzedCategories, setAnalyzedCategories] = React.useState(new Set())
  const [showCards, setShowCards] = React.useState(false)
  // Key to re-trigger bubble animation on the right panel when category changes
  const [panelAnimKey, setPanelAnimKey] = React.useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(analyzeTextSchema),
    defaultValues: { text: originalText || '' },
  })

  React.useEffect(() => {
    if (originalText) {
      setValue('text', originalText, { shouldValidate: false, shouldDirty: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const textValue = watch('text')
  const charCount = textValue?.length || 0

  React.useEffect(() => {
    setOriginalText(textValue || '')
  }, [textValue, setOriginalText])

  // When result arrives, mark all categories as analyzed and show cards
  React.useEffect(() => {
    if (result) {
      setAnalyzedCategories(new Set(['sentiment', 'emotion', 'personality']))
      setShowCards(true)
    }
  }, [result])

  // Handle "Analyze Text" button click
  const handleAnalyzeClick = async () => {
    if (!textValue || textValue.length < 10) {
      toast.error('Text Required', 'Please enter at least 10 characters to analyze.')
      return
    }

    try {
      const analysisResult = await analyze(textValue)
      setAnalysisResult(analysisResult)
      setShowCards(true)
      toast.success('Analysis Complete', 'Your text has been analyzed successfully.')
    } catch (error) {
      toast.error('Analysis Failed', error.message)
    }
  }

  // Handle "Rewrite Suggestion" button click
  const handleRewriteClick = () => {
    if (textValue) {
      setOriginalText(textValue)
    }
    if (result) {
      setAnalysisResult(result)
    }
    navigate('/rewrite')
  }

  // Handle category card click — show result in right panel with bubble animation
  const onCategoryClick = (categoryId) => {
    setActiveCategory(categoryId)
    setPanelAnimKey((k) => k + 1)
  }

  const handleReset = () => {
    reset()
    setActiveCategory(null)
    setAnalyzedCategories(new Set())
    setShowCards(false)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr,1.1fr]">
      {/* ======== LEFT PANEL ======== */}
      <div className="space-y-4">
        {/* Text Input Card */}
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">✍️</span>
            <h2 className="text-sm font-semibold text-foreground">Enter Your Text</h2>
          </div>
          <form onSubmit={handleSubmit(handleAnalyzeClick)}>
            <FormField error={errors.text?.message}>
              <Textarea
                placeholder="Type or paste your text here to begin analysis..."
                className="min-h-[160px] resize-y bg-background/50 border-border/40 text-sm"
                {...register('text')}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
                <span>{charCount} / 5000</span>
                <span>Min: 10 chars</span>
              </div>
            </FormField>
          </form>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={handleAnalyzeClick}
              disabled={isLoading}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-semibold transition-all duration-300',
                'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25',
                'hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]',
                isLoading && 'opacity-60 pointer-events-none'
              )}
            >
              <Search className="h-4 w-4" />
              {isLoading ? 'Analyzing...' : 'Analyze Text'}
            </button>
            <button
              type="button"
              onClick={handleRewriteClick}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-semibold transition-all duration-300',
                'border border-border/60 bg-card text-foreground',
                'hover:bg-accent/40 hover:border-border hover:scale-[1.02] active:scale-[0.98]'
              )}
            >
              <PenLine className="h-4 w-4" />
              Rewrite Suggestion
            </button>
          </div>
        </div>

        {/* Analysis Category Cards — shown after Analyze Text is clicked */}
        {showCards && (
          <div className="space-y-3">
            {ANALYSIS_CATEGORIES.map((cat, idx) => {
              const isAnalyzed = analyzedCategories.has(cat.id)
              const isActive = activeCategory === cat.id
              const Icon = cat.icon

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onCategoryClick(cat.id)}
                  disabled={isLoading}
                  className={cn(
                    'w-full rounded-xl border p-4 text-left transition-all duration-300 group relative overflow-hidden',
                    'bubble-animate',
                    idx === 0 && 'bubble-animate-delay-1',
                    idx === 1 && 'bubble-animate-delay-2',
                    idx === 2 && 'bubble-animate-delay-3',
                    isActive
                      ? cn('border-2', cat.borderColor, 'bg-card shadow-lg', cat.glowColor)
                      : 'border-border/50 bg-card hover:border-border hover:bg-accent/30',
                    isLoading && 'opacity-60 pointer-events-none'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br',
                        cat.color,
                        'shadow-lg',
                        cat.glowColor
                      )}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className={cn(
                          'text-sm font-semibold transition-colors',
                          isActive ? cat.textColor : 'text-foreground'
                        )}>
                          {cat.label}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">{cat.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAnalyzed ? (
                        <div className={cn(
                          'h-7 w-7 rounded-full flex items-center justify-center',
                          isActive ? cn('bg-gradient-to-br', cat.color) : 'bg-emerald-500/20'
                        )}>
                          <Check className={cn('h-3.5 w-3.5', isActive ? 'text-white' : 'text-emerald-400')} />
                        </div>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      )}
                    </div>
                  </div>

                  {/* Ready indicator */}
                  {isAnalyzed && !isActive && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-emerald-400">⚡ Click to display results</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ======== RIGHT PANEL — Analysis Report ======== */}
      <div className="rounded-xl border border-border/60 bg-card p-5 min-h-[500px] lg:sticky lg:top-5 lg:self-start">
        {isLoading ? (
          <AnalysisLoadingState />
        ) : activeCategory && result ? (
          <div key={panelAnimKey} className="bubble-animate-panel">
            <CategoryResultView
              category={activeCategory}
              result={result}
            />
          </div>
        ) : (
          <InitialRightPanelState hasResult={!!result} />
        )}
      </div>
    </div>
  )
}

// ============================================
// Category Result View
// ============================================

function CategoryResultView({ category, result }) {
  const analysis = result.analysis || result
  const sentiment = analysis.sentiment || {}
  const emotions = analysis.emotions || {}
  const personality = analysis.personality || {}

  const catConfig = ANALYSIS_CATEGORIES.find(c => c.id === category)
  const Icon = catConfig?.icon || Sparkles

  return (
    <div>
      {/* Panel Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={cn(
          'h-9 w-9 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg',
          catConfig.color,
          catConfig.glowColor
        )}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className={cn('text-base font-bold', catConfig.textColor)}>{catConfig.label}</h2>
          <p className="text-[11px] text-muted-foreground">AI-powered insights</p>
        </div>
      </div>

      {category === 'sentiment' && <SentimentPanel sentiment={sentiment} />}
      {category === 'emotion' && <EmotionPanel emotions={emotions} />}
      {category === 'personality' && <PersonalityPanel personality={personality} />}
    </div>
  )
}

// ============================================
// Sentiment Panel
// ============================================

function SentimentPanel({ sentiment }) {
  const score = sentiment.score || 0
  const scores = sentiment.scores || {}
  const neutralPct = Math.round((scores.neutral || 0) * 100)
  const positivePct = Math.round((scores.positive || 0) * 100)
  const negativePct = Math.round((scores.negative || 0) * 100)

  const getSentimentLabel = (s) => {
    if (s >= 0.5) return 'Very Positive'
    if (s >= 0.1) return 'Positive'
    if (s >= -0.1) return 'Neutral'
    if (s >= -0.5) return 'Negative'
    return 'Very Negative'
  }

  const label = sentiment.label || getSentimentLabel(score)
  const confidence = Math.round(Math.abs(score) * 100) || neutralPct
  const dominantPct = Math.max(positivePct, neutralPct, negativePct)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Overall Sentiment</p>
        <h3 className="text-3xl font-bold text-foreground capitalize">{label}</h3>
        <p className="text-sm text-muted-foreground">Confidence Score: {confidence}%</p>
      </div>

      <div className="flex justify-center">
        <CircularProgressRing value={dominantPct} size={160} strokeWidth={14} color="stroke-gray-500">
          <span className="text-2xl font-bold text-foreground">{dominantPct}%</span>
        </CircularProgressRing>
      </div>

      <div className="flex justify-center gap-8">
        <div className="text-center">
          <CircularProgressRing value={positivePct} size={70} strokeWidth={5} color="stroke-emerald-400">
            <span className="text-xs font-bold text-emerald-400">{positivePct}%</span>
          </CircularProgressRing>
          <p className="text-[11px] text-muted-foreground mt-1.5">Positive</p>
        </div>
        <div className="text-center">
          <CircularProgressRing value={negativePct} size={70} strokeWidth={5} color="stroke-red-400">
            <span className="text-xs font-bold text-red-400">{negativePct}%</span>
          </CircularProgressRing>
          <p className="text-[11px] text-muted-foreground mt-1.5">Negative</p>
        </div>
      </div>

      <InsightBox text={generateSentimentInsight(label, positivePct, negativePct, neutralPct)} />
    </div>
  )
}

// ============================================
// Emotion Panel
// ============================================

function EmotionPanel({ emotions }) {
  const emotionEntries = Object.entries(emotions).filter(([k]) => k !== 'neutral')
  const sortedEmotions = [...emotionEntries].sort((a, b) => b[1] - a[1])
  const dominantEmotion = sortedEmotions[0]?.[0] || 'neutral'
  const dominantValue = sortedEmotions[0]?.[1] || 0
  const dominantPct = Math.round(dominantValue * 100)

  const dominantConfig = EMOTION_CONFIG.find(e => e.key === dominantEmotion) || EMOTION_CONFIG[0]

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Dominant Emotion</p>
        <div className="text-5xl">{dominantConfig.emoji}</div>
        <h3 className="text-2xl font-bold text-foreground capitalize">{dominantEmotion}</h3>
        <p className="text-sm text-muted-foreground">{dominantPct}% Intensity</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {EMOTION_CONFIG.map(({ key, emoji, color, bgColor, borderColor }) => {
          const rawValue = emotions[key] || 0
          const pct = Math.round(rawValue * 100)
          const isDominant = key === dominantEmotion

          return (
            <div
              key={key}
              className={cn(
                'rounded-xl border p-3 flex flex-col items-center gap-2 transition-all',
                isDominant
                  ? cn('border-2', borderColor, bgColor, 'shadow-md')
                  : 'border-border/40 bg-card hover:bg-accent/20'
              )}
            >
              <CircularProgressRing value={pct} size={56} strokeWidth={4} color={color}>
                <span className="text-[11px] font-bold text-foreground">{pct}%</span>
              </CircularProgressRing>
              <div className="text-lg">{emoji}</div>
              <p className="text-[11px] font-medium text-muted-foreground capitalize">{key}</p>
            </div>
          )
        })}
      </div>

      <InsightBox text={generateEmotionInsight(dominantEmotion, dominantPct, emotions)} />
    </div>
  )
}

// ============================================
// Personality Panel
// ============================================

function PersonalityPanel({ personality }) {
  const entries = Object.entries(personality)
  const sorted = [...entries].sort((a, b) => b[1] - a[1])
  const dominantTrait = sorted[0]?.[0] || 'none'

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Big Five Personality</p>
        <h3 className="text-2xl font-bold text-foreground capitalize">{dominantTrait}</h3>
      </div>

      <div className="space-y-4">
        {PERSONALITY_TRAITS.map(({ key, label, desc, emoji, color }) => {
          const raw = personality[key] || 0
          const pct = raw > 1 ? raw : Math.round(raw * 100)

          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{emoji}</span>
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                  <span className="text-[11px] text-muted-foreground">{desc}</span>
                </div>
                <span className="text-sm font-bold text-foreground">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-1000 ease-out', color)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <InsightBox text={generatePersonalityInsight(personality, dominantTrait)} />
    </div>
  )
}

// ============================================
// Shared Components
// ============================================

function InsightBox({ text }) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
      <div className="flex items-start gap-2">
        <Lightbulb className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

/**
 * Initial right panel state — shown before any analysis is run
 * Shows "First analyse your post" with emoji
 */
function InitialRightPanelState({ hasResult }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-4">
      <div className="relative">
        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500/15 to-purple-500/15 flex items-center justify-center">
          <span className="text-5xl">�</span>
        </div>
        <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center shadow-lg">
          <Search className="h-4 w-4 text-white" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground/70">
          {hasResult ? 'Select a category' : 'First analyse your post'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-[260px]">
          {hasResult
            ? 'Click on one of the analysis cards on the left to view detailed results here.'
            : 'Enter your text on the left and click "Analyze Text" to get AI-powered insights on sentiment, emotions, and personality.'}
        </p>
      </div>
      {!hasResult && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60 mt-2">
          <span>👈</span>
          <span>Type your text & hit Analyze</span>
        </div>
      )}
    </div>
  )
}

function AnalysisLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-4">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-muted border-t-primary animate-spin" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Analyzing your text...</p>
        <p className="text-[11px] text-muted-foreground mt-1">AI is processing sentiment, emotions & personality</p>
      </div>
      <div className="space-y-2 w-full max-w-[250px]">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-2 w-3/4 rounded-full" />
        <Skeleton className="h-2 w-1/2 rounded-full" />
      </div>
    </div>
  )
}

// ============================================
// Insight Generators
// ============================================

function generateSentimentInsight(label, pos, neg, neutral) {
  if (neutral > 80) return 'The text consists only of repeated characters with no discernible semantic meaning or emotional content.'
  if (pos > 60) return 'Your message radiates positivity and warmth. This kind of communication builds trust and strengthens relationships.'
  if (neg > 40) return 'The text carries notable negative sentiment. Consider rewriting for a more constructive tone.'
  if (neutral > 50) return `The text is primarily neutral (${neutral}%). It presents information without strong emotional bias.`
  return `Your text shows a ${label.toLowerCase()} sentiment with ${pos}% positive and ${neg}% negative tones.`
}

function generateEmotionInsight(dominant, pct, emotions) {
  if (dominant === 'surprise' && pct > 30) return 'The extended vocalization suggests excitement, surprise, or possibly distress, but lacks clear semantic content to determine specific emotional intent.'
  if (dominant === 'joy' && pct > 40) return 'Strong joy detected! Your writing conveys happiness and positive energy that can be contagious to readers.'
  if (dominant === 'sadness' && pct > 30) return 'Sadness is the primary emotion. Consider if this is the intended tone for your audience.'
  if (dominant === 'anger' && pct > 30) return 'Significant anger detected. You may want to revise for a calmer, more constructive approach.'
  return `The dominant emotion is ${dominant} at ${pct}% intensity. The emotional makeup suggests a ${pct > 50 ? 'strongly' : 'mildly'} expressive message.`
}

function generatePersonalityInsight(personality, dominant) {
  const values = Object.values(personality)
  const allSame = values.every(v => v === values[0])
  if (allSame) return 'The text contains no meaningful personality indicators, only repeated characters.'
  if (dominant === 'openness') return 'High openness suggests creative, imaginative thinking with a preference for novel experiences.'
  if (dominant === 'extraversion') return 'Strong extraversion indicates energetic, assertive communication with social confidence.'
  if (dominant === 'agreeableness') return 'High agreeableness reflects cooperative, empathetic communication style that values harmony.'
  if (dominant === 'conscientiousness') return 'Strong conscientiousness shows organized, disciplined thinking with attention to detail.'
  if (dominant === 'neuroticism') return 'Elevated neuroticism may indicate emotional sensitivity. Mindful communication can help manage this.'
  return `Your personality profile shows ${dominant} as the most prominent trait in this text sample.`
}
