import * as React from 'react'
import { useAnalysis, useRewrite } from '@/hooks'
import { useToast } from '@/components/common/Toast'
import { Button, Textarea, Badge, Select, Tabs, TabPanel } from '@/components/common'
import { getEmotionEmoji, getSentimentColor, cn } from '@/lib/utils'
import { REWRITE_STYLES } from '@/lib/constants'
import { Brain, Wand2, Sparkles, Copy, Check, RefreshCw, Loader2 } from 'lucide-react'

const styleOptions = Object.entries(REWRITE_STYLES).map(([key, value]) => ({
  value,
  label: key.charAt(0) + key.slice(1).toLowerCase(),
}))

/**
 * Extension Analyze view - Compact text analysis
 */
export default function ExtensionAnalyze() {
  const [activeTab, setActiveTab] = React.useState('analyze')
  const toast = useToast()

  const tabs = [
    { value: 'analyze', label: 'Analyze' },
    { value: 'rewrite', label: 'Rewrite' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex bg-muted rounded-lg p-1 mb-3">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'flex-1 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeTab === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'analyze' ? (
        <AnalyzeView toast={toast} />
      ) : (
        <RewriteView toast={toast} />
      )}
    </div>
  )
}

/**
 * Analyze view content
 */
function AnalyzeView({ toast }) {
  const { analyze, result, isLoading, reset } = useAnalysis()
  const [text, setText] = React.useState('')
  const [copied, setCopied] = React.useState(false)

  const handleAnalyze = async () => {
    if (text.length < 10) {
      toast.error('Error', 'Please enter at least 10 characters.')
      return
    }
    try {
      await analyze(text)
      toast.success('Done', 'Analysis complete!')
    } catch (error) {
      toast.error('Error', error.message)
    }
  }

  const copyResults = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Input */}
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to analyze..."
          className="min-h-[100px] text-sm resize-none"
          disabled={isLoading}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{text.length}/5000</span>
          <div className="flex gap-2">
            {result && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            <Button size="sm" onClick={handleAnalyze} disabled={isLoading || text.length < 10}>
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3 mr-1" />
              )}
              Analyze
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-3 flex-1 overflow-y-auto space-y-3">
          {/* Sentiment */}
          {result.sentiment && (
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">Sentiment</span>
                <span className={cn('text-lg font-bold', getSentimentColor(result.sentiment.score || result.sentiment))}>
                  {typeof result.sentiment.score === 'number' 
                    ? result.sentiment.score.toFixed(2) 
                    : result.sentiment.toFixed?.(2) || result.sentiment}
                </span>
              </div>
              {result.sentiment.label && (
                <Badge variant={result.sentiment.score > 0 ? 'success' : 'destructive'} className="text-xs">
                  {result.sentiment.label}
                </Badge>
              )}
            </div>
          )}

          {/* Emotions */}
          {result.emotions && (
            <div className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs font-medium block mb-2">Emotions</span>
              <div className="flex flex-wrap gap-1.5">
                {(Array.isArray(result.emotions) ? result.emotions : Object.entries(result.emotions)).slice(0, 5).map((item, i) => {
                  const emotion = Array.isArray(item) ? item[0] : item.emotion || item
                  return (
                    <Badge key={i} variant="outline" className="text-xs">
                      {getEmotionEmoji(emotion)} {emotion}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {/* Copy Button */}
          <Button variant="outline" size="sm" className="w-full" onClick={copyResults}>
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? 'Copied' : 'Copy Results'}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!result && !isLoading && (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <Brain className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              Enter text above to analyze emotions
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Rewrite view content
 */
function RewriteView({ toast }) {
  const { rewrite, result, isLoading, reset } = useRewrite()
  const [text, setText] = React.useState('')
  const [style, setStyle] = React.useState('professional')
  const [copied, setCopied] = React.useState(false)

  const handleRewrite = async () => {
    if (text.length < 10) {
      toast.error('Error', 'Please enter at least 10 characters.')
      return
    }
    try {
      await rewrite(text, style)
      toast.success('Done', 'Text rewritten!')
    } catch (error) {
      toast.error('Error', error.message)
    }
  }

  const copyText = () => {
    const rewrittenText = result?.rewritten || result?.rewritten_text || result?.text || ''
    navigator.clipboard.writeText(rewrittenText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const rewrittenText = result?.rewritten || result?.rewritten_text || result?.text || ''

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Input */}
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to rewrite..."
          className="min-h-[80px] text-sm resize-none"
          disabled={isLoading}
        />
        
        <div className="flex gap-2">
          <Select
            options={styleOptions}
            value={style}
            onChange={setStyle}
            className="flex-1"
          />
          <Button size="sm" onClick={handleRewrite} disabled={isLoading || text.length < 10}>
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Wand2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Results */}
      {rewrittenText && (
        <div className="mt-3 flex-1 overflow-y-auto space-y-2">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm whitespace-pre-wrap">{rewrittenText}</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={copyText}>
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !isLoading && (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <Wand2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              Enter text and select a style to rewrite
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
