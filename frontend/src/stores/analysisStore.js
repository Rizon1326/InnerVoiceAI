import { create } from 'zustand'

/**
 * Global store for analysis state sharing between pages
 * Enables text sync between Analysis and Rewrite pages
 */
export const useAnalysisStore = create((set, get) => ({
  // Original text being analyzed
  originalText: '',
  
  // Analysis results from backend
  analysisResult: null,
  
  // Detected emotional words to highlight
  flaggedWords: [],
  
  // Loading states
  isAnalyzing: false,
  isRewriting: false,
  
  // Rewrite result
  rewriteResult: null,
  
  // Selected improvement goal
  selectedGoal: null,
  
  // Actions
  setOriginalText: (text) => set({ originalText: text }),
  
  setAnalysisResult: (result) => {
    // Extract flagged words from analysis
    const flaggedWords = extractFlaggedWords(result)
    set({ analysisResult: result, flaggedWords })
  },
  
  setRewriteResult: (result) => {
    // Also extract flagged words from rewrite result if available
    const currentState = get()
    let updatedFlaggedWords = [...(currentState.flaggedWords || [])]
    
    // Merge highlighted_words from rewrite result
    if (result?.highlighted_words) {
      const existingWords = new Set(updatedFlaggedWords.map(w => w.word?.toLowerCase()))
      result.highlighted_words.forEach(hw => {
        if (hw.word && !existingWords.has(hw.word.toLowerCase())) {
          updatedFlaggedWords.push({
            word: hw.word,
            reason: hw.reason,
            alternatives: hw.alternatives || [],
            category: hw.category || 'flagged',
            emotion: hw.category || 'flagged',
          })
        }
      })
    }
    
    set({ rewriteResult: result, flaggedWords: updatedFlaggedWords })
  },
  
  setSelectedGoal: (goal) => set({ selectedGoal: goal }),
  
  setIsAnalyzing: (loading) => set({ isAnalyzing: loading }),
  
  setIsRewriting: (loading) => set({ isRewriting: loading }),
  
  // Clear rewrite state
  clearRewrite: () => set({ rewriteResult: null, selectedGoal: null }),
  
  // Reset all state
  reset: () => set({
    originalText: '',
    analysisResult: null,
    flaggedWords: [],
    isAnalyzing: false,
    isRewriting: false,
    rewriteResult: null,
    selectedGoal: null,
  }),
}))

/**
 * Extract words that should be flagged based on emotional analysis
 */
function extractFlaggedWords(result) {
  if (!result) return []
  
  const analysis = result.analysis || result
  const emotions = analysis.emotions || {}
  const sentiment = analysis.sentiment || {}
  
  const flaggedWords = []
  
  // Check for negative emotions with high scores
  const negativeEmotions = ['sadness', 'anger', 'fear']
  negativeEmotions.forEach(emotion => {
    if (emotions[emotion] > 0.3) {
      flaggedWords.push({
        emotion,
        score: emotions[emotion],
        reason: getEmotionReason(emotion, emotions[emotion]),
      })
    }
  })
  
  // Check for negative sentiment
  if (sentiment.score < -0.2) {
    flaggedWords.push({
      emotion: 'negativity',
      score: Math.abs(sentiment.score),
      reason: 'This text has a negative tone overall',
    })
  }
  
  // If backend provides highlighted_words, use them
  if (result.highlighted_words) {
    result.highlighted_words.forEach(word => {
      flaggedWords.push({
        word,
        emotion: 'flagged',
        reason: 'Flagged by sentiment analysis',
      })
    })
  }
  
  return flaggedWords
}

/**
 * Get human-readable reason for emotion flagging
 */
function getEmotionReason(emotion, score) {
  const percentage = (score * 100).toFixed(0)
  const reasons = {
    sadness: `Detected sadness (${percentage}%) - Consider a more uplifting tone`,
    anger: `Detected anger (${percentage}%) - Consider softening the language`,
    fear: `Detected fear/anxiety (${percentage}%) - Consider more reassuring words`,
    aggression: `Detected aggressive tone (${percentage}%) - Consider more diplomatic phrasing`,
  }
  return reasons[emotion] || `Emotional intensity: ${percentage}%`
}

// Improvement goal options
export const IMPROVEMENT_GOALS = [
  {
    id: 'increase_openness',
    label: 'Increase Openness',
    description: 'Make the text more creative and open-minded',
    icon: '🎨',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    id: 'decrease_openness',
    label: 'Decrease Openness',
    description: 'Make the text more focused and conventional',
    icon: '🎯',
    color: 'from-slate-500 to-gray-500',
  },
  {
    id: 'reduce_aggression',
    label: 'Reduce Aggressiveness',
    description: 'Soften aggressive or confrontational language',
    icon: '🕊️',
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'reduce_sadness',
    label: 'Reduce Sadness',
    description: 'Transform melancholic tone to hopeful',
    icon: '☀️',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    id: 'more_positive',
    label: 'Make More Positive',
    description: 'Increase overall positivity and optimism',
    icon: '😊',
    color: 'from-pink-500 to-rose-500',
  },
  {
    id: 'more_professional',
    label: 'Make Professional',
    description: 'Polish for business/formal contexts',
    icon: '💼',
    color: 'from-blue-500 to-cyan-500',
  },
]

export default useAnalysisStore
