import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'

// Define public routes that don't require authentication
const publicRoutes = ['/', '/login', '/register']

// Define role-based route mappings
const roleRoutes: Record<string, UserRole[]> = {
  '/student': [UserRole.STUDENT],
  '/admin': [UserRole.INSTRUCTOR],
  '/superadmin': [UserRole.SUPERADMIN],
}

// Define dashboard paths for each role
const dashboardPaths: Record<UserRole, string> = {
  STUDENT: '/student/dashboard',
  INSTRUCTOR: '/admin/dashboard',
  SUPERADMIN: '/superadmin/dashboard',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get the token from the request
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const isAuthenticated = !!token
  const userRole = token?.role as UserRole | undefined

  // Allow access to public routes
  if (publicRoutes.includes(pathname)) {
    // If authenticated user tries to access login/register, redirect to dashboard
    if (isAuthenticated && userRole && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(
        new URL(dashboardPaths[userRole], request.url)
      )
    }
    return NextResponse.next()
  }

  // Protect all other routes - require authentication
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check role-based access
  for (const [routePrefix, allowedRoles] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(routePrefix)) {
      if (!userRole || !allowedRoles.includes(userRole)) {
        // Redirect to user's appropriate dashboard
        if (userRole) {
          return NextResponse.redirect(
            new URL(dashboardPaths[userRole], request.url)
          )
        }
        // Fallback to login if role is undefined
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }
  }

  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - api routes (except auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
