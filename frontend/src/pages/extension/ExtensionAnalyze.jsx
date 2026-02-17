import * as React from 'react'
import { useAnalysis, useRewrite } from '@/hooks'
import { useToast } from '@/components/common/Toast'
import { Button, Textarea, Badge, Select, Tabs, TabPanel } from '@/components/common'
import { getEmotionEmoji, cn } from '@/lib/utils'
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
          {/* Extract analysis from nested response */}
          {(() => {
            const analysis = result.analysis || result
            const sentiment = analysis.sentiment || {}
            const emotions = analysis.emotions || {}
            
            // Get sentiment interpretation
            const score = sentiment.score || 0
            const getSentimentEmoji = (s) => {
              if (s >= 0.5) return '🌟'
              if (s >= 0.1) return '😊'
              if (s >= -0.1) return '😐'
              if (s >= -0.5) return '😔'
              return '😢'
            }
            
            // Get dominant emotion
            const emotionEntries = Object.entries(emotions).filter(([k, v]) => k !== 'neutral' && v > 0)
            const sortedEmotions = emotionEntries.sort((a, b) => b[1] - a[1]).slice(0, 4)
            
            return (
              <>
                {/* Sentiment Card */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-transparent border">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getSentimentEmoji(score)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Sentiment</span>
                        <Badge 
                          variant={score > 0 ? 'success' : score < 0 ? 'destructive' : 'secondary'} 
                          className="text-xs"
                        >
                          {sentiment.label || (score > 0 ? 'Positive' : score < 0 ? 'Negative' : 'Neutral')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div 
                            className={cn(
                              'h-full rounded-full transition-all',
                              score > 0 ? 'bg-green-500' : score < 0 ? 'bg-red-500' : 'bg-gray-400'
                            )}
                            style={{ width: `${Math.abs(score) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold">{(score * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emotions */}
                {sortedEmotions.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <span className="text-xs font-medium text-muted-foreground block mb-2">Top Emotions</span>
                    <div className="space-y-2">
                      {sortedEmotions.map(([emotion, value]) => (
                        <div key={emotion} className="flex items-center gap-2">
                          <span className="text-sm">{getEmotionEmoji(emotion)}</span>
                          <span className="text-xs capitalize flex-1">{emotion}</span>
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${value * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {(value * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Copy Button */}
                <Button variant="outline" size="sm" className="w-full" onClick={copyResults}>
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? 'Copied' : 'Copy Results'}
                </Button>
              </>
            )
          })()}
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
