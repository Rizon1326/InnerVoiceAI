import * as React from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
// import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks'
import { Button } from '@/components/common'
import { Brain, Sun, Moon } from 'lucide-react'

/**
 * Auth layout for login/register pages (web)
 */
export default function AuthLayout() {
  const { resolvedTheme, toggleTheme } = useTheme()
  const location = useLocation()
  const isLogin = location.pathname === '/login'

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-primary-foreground">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur mb-8">
            <Brain className="h-12 w-12" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-center">InnerVoice AI</h1>
          <p className="text-xl text-center opacity-90 max-w-md">
            Understand your emotions, improve your communication, and track your emotional growth over time.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-8 opacity-80">
            <div className="text-center">
              <div className="text-3xl font-bold">AI</div>
              <div className="text-sm">Powered Analysis</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-sm">Always Available</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm">Private & Secure</div>
            </div>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold">InnerVoice</span>
          </Link>
          <div className="flex items-center gap-4 ml-auto">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {resolvedTheme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <Link to={isLogin ? '/register' : '/login'}>
              <Button variant="outline">
                {isLogin ? 'Create Account' : 'Sign In'}
              </Button>
            </Link>
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 InnerVoice AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
