import * as React from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { WEB_NAV_ITEMS } from '@/lib/config'
import { useAuth, useTheme, useBreakpoint } from '@/hooks'
import { Button, Avatar } from '@/components/common'
import {
  LayoutDashboard,
  Brain,
  History,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
} from 'lucide-react'

// Icon map for dynamic rendering
const iconMap = {
  LayoutDashboard,
  Brain,
  History,
  TrendingUp,
  Settings,
}

/**
 * Web application layout with sidebar navigation
 */
export default function WebLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const { isMobile, isTablet } = useBreakpoint()

  // Auto-collapse sidebar on mobile/tablet
  React.useEffect(() => {
    if (isMobile || isTablet) {
      setSidebarOpen(false)
    } else {
      setSidebarOpen(true)
    }
  }, [isMobile, isTablet])

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        isMobile={isMobile || isTablet}
        mobileMenuOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div
        className={cn(
          'flex flex-col transition-all duration-300',
          sidebarOpen && !isMobile && !isTablet ? 'lg:ml-64' : 'lg:ml-20'
        )}
      >
        {/* Top Navbar */}
        <Navbar
          onMenuClick={() => {
            if (isMobile || isTablet) {
              setMobileMenuOpen(true)
            } else {
              setSidebarOpen(!sidebarOpen)
            }
          }}
          sidebarOpen={sidebarOpen}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/**
 * Sidebar navigation component
 */
function Sidebar({ isOpen, isMobile, mobileMenuOpen, onClose }) {
  const location = useLocation()
  const { user, logout } = useAuth()

  const sidebarClasses = cn(
    'fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r transition-all duration-300',
    isMobile
      ? cn(
          'w-64 transform',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )
      : cn(isOpen ? 'w-64' : 'w-20')
  )

  return (
    <aside className={sidebarClasses}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        <Link to="/" className="flex items-center gap-3" onClick={onClose}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Brain className="h-6 w-6 text-primary-foreground" />
          </div>
          {(isOpen || mobileMenuOpen) && (
            <span className="text-lg font-bold">InnerVoice</span>
          )}
        </Link>
        {isMobile && mobileMenuOpen && (
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {WEB_NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon]
            const isActive = location.pathname === item.path

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {Icon && <Icon className="h-5 w-5 shrink-0" />}
                  {(isOpen || mobileMenuOpen) && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="border-t p-4">
        <div className={cn('flex items-center', isOpen || mobileMenuOpen ? 'gap-3' : 'justify-center')}>
          <Avatar name={user?.username} size="default" />
          {(isOpen || mobileMenuOpen) && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{user?.username}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          )}
          {(isOpen || mobileMenuOpen) && (
            <Button variant="ghost" size="icon-sm" onClick={logout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  )
}

/**
 * Top navigation bar component
 */
function Navbar({ onMenuClick, sidebarOpen }) {
  const { user, logout } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)
  const menuRef = React.useRef(null)

  // Close menu on click outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
          {resolvedTheme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="ghost"
            className="flex items-center gap-2"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <Avatar name={user?.username} size="sm" />
            <span className="hidden md:inline-block text-sm">{user?.username}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-md border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95">
              <div className="p-2">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.username}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <hr className="my-2" />
                <Link
                  to="/settings"
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    logout()
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
