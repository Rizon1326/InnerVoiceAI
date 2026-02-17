import * as React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, ThemeProvider } from '@/context'
import { ToastProvider } from '@/components/common/Toast'
import { useAuth } from '@/hooks'
import { isExtension } from '@/lib/config'
import { Loading } from '@/components/common'

// Layouts
import { WebLayout, AuthLayout, ExtensionLayout } from '@/layouts'

// Web Pages (lazy loaded)
const LoginPage = React.lazy(() => import('@/pages/web/LoginPage'))
const RegisterPage = React.lazy(() => import('@/pages/web/RegisterPage'))
const DashboardPage = React.lazy(() => import('@/pages/web/DashboardPage'))
const AnalyzePage = React.lazy(() => import('@/pages/web/AnalyzePage'))
const RewritePage = React.lazy(() => import('@/pages/web/RewritePage'))
const HistoryPage = React.lazy(() => import('@/pages/web/HistoryPage'))
const ProgressPage = React.lazy(() => import('@/pages/web/ProgressPage'))
const SettingsPage = React.lazy(() => import('@/pages/web/SettingsPage'))

// Extension Pages
const ExtensionAnalyze = React.lazy(() => import('@/pages/extension/ExtensionAnalyze'))
const ExtensionHistory = React.lazy(() => import('@/pages/extension/ExtensionHistory'))

/**
 * Protected route wrapper
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

/**
 * Public route wrapper (redirects to home if already authenticated)
 */
function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading..." />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}

/**
 * Web application with routing
 */
function WebApp() {
  return (
    <BrowserRouter>
      <React.Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Loading size="lg" text="Loading..." />
          </div>
        }
      >
        <Routes>
          {/* Public routes */}
          <Route
            element={
              <PublicRoute>
                <AuthLayout />
              </PublicRoute>
            }
          >
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <WebLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/analyze" element={<AnalyzePage />} />
            <Route path="/rewrite" element={<RewritePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  )
}

/**
 * Extension popup application
 */
function ExtensionApp() {
  const [activeTab, setActiveTab] = React.useState('analyze')

  return (
    <React.Suspense
      fallback={
        <div className="w-[400px] h-[600px] flex items-center justify-center">
          <Loading size="lg" />
        </div>
      }
    >
      <ExtensionLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'analyze' && <ExtensionAnalyze />}
        {activeTab === 'history' && <ExtensionHistory />}
      </ExtensionLayout>
    </React.Suspense>
  )
}

/**
 * Main App component
 */
export default function App() {
  const isExtensionMode = isExtension()

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          {isExtensionMode ? <ExtensionApp /> : <WebApp />}
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

