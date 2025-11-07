import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { UserRole } from '@prisma/client'
import { redirect } from 'next/navigation'

/**
 * Get the current server session
 * Use this in server components and API routes
 */
export async function getSession() {
  return await getServerSession(authOptions)
}

/**
 * Get the current authenticated user
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const session = await getSession()
  return session?.user ?? null
}

/**
 * Require authentication
 * Redirects to login if not authenticated
 * Use this in server components that require authentication
 */
export async function requireAuth() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return session
}

/**
 * Require a specific role
 * Redirects to login if not authenticated
 * Redirects to appropriate dashboard if wrong role
 * Use this in server components that require specific roles
 */
export async function requireRole(allowedRoles: UserRole | UserRole[]) {
  const session = await requireAuth()
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

  if (!roles.includes(session.user.role)) {
    // Redirect to appropriate dashboard based on user's role
    const dashboardMap: Record<UserRole, string> = {
      STUDENT: '/student/dashboard',
      INSTRUCTOR: '/admin/dashboard',
      SUPERADMIN: '/superadmin/dashboard',
    }

    redirect(dashboardMap[session.user.role])
  }

  return session
}

/**
 * Check if user has a specific role
 * Returns boolean, doesn't redirect
 */
export async function hasRole(allowedRoles: UserRole | UserRole[]) {
  const user = await getCurrentUser()

  if (!user) return false

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  return roles.includes(user.role)
}

/**
 * Get role-based dashboard path
 */
export function getDashboardPath(role: UserRole): string {
  const dashboardMap: Record<UserRole, string> = {
    STUDENT: '/student/dashboard',
    INSTRUCTOR: '/admin/dashboard',
    SUPERADMIN: '/superadmin/dashboard',
  }

  return dashboardMap[role]
}
