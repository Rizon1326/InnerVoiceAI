import * as React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '@/lib/validations'
import { useAuth } from '@/hooks'
import { useToast } from '@/components/common/Toast'
import { Button, Input, FormField, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/common'
import { Brain, ArrowRight } from 'lucide-react'

/**
 * Login page component (web)
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const toast = useToast()
  const [isLoading, setIsLoading] = React.useState(false)

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      await login(data)
      toast.success('Welcome back!', 'You have successfully logged in.')
      navigate('/')
    } catch (error) {
      toast.error('Login Failed', error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center lg:hidden mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Brain className="h-7 w-7 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome Back</h1>
        <p className="text-muted-foreground mt-2">
          Enter your credentials to access your account
        </p>
      </div>

      {/* Login Form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Username" error={errors.username?.message} required>
              <Input
                type="text"
                placeholder="Enter your username"
                error={errors.username}
                {...register('username')}
              />
            </FormField>

            <FormField label="Password" error={errors.password?.message} required>
              <Input
                type="password"
                placeholder="Enter your password"
                error={errors.password}
                {...register('password')}
              />
            </FormField>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded border-input" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" loading={isLoading}>
              Sign In
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sign up link */}
      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary font-medium hover:underline">
          Create one
        </Link>
      </p>

      {/* Demo credentials */}
      <div className="p-4 rounded-lg bg-muted/50 border">
        <p className="text-sm font-medium mb-2">Demo Credentials</p>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Username: <code className="bg-muted px-1 rounded">demo</code></p>
          <p>Password: <code className="bg-muted px-1 rounded">Demo1234</code></p>
        </div>
      </div>
    </div>
  )
}
