import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { analyzeTextSchema } from '@/lib/validations'
import { useAnalysis } from '@/hooks'
import { useAnalysisStore } from '@/stores'
import { useToast } from '@/components/common/Toast'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Textarea,
  FormField,
  Skeleton,
} from '@/components/common'
import { cn } from '@/lib/utils'
import {
  Brain,
  RefreshCw,
  Sparkles,
  Wand2,
  Heart,
  SmilePlus,
  UserCircle,
} from 'lucide-react'

/**
 * Analyze page - Text analysis with professional visualization (web)
 */
export default function AnalyzePage() {
  const toast = useToast()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Text Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Analyze your text for emotional insights and personality traits
        </p>
      </div>

      {/* Main Content */}
      <AnalyzeContent toast={toast} />
    </div>
  )
}

/**
 * Analyze content - uses global store for text sharing
 */
function AnalyzeContent({ toast }) {
  const navigate = useNavigate()
  const { analyze, result, isLoading, reset } = useAnalysis()
  const { originalText, setOriginalText, setAnalysisResult } = useAnalysisStore()

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

  // Restore persisted text when navigating back (e.g. from Rewrite page)
  React.useEffect(() => {
    if (originalText) {
      setValue('text', originalText, { shouldValidate: false, shouldDirty: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const textValue = watch('text')
  const charCount = textValue?.length || 0

  // Persist text to global store as the user types so it survives route changes
  React.useEffect(() => {
    setOriginalText(textValue || '')
  }, [textValue, setOriginalText])

  const onSubmit = async (data) => {
    try {
      const analysisResult = await analyze(data.text)
      // Store analysis result for the Rewrite page
      setAnalysisResult(analysisResult)
      toast.success('Analysis Complete', 'Your text has been analyzed successfully.')
    } catch (error) {
      toast.error('Analysis Failed', error.message)
    }
  }

  // Navigate to rewrite page – text is already synced to store via useEffect
  const goToRewrite = () => {
    if (result) {
      setAnalysisResult(result)
    }
    navigate('/rewrite')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Enter Your Text
          </CardTitle>
          <CardDescription>
            Type or paste the text you want to analyze
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField error={errors.text?.message}>
              <Textarea
                placeholder="Enter your text here... (e.g., 'I'm feeling excited about the new project, but also a bit nervous about the deadline.')"
                className="min-h-[200px] resize-none"
                {...register('text')}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{charCount} / 5000 characters</span>
                <span>Min: 10 characters</span>
              </div>
            </FormField>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1" loading={isLoading}>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze Text
              </Button>
              {result && (
                <Button type="button" variant="outline" onClick={reset}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>

          {/* Rewrite Suggestion Button - Always Visible */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={goToRewrite}
              className="rewrite-cta-btn w-full group relative flex items-center justify-center gap-3 rounded-xl px-5 py-3 text-sm font-semibold overflow-hidden"
            >
              {/* Animated gradient background */}
              <span className="rewrite-cta-bg absolute inset-0 rounded-xl" />
              {/* Shimmer sweep */}
              <span className="rewrite-cta-shimmer absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100" />
              {/* Content */}
              <span className="relative flex items-center gap-2 text-white">
                <Wand2 className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12" />
                Rewrite Suggestion
                <span className="text-blue-200 text-xs font-normal">→</span>
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Analysis Results
          </CardTitle>
          <CardDescription>
            Emotional insights from your text
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AnalysisResultSkeleton />
          ) : result ? (
            <AnalysisResult result={result} />
          ) : (
            <EmptyResultState />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * The 3 analysis category definitions
 */
const ANALYSIS_CATEGORIES = [
  {
    id: 'sentiment',
    label: 'Sentiment Analysis',
    icon: Heart,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    ringColor: 'ring-emerald-500/40',
    iconColor: 'text-emerald-500',
    description: 'Overall tone & positivity score',
  },
  {
    id: 'emotion',
    label: 'Emotion Analysis',
    icon: SmilePlus,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    ringColor: 'ring-amber-500/40',
    iconColor: 'text-amber-500',
    description: 'Joy, sadness, anger & more',
  },
  {
    id: 'personality',
    label: 'Personality Insights',
    icon: UserCircle,
    color: 'from-violet-500 to-purple-500',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    ringColor: 'ring-violet-500/40',
    iconColor: 'text-violet-500',
    description: 'Big Five personality traits',
  },
]

/**
 * Analysis result display - 3 category cards as tabs
 */
function AnalysisResult({ result }) {
  const [activeCategory, setActiveCategory] = React.useState('sentiment')

  // Extract analysis data from nested response
  const analysis = result.analysis || result
  const sentiment = analysis.sentiment || {}
  const emotions = analysis.emotions || {}
  const personality = analysis.personality || {}

  // Calculate dominant emotion - always pick the highest score across ALL emotions
  const emotionEntries = Object.entries(emotions).filter(([, v]) => v > 0)
  const sortedEmotions = emotionEntries.sort((a, b) => b[1] - a[1])
  const dominantEmotion = sortedEmotions[0]?.[0] || 'neutral'

  // Sentiment interpretation - use the label from backend (highest-scoring class)
  // score is the confidence of the dominant label (0-1), not a polarity value
  const sentimentScore = sentiment.score || 0
  const sentimentLabel = (sentiment.label || '').toLowerCase()
  const getSentimentInterpretation = (label, score) => {
    if (label === 'positive') {
      return score >= 0.75
        ? { text: 'Very Positive', emoji: '🌟', color: 'text-green-500' }
        : { text: 'Positive', emoji: '😊', color: 'text-emerald-500' }
    }
    if (label === 'negative') {
      return score >= 0.75
        ? { text: 'Very Negative', emoji: '😢', color: 'text-red-500' }
        : { text: 'Negative', emoji: '😔', color: 'text-orange-500' }
    }
    // neutral (or unknown)
    return score >= 0.75
      ? { text: 'Very Neutral', emoji: '😐', color: 'text-gray-400' }
      : { text: 'Neutral', emoji: '🙂', color: 'text-gray-500' }
  }
  const sentimentInfo = getSentimentInterpretation(sentimentLabel, sentimentScore)

  return (
    <div className="space-y-5 fade-in">
      {/* Category Selector Cards */}
      <CategorySelector
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      {/* Active Category Content */}
      <div className="min-h-[280px]">
        {activeCategory === 'sentiment' && (
          <SentimentPanel sentiment={sentiment} sentimentInfo={sentimentInfo} sentimentScore={sentimentScore} />
        )}
        {activeCategory === 'emotion' && (
          <EmotionPanel emotions={emotions} dominantEmotion={dominantEmotion} />
        )}
        {activeCategory === 'personality' && (
          <PersonalityPanel personality={personality} />
        )}
      </div>
    </div>
  )
}

/**
 * Stacked category selector cards
 */
function CategorySelector({ activeCategory, onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ANALYSIS_CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat.id
        const Icon = cat.icon
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={cn(
              'relative rounded-xl border p-3 text-left transition-all duration-300 cursor-pointer',
              'hover:scale-[1.02] active:scale-[0.98]',
              isActive
                ? cn('ring-2 shadow-lg z-10', cat.bgColor, cat.borderColor, cat.ringColor)
                : 'bg-card border-border/50 opacity-75 hover:opacity-100 hover:border-border'
            )}
          >
            <div className="flex flex-col items-center text-center gap-1.5">
              <div
                className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center transition-colors',
                  isActive ? cn('bg-gradient-to-br', cat.color) : 'bg-muted'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-muted-foreground')} />
              </div>
              <span className={cn(
                'text-xs font-semibold leading-tight',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {cat.label}
              </span>
            </div>
            {/* Active indicator bar */}
            {isActive && (
              <div className={cn(
                'absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r',
                cat.color
              )} />
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Sentiment Analysis panel
 */
function SentimentPanel({ sentiment, sentimentInfo, sentimentScore }) {
  return (
    <div className="space-y-5 fade-in">
      {/* Overall Sentiment Card */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border p-5">
        <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Overall Sentiment</div>
          <div className="flex items-center gap-4">
            <span className="text-4xl">{sentimentInfo.emoji}</span>
            <div>
              <div className={cn('text-2xl font-bold', sentimentInfo.color)}>
                {sentimentInfo.text}
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">
                Score: {(sentimentScore * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment Breakdown */}
      {sentiment.scores && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Sentiment Distribution
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'positive', label: 'Positive', color: 'bg-green-500', icon: '👍' },
              { key: 'neutral', label: 'Neutral', color: 'bg-gray-400', icon: '➖' },
              { key: 'negative', label: 'Negative', color: 'bg-red-500', icon: '👎' },
            ].map(({ key, label, color, icon }) => (
              <div key={key} className="rounded-lg border bg-card p-3 text-center">
                <div className="text-lg mb-1">{icon}</div>
                <div className="text-lg font-bold">
                  {((sentiment.scores[key] || 0) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', color)}
                    style={{ width: `${(sentiment.scores[key] || 0) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Insight */}
      {sentiment.scores?.positive > 0.6 && (
        <div className="rounded-lg border bg-gradient-to-r from-emerald-500/5 to-transparent p-3">
          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            Great positivity! Your message radiates optimism and warmth.
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Emotion Analysis panel
 */
function EmotionPanel({ emotions, dominantEmotion }) {
  if (Object.keys(emotions).length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No emotion data available.</p>
  }

  return (
    <div className="space-y-4 fade-in">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Emotional Breakdown
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                'rounded-lg border p-3 transition-all duration-200',
                isHighest ? 'ring-2 ring-amber-500/40 bg-amber-500/5 border-amber-500/20' : 'bg-card hover:bg-accent'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{emoji}</span>
                <span className="text-sm font-medium capitalize">
                  {key}
                  {isHighest && <span className="ml-1 text-xs text-amber-500">★</span>}
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', color)}
                  style={{ width: `${value * 100}%` }}
                />
              </div>
              <div className="text-right text-xs text-muted-foreground mt-1">
                {(value * 100).toFixed(0)}%
              </div>
            </div>
          )
        })}
      </div>

      {/* Dominant emotion insight */}
      <div className="rounded-lg border bg-gradient-to-r from-amber-500/5 to-transparent p-3">
        <p className="text-sm text-muted-foreground flex items-start gap-2">
          <span className="text-amber-500 mt-0.5">•</span>
          Dominant emotion detected: <strong className="text-foreground capitalize">{dominantEmotion}</strong>
          {' '}({((emotions[dominantEmotion] || 0) * 100).toFixed(0)}%)
        </p>
      </div>
    </div>
  )
}

/**
 * Personality Insights panel
 */
function PersonalityPanel({ personality }) {
  if (Object.keys(personality).length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No personality data available.</p>
  }

  return (
    <div className="space-y-4 fade-in">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
        Big Five Personality Traits
      </h4>
      <div className="space-y-3">
        {[
          { key: 'openness', label: 'Openness', desc: 'Creativity & curiosity', icon: '🎨' },
          { key: 'conscientiousness', label: 'Conscientiousness', desc: 'Organization & reliability', icon: '📋' },
          { key: 'extraversion', label: 'Extraversion', desc: 'Social energy & assertiveness', icon: '🗣️' },
          { key: 'agreeableness', label: 'Agreeableness', desc: 'Cooperation & trust', icon: '🤝' },
          { key: 'neuroticism', label: 'Neuroticism', desc: 'Calmness & resilience', icon: '🧘' },
        ].map(({ key, label, desc, icon }) => {
          const value = personality[key] || 0
          const normalizedValue = value > 1 ? value : value * 100
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xl">{icon}</span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-sm font-bold text-violet-500">{normalizedValue.toFixed(0)}%</span>
                </div>
                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-700"
                    style={{ width: `${normalizedValue}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Personality insights */}
      {(personality.openness > 70 || personality.agreeableness > 70) && (
        <div className="rounded-lg border bg-gradient-to-r from-violet-500/5 to-transparent p-3">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {personality.openness > 70 && (
              <li className="flex items-start gap-2">
                <span className="text-violet-500 mt-0.5">•</span>
                High openness suggests creative and innovative thinking.
              </li>
            )}
            {personality.agreeableness > 70 && (
              <li className="flex items-start gap-2">
                <span className="text-violet-500 mt-0.5">•</span>
                Strong agreeableness indicates collaborative and empathetic communication.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Empty result state - shows the 3 category cards as a preview
 */
function EmptyResultState() {
  return (
    <div className="space-y-6">
      {/* Category cards preview (non-interactive) */}
      <div className="grid grid-cols-3 gap-2">
        {ANALYSIS_CATEGORIES.map((cat) => {
          const Icon = cat.icon
          return (
            <div
              key={cat.id}
              className={cn(
                'relative rounded-xl border p-3 text-center transition-all duration-300',
                'bg-card border-border/50 opacity-60'
              )}
            >
              <div className="flex flex-col items-center gap-1.5">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-xs font-semibold leading-tight text-muted-foreground">
                  {cat.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Placeholder message */}
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">Your analysis results will appear here</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Enter text and click "Analyze Text" to get started</p>
      </div>
    </div>
  )
}

/**
 * Loading skeleton for analysis
 */
function AnalysisResultSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
    </div>
  )
}

