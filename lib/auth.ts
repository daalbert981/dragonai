/**
 * NextAuth configuration and utilities
 */

import { getServerSession as nextGetServerSession } from 'next-auth';
import { authOptions } from './auth-options';
import { prisma } from './prisma';

// Define UserRole enum locally since it's not in Prisma schema
export enum UserRole {
  STUDENT = 'STUDENT',
  INSTRUCTOR = 'INSTRUCTOR',
  SUPERADMIN = 'SUPERADMIN',
}

// Export the authOptions from auth-options.ts
export { authOptions };

/**
 * Get server session with error handling
 */
export async function getServerSession() {
  try {
    return await nextGetServerSession(authOptions);
  } catch (error) {
    console.error('[AUTH] Session error:', error);
    return null;
  }
}

/**
 * Require authentication
 * Throws an error if user is not authenticated or session is invalid
 */
export async function requireAuth() {
  const session = await getServerSession();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Validate that user has an ID
  const userId = (session.user as any).id;
  if (!userId || isNaN(parseInt(userId))) {
    console.error('[AUTH] Invalid user ID in session:', userId);
    throw new Error('Invalid session');
  }

  return session;
}

/**
 * Require specific role
 * Throws an error if user doesn't have the required role
 */
export async function requireRole(role: UserRole) {
  const session = await requireAuth();
  const userRole = (session.user as any).role;

  if (userRole !== role && userRole !== UserRole.SUPERADMIN) {
    throw new Error('Forbidden: Insufficient permissions');
  }

  return session;
}

/**
 * Check if user has role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const session = await getServerSession();
  if (!session?.user) return false;

  const userRole = (session.user as any).role;
  return userRole === role || userRole === UserRole.SUPERADMIN;
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const session = await getServerSession();
  if (!session?.user) {
    return null;
  }

  const userId = parseInt((session.user as any).id);
  if (isNaN(userId)) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  return user;
}
