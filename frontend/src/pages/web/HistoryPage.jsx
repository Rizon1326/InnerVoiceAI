import * as React from 'react'
import { useHistory } from '@/hooks'
import { useToast } from '@/components/common/Toast'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Skeleton,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/common'
import { formatDate, getEmotionEmoji, getSentimentColor, truncateText } from '@/lib/utils'
import {
  History,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Brain,
  MessageSquare,
  ArrowUpDown,
} from 'lucide-react'

/**
 * History page - View past analyses and rewrites (web)
 */
export default function HistoryPage() {
  const { history, isLoading, error, refetch } = useHistory()
  const toast = useToast()
  
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filterType, setFilterType] = React.useState('all')
  const [sortOrder, setSortOrder] = React.useState('newest')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [selectedItem, setSelectedItem] = React.useState(null)
  const [detailModalOpen, setDetailModalOpen] = React.useState(false)
  
  const itemsPerPage = 10

  // Filter and sort history
  const filteredHistory = React.useMemo(() => {
    let items = [...(history || [])]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      items = items.filter((item) =>
        item.text?.toLowerCase().includes(query) ||
        item.primary_emotion?.toLowerCase().includes(query)
      )
    }

    // Filter by type
    if (filterType !== 'all') {
      items = items.filter((item) => item.type === filterType)
    }

    // Sort
    items.sort((a, b) => {
      const dateA = new Date(a.created_at || a.date)
      const dateB = new Date(b.created_at || b.date)
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })

    return items
  }, [history, searchQuery, filterType, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage)
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleViewDetails = (item) => {
    setSelectedItem(item)
    setDetailModalOpen(true)
  }

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
      {/* Header */}
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Type Filter */}
            <Select
              options={typeOptions}
              value={filterType}
              onChange={setFilterType}
              className="w-full md:w-40"
            />
            
            {/* Sort Order */}
            <Select
              options={sortOptions}
              value={sortOrder}
              onChange={setSortOrder}
              className="w-full md:w-40"
            />
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <HistoryListSkeleton />
          ) : paginatedHistory.length > 0 ? (
            <>
              <div className="space-y-3">
                {paginatedHistory.map((item, index) => (
                  <HistoryItem
                    key={item.id || index}
                    item={item}
                    onViewDetails={() => handleViewDetails(item)}
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

      {/* Detail Modal */}
      <HistoryDetailModal
        item={selectedItem}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
      />
    </div>
  )
}

/**
 * Individual history item
 */
function HistoryItem({ item, onViewDetails }) {
  const isAnalysis = item.type === 'analysis' || !item.type

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors group">
      {/* Icon/Emoji */}
      <div className="text-2xl shrink-0">
        {isAnalysis ? getEmotionEmoji(item.primary_emotion || item.emotion) : '✍️'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">
            {truncateText(item.text || '', 100)}
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={onViewDetails}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center flex-wrap gap-2 mt-2">
          <Badge variant={isAnalysis ? 'default' : 'secondary'}>
            {isAnalysis ? (
              <>
                <Brain className="h-3 w-3 mr-1" />
                Analysis
              </>
            ) : (
              <>
                <MessageSquare className="h-3 w-3 mr-1" />
                Rewrite
              </>
            )}
          </Badge>
          
          {item.primary_emotion && (
            <Badge variant="outline" className="capitalize">
              {item.primary_emotion}
            </Badge>
          )}
          
          {item.sentiment_score !== undefined && (
            <span className={`text-xs font-medium ${getSentimentColor(item.sentiment_score)}`}>
              Sentiment: {item.sentiment_score.toFixed(2)}
            </span>
          )}
          
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(item.created_at || item.date)}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * History detail modal
 */
function HistoryDetailModal({ item, isOpen, onClose }) {
  if (!item) return null

  const isAnalysis = item.type === 'analysis' || !item.type

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <ModalHeader>
        <ModalTitle className="flex items-center gap-2">
          {isAnalysis ? <Brain className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
          {isAnalysis ? 'Analysis Details' : 'Rewrite Details'}
        </ModalTitle>
        <ModalDescription>
          {formatDate(item.created_at || item.date, { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </ModalDescription>
      </ModalHeader>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Original Text */}
        <div>
          <h4 className="text-sm font-medium mb-2">Original Text</h4>
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            {item.text}
          </div>
        </div>

        {/* Analysis Results */}
        {isAnalysis && (
          <>
            {/* Sentiment */}
            {item.sentiment_score !== undefined && (
              <div>
                <h4 className="text-sm font-medium mb-2">Sentiment</h4>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${getSentimentColor(item.sentiment_score)}`}>
                    {item.sentiment_score.toFixed(2)}
                  </span>
                  <Badge variant={item.sentiment_score > 0 ? 'success' : item.sentiment_score < 0 ? 'destructive' : 'secondary'}>
                    {item.sentiment_score > 0.3 ? 'Positive' : item.sentiment_score < -0.3 ? 'Negative' : 'Neutral'}
                  </Badge>
                </div>
              </div>
            )}

            {/* Emotions */}
            {item.emotions && (
              <div>
                <h4 className="text-sm font-medium mb-2">Detected Emotions</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(item.emotions).map(([emotion, score]) => (
                    <Badge key={emotion} variant="outline">
                      {getEmotionEmoji(emotion)} {emotion} ({(score * 100).toFixed(0)}%)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Rewritten Text */}
        {!isAnalysis && item.rewritten_text && (
          <div>
            <h4 className="text-sm font-medium mb-2">Rewritten Text</h4>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
              {item.rewritten_text}
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  )
}

/**
 * Empty state
 */
function EmptyHistoryState() {
  return (
    <div className="text-center py-12">
      <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
      <h3 className="font-medium">No history found</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Your analyses and rewrites will appear here.
      </p>
    </div>
  )
}

/**
 * Loading skeleton
 */
function HistoryListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-4 p-4 rounded-lg border">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
