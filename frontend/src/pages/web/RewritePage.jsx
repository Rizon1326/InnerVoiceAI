import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAnalysisStore } from '@/stores'
import { analysisService } from '@/services'
import { useToast } from '@/components/common/Toast'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Textarea,
} from '@/components/common'
import {
  HighlightedText,
  RewriteOptions,
  SuggestionCards,
  RewriteResult,
  RewriteResultSkeleton,
} from '@/components/rewrite'
import { Wand2, ArrowLeft, RefreshCw, FileText, Sparkles } from 'lucide-react'

/**
 * Dedicated Rewrite Page
 * Uses global state to prefill text from Analysis page
 */
export default function RewritePage() {
  const toast = useToast()
  const navigate = useNavigate()

  // Global state
  const {
    originalText,
    setOriginalText,
    analysisResult,
    flaggedWords,
    rewriteResult,
    setRewriteResult,
    selectedGoal,
    setSelectedGoal,
    isRewriting,
    setIsRewriting,
    clearRewrite,
  } = useAnalysisStore()

  // Local state for text editing
  const [editedText, setEditedText] = React.useState(originalText)
  const [isEditing, setIsEditing] = React.useState(false)

  // Sync edited text with original
  React.useEffect(() => {
    setEditedText(originalText)
  }, [originalText])

  // Extract emotions for suggestions
  const emotions = React.useMemo(() => {
    if (!analysisResult) return {}
    const analysis = analysisResult.analysis || analysisResult
    return analysis.emotions || {}
  }, [analysisResult])

  /**
   * Handle rewrite request
   */
  const handleRewrite = async (goalId) => {
    if (!editedText || editedText.length < 10) {
      toast.error('Text too short', 'Please enter at least 10 characters.')
      return
    }

    setSelectedGoal(goalId)
    setIsRewriting(true)
    clearRewrite()

    try {
      const response = await analysisService.rewriteText({
        text: editedText,
        goal: goalId,
        style: goalId, // Backend may use style or goal
      })

      // Extract data from response
      const data = response.data || response
      setRewriteResult(data)
      toast.success('Rewrite Complete', 'Your text has been transformed!')
    } catch (error) {
      console.error('Rewrite error:', error)
      toast.error('Rewrite Failed', error.message || 'Please try again.')
    } finally {
      setIsRewriting(false)
    }
  }

  /**
   * Handle try another goal
   */
  const handleTryAnother = () => {
    clearRewrite()
    setSelectedGoal(null)
  }

  /**
   * Handle copy success
   */
  const handleCopySuccess = () => {
    toast.success('Copied!', 'Rewritten text copied to clipboard.')
  }

  /**
   * Send rewritten text to Analyze page and navigate there
   */
  const handleAnalyzeRewrittenText = (rewrittenText) => {
    setOriginalText(rewrittenText)
    clearRewrite()
    navigate('/analyze')
  }

  /**
   * Toggle edit mode
   */
  const toggleEditMode = () => {
    setIsEditing(!isEditing)
  }

  /**
   * Save edited text
   */
  const saveEditedText = () => {
    setOriginalText(editedText)
    setIsEditing(false)
    clearRewrite()
  }

  const hasText = editedText && editedText.length > 0
  const hasAnalysis = analysisResult !== null

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/analyze">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-blue-400 hover:bg-blue-400/10 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Analyze
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
              <Wand2 className="h-5 w-5 text-white" />
            </div>
            AI Text Rewriter
          </h1>
          <p className="text-muted-foreground mt-1">
            Transform your text based on emotional and personality analysis
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Original Text */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Original Text
                  </CardTitle>
                  <CardDescription>
                    {hasAnalysis
                      ? 'Emotional words are highlighted based on your analysis'
                      : 'Enter or paste the text you want to rewrite'}
                  </CardDescription>
                </div>
                {hasText && !isEditing && (
                  <Button variant="ghost" size="sm" onClick={toggleEditMode}>
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing || !hasText ? (
                <div className="space-y-4">
                  <Textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    placeholder="Enter or paste your text here... This text will be analyzed and rewritten based on your selected improvement goal."
                    className="min-h-[200px] resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {editedText.length} characters
                    </span>
                    {isEditing && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveEditedText}>
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <HighlightedText
                  text={editedText}
                  flaggedWords={flaggedWords}
                  emotions={emotions}
                />
              )}
            </CardContent>
          </Card>

          {/* Quick Suggestions */}
          {hasText && !rewriteResult && (
            <Card>
              <CardContent className="pt-6">
                <SuggestionCards
                  emotions={emotions}
                  onSelect={handleRewrite}
                  loadingGoal={isRewriting ? selectedGoal : null}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Rewrite Options & Result */}
        <div className="space-y-4">
          {/* Rewrite Options */}
          {hasText && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Improvement Goals
                </CardTitle>
                <CardDescription>
                  Choose how you want to transform your text
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RewriteOptions
                  selectedGoal={selectedGoal}
                  onSelect={handleRewrite}
                  isLoading={isRewriting}
                  emotions={emotions}
                />
              </CardContent>
            </Card>
          )}

          {/* Rewrite Result */}
          {(isRewriting || rewriteResult) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-primary" />
                  Rewritten Text
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isRewriting ? (
                  <RewriteResultSkeleton selectedGoal={selectedGoal} />
                ) : (
                  <RewriteResult
                    result={rewriteResult}
                    selectedGoal={selectedGoal}
                    onCopy={handleCopySuccess}
                    onTryAnother={handleTryAnother}
                    onAnalyzeThis={handleAnalyzeRewrittenText}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!hasText && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Wand2 className="h-8 w-8 text-primary/50" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Text to Rewrite</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Analyze some text first, or paste text directly here
                  </p>
                  <Link to="/analyze">
                    <Button variant="outline" className="gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Go to Analysis
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
