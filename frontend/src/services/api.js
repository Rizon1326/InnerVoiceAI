import axios from 'axios'
import { API_CONFIG, AUTH_CONFIG, isExtension } from '@/lib/config'

/**
 * Axios instance with interceptors for auth and error handling
 */
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Get auth token from storage (supports both web and extension)
 */
const getToken = async () => {
  if (isExtension()) {
    return new Promise((resolve) => {
      chrome.storage.sync.get([AUTH_CONFIG.TOKEN_KEY], (result) => {
        resolve(result[AUTH_CONFIG.TOKEN_KEY] || null)
      })
    })
  }
  const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY)
  return (token && token !== 'undefined' && token !== 'null') ? token : null
}

/**
 * Set auth token in storage
 */
export const setToken = async (token) => {
  if (isExtension()) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [AUTH_CONFIG.TOKEN_KEY]: token }, resolve)
    })
  }
  localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token)
}

/**
 * Remove auth token from storage
 */
export const removeToken = async () => {
  if (isExtension()) {
    return new Promise((resolve) => {
      chrome.storage.sync.remove([AUTH_CONFIG.TOKEN_KEY], resolve)
    })
  }
  localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY)
}

/**
 * Get user data from storage
 */
export const getStoredUser = async () => {
  if (isExtension()) {
    return new Promise((resolve) => {
      chrome.storage.sync.get([AUTH_CONFIG.USER_KEY], (result) => {
        resolve(result[AUTH_CONFIG.USER_KEY] || null)
      })
    })
  }
  const user = localStorage.getItem(AUTH_CONFIG.USER_KEY)
  if (!user || user === 'undefined' || user === 'null') {
    return null
  }
  try {
    return JSON.parse(user)
  } catch {
    return null
  }
}

/**
 * Set user data in storage
 */
export const setStoredUser = async (user) => {
  if (isExtension()) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [AUTH_CONFIG.USER_KEY]: user }, resolve)
    })
  }
  localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user))
}

/**
 * Remove user data from storage
 */
export const removeStoredUser = async () => {
  if (isExtension()) {
    return new Promise((resolve) => {
      chrome.storage.sync.remove([AUTH_CONFIG.USER_KEY], resolve)
    })
  }
  localStorage.removeItem(AUTH_CONFIG.USER_KEY)
}

// Request interceptor - Add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await getToken()
    if (token) {
      config.headers.Authorization = `Token ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      // Clear stored credentials
      await removeToken()
      await removeStoredUser()
      // Redirect to login (web only)
      if (!isExtension() && typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }

    // Extract error message
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      'An unexpected error occurred'

    return Promise.reject(new Error(message))
  }
)

export default api
