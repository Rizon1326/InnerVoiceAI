import api, { setToken, removeToken, setStoredUser, removeStoredUser } from './api'

/**
 * Authentication service functions
 */
export const authService = {
  /**
   * Register a new user
   * @param {object} data - { username, email, password }
   * @returns {Promise} User data and token
   */
  register: async (data) => {
    const response = await api.post('/auth/register/', data)
    const { data: userData } = response.data
    
    // Extract user info from backend response
    const user = {
      id: userData.user_id,
      username: userData.username,
      email: userData.email,
    }
    const token = userData.token

    // Store credentials
    await setToken(token)
    await setStoredUser(user)

    return { token, user }
  },

  /**
   * Login user
   * @param {object} data - { username, password }
   * @returns {Promise} User data and token
   */
  login: async (data) => {
    const response = await api.post('/auth/login/', data)
    const { data: userData } = response.data
    
    // Extract user info from backend response
    const user = {
      id: userData.user_id,
      username: userData.username,
      email: userData.email,
    }
    const token = userData.token

    // Store credentials
    await setToken(token)
    await setStoredUser(user)

    return { token, user }
  },

  /**
   * Logout user
   * @returns {Promise}
   */
  logout: async () => {
    try {
      await api.post('/auth/logout/')
    } catch (error) {
      // Ignore logout errors
      console.warn('Logout API error:', error)
    } finally {
      // Always clear local storage
      await removeToken()
      await removeStoredUser()
    }
  },

  /**
   * Get user profile
   * @returns {Promise} User profile data
   */
  getProfile: async () => {
    const response = await api.get('/profile/')
    return response.data
  },

  /**
   * Get user metrics
   * @returns {Promise} User metrics data
   */
  getMetrics: async () => {
    const response = await api.get('/metrics/')
    return response.data
  },
}

export default authService
