/**
 * NextAuth configuration and utilities
 */

import { NextAuthOptions, getServerSession as nextGetServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user.password) {
          throw new Error('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};

/**
 * Get server session
 */
export function getServerSession() {
  return nextGetServerSession(authOptions);
}

/**
 * Require authentication
 * Throws an error if user is not authenticated
 */
export async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error('Unauthorized');
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

  const user = await prisma.user.findUnique({
    where: {
      id: (session.user as any).id,
    },
  });

  return user;
}
