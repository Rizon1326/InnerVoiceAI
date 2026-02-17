import * as React from 'react'
import { THEME_CONFIG, isExtension } from '@/lib/config'

// Theme Context
const ThemeContext = React.createContext(null)

/**
 * Get stored theme preference
 */
const getStoredTheme = async () => {
  if (isExtension()) {
    return new Promise((resolve) => {
      chrome.storage.sync.get([THEME_CONFIG.STORAGE_KEY], (result) => {
        resolve(result[THEME_CONFIG.STORAGE_KEY] || THEME_CONFIG.DEFAULT)
      })
    })
  }
  return localStorage.getItem(THEME_CONFIG.STORAGE_KEY) || THEME_CONFIG.DEFAULT
}

/**
 * Set stored theme preference
 */
const setStoredTheme = async (theme) => {
  if (isExtension()) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [THEME_CONFIG.STORAGE_KEY]: theme }, resolve)
    })
  }
  localStorage.setItem(THEME_CONFIG.STORAGE_KEY, theme)
}

/**
 * Get system theme preference
 */
const getSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

/**
 * Theme Provider component
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = React.useState('system')
  const [resolvedTheme, setResolvedTheme] = React.useState('light')

  // Initialize theme from storage
  React.useEffect(() => {
    const initTheme = async () => {
      const storedTheme = await getStoredTheme()
      setThemeState(storedTheme)
    }
    initTheme()
  }, [])

  // Update resolved theme when theme or system preference changes
  React.useEffect(() => {
    const updateResolvedTheme = () => {
      const resolved = theme === 'system' ? getSystemTheme() : theme
      setResolvedTheme(resolved)

      // Apply to document
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('light', 'dark')
        document.documentElement.classList.add(resolved)
      }
    }

    updateResolvedTheme()

    // Listen for system theme changes
    if (theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => updateResolvedTheme()
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    }
  }, [theme])

  // Set theme function
  const setTheme = React.useCallback(async (newTheme) => {
    setThemeState(newTheme)
    await setStoredTheme(newTheme)
  }, [])

  // Toggle theme
  const toggleTheme = React.useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }, [resolvedTheme, setTheme])

  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
      isDark: resolvedTheme === 'dark',
    }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Hook to use theme context
 */
export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export default ThemeContext
