import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { analyzeTextSchema, rewriteTextSchema } from '@/lib/validations'
import { useAnalysis, useRewrite } from '@/hooks'
import { useToast } from '@/components/common/Toast'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Textarea,
  FormField,
  Badge,
  Select,
  Tabs,
  TabPanel,
  Progress,
  Skeleton,
} from '@/components/common'
import { getEmotionEmoji, getSentimentColor, cn } from '@/lib/utils'
import { REWRITE_STYLES } from '@/lib/constants'
import {
  Brain,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Wand2,
} from 'lucide-react'

const styleOptions = Object.entries(REWRITE_STYLES).map(([key, value]) => ({
  value,
  label: key.charAt(0) + key.slice(1).toLowerCase(),
}))

/**
 * Analyze page - Text analysis and rewriting (web)
 */
export default function AnalyzePage() {
  const [activeTab, setActiveTab] = React.useState('analyze')
  const toast = useToast()

  const tabs = [
    { value: 'analyze', label: 'Analyze', icon: Brain },
    { value: 'rewrite', label: 'Rewrite', icon: Wand2 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Text Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Analyze your text for emotional insights or rewrite it with AI
        </p>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      <TabPanel value="analyze" activeTab={activeTab}>
        <AnalyzeTab toast={toast} />
      </TabPanel>

      <TabPanel value="rewrite" activeTab={activeTab}>
        <RewriteTab toast={toast} />
      </TabPanel>
    </div>
  )
}

/**
 * Analyze tab content
 */
function AnalyzeTab({ toast }) {
  const { analyze, result, isLoading, reset } = useAnalysis()
  const [copied, setCopied] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(analyzeTextSchema),
    defaultValues: { text: '' },
  })

  const textValue = watch('text')
  const charCount = textValue?.length || 0

  const onSubmit = async (data) => {
    try {
      await analyze(data.text)
      toast.success('Analysis Complete', 'Your text has been analyzed successfully.')
    } catch (error) {
      toast.error('Analysis Failed', error.message)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied!', 'Analysis copied to clipboard.')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Enter Your Text
          </CardTitle>
          <CardDescription>
            Type or paste the text you want to analyze
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField error={errors.text?.message}>
              <Textarea
                placeholder="Enter your text here... (e.g., 'I'm feeling excited about the new project, but also a bit nervous about the deadline.')"
                className="min-h-[200px] resize-none"
                {...register('text')}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{charCount} / 5000 characters</span>
                <span>Min: 10 characters</span>
              </div>
            </FormField>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1" loading={isLoading}>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze Text
              </Button>
              {result && (
                <Button type="button" variant="outline" onClick={reset}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Analysis Results
          </CardTitle>
          <CardDescription>
            Emotional insights from your text
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AnalysisResultSkeleton />
          ) : result ? (
            <AnalysisResult result={result} onCopy={copyToClipboard} copied={copied} />
          ) : (
            <EmptyResultState />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Analysis result display
 */
function AnalysisResult({ result, onCopy, copied }) {
  const sentiment = result.sentiment || result.sentiment_analysis
  const emotions = result.emotions || result.emotion_detection
  const personality = result.personality || result.personality_traits

  return (
    <div className="space-y-6">
      {/* Sentiment */}
      {sentiment && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Sentiment</h4>
          <div className="flex items-center gap-4">
            <div className={cn('text-3xl font-bold', getSentimentColor(sentiment.score || sentiment))}>
              {typeof sentiment.score === 'number' ? sentiment.score.toFixed(2) : sentiment.toFixed?.(2) || sentiment}
            </div>
            <div className="flex-1">
              <Progress
                value={((sentiment.score || sentiment) + 1) * 50}
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Negative</span>
                <span>Neutral</span>
                <span>Positive</span>
              </div>
            </div>
          </div>
          {sentiment.label && (
            <Badge variant={sentiment.score > 0 ? 'success' : sentiment.score < 0 ? 'destructive' : 'secondary'}>
              {sentiment.label}
            </Badge>
          )}
        </div>
      )}

      {/* Emotions */}
      {emotions && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Detected Emotions</h4>
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(emotions) ? emotions : Object.entries(emotions)).map((item, i) => {
              const emotion = Array.isArray(item) ? item[0] : item.emotion || item
              const score = Array.isArray(item) ? item[1] : item.score
              return (
                <Badge key={i} variant="outline" className="text-sm py-1 px-3">
                  {getEmotionEmoji(emotion)} {emotion}
                  {score && <span className="ml-1 text-muted-foreground">({(score * 100).toFixed(0)}%)</span>}
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {/* Personality Traits */}
      {personality && Object.keys(personality).length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Personality Traits</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(personality).slice(0, 6).map(([trait, score]) => (
              <div key={trait} className="flex items-center justify-between text-sm">
                <span className="capitalize">{trait.replace('_', ' ')}</span>
                <span className="text-muted-foreground">{typeof score === 'number' ? `${(score * 100).toFixed(0)}%` : score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Copy Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => onCopy(JSON.stringify(result, null, 2))}
      >
        {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
        {copied ? 'Copied!' : 'Copy Results'}
      </Button>
    </div>
  )
}

/**
 * Rewrite tab content
 */
function RewriteTab({ toast }) {
  const { rewrite, result, isLoading, reset } = useRewrite()
  const [copied, setCopied] = React.useState(false)
  const [style, setStyle] = React.useState('professional')

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: { text: '', context: '' },
  })

  const textValue = watch('text')
  const charCount = textValue?.length || 0

  const onSubmit = async (data) => {
    if (data.text.length < 10) {
      toast.error('Text too short', 'Please enter at least 10 characters.')
      return
    }
    try {
      await rewrite(data.text, style, data.context)
      toast.success('Rewrite Complete', 'Your text has been rewritten successfully.')
    } catch (error) {
      toast.error('Rewrite Failed', error.message)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied!', 'Rewritten text copied to clipboard.')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Text to Rewrite
          </CardTitle>
          <CardDescription>
            Enter your text and choose a style
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Your Text" error={errors.text?.message}>
              <Textarea
                placeholder="Enter the text you want to rewrite..."
                className="min-h-[150px] resize-none"
                {...register('text')}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{charCount} / 5000 characters</span>
              </div>
            </FormField>

            <FormField label="Writing Style">
              <Select
                options={styleOptions}
                value={style}
                onChange={setStyle}
                placeholder="Select a style"
              />
            </FormField>

            <FormField label="Context (Optional)">
              <Textarea
                placeholder="Add any context that might help (e.g., 'This is an email to my manager')"
                className="min-h-[80px] resize-none"
                {...register('context')}
              />
            </FormField>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1" loading={isLoading}>
                <Wand2 className="h-4 w-4 mr-2" />
                Rewrite Text
              </Button>
              {result && (
                <Button type="button" variant="outline" onClick={reset}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Rewritten Text
          </CardTitle>
          <CardDescription>
            AI-rewritten version of your text
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <RewriteResultSkeleton />
          ) : result ? (
            <RewriteResult result={result} onCopy={copyToClipboard} copied={copied} />
          ) : (
            <EmptyResultState icon={Wand2} text="Your rewritten text will appear here" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Rewrite result display
 */
function RewriteResult({ result, onCopy, copied }) {
  // Backend returns: { original, rewritten, highlighted_words, improvements, success, error }
  const rewrittenText = result.rewritten || result.rewritten_text || result.text || ''

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-muted/50 border">
        <p className="text-sm whitespace-pre-wrap">{rewrittenText}</p>
      </div>

      {result.improvements && result.improvements.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Improvements Made</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {result.improvements.map((improvement, i) => (
              <li key={i} className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
                {improvement}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.highlighted_words && result.highlighted_words.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Key Changes</h4>
          <div className="flex flex-wrap gap-2">
            {result.highlighted_words.map((word, i) => (
              <span key={i} className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary">
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => onCopy(rewrittenText)}
      >
        {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
        {copied ? 'Copied!' : 'Copy Text'}
      </Button>
    </div>
  )
}

/**
 * Empty result state
 */
function EmptyResultState({ icon: Icon = Sparkles, text = 'Your analysis results will appear here' }) {
  return (
    <div className="flex flex-col items-center justify-center h-[300px] text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground">{text}</p>
    </div>
  )
}

/**
 * Loading skeleton for analysis
 */
function AnalysisResultSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
    </div>
  )
}

/**
 * Loading skeleton for rewrite
 */
function RewriteResultSkeleton() {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  )
}
