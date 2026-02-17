import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * HighlightedText Component
 * Displays text with emotional words highlighted based on analysis
 * 
 * @param {string} text - Original text to display
 * @param {Array} flaggedWords - Words/phrases to highlight with reasons
 * @param {Object} emotions - Emotion scores from analysis
 */
export function HighlightedText({ text, flaggedWords = [], emotions = {}, className }) {
  const [hoveredWord, setHoveredWord] = React.useState(null)
  const [tooltipPosition, setTooltipPosition] = React.useState({ x: 0, y: 0 })

  // Build list of words to highlight based on emotions
  const highlightPatterns = React.useMemo(() => {
    const patterns = []
    
    // Add specific flagged words
    flaggedWords.forEach(item => {
      if (item.word) {
        patterns.push({
          pattern: item.word,
          reason: item.reason,
          emotion: item.emotion,
          score: item.score,
        })
      }
    })

    // Detect negative emotion intensity for overall highlighting
    const negativeEmotions = {
      sadness: emotions.sadness || 0,
      anger: emotions.anger || 0,
      fear: emotions.fear || 0,
    }

    // Common negative words to highlight (sample - backend should provide)
    const negativeIndicators = [
      { words: ['hate', 'hated', 'hating', 'awful', 'terrible', 'horrible'], emotion: 'anger' },
      { words: ['sad', 'depressed', 'unhappy', 'miserable', 'hopeless', 'crying'], emotion: 'sadness' },
      { words: ['scared', 'afraid', 'anxious', 'worried', 'terrified', 'panic'], emotion: 'fear' },
      { words: ['angry', 'furious', 'rage', 'mad', 'annoyed', 'frustrated'], emotion: 'anger' },
      { words: ['stupid', 'idiot', 'dumb', 'ridiculous', 'pathetic'], emotion: 'aggression' },
    ]

    negativeIndicators.forEach(({ words, emotion }) => {
      if (negativeEmotions[emotion] > 0.2 || emotion === 'aggression') {
        words.forEach(word => {
          if (text.toLowerCase().includes(word)) {
            patterns.push({
              pattern: word,
              reason: getReasonForEmotion(emotion),
              emotion,
              score: negativeEmotions[emotion] || 0.5,
            })
          }
        })
      }
    })

    return patterns
  }, [text, flaggedWords, emotions])

  // Create highlighted text segments
  const segments = React.useMemo(() => {
    if (!text || highlightPatterns.length === 0) {
      return [{ text, isHighlighted: false }]
    }

    // Build regex from patterns
    const patternWords = highlightPatterns.map(p => escapeRegex(p.pattern))
    if (patternWords.length === 0) {
      return [{ text, isHighlighted: false }]
    }

    const regex = new RegExp(`\\b(${patternWords.join('|')})\\b`, 'gi')
    const parts = []
    let lastIndex = 0
    let match

    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push({
          text: text.slice(lastIndex, match.index),
          isHighlighted: false,
        })
      }

      // Find matching pattern for this word
      const matchedPattern = highlightPatterns.find(
        p => p.pattern.toLowerCase() === match[0].toLowerCase()
      )

      // Add highlighted word
      parts.push({
        text: match[0],
        isHighlighted: true,
        reason: matchedPattern?.reason || 'Flagged for review',
        emotion: matchedPattern?.emotion || 'unknown',
        score: matchedPattern?.score || 0,
      })

      lastIndex = regex.lastIndex
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        text: text.slice(lastIndex),
        isHighlighted: false,
      })
    }

    return parts.length > 0 ? parts : [{ text, isHighlighted: false }]
  }, [text, highlightPatterns])

  const handleMouseEnter = (e, segment) => {
    const rect = e.target.getBoundingClientRect()
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    })
    setHoveredWord(segment)
  }

  const handleMouseLeave = () => {
    setHoveredWord(null)
  }

  return (
    <div className={cn('relative', className)}>
      <div className="p-4 rounded-lg border bg-card text-sm leading-relaxed whitespace-pre-wrap">
        {segments.map((segment, index) => (
          segment.isHighlighted ? (
            <span
              key={index}
              className={cn(
                'px-1 py-0.5 rounded cursor-help transition-all duration-200',
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                'hover:bg-red-200 dark:hover:bg-red-900/50',
                hoveredWord === segment && 'ring-2 ring-red-400'
              )}
              onMouseEnter={(e) => handleMouseEnter(e, segment)}
              onMouseLeave={handleMouseLeave}
            >
              {segment.text}
            </span>
          ) : (
            <span key={index}>{segment.text}</span>
          )
        ))}
      </div>

      {/* Tooltip */}
      {hoveredWord && (
        <div
          className={cn(
            'fixed z-50 px-3 py-2 rounded-lg shadow-lg',
            'bg-gray-900 text-white text-xs max-w-xs',
            'transform -translate-x-1/2 -translate-y-full',
            'animate-in fade-in-0 zoom-in-95 duration-150'
          )}
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-red-400 font-semibold capitalize">
              {hoveredWord.emotion}
            </span>
            {hoveredWord.score > 0 && (
              <span className="text-gray-400">
                ({(hoveredWord.score * 100).toFixed(0)}%)
              </span>
            )}
          </div>
          <p className="text-gray-300">{hoveredWord.reason}</p>
          <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}

      {/* Legend */}
      {highlightPatterns.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-red-100 dark:bg-red-900/30" />
            <span>Highlighted words indicate detected emotions</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Get human readable reason for emotion
 */
function getReasonForEmotion(emotion) {
  const reasons = {
    sadness: 'This word conveys sadness - consider a more hopeful alternative',
    anger: 'This word conveys anger - consider softening the tone',
    fear: 'This word conveys fear/anxiety - consider more reassuring language',
    aggression: 'This word may seem aggressive - consider a more diplomatic phrase',
    negativity: 'This word has negative connotations - consider a neutral alternative',
  }
  return reasons[emotion] || 'This word was flagged for review'
}

export default HighlightedText
