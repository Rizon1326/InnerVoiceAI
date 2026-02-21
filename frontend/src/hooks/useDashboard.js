import * as React from 'react'
import { analysisService, authService } from '@/services'
import { LOADING_STATES } from '@/lib/constants'

/**
 * Aggregated dashboard hook.
 *
 * Fetches data from every relevant backend endpoint and normalises
 * the payloads so the DashboardPage can consume a single, consistent
 * data object without caring about backend response shapes.
 */
export function useDashboard() {
  const [status, setStatus] = React.useState(LOADING_STATES.LOADING)
  const [error, setError] = React.useState(null)

  // Individual slices
  const [metrics, setMetrics] = React.useState(null)
  const [progress, setProgress] = React.useState([])
  const [trends, setTrends] = React.useState(null)
  const [analytics, setAnalytics] = React.useState(null)
  const [history, setHistory] = React.useState([])

  const fetchAll = React.useCallback(async () => {
    setStatus(LOADING_STATES.LOADING)
    setError(null)

    // Fire all requests in parallel – none depend on each other
    const results = await Promise.allSettled([
      authService.getMetrics(),                               // 0 → ProjectMetrics
      analysisService.getProgress(),                          // 1 → EmotionalProgress[]
      analysisService.getEmotionalTrends({ days: 30 }),       // 2 → trend objects
      analysisService.getBehavioralAnalytics({ days: 30 }),   // 3 → BehavioralAnalytics
      analysisService.getHistory({ limit: 10 }),              // 4 → Post[] (with analysis)
    ])

    // Helper – safely unwrap { success, data } envelope
    const unwrap = (settled) => {
      if (settled.status === 'rejected') return null
      const res = settled.value
      // authService.getMetrics returns response.data directly (axios interceptor)
      // analysisService.* return response.data which is { success, data }
      if (res?.data !== undefined) return res.data
      return res
    }

    const rawMetrics = unwrap(results[0])
    const rawProgress = unwrap(results[1])
    const rawTrends = unwrap(results[2])
    const rawAnalytics = unwrap(results[3])
    const rawHistory = unwrap(results[4])

    setMetrics(rawMetrics)
    setProgress(Array.isArray(rawProgress) ? rawProgress : [])
    setTrends(rawTrends)
    setAnalytics(rawAnalytics)
    setHistory(Array.isArray(rawHistory) ? rawHistory : [])

    // If ALL requests failed, mark as error
    const allFailed = results.every((r) => r.status === 'rejected')
    if (allFailed) {
      setError('Unable to load dashboard data. Please try again.')
      setStatus(LOADING_STATES.ERROR)
    } else {
      setStatus(LOADING_STATES.SUCCESS)
    }
  }, [])

  React.useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // ─── Derived / normalised data ──────────────────────────────────

  /**
   * Stat cards – top-level KPIs
   */
  const stats = React.useMemo(() => {
    const m = metrics || {}
    const eng = analytics?.engagement || {}
    return {
      totalAnalyses: m.total_posts_analyzed ?? eng.total_posts ?? 0,
      totalRewrites: m.total_rewrites_generated ?? eng.total_rewrites ?? 0,
      daysActive: m.days_active ?? eng.days_active ?? 0,
      streak: m.streak_days ?? eng.streak ?? 0,
      avgPostsPerDay: m.average_posts_per_day ?? eng.avg_posts_per_day ?? 0,
      languagesUsed: m.languages_used ?? 0,
      avgSentimentImprovement: m.avg_sentiment_improvement ?? 0,
      emotionalStability: m.emotional_stability ?? 0,
    }
  }, [metrics, analytics])

  /**
   * Sentiment chart data – daily data points from progress records
   */
  const sentimentChartData = React.useMemo(() => {
    // Prefer behavioral analytics data points (already formatted)
    const bp = analytics?.sentiment_trend?.data_points
    if (bp && bp.length > 0) {
      return bp.map((p) => ({
        date: _shortDate(p.date),
        fullDate: p.date,
        sentiment: p.sentiment,
        posts: p.posts,
      }))
    }
    // Fall back to EmotionalProgress records
    if (progress.length > 0) {
      return progress.map((p) => ({
        date: _shortDate(p.date),
        fullDate: p.date,
        sentiment: p.avg_sentiment_score,
        posts: p.posts_count,
      }))
    }
    return []
  }, [analytics, progress])

  /**
   * Emotion distribution – averaged across period
   */
  const emotionDistribution = React.useMemo(() => {
    const perEmotion = analytics?.emotional_tone_distribution?.per_emotion_avg
    if (perEmotion && Object.keys(perEmotion).length > 0) {
      return perEmotion // { joy: 0.xx, sadness: 0.xx, ... }
    }
    // Fallback: compute from progress records
    if (progress.length > 0) {
      const n = progress.length
      return {
        joy: progress.reduce((s, p) => s + (p.avg_emotion_joy || 0), 0) / n,
        sadness: progress.reduce((s, p) => s + (p.avg_emotion_sadness || 0), 0) / n,
        anger: progress.reduce((s, p) => s + (p.avg_emotion_anger || 0), 0) / n,
        fear: progress.reduce((s, p) => s + (p.avg_emotion_fear || 0), 0) / n,
        surprise: progress.reduce((s, p) => s + (p.avg_emotion_surprise || 0), 0) / n,
      }
    }
    return null
  }, [analytics, progress])

  /**
   * Sentiment trend direction + summary scores from behavioral analytics
   */
  const sentimentSummary = React.useMemo(() => {
    const st = analytics?.sentiment_trend || {}
    const scores = analytics?.summary_scores || {}
    return {
      direction: st.direction || 'insufficient_data',
      slope: st.slope ?? 0,
      currentAvg: st.current_avg ?? 0,
      periodAvg: st.period_avg ?? 0,
      periodMin: st.period_min ?? 0,
      periodMax: st.period_max ?? 0,
      communicationGrowth: scores.communication_growth_index ?? 0,
      sentimentProgress: scores.sentiment_progress ?? 0,
      emotionalBalance: scores.emotional_balance ?? 0,
      writingConsistency: scores.writing_consistency ?? 0,
    }
  }, [analytics])

  /**
   * Emotional trends from /progress/trends/
   */
  const emotionalTrends = React.useMemo(() => {
    if (!trends) return null
    return {
      sentiment: trends.sentiment_trend,
      joy: trends.joy_trend,
      sadness: trends.sadness_trend,
      anger: trends.anger_trend,
      neuroticism: trends.neuroticism_trend,
      openness: trends.openness_trend,
    }
  }, [trends])

  /**
   * Post type distribution from behavioral analytics
   */
  const postTypeDistribution = React.useMemo(() => {
    return analytics?.post_type_frequency || null
  }, [analytics])

  /**
   * Language evolution from behavioral analytics
   */
  const languageEvolution = React.useMemo(() => {
    return analytics?.language_evolution || null
  }, [analytics])

  /**
   * Writing consistency score from behavioral analytics
   */
  const writingConsistency = React.useMemo(() => {
    return analytics?.writing_consistency || null
  }, [analytics])

  /**
   * Rewrite preference data
   */
  const rewritePreferences = React.useMemo(() => {
    return analytics?.rewrite_preferences || null
  }, [analytics])

  /**
   * Recent history – normalised for display
   */
  const recentHistory = React.useMemo(() => {
    return history.slice(0, 5).map((item) => {
      const a = item.analysis || {}
      const emotions = a.emotions || {}
      // Find dominant emotion
      const sorted = Object.entries(emotions).sort((a, b) => b[1] - a[1])
      const dominantEmotion = sorted[0]?.[0] || 'neutral'
      return {
        id: item.id,
        text: item.text,
        language: item.language,
        createdAt: item.created_at,
        sentimentLabel: a.sentiment?.label || 'unknown',
        sentimentScore: a.sentiment?.score ?? 0,
        dominantEmotion,
        emotions,
      }
    })
  }, [history])

  return {
    // Status
    isLoading: status === LOADING_STATES.LOADING,
    isError: status === LOADING_STATES.ERROR,
    error,
    refetch: fetchAll,

    // Normalised data
    stats,
    sentimentChartData,
    emotionDistribution,
    sentimentSummary,
    emotionalTrends,
    postTypeDistribution,
    languageEvolution,
    writingConsistency,
    rewritePreferences,
    recentHistory,

    // Raw (for advanced usage)
    rawMetrics: metrics,
    rawAnalytics: analytics,
  }
}

// ─── Helpers ────────────────────────────────────────────────────

function _shortDate(isoDate) {
  if (!isoDate) return ''
  try {
    const d = new Date(isoDate)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return isoDate
  }
}
