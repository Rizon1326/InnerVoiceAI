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
   * Update user profile (username / email)
   * @param {object} data - { username, email }
   * @returns {Promise} Updated user profile data
   */
  updateProfile: async (data) => {
    const response = await api.put('/profile/', data)
    const userData = response.data?.data
    if (userData) {
      const user = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        avatar_url: userData.avatar_url || null,
      }
      await setStoredUser(user)
    }
    return response.data
  },

  /**
   * Upload user avatar
   * @param {File} file - The image file to upload
   * @returns {Promise} { success, data: { avatar_url } }
   */
  uploadAvatar: async (file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    const response = await api.post('/profile/avatar/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  /**
   * Export all user data as JSON download
   * @returns {Promise} The exported data object
   */
  exportData: async () => {
    const response = await api.get('/profile/export/')
    return response.data
  },

  /**
   * Permanently delete user account
   * @param {string} password - User's current password for confirmation
   * @returns {Promise}
   */
  deleteAccount: async (password) => {
    const response = await api.delete('/profile/delete/', { data: { password } })
    // Clear local storage after deletion
    await removeToken()
    await removeStoredUser()
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
