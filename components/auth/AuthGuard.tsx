'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ReactNode, useEffect } from 'react'
import { UserRole } from '@prisma/client'

interface AuthGuardProps {
  children: ReactNode
  allowedRoles?: UserRole[]
  fallbackUrl?: string
}

/**
 * Client-side authentication guard component
 * Redirects unauthenticated users to login
 * Optionally checks for specific roles
 */
export function AuthGuard({
  children,
  allowedRoles,
  fallbackUrl = '/login',
}: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    // Redirect to login if not authenticated
    if (!session) {
      router.push(fallbackUrl)
      return
    }

    // Check role if allowedRoles is specified
    if (allowedRoles && !allowedRoles.includes(session.user.role)) {
      // Redirect to appropriate dashboard based on user's role
      const dashboardMap: Record<UserRole, string> = {
        STUDENT: '/student/dashboard',
        INSTRUCTOR: '/admin/dashboard',
        SUPERADMIN: '/superadmin/dashboard',
      }

      router.push(dashboardMap[session.user.role])
    }
  }, [session, status, allowedRoles, fallbackUrl, router])

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  // Don't render children if not authenticated or wrong role
  if (!session) return null

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return null
  }

  return <>{children}</>
}
