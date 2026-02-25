import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * HighlightedText Component
 * Displays text with emotional/problematic words highlighted in red
 * Clicking on highlighted words shows alternative suggestions (Grammarly-like)
 * 
 * @param {string} text - Original text to display
 * @param {Array} flaggedWords - Words/phrases to highlight with reasons and alternatives
 * @param {Object} emotions - Emotion scores from analysis
 * @param {function} onWordReplace - Callback when a word is replaced with an alternative
 */
export function HighlightedText({ 
  text, 
  flaggedWords = [], 
  emotions = {}, 
  className,
  onWordReplace 
}) {
  const [activeWord, setActiveWord] = React.useState(null)
  const [popoverPosition, setPopoverPosition] = React.useState({ x: 0, y: 0 })
  const containerRef = React.useRef(null)

  // Build list of words to highlight based on emotions and flaggedWords
  const highlightPatterns = React.useMemo(() => {
    const patterns = []
    const addedWords = new Set()
    
    // Add specific flagged words from backend/analysis
    flaggedWords.forEach(item => {
      if (item.word && !addedWords.has(item.word.toLowerCase())) {
        patterns.push({
          pattern: item.word,
          reason: item.reason || 'Flagged for review',
          emotion: item.emotion || item.category || 'flagged',
          score: item.score || 0,
          alternatives: item.alternatives || [],
          start: item.start,
          end: item.end,
        })
        addedWords.add(item.word.toLowerCase())
      }
    })

    // Common negative words to highlight with alternatives
    const negativeIndicators = [
      { 
        words: ['hate', 'hated', 'hating'], 
        emotion: 'anger',
        alternatives: ['dislike', 'am not fond of', 'prefer not to']
      },
      { 
        words: ['awful', 'terrible', 'horrible'], 
        emotion: 'negativity',
        alternatives: ['challenging', 'difficult', 'not ideal']
      },
      { 
        words: ['sad', 'depressed', 'unhappy', 'miserable', 'hopeless'], 
        emotion: 'sadness',
        alternatives: ['reflective', 'going through a tough time', 'processing']
      },
      { 
        words: ['scared', 'afraid', 'anxious', 'worried', 'terrified'], 
        emotion: 'fear',
        alternatives: ['cautious', 'mindful', 'thoughtful about']
      },
      { 
        words: ['angry', 'furious', 'rage', 'mad'], 
        emotion: 'anger',
        alternatives: ['frustrated', 'concerned', 'disappointed']
      },
      { 
        words: ['stupid', 'idiot', 'dumb', 'ridiculous', 'pathetic'], 
        emotion: 'aggression',
        alternatives: ['unclear', 'confusing', 'could be better']
      },
      { 
        words: ['failed', 'failure', 'useless', 'worthless'], 
        emotion: 'negativity',
        alternatives: ['learned from', 'experienced challenges', 'needs improvement']
      },
      { 
        words: ['annoyed', 'frustrated', 'irritated'], 
        emotion: 'aggression',
        alternatives: ['concerned', 'noticing', 'working through']
      },
    ]

    // Detect negative emotions and add corresponding words
    const negativeEmotions = {
      sadness: emotions.sadness || 0,
      anger: emotions.anger || 0,
      fear: emotions.fear || 0,
    }

    negativeIndicators.forEach(({ words, emotion, alternatives }) => {
      const shouldHighlight = 
        negativeEmotions[emotion] > 0.2 || 
        emotion === 'aggression' || 
        emotion === 'negativity'
      
      if (shouldHighlight) {
        words.forEach(word => {
          if (text.toLowerCase().includes(word) && !addedWords.has(word.toLowerCase())) {
            patterns.push({
              pattern: word,
              reason: getReasonForEmotion(emotion),
              emotion,
              score: negativeEmotions[emotion] || 0.5,
              alternatives: alternatives,
            })
            addedWords.add(word.toLowerCase())
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
        alternatives: matchedPattern?.alternatives || [],
        startIndex: match.index,
        endIndex: regex.lastIndex,
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

  const handleWordClick = (e, segment) => {
    e.stopPropagation()
    
    if (!segment.alternatives || segment.alternatives.length === 0) {
      return
    }

    const rect = e.target.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
    
    setPopoverPosition({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.bottom - containerRect.top + 8,
    })
    setActiveWord(activeWord === segment ? null : segment)
  }

  const handleAlternativeSelect = (segment, alternative) => {
    if (onWordReplace) {
      onWordReplace(segment.text, alternative, segment.startIndex, segment.endIndex)
    }
    setActiveWord(null)
  }

  // Close popover when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setActiveWord(null)
    if (activeWord) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [activeWord])

  // Count only the words that are actually highlighted in the text
  const actualHighlightCount = React.useMemo(() => {
    return segments.filter(s => s.isHighlighted).length
  }, [segments])

  const hasHighlights = actualHighlightCount > 0

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <div className="p-4 rounded-lg border bg-card text-sm leading-relaxed whitespace-pre-wrap">
        {segments.map((segment, index) => (
          segment.isHighlighted ? (
            <span
              key={index}
              onClick={(e) => handleWordClick(e, segment)}
              className={cn(
                'px-1 py-0.5 rounded transition-all duration-200 cursor-pointer',
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                'hover:bg-red-200 dark:hover:bg-red-900/50',
                'border-b-2 border-red-400 dark:border-red-500',
                activeWord === segment && 'ring-2 ring-red-400 bg-red-200 dark:bg-red-900/60'
              )}
              title={`Click for suggestions: ${segment.reason}`}
            >
              {segment.text}
            </span>
          ) : (
            <span key={index}>{segment.text}</span>
          )
        ))}
      </div>

      {/* Alternatives Popover */}
      {activeWord && activeWord.alternatives && activeWord.alternatives.length > 0 && (
        <div
          className={cn(
            'absolute z-50 min-w-[200px] max-w-[300px] rounded-lg shadow-xl',
            'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
            'animate-in fade-in-0 zoom-in-95 duration-150'
          )}
          style={{
            left: `${popoverPosition.x}px`,
            top: `${popoverPosition.y}px`,
            transform: 'translateX(-50%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-t-lg">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {activeWord.emotion.charAt(0).toUpperCase() + activeWord.emotion.slice(1)}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {activeWord.reason}
            </p>
          </div>

          {/* Alternatives */}
          <div className="p-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 px-2 mb-2 font-semibold">
              Replace with
            </p>
            <div className="space-y-1">
              {activeWord.alternatives.map((alt, i) => (
                <button
                  key={i}
                  onClick={() => handleAlternativeSelect(activeWord, alt)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm transition-all',
                    'hover:bg-green-50 dark:hover:bg-green-900/20',
                    'hover:text-green-700 dark:hover:text-green-400',
                    'flex items-center gap-2 group'
                  )}
                >
                  <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                    <span className="text-[10px] text-green-600 dark:text-green-400 font-bold">
                      {i + 1}
                    </span>
                  </span>
                  <span className="flex-1">{alt}</span>
                  <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to replace
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div 
            className="absolute -top-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-b-white dark:border-b-gray-800"
            style={{ filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.1))' }}
          />
        </div>
      )}

      {/* Legend */}
      {hasHighlights && (
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-red-100 dark:bg-red-900/30 border-b-2 border-red-400" />
            <span>Click highlighted words for suggestions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex w-4 h-4 rounded-full bg-red-500/20 items-center justify-center text-[10px]">
              {actualHighlightCount}
            </span>
            <span>words highlighted</span>
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
