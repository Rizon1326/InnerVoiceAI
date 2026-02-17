import * as React from 'react'
import { useHistory } from '@/hooks'
import { Button, Badge, Skeleton } from '@/components/common'
import { formatDate, getEmotionEmoji, truncateText } from '@/lib/utils'
import { History, Brain, MessageSquare, ChevronRight, RefreshCw } from 'lucide-react'

/**
 * Extension History view - Compact history list
 */
export default function ExtensionHistory() {
  const { history, isLoading, refetch } = useHistory()

  const recentHistory = React.useMemo(() => {
    return (history || []).slice(0, 20)
  }, [history])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4" />
          Recent History
        </h2>
        <Button variant="ghost" size="icon-sm" onClick={refetch}>
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto -mx-3 px-3">
        {isLoading ? (
          <HistorySkeleton />
        ) : recentHistory.length > 0 ? (
          <div className="space-y-2">
            {recentHistory.map((item, index) => (
              <HistoryItem key={item.id || index} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}

/**
 * History item component
 */
function HistoryItem({ item }) {
  const [expanded, setExpanded] = React.useState(false)
  const isAnalysis = item.type === 'analysis' || !item.type

  return (
    <div
      className="p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg shrink-0">
          {isAnalysis ? getEmotionEmoji(item.primary_emotion) : '✍️'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs leading-relaxed">
            {expanded ? item.text : truncateText(item.text || '', 60)}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant={isAnalysis ? 'default' : 'secondary'} className="text-[10px] py-0 px-1.5">
              {isAnalysis ? 'Analysis' : 'Rewrite'}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {formatDate(item.created_at || item.date)}
            </span>
          </div>
        </div>
        <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`} />
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-2 pt-2 border-t space-y-2">
          {item.sentiment_score !== undefined && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Sentiment:</span>
              <span className="font-medium">{item.sentiment_score.toFixed(2)}</span>
            </div>
          )}
          {item.emotions && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(item.emotions).slice(0, 3).map(([emotion]) => (
                <Badge key={emotion} variant="outline" className="text-[10px] py-0">
                  {getEmotionEmoji(emotion)} {emotion}
                </Badge>
              ))}
            </div>
          )}
          {item.rewritten_text && (
            <div className="p-2 rounded bg-primary/5 text-xs">
              <p className="text-[10px] text-muted-foreground mb-1">Rewritten:</p>
              {item.rewritten_text}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Empty state
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-8">
      <History className="h-10 w-10 text-muted-foreground/30 mb-2" />
      <p className="text-xs text-muted-foreground">No history yet</p>
      <p className="text-[10px] text-muted-foreground mt-1">
        Start analyzing text to see your history
      </p>
    </div>
  )
}

/**
 * Loading skeleton
 */
function HistorySkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-2.5 rounded-lg border">
          <div className="flex items-start gap-2">
            <Skeleton className="h-6 w-6 rounded shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
