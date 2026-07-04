import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        identifier: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const identifier = credentials.identifier.trim()
        const isEmail = identifier.includes('@')

        const user = isEmail
          ? await prisma.user.findUnique({ where: { email: identifier } })
          : await prisma.user.findUnique({ where: { username: identifier } })

        if (!user || !user.password) {
          throw new Error('Invalid credentials')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error('Invalid credentials')
        }

        return {
          id: user.id.toString(),
          email: user.email || '',
          name: user.username,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.email = user.email
        token.name = user.name
        token.roleCheckedAt = Date.now()
      }

      // Session revocation: re-verify the user against the DB every 15 min
      // so deleted users lose access and role changes propagate without
      // waiting out the 30-day JWT
      const ROLE_RECHECK_MS = 15 * 60 * 1000
      const lastChecked = (token.roleCheckedAt as number) || 0

      if (token.id && Date.now() - lastChecked > ROLE_RECHECK_MS) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: parseInt(token.id as string) },
            select: { role: true },
          })

          if (!dbUser) {
            // User deleted — flag the token; the session callback nulls it
            token.invalidated = true
            return token
          }

          token.role = dbUser.role
          token.roleCheckedAt = Date.now()
        } catch (error) {
          // DB hiccup: keep the existing token rather than logging everyone out
          console.error('[AUTH] Role re-check failed:', error)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token?.invalidated) {
        // User no longer exists — expire the session immediately
        return { ...session, user: undefined, expires: new Date(0).toISOString() } as any
      }
      if (token && session.user) {
        const user = session.user as any;
        user.id = token.id;
        user.role = token.role;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
      }
      return session;
    },
  },
  // Additional session configuration for production stability
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}
