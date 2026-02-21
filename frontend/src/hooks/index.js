// Export all hooks
export { useAuth } from '@/context/AuthContext'
export { useTheme } from '@/context/ThemeContext'
export { useAnalysis, useRewrite, useHistory, useProgress, useEmotionalTrends, useBehavioralAnalytics } from './useAnalysis'
export {
  useDebounce,
  useLocalStorage,
  useMediaQuery,
  useBreakpoint,
  useClickOutside,
  useKeyPress,
  usePrevious,
  useMounted,
} from './useUtils'
