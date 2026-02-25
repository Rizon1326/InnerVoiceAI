import * as React from 'react'
import { Link } from 'react-router-dom'
import { useAuth, useDashboard } from '@/hooks'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Skeleton,
} from '@/components/common'
import { cn, formatDate, getEmotionEmoji, formatNumber } from '@/lib/utils'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  ArrowRight,
  Sparkles,
  Activity,
  Target,
  Clock,
  BarChart3,
  Globe,
  Flame,
  RefreshCw,
  Zap,
  ShieldCheck,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  LayoutDashboard,
  AlertCircle,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'

// ─── Color palette ──────────────────────────────────────────────
const COLORS = {
  primary: 'hsl(var(--primary))',
  joy: '#facc15',
  sadness: '#60a5fa',
  anger: '#f87171',
  fear: '#a78bfa',
  surprise: '#f472b6',
  neutral: '#94a3b8',
  positive: '#22c55e',
  negative: '#ef4444',
}

const EMOTION_COLORS = {
  joy: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600 dark:text-yellow-400', bar: '#facc15' },
  sadness: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-600 dark:text-blue-400', bar: '#60a5fa' },
  anger: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600 dark:text-red-400', bar: '#f87171' },
  fear: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-600 dark:text-violet-400', bar: '#a78bfa' },
  surprise: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-600 dark:text-pink-400', bar: '#f472b6' },
  neutral: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-600 dark:text-slate-400', bar: '#94a3b8' },
}

const POST_TYPE_COLORS = {
  expressive: '#f472b6',
  informative: '#60a5fa',
  persuasive: '#facc15',
  reflective: '#a78bfa',
  conversational: '#34d399',
  informational: '#94a3b8',
}

// ─────────────────────────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const {
    isLoading,
    isError,
    error,
    refetch,
    stats,
    sentimentChartData,
    emotionDistribution,
    sentimentSummary,
    emotionalTrends,
    postTypeDistribution,
    languageEvolution,
    writingConsistency,
    recentHistory,
  } = useDashboard()

  // ─── Error state ───────────────────────────────────────────────
  if (isError && !stats.totalAnalyses) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive/60" />
        <h2 className="text-xl font-semibold">Failed to load dashboard</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={refetch} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── Welcome Header ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            Welcome back, {user?.username || 'User'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's your emotional intelligence overview for the past 30 days
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={refetch} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Link to="/analyze">
            <Button className="gap-2">
              <Sparkles className="h-4 w-4" />
              New Analysis
            </Button>
          </Link>
        </div>
      </div>

      {/* ── KPI Stat Cards ─────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Analyses"
          value={stats.totalAnalyses}
          icon={Brain}
          gradient="from-blue-500 to-indigo-500"
          loading={isLoading}
          subtitle={stats.daysActive > 0 ? `${stats.daysActive} active days` : undefined}
        />
        <StatCard
          title="Current Streak"
          value={`${stats.streak} day${stats.streak !== 1 ? 's' : ''}`}
          icon={Flame}
          gradient="from-orange-500 to-red-500"
          loading={isLoading}
          subtitle={stats.avgPostsPerDay > 0 ? `~${stats.avgPostsPerDay.toFixed(1)} posts/day` : undefined}
        />
        <StatCard
          title="Growth Index"
          value={sentimentSummary.communicationGrowth > 0 ? `${sentimentSummary.communicationGrowth}` : 'N/A'}
          icon={Zap}
          gradient="from-violet-500 to-purple-500"
          loading={isLoading}
          subtitle={_trendLabel(sentimentSummary.direction)}
        />
      </div>

      {/* ── Summary Scores Row ─────────────────────────────────── */}
      {!isLoading && sentimentSummary.communicationGrowth > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <ScoreGauge label="Sentiment Progress" value={sentimentSummary.sentimentProgress} icon={TrendingUp} color="emerald" />
          <ScoreGauge label="Emotional Balance" value={sentimentSummary.emotionalBalance} icon={ShieldCheck} color="blue" />
          <ScoreGauge label="Writing Consistency" value={sentimentSummary.writingConsistency} icon={Target} color="violet" />
        </div>
      )}

      {/* ── Charts Row 1 ───────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sentiment Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-primary" />
              Sentiment Trend
            </CardTitle>
            <CardDescription>
              {sentimentSummary.direction !== 'insufficient_data' ? (
                <span className="flex items-center gap-1.5">
                  Your sentiment is
                  <TrendBadge direction={sentimentSummary.direction} />
                  <span className="text-xs text-muted-foreground/70">
                    (avg: {sentimentSummary.periodAvg.toFixed(3)})
                  </span>
                </span>
              ) : 'Daily sentiment scores over the period'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full rounded-lg" />
            ) : sentimentChartData.length > 0 ? (
              <SentimentChart data={sentimentChartData} />
            ) : (
              <EmptyChartState message="Analyze some texts to see your sentiment trend." />
            )}
          </CardContent>
        </Card>

        {/* Emotion Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Emotion Profile
            </CardTitle>
            <CardDescription>Average emotional composition</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-9 w-full rounded" />
                ))}
              </div>
            ) : emotionDistribution ? (
              <EmotionDistributionBars emotions={emotionDistribution} />
            ) : (
              <EmptyChartState message="No emotion data yet." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2 ───────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Post Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Writing Style Distribution
            </CardTitle>
            <CardDescription>
              {postTypeDistribution?.dominant_type
                ? `Dominant style: ${_humanize(postTypeDistribution.dominant_type)}`
                : 'How your writing breaks down by type'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full rounded-lg" />
            ) : postTypeDistribution?.counts && Object.keys(postTypeDistribution.counts).length > 0 ? (
              <PostTypeChart data={postTypeDistribution} />
            ) : (
              <EmptyChartState message="Start writing to see your style distribution." />
            )}
          </CardContent>
        </Card>

        {/* Language Evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Language Usage
            </CardTitle>
            <CardDescription>
              {languageEvolution?.primary_language
                ? `Primary: ${_humanize(languageEvolution.primary_language)}`
                : 'Distribution of languages detected'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full rounded-lg" />
            ) : languageEvolution?.distribution && Object.keys(languageEvolution.distribution).length > 0 ? (
              <LanguageDistribution data={languageEvolution} />
            ) : (
              <EmptyChartState message="No language data available yet." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Writing Consistency & Emotional Trends ─────────────── */}
      {!isLoading && (writingConsistency || emotionalTrends) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Writing Consistency Radar */}
          {writingConsistency?.components && Object.keys(writingConsistency.components).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Writing Consistency
                </CardTitle>
                <CardDescription>
                  Score: <strong>{writingConsistency.score}</strong>/100
                  <span className="ml-2 capitalize text-xs">({_humanize(writingConsistency.label)})</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConsistencyRadar data={writingConsistency.components} />
              </CardContent>
            </Card>
          )}

          {/* Emotional Trends */}
          {emotionalTrends && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Key Metric Trends
                </CardTitle>
                <CardDescription>30-day direction indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <TrendIndicators trends={emotionalTrends} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Recent Activity ────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest analyses</CardDescription>
          </div>
          <Link to="/history">
            <Button variant="ghost" size="sm" className="gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentHistory.length > 0 ? (
            <RecentHistoryList items={recentHistory} />
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>

      {/* ── Quick Actions ──────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <QuickActionCard
          title="Analyze Text"
          description="Get insights into your emotions and sentiment"
          icon={Brain}
          href="/analyze"
          gradient="from-blue-500 to-purple-500"
        />
        <QuickActionCard
          title="View Progress"
          description="Track your emotional growth over time"
          icon={TrendingUp}
          href="/progress"
          gradient="from-green-500 to-emerald-500"
        />
        <QuickActionCard
          title="Browse History"
          description="Review your past analyses and rewrites"
          icon={Calendar}
          href="/history"
          gradient="from-orange-500 to-red-500"
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────────

/** KPI stat card with gradient icon */
function StatCard({ title, value, icon: Icon, gradient, loading, subtitle }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1 tracking-tight">
              {typeof value === 'number' ? formatNumber(value) : value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground/80 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            'h-12 w-12 rounded-full bg-gradient-to-br flex items-center justify-center shadow-sm transition-transform group-hover:scale-110',
            gradient,
          )}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** Score gauge card used for summary scores */
function ScoreGauge({ label, value, icon: Icon, color }) {
  const colorMap = {
    emerald: { ring: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', barBg: '#10b981' },
    blue: { ring: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', barBg: '#3b82f6' },
    violet: { ring: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20', barBg: '#8b5cf6' },
  }
  const c = colorMap[color] || colorMap.blue
  const pct = Math.min(Math.max(value, 0), 100)

  return (
    <Card className={cn('border', c.border)}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-4">
          <div className={cn('h-14 w-14 rounded-full flex items-center justify-center shrink-0', c.bg)}>
            <span className={cn('text-lg font-bold tabular-nums', c.ring)}>{pct.toFixed(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={cn('h-4 w-4 shrink-0', c.ring)} />
              <span className="text-sm font-semibold truncate">{label}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: c.barBg }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** Sentiment area chart */
function SentimentChart({ data }) {
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <defs>
            <linearGradient id="dashSentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" domain={['dataMin - 0.1', 'dataMax + 0.1']} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: 12,
            }}
            formatter={(val) => [val?.toFixed(4), 'Sentiment']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="sentiment"
            stroke={COLORS.primary}
            fill="url(#dashSentGrad)"
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS.primary }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Horizontal bar-style emotion distribution */
function EmotionDistributionBars({ emotions }) {
  const entries = Object.entries(emotions)
    .map(([k, v]) => ({ emotion: k, value: v }))
    .sort((a, b) => b.value - a.value)

  const maxVal = Math.max(...entries.map((e) => e.value), 0.01)

  return (
    <div className="space-y-3.5">
      {entries.map(({ emotion, value }) => {
        const pct = (value / maxVal) * 100
        const c = EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral
        return (
          <div key={emotion}>
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-2 text-sm font-medium capitalize">
                <span className="text-base">{getEmotionEmoji(emotion)}</span>
                {emotion}
              </span>
              <span className={cn('text-sm font-bold tabular-nums', c.text)}>
                {(value * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: c.bar }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Post type bar chart */
function PostTypeChart({ data }) {
  const chartData = Object.entries(data.counts).map(([type, count]) => ({
    type: _humanize(type),
    count,
    fill: POST_TYPE_COLORS[type] || '#94a3b8',
  }))

  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" />
          <XAxis dataKey="type" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Language distribution as segmented bar + legend */
function LanguageDistribution({ data }) {
  const langColors = {
    bangla: { color: '#22c55e', emoji: '🇧🇩' },
    banglish: { color: '#3b82f6', emoji: '🔤' },
    english: { color: '#6b7280', emoji: '🇬🇧' },
    mixed: { color: '#06b6d4', emoji: '🌐' },
  }

  const entries = Object.entries(data.distribution)
    .map(([lang, pct]) => ({
      lang,
      pct,
      count: data.counts[lang] || 0,
      ...(langColors[lang] || { color: '#94a3b8', emoji: '📝' }),
    }))
    .sort((a, b) => b.pct - a.pct)

  return (
    <div className="space-y-5">
      {/* Segmented bar */}
      <div className="h-6 rounded-full overflow-hidden flex">
        {entries.map(({ lang, pct, color }) => (
          <div
            key={lang}
            className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
            style={{ width: `${pct * 100}%`, backgroundColor: color, minWidth: pct > 0 ? '4px' : '0' }}
            title={`${_humanize(lang)}: ${(pct * 100).toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3">
        {entries.map(({ lang, pct, count, color, emoji }) => (
          <div key={lang} className="flex items-center gap-2.5 text-sm">
            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-base">{emoji}</span>
            <div className="min-w-0">
              <span className="font-medium capitalize">{_humanize(lang)}</span>
              <span className="text-muted-foreground ml-1.5 text-xs">
                {(pct * 100).toFixed(0)}% ({count})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Writing consistency radar chart */
function ConsistencyRadar({ data }) {
  const radarData = Object.entries(data).map(([key, value]) => ({
    dimension: _humanize(key),
    score: value,
  }))

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid className="stroke-muted/60" />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            dataKey="score"
            stroke={COLORS.primary}
            fill={COLORS.primary}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Trend direction indicators row */
function TrendIndicators({ trends }) {
  const items = [
    { key: 'sentiment', label: 'Sentiment', data: trends.sentiment, emoji: '📊' },
    { key: 'joy', label: 'Joy', data: trends.joy, emoji: '😄' },
    { key: 'sadness', label: 'Sadness', data: trends.sadness, emoji: '😢' },
    { key: 'anger', label: 'Anger', data: trends.anger, emoji: '😠' },
    { key: 'openness', label: 'Openness', data: trends.openness, emoji: '🎨' },
    { key: 'neuroticism', label: 'Neuroticism', data: trends.neuroticism, emoji: '🧘' },
  ].filter((i) => i.data != null)

  if (items.length === 0) {
    return <EmptyChartState message="Not enough data to calculate trends." />
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map(({ key, label, data, emoji }) => {
        const improvement = data.improvement || 'stable'
        const isPositive = improvement === 'positive'
        const isNegative = improvement === 'negative'

        return (
          <div key={key} className="rounded-lg border p-3 hover:bg-accent/30 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{emoji}</span>
              <span className="text-xs font-semibold text-muted-foreground">{label}</span>
            </div>
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : isNegative ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={cn(
                'text-sm font-bold tabular-nums',
                isPositive && 'text-green-500',
                isNegative && 'text-red-500',
                !isPositive && !isNegative && 'text-muted-foreground',
              )}>
                {data.trend != null ? (data.trend > 0 ? '+' : '') + data.trend.toFixed(3) : '—'}
              </span>
            </div>
            {data.current != null && (
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                Current: {typeof data.current === 'number' ? data.current.toFixed(3) : data.current}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Trend direction badge */
function TrendBadge({ direction }) {
  const map = {
    improving: { label: 'Improving', variant: 'success', icon: TrendingUp },
    declining: { label: 'Declining', variant: 'destructive', icon: TrendingDown },
    stable: { label: 'Stable', variant: 'secondary', icon: Minus },
    insufficient_data: { label: 'Insufficient data', variant: 'outline', icon: Minus },
  }
  const info = map[direction] || map.insufficient_data
  const DirIcon = info.icon

  return (
    <Badge variant={info.variant} className="gap-1 text-xs">
      <DirIcon className="h-3 w-3" />
      {info.label}
    </Badge>
  )
}

/** Recent history list – maps real backend Post data */
function RecentHistoryList({ items }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
        >
          <div className="text-2xl shrink-0">
            {getEmotionEmoji(item.dominantEmotion)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {item.text?.length > 90 ? item.text.slice(0, 90) + '…' : item.text}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant={item.sentimentLabel === 'positive' ? 'success' : item.sentimentLabel === 'negative' ? 'destructive' : 'secondary'}>
                {item.sentimentLabel}
              </Badge>
              <Badge variant="outline" className="capitalize text-xs">
                {item.dominantEmotion}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(item.createdAt)}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={cn(
              'text-sm font-bold tabular-nums',
              item.sentimentScore >= 0.5 ? 'text-green-500' :
              item.sentimentScore >= 0 ? 'text-muted-foreground' : 'text-red-500',
            )}>
              {item.sentimentScore >= 0 ? '+' : ''}{item.sentimentScore.toFixed(2)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Empty state for the whole history section */
function EmptyState() {
  return (
    <div className="text-center py-10">
      <Brain className="h-14 w-14 mx-auto text-muted-foreground/40 mb-4" />
      <h3 className="font-semibold text-lg">No activity yet</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        Start by analyzing some text to populate your dashboard with real insights.
      </p>
      <Link to="/analyze" className="inline-block mt-4">
        <Button className="gap-2">
          <Sparkles className="h-4 w-4" />
          Start Analyzing
        </Button>
      </Link>
    </div>
  )
}

/** Empty chart placeholder */
function EmptyChartState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
        <PieChartIcon className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

/** Quick action card */
function QuickActionCard({ title, description, icon: Icon, href, gradient }) {
  return (
    <Link to={href}>
      <Card className="group hover:shadow-md transition-all cursor-pointer overflow-hidden">
        <CardContent className="pt-6 relative">
          <div className={cn(
            'absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-br',
            gradient,
          )} />
          <div className="relative">
            <div className={cn('h-10 w-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-4', gradient)}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// ─── Utility helpers ────────────────────────────────────────────

function _humanize(str) {
  if (!str) return ''
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function _trendLabel(direction) {
  const map = {
    improving: '📈 Improving',
    declining: '📉 Declining',
    stable: '➡️ Stable',
    insufficient_data: 'Need more data',
  }
  return map[direction] || map.insufficient_data
}
