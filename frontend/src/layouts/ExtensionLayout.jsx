import * as React from 'react'
import { cn } from '@/lib/utils'
import { EXTENSION_NAV_ITEMS } from '@/lib/config'
import { useAuth, useTheme } from '@/hooks'
import { Button, Avatar } from '@/components/common'
import { Brain, History, Settings, Sun, Moon, LogOut, User } from 'lucide-react'

// Icon map for dynamic rendering
const iconMap = {
  Brain,
  History,
  Settings,
}

/**
 * Chrome Extension popup layout (400x600)
 */
export default function ExtensionLayout({ children, activeTab, onTabChange }) {
  const { user, logout, isAuthenticated } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const [showSettings, setShowSettings] = React.useState(false)

  if (!isAuthenticated) {
    return <ExtensionAuthView />
  }

  return (
    <div className="flex flex-col w-[400px] h-[600px] bg-background overflow-hidden">
      {/* Compact Header */}
      <ExtensionHeader
        user={user}
        resolvedTheme={resolvedTheme}
        toggleTheme={toggleTheme}
        onLogout={logout}
        onSettingsClick={() => setShowSettings(!showSettings)}
      />

      {/* Settings Panel (slides over content) */}
      {showSettings ? (
        <ExtensionSettings onClose={() => setShowSettings(false)} />
      ) : (
        <>
          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-3">{children}</main>

          {/* Bottom Navigation */}
          <ExtensionBottomNav activeTab={activeTab} onTabChange={onTabChange} />
        </>
      )}
    </div>
  )
}

/**
 * Extension header component with user info and actions
 */
function ExtensionHeader({ user, resolvedTheme, toggleTheme, onLogout, onSettingsClick }) {
  return (
    <header className="flex items-center justify-between px-3 py-2 border-b bg-card/50 backdrop-blur h-12 shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <Brain className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold">InnerVoice</span>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={toggleTheme} title="Toggle theme">
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onSettingsClick} title="Settings">
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onLogout} title="Logout">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

/**
 * Extension bottom navigation
 */
function ExtensionBottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="flex items-center justify-around border-t bg-card/50 backdrop-blur h-14 shrink-0">
      {EXTENSION_NAV_ITEMS.map((item) => {
        const Icon = iconMap[item.icon]
        const isActive = activeTab === item.path

        return (
          <button
            key={item.path}
            onClick={() => onTabChange(item.path)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[60px]',
              isActive
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            {Icon && <Icon className="h-5 w-5" />}
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

/**
 * Extension settings panel
 */
function ExtensionSettings({ onClose }) {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Settings</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Back
        </Button>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-card border mb-4">
        <Avatar name={user?.username} size="default" />
        <div>
          <p className="text-sm font-medium">{user?.username}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* Theme Setting */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Appearance</h3>
        <div className="grid grid-cols-3 gap-2">
          {['light', 'dark', 'system'].map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                'px-3 py-2 text-sm rounded-md border transition-colors capitalize',
                theme === t
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input hover:bg-accent'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Auth view for unauthenticated users in extension
 */
function ExtensionAuthView() {
  const [mode, setMode] = React.useState('login') // 'login' | 'register'

  return (
    <div className="flex flex-col w-[400px] h-[600px] bg-background">
      {/* Header */}
      <div className="flex flex-col items-center pt-8 pb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary mb-3">
          <Brain className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold">InnerVoice AI</h1>
        <p className="text-sm text-muted-foreground">Understand your emotions better</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex mx-4 mb-4 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setMode('login')}
          className={cn(
            'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
            mode === 'login' ? 'bg-background shadow-sm' : 'text-muted-foreground'
          )}
        >
          Login
        </button>
        <button
          onClick={() => setMode('register')}
          className={cn(
            'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
            mode === 'register' ? 'bg-background shadow-sm' : 'text-muted-foreground'
          )}
        >
          Register
        </button>
      </div>

      {/* Form Content - Will be replaced by actual forms */}
      <div className="flex-1 px-4 overflow-y-auto">
        {mode === 'login' ? (
          <ExtensionLoginForm />
        ) : (
          <ExtensionRegisterForm />
        )}
      </div>
    </div>
  )
}

/**
 * Extension login form (compact)
 */
function ExtensionLoginForm() {
  const { login } = useAuth()
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ username, password })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-2 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full h-10 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Enter username"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full h-10 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Enter password"
          required
        />
      </div>
      <Button type="submit" className="w-full" loading={loading}>
        Login
      </Button>
    </form>
  )
}

/**
 * Extension register form (compact)
 */
function ExtensionRegisterForm() {
  const { register } = useAuth()
  const [formData, setFormData] = React.useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="p-2 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>
      )}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Username</label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Choose a username"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Create a password"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Confirm Password</label>
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Confirm password"
          required
        />
      </div>
      <Button type="submit" className="w-full" loading={loading}>
        Create Account
      </Button>
    </form>
  )
}
