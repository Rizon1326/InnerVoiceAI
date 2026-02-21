import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Heart,
  SmilePlus,
  UserCircle,
  X,
} from 'lucide-react'

/**
 * Reusable Analysis Report Panel
 * Displays full analysis details (sentiment, emotions, personality)
 * in a unified, self-contained panel. Used by History detail view.
 */
export default function AnalysisReportPanel({ result, onClose, className }) {
  const [activeCategory, setActiveCategory] = React.useState('sentiment')

  if (!result) return null

  // Normalise – history items may store data flat or nested
  const analysis = result.analysis || result
  const sentiment = analysis.sentiment || {}
  const emotions = analysis.emotions || {}
  const personality = analysis.personality || {}

  // Dominant emotion
  const emotionEntries = Object.entries(emotions).filter(([, v]) => v > 0)
  const sortedEmotions = emotionEntries.sort((a, b) => b[1] - a[1])
  const dominantEmotion = sortedEmotions[0]?.[0] || 'neutral'

  // Sentiment interpretation
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
    return score >= 0.75
      ? { text: 'Very Neutral', emoji: '😐', color: 'text-gray-400' }
      : { text: 'Neutral', emoji: '🙂', color: 'text-gray-500' }
  }
  const sentimentInfo = getSentimentInterpretation(sentimentLabel, sentimentScore)

  const CATEGORIES = [
    { id: 'sentiment', label: 'Sentiment', icon: Heart, color: 'from-emerald-500 to-teal-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', ringColor: 'ring-emerald-500/40', iconColor: 'text-emerald-500' },
    { id: 'emotion', label: 'Emotions', icon: SmilePlus, color: 'from-amber-500 to-orange-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', ringColor: 'ring-amber-500/40', iconColor: 'text-amber-500' },
    { id: 'personality', label: 'Personality', icon: UserCircle, color: 'from-violet-500 to-purple-500', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/30', ringColor: 'ring-violet-500/40', iconColor: 'text-violet-500' },
  ]

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Panel Header */}
      {onClose && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <h3 className="text-lg font-semibold">Analysis Report</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Category tabs */}
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id
            const Icon = cat.icon
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
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
                      'h-8 w-8 rounded-lg flex items-center justify-center transition-colors',
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

        {/* Panel content */}
        <div className="min-h-[240px] fade-in">
          {activeCategory === 'sentiment' && (
            <SentimentSection sentiment={sentiment} sentimentInfo={sentimentInfo} sentimentScore={sentimentScore} />
          )}
          {activeCategory === 'emotion' && (
            <EmotionSection emotions={emotions} dominantEmotion={dominantEmotion} />
          )}
          {activeCategory === 'personality' && (
            <PersonalitySection personality={personality} />
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Sentiment ─── */
function SentimentSection({ sentiment, sentimentInfo, sentimentScore }) {
  return (
    <div className="space-y-4 fade-in">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border p-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{sentimentInfo.emoji}</span>
          <div>
            <div className={cn('text-xl font-bold', sentimentInfo.color)}>{sentimentInfo.text}</div>
            <div className="text-xs text-muted-foreground">Score: {(sentimentScore * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {sentiment.scores && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'positive', label: 'Positive', color: 'bg-green-500', icon: '👍' },
            { key: 'neutral', label: 'Neutral', color: 'bg-gray-400', icon: '➖' },
            { key: 'negative', label: 'Negative', color: 'bg-red-500', icon: '👎' },
          ].map(({ key, label, color, icon }) => (
            <div key={key} className="rounded-lg border bg-card p-2.5 text-center">
              <div className="text-sm mb-0.5">{icon}</div>
              <div className="text-base font-bold">{((sentiment.scores[key] || 0) * 100).toFixed(0)}%</div>
              <div className="text-[10px] text-muted-foreground">{label}</div>
              <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${(sentiment.scores[key] || 0) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Emotions ─── */
function EmotionSection({ emotions, dominantEmotion }) {
  if (Object.keys(emotions).length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No emotion data available.</p>
  }

  const EMOTION_DEFS = [
    { key: 'joy', emoji: '😄', color: 'from-yellow-400 to-orange-400' },
    { key: 'sadness', emoji: '😢', color: 'from-blue-400 to-indigo-400' },
    { key: 'anger', emoji: '😠', color: 'from-red-400 to-rose-500' },
    { key: 'fear', emoji: '😨', color: 'from-purple-400 to-violet-500' },
    { key: 'surprise', emoji: '😲', color: 'from-pink-400 to-fuchsia-500' },
    { key: 'neutral', emoji: '😐', color: 'from-gray-400 to-slate-500' },
  ]

  return (
    <div className="space-y-3 fade-in">
      <div className="grid grid-cols-2 gap-2">
        {EMOTION_DEFS.map(({ key, emoji, color }) => {
          const value = emotions[key] || 0
          const isHighest = key === dominantEmotion
          return (
            <div
              key={key}
              className={cn(
                'rounded-lg border p-2.5 transition-all duration-200',
                isHighest ? 'ring-2 ring-amber-500/40 bg-amber-500/5 border-amber-500/20' : 'bg-card hover:bg-accent'
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">{emoji}</span>
                <span className="text-xs font-medium capitalize">
                  {key}{isHighest && <span className="ml-1 text-[10px] text-amber-500">★</span>}
                </span>
              </div>
              <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', color)} style={{ width: `${value * 100}%` }} />
              </div>
              <div className="text-right text-[10px] text-muted-foreground mt-0.5">{(value * 100).toFixed(0)}%</div>
            </div>
          )
        })}
      </div>

      <div className="rounded-lg border bg-gradient-to-r from-amber-500/5 to-transparent p-2.5">
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <span className="text-amber-500">•</span>
          Dominant: <strong className="text-foreground capitalize">{dominantEmotion}</strong> ({((emotions[dominantEmotion] || 0) * 100).toFixed(0)}%)
        </p>
      </div>
    </div>
  )
}

/* ─── Personality ─── */
function PersonalitySection({ personality }) {
  if (Object.keys(personality).length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No personality data available.</p>
  }

  const TRAITS = [
    { key: 'openness', label: 'Openness', icon: '🎨' },
    { key: 'conscientiousness', label: 'Conscientiousness', icon: '📋' },
    { key: 'extraversion', label: 'Extraversion', icon: '🗣️' },
    { key: 'agreeableness', label: 'Agreeableness', icon: '🤝' },
    { key: 'neuroticism', label: 'Neuroticism', icon: '🧘' },
  ]

  return (
    <div className="space-y-3 fade-in">
      {TRAITS.map(({ key, label, icon }) => {
        const value = personality[key] || 0
        const pct = value > 1 ? value : value * 100
        return (
          <div key={key} className="flex items-center gap-2.5">
            <span className="text-base">{icon}</span>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-xs font-medium">{label}</span>
                <span className="text-xs font-bold text-violet-500">{pct.toFixed(0)}%</span>
              </div>
              <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { AnalysisReportPanel }
