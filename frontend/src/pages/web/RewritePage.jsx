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
  RewriteResult,
  RewriteResultSkeleton,
} from '@/components/rewrite'
import { Wand2, ArrowLeft, RefreshCw, FileText, Sparkles, Copy, Check, MessageSquarePlus, Send, X } from 'lucide-react'

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
  // If arriving without text, start in editing mode so the user can type freely
  const [editedText, setEditedText] = React.useState(originalText)
  const [isEditing, setIsEditing] = React.useState(!originalText)
  // eslint-disable-next-line no-unused-vars
  const [replacementHistory, setReplacementHistory] = React.useState([])
  
  // Custom rewrite instruction from user
  const [customInstruction, setCustomInstruction] = React.useState('')
  // Sync edited text with original (only when originalText changes externally)
  React.useEffect(() => {
    setEditedText(originalText)
    setReplacementHistory([])
    // If text was set externally (e.g. from Analyze page), exit editing mode
    if (originalText) {
      setIsEditing(false)
    }
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
        custom_instruction: customInstruction.trim() || undefined,
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
   * Handle rewrite with custom instruction only (no goal needed)
   */
  const handleCustomRewrite = async () => {
    if (!editedText || editedText.length < 10) {
      toast.error('Text too short', 'Please enter at least 10 characters.')
      return
    }
    if (!customInstruction.trim()) {
      toast.error('No instruction', 'Please write how you want the text rewritten.')
      return
    }

    setSelectedGoal('custom')
    setIsRewriting(true)
    clearRewrite()

    try {
      const response = await analysisService.rewriteText({
        text: editedText,
        goal: 'custom',
        style: 'custom',
        custom_instruction: customInstruction.trim(),
      })

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
   * Handle word replacement from HighlightedText suggestions
   */
  const handleWordReplace = (originalWord, replacement, startIndex, endIndex) => {
    // Replace the word in the text
    const beforeWord = editedText.slice(0, startIndex)
    const afterWord = editedText.slice(endIndex)
    const newText = beforeWord + replacement + afterWord
    
    setEditedText(newText)
    setOriginalText(newText)
    setReplacementHistory(prev => [...prev, { original: originalWord, replacement, timestamp: Date.now() }])
    
    // Clear rewrite result since text changed
    clearRewrite()
    
    toast.success('Word Replaced', `"${originalWord}" → "${replacement}"`)
  }

  /**
   * Toggle edit mode
   */
  const toggleEditMode = () => {
    if (!isEditing) {
      setIsEditing(true)
    }
  }

  /**
   * Save edited text
   */
  const saveEditedText = () => {
    if (editedText && editedText.trim().length > 0) {
      setOriginalText(editedText)
      setIsEditing(false)
      clearRewrite()
    }
  }

  /**
   * Cancel editing and revert to original text
   */
  const cancelEditing = () => {
    setEditedText(originalText)
    // If there was no original text, stay in editing mode
    if (originalText) {
      setIsEditing(false)
    }
  }

  // State for copy button of original text
  const [copiedOriginal, setCopiedOriginal] = React.useState(false)

  /**
   * Copy original text to clipboard
   */
  const handleCopyOriginal = () => {
    navigator.clipboard.writeText(editedText)
    setCopiedOriginal(true)
    setTimeout(() => setCopiedOriginal(false), 2000)
    toast.success('Copied!', 'Original text copied to clipboard.')
  }

  // hasText is true when text has been committed (saved) - controls showing improvement goals
  const hasText = originalText && originalText.length > 0
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
              {isEditing ? (
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
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelEditing}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveEditedText} disabled={!editedText || editedText.trim().length === 0}>
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <HighlightedText
                    text={editedText}
                    flaggedWords={flaggedWords}
                    emotions={emotions}
                    onWordReplace={handleWordReplace}
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyOriginal}
                      className="gap-2 text-muted-foreground"
                    >
                      {copiedOriginal ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy Text
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom Rewrite Instruction */}
          {hasText && !isEditing && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquarePlus className="h-4 w-4 text-primary" />
                  Custom Rewrite Instruction
                </CardTitle>
                <CardDescription className="text-xs">
                  Tell the AI how you want your text rewritten — in English, Bangla, or Banglish
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="relative">
                    <Textarea
                      value={customInstruction}
                      onChange={(e) => setCustomInstruction(e.target.value)}
                      placeholder='e.g. "increase sadness", "make it formal", "sadness komau", "আরও ইতিবাচক করো"...'
                      className="min-h-[80px] resize-none pr-10 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && customInstruction.trim()) {
                          handleCustomRewrite()
                        }
                      }}
                    />
                    {customInstruction && (
                      <button
                        onClick={() => setCustomInstruction('')}
                        className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Clear instruction"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Increase sadness', value: 'increase sadness' },
                      { label: 'আরও ইতিবাচক', value: 'আরও ইতিবাচক করো' },
                      { label: 'Make formal', value: 'make it more formal and professional' },
                      { label: 'Sadness komau', value: 'sadness komau' },
                    ].map((chip) => (
                      <button
                        key={chip.value}
                        onClick={() => setCustomInstruction(chip.value)}
                        className="px-2.5 py-1 text-[11px] rounded-full border border-border bg-card hover:bg-primary/10 hover:border-primary/30 text-muted-foreground hover:text-primary transition-all"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                  <Button
                    onClick={handleCustomRewrite}
                    disabled={!customInstruction.trim() || isRewriting}
                    className="w-full gap-2"
                    size="sm"
                  >
                    {isRewriting && selectedGoal === 'custom' ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Rewriting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Rewrite with This Instruction
                      </>
                    )}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Press <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px]">Ctrl</kbd> + <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px]">Enter</kbd> to send · Or pick an improvement goal on the right
                  </p>
                </div>
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
          {!hasText && !isEditing && (
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

          {/* Hint when user is typing but hasn't saved yet */}
          {!hasText && isEditing && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-primary/50" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Enter Your Text</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Type or paste your text, then click <strong>Save Changes</strong> to see rewrite options
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
