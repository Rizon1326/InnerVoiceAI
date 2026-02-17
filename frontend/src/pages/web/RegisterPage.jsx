import * as React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema } from '@/lib/validations'
import { useAuth } from '@/hooks'
import { useToast } from '@/components/common/Toast'
import { Button, Input, FormField, Card, CardContent } from '@/components/common'
import { Brain, ArrowRight, Check } from 'lucide-react'

/**
 * Registration page component (web)
 */
export default function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser, isAuthenticated } = useAuth()
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
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const password = watch('password')

  // Password strength indicators
  const passwordChecks = [
    { label: 'At least 8 characters', valid: password?.length >= 8 },
    { label: 'Contains lowercase letter', valid: /[a-z]/.test(password || '') },
    { label: 'Contains uppercase letter', valid: /[A-Z]/.test(password || '') },
    { label: 'Contains a number', valid: /[0-9]/.test(password || '') },
  ]

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      await registerUser({
        username: data.username,
        email: data.email,
        password: data.password,
      })
      toast.success('Account Created!', 'Welcome to InnerVoice AI. Let\'s get started!')
      navigate('/')
    } catch (error) {
      toast.error('Registration Failed', error.message)
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
        <h1 className="text-2xl font-bold tracking-tight">Create Your Account</h1>
        <p className="text-muted-foreground mt-2">
          Start your journey to better emotional awareness
        </p>
      </div>

      {/* Registration Form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Username" error={errors.username?.message} required>
              <Input
                type="text"
                placeholder="Choose a username"
                error={errors.username}
                {...register('username')}
              />
            </FormField>

            <FormField label="Email" error={errors.email?.message} required>
              <Input
                type="email"
                placeholder="you@example.com"
                error={errors.email}
                {...register('email')}
              />
            </FormField>

            <FormField label="Password" error={errors.password?.message} required>
              <Input
                type="password"
                placeholder="Create a strong password"
                error={errors.password}
                {...register('password')}
              />
              {/* Password strength checklist */}
              {password && (
                <div className="mt-2 space-y-1">
                  {passwordChecks.map((check, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 text-xs ${
                        check.valid ? 'text-green-600' : 'text-muted-foreground'
                      }`}
                    >
                      <Check className={`h-3 w-3 ${check.valid ? 'opacity-100' : 'opacity-30'}`} />
                      {check.label}
                    </div>
                  ))}
                </div>
              )}
            </FormField>

            <FormField label="Confirm Password" error={errors.confirmPassword?.message} required>
              <Input
                type="password"
                placeholder="Confirm your password"
                error={errors.confirmPassword}
                {...register('confirmPassword')}
              />
            </FormField>

            <div className="flex items-start gap-2">
              <input type="checkbox" className="mt-1 rounded border-input" required />
              <span className="text-sm text-muted-foreground">
                I agree to the{' '}
                <Link to="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </div>

            <Button type="submit" className="w-full" loading={isLoading}>
              Create Account
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Login link */}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
