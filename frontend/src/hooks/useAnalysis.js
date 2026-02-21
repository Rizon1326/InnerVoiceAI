import * as React from 'react'
import { analysisService } from '@/services'
import { LOADING_STATES } from '@/lib/constants'

/**
 * Hook for text analysis functionality
 */
export function useAnalysis() {
  const [status, setStatus] = React.useState(LOADING_STATES.IDLE)
  const [result, setResult] = React.useState(null)
  const [error, setError] = React.useState(null)

  const analyze = React.useCallback(async (text) => {
    setStatus(LOADING_STATES.LOADING)
    setError(null)
    try {
      const response = await analysisService.analyzeText({ text })
      // Backend returns { success: true, data: {...}, context_analysis: {...} }
      const data = response.data || response
      const contextAnalysis = response.context_analysis || null
      // Attach bangla_meta to the result object so the UI can display it
      const bangla_meta = response.bangla_meta || (contextAnalysis ? {
        script: contextAnalysis.detected_language_type,
        detected_slang: contextAnalysis.detected_slang,
        context_hint: contextAnalysis.context_hint,
      } : null)
      const enriched = {
        ...data,
        ...(bangla_meta ? { bangla_meta } : {}),
        ...(contextAnalysis ? { context_analysis: contextAnalysis } : {}),
      }
      setResult(enriched)
      setStatus(LOADING_STATES.SUCCESS)
      return enriched
    } catch (err) {
      setError(err.message)
      setStatus(LOADING_STATES.ERROR)
      throw err
    }
  }, [])

  const reset = React.useCallback(() => {
    setStatus(LOADING_STATES.IDLE)
    setResult(null)
    setError(null)
  }, [])

  return {
    analyze,
    result,
    isLoading: status === LOADING_STATES.LOADING,
    isSuccess: status === LOADING_STATES.SUCCESS,
    isError: status === LOADING_STATES.ERROR,
    error,
    reset,
  }
}

/**
 * Hook for text rewriting functionality
 */
export function useRewrite() {
  const [status, setStatus] = React.useState(LOADING_STATES.IDLE)
  const [result, setResult] = React.useState(null)
  const [error, setError] = React.useState(null)

  const rewrite = React.useCallback(async (text, style, context = '') => {
    setStatus(LOADING_STATES.LOADING)
    setError(null)
    try {
      const response = await analysisService.rewriteText({ text, style, context })
      // Backend returns { success: true, data: {...} }
      const data = response.data || response
      setResult(data)
      setStatus(LOADING_STATES.SUCCESS)
      return data
    } catch (err) {
      setError(err.message)
      setStatus(LOADING_STATES.ERROR)
      throw err
    }
  }, [])

  const reset = React.useCallback(() => {
    setStatus(LOADING_STATES.IDLE)
    setResult(null)
    setError(null)
  }, [])

  return {
    rewrite,
    result,
    isLoading: status === LOADING_STATES.LOADING,
    isSuccess: status === LOADING_STATES.SUCCESS,
    isError: status === LOADING_STATES.ERROR,
    error,
    reset,
  }
}

/**
 * Hook for fetching analysis history
 */
export function useHistory() {
  const [status, setStatus] = React.useState(LOADING_STATES.IDLE)
  const [history, setHistory] = React.useState([])
  const [error, setError] = React.useState(null)

  const fetchHistory = React.useCallback(async (params = {}) => {
    setStatus(LOADING_STATES.LOADING)
    setError(null)
    try {
      const response = await analysisService.getHistory(params)
      // Backend returns { success: true, data: [...] }
      const items = Array.isArray(response) ? response : (response.data || response.history || [])
      setHistory(items)
      setStatus(LOADING_STATES.SUCCESS)
      return items
    } catch (err) {
      setError(err.message)
      setStatus(LOADING_STATES.ERROR)
      throw err
    }
  }, [])

  React.useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return {
    history,
    isLoading: status === LOADING_STATES.LOADING,
    isError: status === LOADING_STATES.ERROR,
    error,
    refetch: fetchHistory,
  }
}

/**
 * Hook for user progress data
 */
export function useProgress() {
  const [status, setStatus] = React.useState(LOADING_STATES.IDLE)
  const [progress, setProgress] = React.useState(null)
  const [error, setError] = React.useState(null)

  const fetchProgress = React.useCallback(async () => {
    setStatus(LOADING_STATES.LOADING)
    setError(null)
    try {
      const response = await analysisService.getProgress()
      // Backend returns { success: true, data: {...} }
      const data = response.data || response
      setProgress(data)
      setStatus(LOADING_STATES.SUCCESS)
      return data
    } catch (err) {
      setError(err.message)
      setStatus(LOADING_STATES.ERROR)
      throw err
    }
  }, [])

  React.useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  return {
    progress,
    isLoading: status === LOADING_STATES.LOADING,
    isError: status === LOADING_STATES.ERROR,
    error,
    refetch: fetchProgress,
  }
}

/**
 * Hook for emotional trends
 */
export function useEmotionalTrends(period = 'week') {
  const [status, setStatus] = React.useState(LOADING_STATES.IDLE)
  const [trends, setTrends] = React.useState(null)
  const [error, setError] = React.useState(null)

  const fetchTrends = React.useCallback(async (p = period) => {
    setStatus(LOADING_STATES.LOADING)
    setError(null)
    try {
      const response = await analysisService.getEmotionalTrends({ period: p })
      // Backend returns { success: true, data: {...} }
      const data = response.data || response
      setTrends(data)
      setStatus(LOADING_STATES.SUCCESS)
      return data
    } catch (err) {
      setError(err.message)
      setStatus(LOADING_STATES.ERROR)
      throw err
    }
  }, [period])

  React.useEffect(() => {
    fetchTrends()
  }, [fetchTrends])

  return {
    trends,
    isLoading: status === LOADING_STATES.LOADING,
    isError: status === LOADING_STATES.ERROR,
    error,
    refetch: fetchTrends,
  }
}
