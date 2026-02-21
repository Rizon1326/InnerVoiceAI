import * as React from 'react'
import { authService, getStoredUser, setStoredUser } from '@/services'
import { LOADING_STATES } from '@/lib/constants'

// Auth Context
const AuthContext = React.createContext(null)

/**
 * Auth Provider component
 */
export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null)
  const [status, setStatus] = React.useState(LOADING_STATES.LOADING)
  const [error, setError] = React.useState(null)

  // Initialize auth state from storage
  React.useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = await getStoredUser()
        if (storedUser) {
          // Verify token is still valid by fetching profile
          try {
            const profile = await authService.getProfile()
            const userData = profile.data || profile.user || storedUser
            const user = {
              id: userData.id,
              username: userData.username,
              email: userData.email,
              avatar_url: userData.avatar_url || null,
            }
            await setStoredUser(user)
            setUser(user)
            setStatus(LOADING_STATES.SUCCESS)
          } catch {
            // Token invalid, clear storage
            await authService.logout()
            setUser(null)
            setStatus(LOADING_STATES.IDLE)
          }
        } else {
          setStatus(LOADING_STATES.IDLE)
        }
      } catch (err) {
        console.error('Auth init error:', err)
        setStatus(LOADING_STATES.IDLE)
      }
    }

    initAuth()
  }, [])

  // Login function
  const login = React.useCallback(async (credentials) => {
    setStatus(LOADING_STATES.LOADING)
    setError(null)
    try {
      const data = await authService.login(credentials)
      setUser(data.user)
      setStatus(LOADING_STATES.SUCCESS)
      return data
    } catch (err) {
      setError(err.message)
      setStatus(LOADING_STATES.ERROR)
      throw err
    }
  }, [])

  // Register function
  const register = React.useCallback(async (userData) => {
    setStatus(LOADING_STATES.LOADING)
    setError(null)
    try {
      const data = await authService.register(userData)
      setUser(data.user)
      setStatus(LOADING_STATES.SUCCESS)
      return data
    } catch (err) {
      setError(err.message)
      setStatus(LOADING_STATES.ERROR)
      throw err
    }
  }, [])

  // Logout function
  const logout = React.useCallback(async () => {
    setStatus(LOADING_STATES.LOADING)
    try {
      await authService.logout()
      setUser(null)
      setStatus(LOADING_STATES.IDLE)
    } catch (err) {
      console.error('Logout error:', err)
      setUser(null)
      setStatus(LOADING_STATES.IDLE)
    }
  }, [])

  // Refresh user data
  const refreshUser = React.useCallback(async () => {
    try {
      const profile = await authService.getProfile()
      const userData = profile.data || profile.user
      const user = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        avatar_url: userData.avatar_url || null,
      }
      await setStoredUser(user)
      setUser(user)
      return user
    } catch (err) {
      console.error('Refresh user error:', err)
      throw err
    }
  }, [])

  const value = React.useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading: status === LOADING_STATES.LOADING,
      error,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, status, error, login, register, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
