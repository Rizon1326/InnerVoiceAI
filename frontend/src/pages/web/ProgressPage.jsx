import * as React from 'react'
import { useBehavioralAnalytics, useAuth } from '@/hooks'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Progress,
  Select,
  Skeleton,
  CircularProgress,
} from '@/components/common'
import { cn, getEmotionEmoji, formatNumber } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Calendar,
  Brain,
  Flame,
  BarChart3,
  Activity,
  Languages,
  Shuffle,
  PenTool,
  Wand2,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts'

const TONE_COLORS = {
  positive: '#22c55e',
  neutral: '#6b7280',
  negative: '#ef4444',
}

const EMOTION_COLORS = {
  joy: '#facc15',
  sadness: '#3b82f6',
  anger: '#ef4444',
  fear: '#a855f7',
  surprise: '#ec4899',
  neutral: '#6b7280',
}

const POST_TYPE_COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#f97316']
const LANG_COLORS = { bangla: '#8b5cf6', banglish: '#06b6d4', english: '#f59e0b', mixed: '#10b981' }
const GOAL_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6']

/**
 * Progress Page – Behavioral Intelligence Dashboard
 *
 * Fully data-driven. Every chart, score, and indicator is computed from
 * the Django BehavioralAnalyticsEngine endpoint.
 */
export default function ProgressPage() {
  useAuth() // ensure authenticated
  const [days, setDays] = React.useState(30)
  const { analytics, isLoading, isError, error, refetch } = useBehavioralAnalytics(days)

  const periodOptions = [
    { value: 7, label: 'Last 7 Days' },
    { value: 14, label: 'Last 14 Days' },
    { value: 30, label: 'Last 30 Days' },
    { value: 90, label: 'Last 90 Days' },
    { value: 365, label: 'Last Year' },
  ]

  React.useEffect(() => {
    refetch(days)
  }, [days, refetch])

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="font-semibold text-lg">Failed to load analytics</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const summary = analytics?.summary_scores || {}
  const sentiment = analytics?.sentiment_trend || {}
  const tone = analytics?.emotional_tone_distribution || {}
  const postTypes = analytics?.post_type_frequency || {}
  const rewritePrefs = analytics?.rewrite_preferences || {}
  const langEvo = analytics?.language_evolution || {}
  const consistency = analytics?.writing_consistency || {}
  const engagement = analytics?.engagement || {}

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            Behavioral Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Data-driven insights into your communication evolution
          </p>
        </div>
        <Select
          options={periodOptions}
          value={days}
          onChange={(v) => setDays(Number(v))}
          className="w-44"
        />
      </div>

      {/* ─── Communication Growth Index ─── */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <CircularProgress value={summary.communication_growth_index || 0} size={96} strokeWidth={6} />
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold">
                  Communication Growth Index
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Composite score based on sentiment progress, emotional balance, and writing consistency
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <MiniMetric label="Sentiment" value={summary.sentiment_progress} />
                <MiniMetric label="Balance" value={summary.emotional_balance} />
                <MiniMetric label="Consistency" value={summary.writing_consistency} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Engagement Summary ─── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Brain} label="Total Posts" value={engagement.total_posts} loading={isLoading} />
        <StatCard icon={Wand2} label="Rewrites" value={engagement.total_rewrites} loading={isLoading} />
        <StatCard icon={Calendar} label="Days Active" value={engagement.days_active} loading={isLoading} />
        <StatCard icon={Activity} label="Posts / Day" value={engagement.avg_posts_per_day} loading={isLoading} />
        <StatCard icon={Flame} label="Streak" value={`${engagement.streak || 0}d`} loading={isLoading} />
      </div>

      {/* ─── Row 1: Sentiment Trend + Emotional Tone ─── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Sentiment Trend */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Sentiment Trend
                </CardTitle>
                <CardDescription>
                  {sentiment.direction === 'improving'
                    ? '📈 Your sentiment is improving over this period'
                    : sentiment.direction === 'declining'
                    ? '📉 Your sentiment has been declining'
                    : sentiment.direction === 'stable'
                    ? '➡️ Your sentiment has been stable'
                    : 'Not enough data yet'}
                </CardDescription>
              </div>
              <TrendBadge direction={sentiment.direction} slope={sentiment.slope} />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <SentimentTrendChart data={sentiment.data_points || []} />
            )}
            {!isLoading && sentiment.period_avg != null && (
              <div className="grid grid-cols-3 gap-4 mt-4 text-center text-xs">
                <div>
                  <span className="text-muted-foreground">Period Avg</span>
                  <p className="font-semibold text-sm">{sentiment.period_avg?.toFixed(3)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Min</span>
                  <p className="font-semibold text-sm">{sentiment.period_min?.toFixed(3)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Max</span>
                  <p className="font-semibold text-sm">{sentiment.period_max?.toFixed(3)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Emotional Tone Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Emotional Tone Distribution
            </CardTitle>
            <CardDescription>
              Positive / Neutral / Negative balance and period-over-period shift
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <>
                <ToneDistributionChart current={tone.current} previous={tone.previous} />
                <ToneShiftIndicators shift={tone.shift} />
                {Object.keys(tone.per_emotion_avg || {}).length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Per-Emotion Averages</p>
                    <EmotionRadarChart data={tone.per_emotion_avg} />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Row 2: Post Types + Rewrite Preferences ─── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 3. Post Type Frequency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              Post Type Distribution
            </CardTitle>
            <CardDescription>
              What kind of posts you write most: expressive, informative, persuasive, reflective, conversational
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <PostTypePieChart counts={postTypes.counts || {}} dominant={postTypes.dominant_type} />
            )}
          </CardContent>
        </Card>

        {/* 4. Rewrite Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Rewrite Preference Patterns
            </CardTitle>
            <CardDescription>
              {rewritePrefs.total_rewrites
                ? `${rewritePrefs.total_rewrites} rewrites — preferred goal: ${formatGoalLabel(rewritePrefs.preferred_goal)}`
                : 'No rewrites recorded yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : rewritePrefs.total_rewrites ? (
              <RewritePreferencesChart goalCounts={rewritePrefs.goal_counts || {}} />
            ) : (
              <EmptyState message="Start rewriting text to see your preference patterns." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Row 3: Language Evolution + Writing Consistency ─── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 5. Language Usage Evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Languages className="h-5 w-5 text-primary" />
              Language Usage Evolution
            </CardTitle>
            <CardDescription>
              Primary language: <span className="font-semibold capitalize">{langEvo.primary_language || '—'}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <>
                <LanguageDistributionBars distribution={langEvo.distribution || {}} counts={langEvo.counts || {}} />
                {(langEvo.weekly_series || []).length > 1 && (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Weekly Breakdown</p>
                    <LanguageWeeklyChart series={langEvo.weekly_series} />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 6. Writing Consistency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shuffle className="h-5 w-5 text-primary" />
              Writing Consistency Score
            </CardTitle>
            <CardDescription>
              {consistency.label === 'very_consistent'
                ? '🎯 Very consistent writing style'
                : consistency.label === 'consistent'
                ? '✅ Consistent style overall'
                : consistency.label === 'variable'
                ? '🔄 Variable — your style shifts frequently'
                : consistency.label === 'highly_variable'
                ? '⚡ Highly variable — lots of style changes'
                : 'Need more data to measure'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <ConsistencyPanel score={consistency.score} components={consistency.components || {}} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ================================================================
   SUB-COMPONENTS – all data-driven, zero mock data
   ================================================================ */

/** Mini metric inside the CGI banner */
function MiniMetric({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value != null ? Math.round(value) : '—'}</p>
    </div>
  )
}

/** Stat card for engagement row */
function StatCard({ icon: Icon, label, value, loading }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        {loading ? (
          <Skeleton className="h-14 w-full" />
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {Icon && <Icon className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold">
                {typeof value === 'number' ? formatNumber(value) : (value ?? '—')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Trend direction badge */
function TrendBadge({ direction, slope }) {
  if (!direction || direction === 'insufficient_data') return null

  const map = {
    improving: { icon: TrendingUp, color: 'text-green-600 bg-green-500/10 border-green-500/20', label: 'Improving' },
    declining: { icon: TrendingDown, color: 'text-red-600 bg-red-500/10 border-red-500/20', label: 'Declining' },
    stable: { icon: Minus, color: 'text-gray-600 bg-gray-500/10 border-gray-500/20', label: 'Stable' },
  }
  const cfg = map[direction] || map.stable
  const Icon = cfg.icon

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', cfg.color)}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
      {slope != null && <span className="opacity-60 ml-0.5">({slope > 0 ? '+' : ''}{(slope * 100).toFixed(1)}%)</span>}
    </span>
  )
}

/* ─── 1. Sentiment Trend Chart ─── */
function SentimentTrendChart({ data }) {
  if (!data || data.length === 0) {
    return <EmptyState message="No sentiment data for this period yet." />
  }

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sentiment: d.sentiment,
    posts: d.posts,
  }))

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" className="text-[10px]" tick={{ fontSize: 10 }} />
          <YAxis domain={[-1, 1]} className="text-[10px]" tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(val, name) => [typeof val === 'number' ? val.toFixed(4) : val, name === 'sentiment' ? 'Sentiment' : 'Posts']}
          />
          <Area type="monotone" dataKey="sentiment" stroke="hsl(var(--primary))" fill="url(#sentGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ─── 2. Tone Distribution ─── */
function ToneDistributionChart({ current, previous }) {
  if (!current) return <EmptyState message="No tone data available." />

  const chartData = ['positive', 'neutral', 'negative'].map((key) => ({
    tone: key.charAt(0).toUpperCase() + key.slice(1),
    current: +(current[key] * 100).toFixed(1),
    previous: +(previous?.[key] * 100 || 0).toFixed(1),
  }))

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis dataKey="tone" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 10 }} unit="%" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(val) => `${val}%`}
          />
          <Bar dataKey="previous" name="Previous" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="current" name="Current" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ToneShiftIndicators({ shift }) {
  if (!shift) return null
  return (
    <div className="flex items-center gap-4 mt-3 justify-center">
      {['positive', 'neutral', 'negative'].map((key) => {
        const val = shift[key] || 0
        const isUp = val > 0.005
        const isDown = val < -0.005
        return (
          <span key={key} className="inline-flex items-center gap-1 text-xs font-medium capitalize">
            {isUp ? <ArrowUpRight className="h-3.5 w-3.5 text-green-500" /> : isDown ? <ArrowDownRight className="h-3.5 w-3.5 text-red-500" /> : <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
            <span style={{ color: TONE_COLORS[key] }}>{key}</span>
            <span className="text-muted-foreground">
              {val > 0 ? '+' : ''}{(val * 100).toFixed(1)}%
            </span>
          </span>
        )
      })}
    </div>
  )
}

function EmotionRadarChart({ data }) {
  const chartData = Object.entries(data).map(([emotion, val]) => ({
    emotion: `${getEmotionEmoji(emotion)} ${emotion}`,
    value: +(val * 100).toFixed(1),
  }))

  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData}>
          <PolarGrid className="stroke-muted" />
          <PolarAngleAxis dataKey="emotion" tick={{ fontSize: 10 }} />
          <PolarRadiusAxis tick={{ fontSize: 9 }} />
          <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ─── 3. Post Type Pie ─── */
function PostTypePieChart({ counts, dominant }) {
  const entries = Object.entries(counts)
  if (entries.length === 0) return <EmptyState message="No posts analyzed yet." />

  const chartData = entries.map(([name, value]) => ({ name: capitalize(name), value }))

  return (
    <div className="flex flex-col items-center">
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ strokeWidth: 1 }}
            >
              {chartData.map((_, idx) => (
                <Cell key={idx} fill={POST_TYPE_COLORS[idx % POST_TYPE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {dominant && (
        <p className="text-xs text-muted-foreground mt-2">
          Dominant type: <span className="font-semibold capitalize text-foreground">{dominant}</span>
        </p>
      )}
    </div>
  )
}

/* ─── 4. Rewrite Preferences ─── */
function RewritePreferencesChart({ goalCounts }) {
  const chartData = Object.entries(goalCounts).map(([goal, count]) => ({
    goal: formatGoalLabel(goal),
    count,
  }))

  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis dataKey="goal" type="category" width={120} tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {chartData.map((_, idx) => (
              <Cell key={idx} fill={GOAL_COLORS[idx % GOAL_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ─── 5. Language Evolution ─── */
function LanguageDistributionBars({ distribution, counts }) {
  const entries = Object.entries(distribution)
  if (entries.length === 0) return <EmptyState message="No language data yet." />

  return (
    <div className="space-y-3">
      {entries.map(([lang, pct]) => (
        <div key={lang}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="capitalize font-medium">{lang}</span>
            <span className="text-muted-foreground">{counts[lang] || 0} posts · {(pct * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct * 100}%`, backgroundColor: LANG_COLORS[lang] || '#6b7280' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function LanguageWeeklyChart({ series }) {
  if (!series || series.length === 0) return null

  // Collect all language keys
  const langKeys = new Set()
  series.forEach((s) => {
    Object.keys(s).forEach((k) => {
      if (k !== 'week') langKeys.add(k)
    })
  })

  const chartData = series.map((s) => ({
    ...s,
    week: new Date(s.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  return (
    <div className="h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 9 }} />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
          {[...langKeys].map((lang) => (
            <Bar key={lang} dataKey={lang} stackId="a" fill={LANG_COLORS[lang] || '#6b7280'} />
          ))}
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ─── 6. Writing Consistency ─── */
function ConsistencyPanel({ score, components }) {
  const dims = [
    { key: 'sentiment', label: 'Sentiment Stability', icon: '📊' },
    { key: 'tone', label: 'Tone Consistency', icon: '🎭' },
    { key: 'post_type', label: 'Post-Type Stability', icon: '📝' },
    { key: 'language', label: 'Language Consistency', icon: '🌐' },
    { key: 'word_count', label: 'Length Regularity', icon: '📏' },
  ]

  return (
    <div className="space-y-5">
      {/* Overall score */}
      <div className="flex items-center gap-4">
        <CircularProgress value={score || 0} size={80} strokeWidth={5} />
        <div>
          <p className="text-sm font-semibold">
            {score != null ? `${Math.round(score)} / 100` : '—'}
          </p>
          <p className="text-xs text-muted-foreground">
            {score >= 75 ? 'Very consistent writing pattern'
              : score >= 55 ? 'Reasonably consistent style'
              : score >= 35 ? 'Moderately variable — some style shifts'
              : 'Highly variable — frequent style changes'}
          </p>
        </div>
      </div>

      {/* Per-dimension breakdown */}
      <div className="space-y-3">
        {dims.map(({ key, label, icon }) => {
          const val = components[key]
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5">
                  <span>{icon}</span>
                  {label}
                </span>
                <span className="font-semibold">{val != null ? Math.round(val) : '—'}</span>
              </div>
              <Progress value={val || 0} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Empty state placeholder ─── */
function EmptyState({ message }) {
  return (
    <div className="flex items-center justify-center h-[200px] text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

/* ─── Helpers ─── */
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

function formatGoalLabel(goal) {
  if (!goal) return '—'
  return goal.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
