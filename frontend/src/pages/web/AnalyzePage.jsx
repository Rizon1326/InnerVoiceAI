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
  Badge,
  Skeleton,
} from '@/components/common'
import { cn } from '@/lib/utils'
import {
  Brain,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  Wand2,
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
  const [copied, setCopied] = React.useState(false)

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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied!', 'Analysis copied to clipboard.')
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
            <AnalysisResult result={result} onCopy={copyToClipboard} copied={copied} onRewrite={goToRewrite} />
          ) : (
            <EmptyResultState />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Analysis result display - Professional & Visual
 */
function AnalysisResult({ result, onCopy, copied, onRewrite }) {
  // Extract analysis data from nested response
  const analysis = result.analysis || result
  const sentiment = analysis.sentiment || {}
  const emotions = analysis.emotions || {}
  const personality = analysis.personality || {}

  // Calculate dominant emotion
  const emotionEntries = Object.entries(emotions).filter(([k, v]) => k !== 'neutral' && v > 0)
  const sortedEmotions = emotionEntries.sort((a, b) => b[1] - a[1])
  const dominantEmotion = sortedEmotions[0]?.[0] || 'neutral'
  
  // Sentiment interpretation
  const sentimentScore = sentiment.score || 0
  const getSentimentInterpretation = (score) => {
    if (score >= 0.5) return { text: 'Very Positive', emoji: '🌟', color: 'text-green-500' }
    if (score >= 0.1) return { text: 'Positive', emoji: '😊', color: 'text-emerald-500' }
    if (score >= -0.1) return { text: 'Neutral', emoji: '😐', color: 'text-gray-500' }
    if (score >= -0.5) return { text: 'Negative', emoji: '😔', color: 'text-orange-500' }
    return { text: 'Very Negative', emoji: '😢', color: 'text-red-500' }
  }
  const sentimentInfo = getSentimentInterpretation(sentimentScore)

  return (
    <div className="space-y-6 fade-in">
      {/* Overall Sentiment Card */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="text-sm text-muted-foreground mb-2">Overall Sentiment</div>
          <div className="flex items-center gap-4">
            <span className="text-5xl">{sentimentInfo.emoji}</span>
            <div>
              <div className={cn('text-3xl font-bold', sentimentInfo.color)}>
                {sentimentInfo.text}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
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
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Sentiment Distribution
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'positive', label: 'Positive', color: 'bg-green-500', icon: '👍' },
              { key: 'neutral', label: 'Neutral', color: 'bg-gray-400', icon: '➖' },
              { key: 'negative', label: 'Negative', color: 'bg-red-500', icon: '👎' },
            ].map(({ key, label, color, icon }) => (
              <div key={key} className="rounded-lg border bg-card p-3 text-center">
                <div className="text-xl mb-1">{icon}</div>
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

      {/* Emotions Wheel */}
      {Object.keys(emotions).length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Emotional Analysis
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
                    isHighest ? 'ring-2 ring-primary bg-primary/5 border-primary/20' : 'bg-card hover:bg-accent'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{emoji}</span>
                    <span className="text-sm font-medium capitalize">
                      {key}
                      {isHighest && <span className="ml-1 text-xs text-primary">★</span>}
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
        </div>
      )}

      {/* Personality Traits */}
      {Object.keys(personality).length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Personality Insights (Big Five)
          </h4>
          <div className="space-y-3">
            {[
              { key: 'openness', label: 'Openness', desc: 'Creativity & curiosity', icon: '🎨' },
              { key: 'conscientiousness', label: 'Conscientiousness', desc: 'Organization & reliability', icon: '📋' },
              { key: 'extraversion', label: 'Extraversion', desc: 'Social energy & assertiveness', icon: '🗣️' },
              { key: 'agreeableness', label: 'Agreeableness', desc: 'Cooperation & trust', icon: '🤝' },
              { key: 'neuroticism', label: 'Neuroticism', desc: 'Calmness & resilience', icon: '🧘' },
            ].map(({ key, label, desc, icon }) => {
              // Personality values come as 0-100 from backend
              const value = personality[key] || 0
              const normalizedValue = value > 1 ? value : value * 100
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-sm font-bold text-primary">{normalizedValue.toFixed(0)}%</span>
                    </div>
                    <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-700"
                        style={{ width: `${normalizedValue}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Insights Summary */}
      <div className="rounded-lg border bg-gradient-to-r from-primary/5 to-transparent p-4">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Quick Insights
        </h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            Your text expresses a <strong className="text-foreground">{sentimentInfo.text.toLowerCase()}</strong> tone
            {dominantEmotion !== 'neutral' && (
              <> with dominant <strong className="text-foreground">{dominantEmotion}</strong> emotion</>
            )}.
          </li>
          {sentiment.scores?.positive > 0.6 && (
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Great positivity! Your message radiates optimism and warmth.
            </li>
          )}
          {personality.openness > 70 && (
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              High openness suggests creative and innovative thinking.
            </li>
          )}
          {personality.agreeableness > 70 && (
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Strong agreeableness indicates collaborative and empathetic communication.
            </li>
          )}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {/* Rewrite Button - Primary CTA */}
        <button
          type="button"
          className="rewrite-cta-btn flex-1 group relative flex items-center justify-center gap-3 rounded-xl px-5 py-3 text-sm font-semibold overflow-hidden"
          onClick={onRewrite}
        >
          <span className="rewrite-cta-bg absolute inset-0 rounded-xl" />
          <span className="rewrite-cta-shimmer absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100" />
          <span className="relative flex items-center gap-2 text-white">
            <Wand2 className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12" />
            Rewrite This Text
          </span>
        </button>

        {/* Copy Button */}
        <Button
          variant="outline"
          onClick={() => onCopy(JSON.stringify(result, null, 2))}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

/**
 * Empty result state
 */
function EmptyResultState() {
  return (
    <div className="flex flex-col items-center justify-center h-[300px] text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Sparkles className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground">Your analysis results will appear here</p>
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

