'use client'

import { Suspense, useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/types'
import { APP_VERSION, APP_COPYRIGHT } from '@/lib/version'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')
  const registered = searchParams.get('registered')

  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginInput) => {
    try {
      setIsLoading(true)
      setError('')

      const result = await signIn('credentials', {
        identifier: data.identifier,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid credentials')
        return
      }

      if (!result?.ok) {
        setError('Authentication failed. Please try again.')
        return
      }

      // If there's an explicit callback URL, use it; otherwise route by role
      if (callbackUrl) {
        router.push(callbackUrl)
      } else {
        const session = await getSession()
        const role = (session?.user as any)?.role
        const dashboards: Record<string, string> = {
          STUDENT: '/student',
          INSTRUCTOR: '/admin',
          SUPERADMIN: '/superadmin',
        }
        router.push(dashboards[role] || '/student')
      }
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-6 sm:mb-8 text-center">
          <svg viewBox="0 0 32 32" className="mx-auto mb-4 h-12 w-12" aria-hidden="true">
            <rect width="32" height="32" rx="7" className="fill-foreground dark:fill-[#111113]" />
            <path d="M9 23 L16 7 L23 23 L16 19 Z" className="fill-background dark:fill-[#FFC600]" />
          </svg>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Dragon AI</h1>
          <p className="mt-2 text-muted-foreground">
            Your AI-powered teaching assistant
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Success Message (after registration) */}
              {registered && (
                <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Account created successfully. Please sign in.</span>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Identifier Field (Email or Username) */}
              <div className="space-y-2">
                <Label htmlFor="identifier">Email or Username</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="Email or username"
                  {...register('identifier')}
                  disabled={isLoading}
                />
                {errors.identifier && (
                  <p className="text-sm text-red-600">{errors.identifier.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Have a registration token?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {APP_COPYRIGHT} &middot; v{APP_VERSION} &middot;{' '}
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
        </p>
      </div>
    </div>
  )
}
