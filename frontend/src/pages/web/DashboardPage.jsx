import * as React from 'react'
import { Link } from 'react-router-dom'
import { useAuth, useProgress, useHistory, useEmotionalTrends } from '@/hooks'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Progress,
  CardSkeleton,
  Skeleton,
} from '@/components/common'
import { formatDate, getEmotionEmoji, getSentimentColor, formatNumber } from '@/lib/utils'
import {
  Brain,
  TrendingUp,
  MessageSquare,
  Calendar,
  ArrowRight,
  Sparkles,
  Activity,
  Target,
  Clock,
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
} from 'recharts'

/**
 * Dashboard/Home page component (web)
 */
export default function DashboardPage() {
  const { user } = useAuth()
  const { progress, isLoading: progressLoading } = useProgress()
  const { history, isLoading: historyLoading } = useHistory()
  const { trends, isLoading: trendsLoading } = useEmotionalTrends('week')

  const recentHistory = React.useMemo(() => {
    return (history || []).slice(0, 5)
  }, [history])

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.username}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your emotional journey
          </p>
        </div>
        <Link to="/analyze">
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            New Analysis
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Analyses"
          value={progress?.total_analyses || 0}
          icon={Brain}
          loading={progressLoading}
          trend={progress?.analyses_this_week ? `+${progress.analyses_this_week} this week` : undefined}
        />
        <StatCard
          title="Texts Rewritten"
          value={progress?.total_rewrites || 0}
          icon={MessageSquare}
          loading={progressLoading}
        />
        <StatCard
          title="Avg. Sentiment"
          value={progress?.average_sentiment?.toFixed(2) || 'N/A'}
          icon={Activity}
          loading={progressLoading}
          valueClassName={getSentimentColor(progress?.average_sentiment || 0)}
        />
        <StatCard
          title="Current Streak"
          value={`${progress?.current_streak || 0} days`}
          icon={Target}
          loading={progressLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Emotional Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Emotional Trends
            </CardTitle>
            <CardDescription>Your sentiment over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <EmotionalTrendsChart data={trends?.data || []} />
            )}
          </CardContent>
        </Card>

        {/* Emotion Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Emotion Distribution
            </CardTitle>
            <CardDescription>Your most frequent emotions</CardDescription>
          </CardHeader>
          <CardContent>
            {progressLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <EmotionDistribution emotions={progress?.emotion_distribution || {}} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest analyses and rewrites</CardDescription>
          </div>
          <Link to="/history">
            <Button variant="ghost" size="sm" className="gap-1">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full" />
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

      {/* Quick Actions */}
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

/**
 * Stats card component
 */
function StatCard({ title, value, icon: Icon, loading, trend, valueClassName }) {
  if (loading) {
    return <CardSkeleton />
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${valueClassName || ''}`}>
              {formatNumber(value)}
            </p>
            {trend && <p className="text-xs text-green-600 mt-1">{trend}</p>}
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Emotional trends line chart
 */
function EmotionalTrendsChart({ data }) {
  // Transform data if needed or use mock data
  const chartData = data.length > 0 ? data : [
    { date: 'Mon', sentiment: 0.2 },
    { date: 'Tue', sentiment: 0.5 },
    { date: 'Wed', sentiment: 0.3 },
    { date: 'Thu', sentiment: 0.7 },
    { date: 'Fri', sentiment: 0.4 },
    { date: 'Sat', sentiment: 0.6 },
    { date: 'Sun', sentiment: 0.5 },
  ]

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" className="text-xs" />
          <YAxis domain={[-1, 1]} className="text-xs" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Area
            type="monotone"
            dataKey="sentiment"
            stroke="hsl(var(--primary))"
            fill="url(#sentimentGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Emotion distribution bar component
 */
function EmotionDistribution({ emotions }) {
  const emotionList = Object.entries(emotions)
    .map(([emotion, count]) => ({ emotion, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  if (emotionList.length === 0) {
    // Show mock data
    return (
      <div className="space-y-4">
        {['Joy', 'Neutral', 'Anticipation', 'Trust'].map((emotion, i) => (
          <div key={emotion} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {getEmotionEmoji(emotion)} {emotion}
              </span>
              <span className="text-muted-foreground">{Math.floor(Math.random() * 20) + 5}%</span>
            </div>
            <Progress value={Math.random() * 60 + 20} />
          </div>
        ))}
      </div>
    )
  }

  const total = emotionList.reduce((sum, e) => sum + e.count, 0)

  return (
    <div className="space-y-4">
      {emotionList.map(({ emotion, count }) => {
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={emotion} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 capitalize">
                {getEmotionEmoji(emotion)} {emotion}
              </span>
              <span className="text-muted-foreground">{percentage}%</span>
            </div>
            <Progress value={percentage} />
          </div>
        )
      })}
    </div>
  )
}

/**
 * Recent history list
 */
function RecentHistoryList({ items }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={item.id || index}
          className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
        >
          <div className="text-2xl">
            {getEmotionEmoji(item.primary_emotion || item.emotion)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.text?.slice(0, 80)}...</p>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant={item.type === 'analysis' ? 'default' : 'secondary'}>
                {item.type || 'Analysis'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(item.created_at || item.date)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div className="text-center py-8">
      <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
      <h3 className="font-medium">No activity yet</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Start by analyzing some text to see your emotional insights here.
      </p>
      <Link to="/analyze" className="inline-block mt-4">
        <Button>
          <Sparkles className="h-4 w-4 mr-2" />
          Start Analyzing
        </Button>
      </Link>
    </div>
  )
}

/**
 * Quick action card
 */
function QuickActionCard({ title, description, icon: Icon, href, gradient }) {
  return (
    <Link to={href}>
      <Card className="group hover:shadow-md transition-all cursor-pointer overflow-hidden">
        <CardContent className="pt-6 relative">
          <div
            className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-br ${gradient}`}
          />
          <div className="relative">
            <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}>
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
