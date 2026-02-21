import api from './api'

/**
 * Analysis service functions for text processing
 */
export const analysisService = {
  /**
   * Analyze text for sentiment, emotion, and personality
   * @param {object} data - { text }
   * @returns {Promise} Analysis results
   */
  analyzeText: async (data) => {
    const response = await api.post('/analyze/', data)
    return response.data
  },

  /**
   * Rewrite text with specified style
   * @param {object} data - { text, style, context? }
   * @returns {Promise} Rewritten text
   */
  rewriteText: async (data) => {
    const response = await api.post('/rewrite/', data)
    return response.data
  },

  /**
   * Get analysis history
   * @param {object} params - { page?, limit?, date_from?, date_to? }
   * @returns {Promise} History items
   */
  getHistory: async (params = {}) => {
    const response = await api.get('/history/', { params })
    return response.data
  },

  /**
   * Get user progress data
   * @returns {Promise} Progress statistics
   */
  getProgress: async () => {
    const response = await api.get('/progress/')
    return response.data
  },

  /**
   * Get emotional trends over time
   * @param {object} params - { period?: 'week' | 'month' | 'year' }
   * @returns {Promise} Trend data
   */
  getEmotionalTrends: async (params = {}) => {
    const response = await api.get('/progress/trends/', { params })
    return response.data
  },

  /**
   * Get behavioral analytics for the authenticated user
   * @param {object} params - { days?: number }
   * @returns {Promise} Full behavioral analytics payload
   */
  getBehavioralAnalytics: async (params = {}) => {
    const response = await api.get('/progress/behavioral-analytics/', { params })
    return response.data
  },

  /**
   * Get public statistics
   * @returns {Promise} Project statistics
   */
  getStatistics: async () => {
    const response = await api.get('/statistics/')
    return response.data
  },

  /**
   * Health check endpoint
   * @returns {Promise} Health status
   */
  healthCheck: async () => {
    const response = await api.get('/health/')
    return response.data
  },
}

export default analysisService
