import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useHistory } from '@/hooks'
import { useAnalysisStore } from '@/stores'
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Skeleton,
} from '@/components/common'
import { cn, formatDate, getEmotionEmoji, truncateText } from '@/lib/utils'
import AnalysisReportPanel from '@/components/TextAnalysis/AnalysisReportPanel'
import {
  History,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Brain,
  MessageSquare,
  Wand2,
  TrendingUp,
  BarChart3,
  Sparkles,
} from 'lucide-react'

/**
 * History page – senior-level master-detail layout
 * Left:  scrollable history list with rich snapshot cards
 * Right: full Analysis Report panel (reuses AnalysisReportPanel component)
 */
export default function HistoryPage() {
  const navigate = useNavigate()
  const { history, isLoading } = useHistory()
  const { setOriginalText, setAnalysisResult } = useAnalysisStore()

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filterType, setFilterType] = React.useState('all')
  const [sortOrder, setSortOrder] = React.useState('newest')
  const [currentPage, setCurrentPage] = React.useState(1)

  // Detail panel
  const [selectedItem, setSelectedItem] = React.useState(null)
  const [panelVisible, setPanelVisible] = React.useState(false)

  const itemsPerPage = 10

  // ------- derived data -------
  const filteredHistory = React.useMemo(() => {
    let items = [...(history || [])]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter(
        (i) =>
          i.text?.toLowerCase().includes(q) ||
          i.primary_emotion?.toLowerCase().includes(q),
      )
    }
    if (filterType !== 'all') {
      items = items.filter((i) => i.type === filterType)
    }
    items.sort((a, b) => {
      const dA = new Date(a.created_at || a.date)
      const dB = new Date(b.created_at || b.date)
      return sortOrder === 'newest' ? dB - dA : dA - dB
    })
    return items
  }, [history, searchQuery, filterType, sortOrder])

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage)
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  // ------- handlers -------
  const handleSelectItem = React.useCallback((item) => {
    setSelectedItem(item)
    setPanelVisible(true)
  }, [])

  const handleClosePanel = React.useCallback(() => {
    setPanelVisible(false)
    // Allow transition to finish before clearing data
    setTimeout(() => setSelectedItem(null), 300)
  }, [])

  const handleRewriteAgain = React.useCallback(
    (item) => {
      // Prefill the store and navigate
      setOriginalText(item.text || '')
      if (item.analysis || item.emotions) {
        setAnalysisResult(item)
      }
      navigate('/rewrite')
    },
    [navigate, setOriginalText, setAnalysisResult],
  )

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'analysis', label: 'Analyses' },
    { value: 'rewrite', label: 'Rewrites' },
  ]

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
  ]

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            History
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage your past analyses and rewrites
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredHistory.length} {filteredHistory.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      {/* ─── Filters ─── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10"
              />
            </div>
            <Select
              options={typeOptions}
              value={filterType}
              onChange={(v) => { setFilterType(v); setCurrentPage(1) }}
              className="w-full md:w-40"
            />
            <Select
              options={sortOptions}
              value={sortOrder}
              onChange={setSortOrder}
              className="w-full md:w-40"
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── Master-Detail Layout ─── */}
      <div className="flex gap-6 items-start relative">
        {/* Master – History List */}
        <div
          className={cn(
            'w-full transition-all duration-300 ease-in-out',
            panelVisible ? 'lg:w-1/2 xl:w-[55%]' : 'w-full',
          )}
        >
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <HistoryListSkeleton />
              ) : paginatedHistory.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {paginatedHistory.map((item, index) => (
                      <HistoryCard
                        key={item.id || index}
                        item={item}
                        isSelected={selectedItem?.id === item.id}
                        onSelect={() => handleSelectItem(item)}
                        onRewrite={() => handleRewriteAgain(item)}
                        compact={panelVisible}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <EmptyHistoryState />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail panel (slides in from right) */}
        <div
          className={cn(
            'hidden lg:block sticky top-6 transition-all duration-300 ease-in-out overflow-hidden',
            panelVisible
              ? 'lg:w-1/2 xl:w-[45%] opacity-100 translate-x-0'
              : 'w-0 opacity-0 translate-x-8 pointer-events-none',
          )}
        >
          {selectedItem && (
            <Card className="h-[calc(100vh-13rem)] overflow-hidden slide-in-right">
              <AnalysisReportPanel
                result={selectedItem}
                onClose={handleClosePanel}
              />
            </Card>
          )}
        </div>
      </div>

      {/* Mobile overlay panel */}
      {panelVisible && selectedItem && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClosePanel}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-background border-l shadow-2xl slide-in-right">
            <AnalysisReportPanel
              result={selectedItem}
              onClose={handleClosePanel}
            />
            {/* Mobile Rewrite Again */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background/95 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => {
                  handleClosePanel()
                  handleRewriteAgain(selectedItem)
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                <Wand2 className="h-4 w-4" />
                Rewrite Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================
   HistoryCard – rich snapshot card
   ================================================================ */

/**
 * Extracts key analysis metrics from a history item into a flat shape
 */
function extractMetrics(item) {
  const analysis = item.analysis || item
  const sentiment = analysis.sentiment || {}
  const emotions = analysis.emotions || {}
  const personality = analysis.personality || {}

  // Sentiment
  const sentimentLabel = sentiment.label || (item.sentiment_score > 0.3 ? 'positive' : item.sentiment_score < -0.3 ? 'negative' : 'neutral')
  const sentimentScore = sentiment.score || item.sentiment_score

  // Dominant emotion
  const emotionEntries = Object.entries(emotions).filter(([, v]) => typeof v === 'number' && v > 0)
  const sorted = emotionEntries.sort((a, b) => b[1] - a[1])
  const dominantEmotion = item.primary_emotion || sorted[0]?.[0] || null
  const dominantEmotionScore = sorted[0]?.[1] || null

  // Personality summary – pick top trait
  const personalityEntries = Object.entries(personality).filter(([, v]) => typeof v === 'number')
  const topTrait = personalityEntries.sort((a, b) => b[1] - a[1])[0] || null

  return { sentimentLabel, sentimentScore, dominantEmotion, dominantEmotionScore, topTrait, emotions, personality }
}

function HistoryCard({ item, isSelected, onSelect, onRewrite, compact }) {
  const isAnalysis = item.type === 'analysis' || !item.type
  const metrics = React.useMemo(() => extractMetrics(item), [item])

  const sentimentColors = {
    positive: 'text-green-500 bg-green-500/10 border-green-500/20',
    negative: 'text-red-500 bg-red-500/10 border-red-500/20',
    neutral: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
  }
  const sentColor = sentimentColors[metrics.sentimentLabel?.toLowerCase()] || sentimentColors.neutral

  return (
    <div
      onClick={onSelect}
      className={cn(
        'relative rounded-xl border p-4 cursor-pointer transition-all duration-200 group',
        'hover:shadow-md hover:border-primary/30',
        isSelected
          ? 'ring-2 ring-primary/40 border-primary/30 bg-primary/[0.03] shadow-md'
          : 'bg-card hover:bg-accent/30',
      )}
    >
      {/* Top row: type badge + timestamp */}
      <div className="flex items-center justify-between mb-2.5">
        <Badge variant={isAnalysis ? 'default' : 'secondary'} className="text-[10px]">
          {isAnalysis ? (
            <><Brain className="h-3 w-3 mr-1" /> Analysis</>
          ) : (
            <><MessageSquare className="h-3 w-3 mr-1" /> Rewrite</>
          )}
        </Badge>
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDate(item.created_at || item.date)}
        </span>
      </div>

      {/* Text preview */}
      <p className="text-sm leading-relaxed text-foreground/90 mb-3">
        {truncateText(item.text || '', compact ? 80 : 140)}
      </p>

      {/* Metrics row */}
      <div className="flex flex-wrap items-center gap-2 mb-1">
        {/* Sentiment pill */}
        {metrics.sentimentLabel && (
          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize', sentColor)}>
            <TrendingUp className="h-3 w-3" />
            {metrics.sentimentLabel}
            {metrics.sentimentScore != null && (
              <span className="opacity-70 ml-0.5">
                {(typeof metrics.sentimentScore === 'number' ? (metrics.sentimentScore * 100).toFixed(0) : metrics.sentimentScore)}%
              </span>
            )}
          </span>
        )}

        {/* Dominant emotion pill */}
        {metrics.dominantEmotion && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[11px] font-semibold capitalize">
            <span>{getEmotionEmoji(metrics.dominantEmotion)}</span>
            {metrics.dominantEmotion}
            {metrics.dominantEmotionScore != null && (
              <span className="opacity-70 ml-0.5">{(metrics.dominantEmotionScore * 100).toFixed(0)}%</span>
            )}
          </span>
        )}

        {/* Top personality trait */}
        {metrics.topTrait && (
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400 px-2 py-0.5 text-[11px] font-semibold capitalize">
            <BarChart3 className="h-3 w-3" />
            {metrics.topTrait[0]}
          </span>
        )}
      </div>

      {/* Rewrite Again CTA – visible on hover (desktop), always on mobile */}
      <div className={cn(
        'mt-3 pt-3 border-t border-border/40 flex items-center justify-end',
        'opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200',
      )}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRewrite()
          }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5',
            'px-3 py-1.5 text-xs font-semibold text-primary',
            'hover:bg-primary/10 hover:border-primary/40 active:scale-[0.97]',
            'transition-all duration-200',
          )}
        >
          <Wand2 className="h-3.5 w-3.5" />
          Rewrite Again
        </button>
      </div>
    </div>
  )
}

/* ================================================================
   Empty & Skeleton
   ================================================================ */

function EmptyHistoryState() {
  return (
    <div className="text-center py-16">
      <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Sparkles className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="font-semibold text-lg">No history yet</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
        Your analyses and rewrites will appear here once you start using the tool.
      </p>
    </div>
  )
}

function HistoryListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
