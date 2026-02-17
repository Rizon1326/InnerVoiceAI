import * as React from 'react'
import { useProgress, useEmotionalTrends, useAuth } from '@/hooks'
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
import { getEmotionEmoji, getSentimentColor, formatNumber } from '@/lib/utils'
import {
  TrendingUp,
  Trophy,
  Target,
  Calendar,
  Brain,
  Flame,
  Award,
  BarChart3,
  Activity,
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
} from 'recharts'

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28']

/**
 * Progress page - Track emotional growth (web)
 */
export default function ProgressPage() {
  const { user } = useAuth()
  const { progress, isLoading: progressLoading } = useProgress()
  const [period, setPeriod] = React.useState('week')
  const { trends, isLoading: trendsLoading, refetch: refetchTrends } = useEmotionalTrends(period)

  const periodOptions = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
  ]

  React.useEffect(() => {
    refetchTrends(period)
  }, [period, refetchTrends])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            Your Progress
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your emotional journey and growth over time
          </p>
        </div>
        <Select
          options={periodOptions}
          value={period}
          onChange={setPeriod}
          className="w-40"
        />
      </div>

      {/* Achievement Banner */}
      {progress?.current_streak > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center">
                <Flame className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  🔥 {progress.current_streak} Day Streak!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Keep it up! You're doing great with your emotional awareness practice.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Sessions"
          value={progress?.total_analyses || 0}
          icon={Brain}
          loading={progressLoading}
          description="All-time analyses"
        />
        <StatsCard
          title="This Week"
          value={progress?.analyses_this_week || 0}
          icon={Calendar}
          loading={progressLoading}
          description="Analyses this week"
        />
        <StatsCard
          title="Best Streak"
          value={`${progress?.longest_streak || 0} days`}
          icon={Trophy}
          loading={progressLoading}
          description="Your record"
        />
        <StatsCard
          title="Avg. Sentiment"
          value={progress?.average_sentiment?.toFixed(2) || 'N/A'}
          icon={Activity}
          loading={progressLoading}
          description="Overall mood"
          valueClass={getSentimentColor(progress?.average_sentiment || 0)}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sentiment Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Sentiment Trend
            </CardTitle>
            <CardDescription>Your emotional trajectory over time</CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <SentimentTrendChart data={trends?.data || mockTrendData} />
            )}
          </CardContent>
        </Card>

        {/* Emotion Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Emotion Breakdown
            </CardTitle>
            <CardDescription>Distribution of your emotions</CardDescription>
          </CardHeader>
          <CardContent>
            {progressLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <EmotionPieChart data={progress?.emotion_distribution || {}} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weekly Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Weekly Activity</CardTitle>
            <CardDescription>Your analysis activity by day</CardDescription>
          </CardHeader>
          <CardContent>
            {progressLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <WeeklyActivityChart data={progress?.weekly_activity || mockWeeklyData} />
            )}
          </CardContent>
        </Card>

        {/* Progress Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Goals
            </CardTitle>
            <CardDescription>Track your targets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <GoalProgress
              label="Weekly Analyses"
              current={progress?.analyses_this_week || 0}
              target={7}
              icon="📝"
            />
            <GoalProgress
              label="Positive Days"
              current={progress?.positive_days || 0}
              target={5}
              icon="😊"
            />
            <GoalProgress
              label="Streak Goal"
              current={progress?.current_streak || 0}
              target={14}
              icon="🔥"
            />
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Achievements
          </CardTitle>
          <CardDescription>Milestones you've reached</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Achievement
              title="First Analysis"
              description="Completed your first text analysis"
              icon="🎯"
              unlocked={progress?.total_analyses > 0}
            />
            <Achievement
              title="Week Warrior"
              description="7-day analysis streak"
              icon="🗓️"
              unlocked={progress?.longest_streak >= 7}
            />
            <Achievement
              title="Emotion Explorer"
              description="Analyzed 10 different emotions"
              icon="🌈"
              unlocked={Object.keys(progress?.emotion_distribution || {}).length >= 10}
            />
            <Achievement
              title="Century Club"
              description="Completed 100 analyses"
              icon="💯"
              unlocked={progress?.total_analyses >= 100}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Mock data for demo
const mockTrendData = [
  { date: 'Mon', sentiment: 0.3 },
  { date: 'Tue', sentiment: 0.5 },
  { date: 'Wed', sentiment: 0.2 },
  { date: 'Thu', sentiment: 0.7 },
  { date: 'Fri', sentiment: 0.4 },
  { date: 'Sat', sentiment: 0.6 },
  { date: 'Sun', sentiment: 0.5 },
]

const mockWeeklyData = [
  { day: 'Mon', count: 3 },
  { day: 'Tue', count: 5 },
  { day: 'Wed', count: 2 },
  { day: 'Thu', count: 4 },
  { day: 'Fri', count: 6 },
  { day: 'Sat', count: 1 },
  { day: 'Sun', count: 2 },
]

/**
 * Stats card component
 */
function StatsCard({ title, value, icon: Icon, loading, description, valueClass }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${valueClass || ''}`}>
              {typeof value === 'number' ? formatNumber(value) : value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
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
 * Sentiment trend line chart
 */
function SentimentTrendChart({ data }) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="sentimentFill" x1="0" y1="0" x2="0" y2="1">
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
            fill="url(#sentimentFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Emotion distribution pie chart
 */
function EmotionPieChart({ data }) {
  const chartData = Object.entries(data).map(([emotion, count]) => ({
    name: emotion,
    value: count,
  }))

  // Use mock data if empty
  const displayData = chartData.length > 0 ? chartData : [
    { name: 'Joy', value: 30 },
    { name: 'Neutral', value: 25 },
    { name: 'Anticipation', value: 20 },
    { name: 'Trust', value: 15 },
    { name: 'Sadness', value: 10 },
  ]

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={displayData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
            label={({ name, percent }) => `${getEmotionEmoji(name)} ${(percent * 100).toFixed(0)}%`}
          >
            {displayData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Weekly activity bar chart
 */
function WeeklyActivityChart({ data }) {
  const chartData = Array.isArray(data) ? data : mockWeeklyData

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis dataKey="day" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Goal progress component
 */
function GoalProgress({ label, current, target, icon }) {
  const percentage = Math.min((current / target) * 100, 100)
  const isComplete = current >= target

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <span>{icon}</span>
          {label}
        </span>
        <span className={isComplete ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
          {current}/{target}
        </span>
      </div>
      <Progress value={percentage} variant={isComplete ? 'success' : 'default'} />
    </div>
  )
}

/**
 * Achievement badge component
 */
function Achievement({ title, description, icon, unlocked }) {
  return (
    <div
      className={`p-4 rounded-lg border text-center transition-all ${
        unlocked
          ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20'
          : 'bg-muted/30 border-muted opacity-50'
      }`}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <h4 className="font-medium text-sm">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
      {unlocked && (
        <Badge variant="success" className="mt-2">
          Unlocked
        </Badge>
      )}
    </div>
  )
}
