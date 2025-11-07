# Dragon AI - Key Code Snippets & Current Implementation

## 1. Database Schema (Minimal)

**File:** `/home/user/dragonai/prisma/schema.prisma`

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User model for authentication
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  password      String?
  role          UserRole  @default(STUDENT)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations will be added as features are developed
}

enum UserRole {
  STUDENT
  ADMIN
  SUPERADMIN
}
```

**Analysis:**
- Only User model exists
- Password field included but authentication not implemented
- Comment indicates relations will be added for documents, assignments, etc.
- NEED: Document, ProcessingJob, DocumentContent models

---

## 2. API Route Example

**File:** `/home/user/dragonai/app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Dragon AI API'
  })
}
```

**Analysis:**
- Shows proper Next.js 14 API route structure (route.ts)
- Uses NextResponse for JSON responses
- Simple GET-only endpoint
- Good template for additional endpoints

---

## 3. Prisma Client Singleton

**File:** `/home/user/dragonai/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Analysis:**
- Proper singleton pattern to avoid multiple Prisma instances
- Prevents connection exhaustion in development with hot reloading
- Ready to use in API routes and server components
- Import pattern: `import { prisma } from '@/lib/prisma'`

---

## 4. Type Definitions

**File:** `/home/user/dragonai/types/index.ts`

```typescript
// Global type definitions for Dragon AI

export type UserRole = 'STUDENT' | 'ADMIN' | 'SUPERADMIN'

export interface User {
  id: string
  name: string | null
  email: string
  emailVerified: Date | null
  image: string | null
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

// Add more type definitions as the project grows
```

**Analysis:**
- Centralized type definitions
- User type matches Prisma schema
- Comment indicates place for future types
- NEED: Document, ProcessingJob, DocumentContent types

---

## 5. Utility Functions

**File:** `/home/user/dragonai/lib/utils.ts`

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Analysis:**
- Helper for combining Tailwind classes without conflicts
- Use pattern: `className={cn("base-class", condition && "conditional-class")}`
- Can be extended with additional utilities

---

## 6. Root Layout

**File:** `/home/user/dragonai/app/layout.tsx`

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dragon AI - AI Teaching Assistant Platform',
  description: 'An AI-powered teaching assistant platform for university instructors',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

**Analysis:**
- Next.js 14 App Router layout
- Metadata configuration (SEO)
- Inter font loaded from Google Fonts
- Global CSS imported
- NEED: Add NextAuth provider, theme provider, React Query provider here

---

## 7. Page Structure Examples

**Home Page:** `/home/user/dragonai/app/page.tsx`
```typescript
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to Dragon AI
        </h1>
        <p className="text-xl text-muted-foreground">
          AI Teaching Assistant Platform for University Instructors
        </p>
      </div>
    </main>
  )
}
```

**Student Dashboard:** `/home/user/dragonai/app/student/page.tsx`
```typescript
export default function StudentDashboard() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Student Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome to your student dashboard. Features will be implemented here.
      </p>
    </div>
  )
}
```

**Analysis:**
- Simple placeholder pages
- Proper Tailwind CSS utility usage
- Server components (no 'use client' directive)
- Ready for content implementation

---

## 8. Next.js Configuration

**File:** `/home/user/dragonai/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
    ],
  },
}

module.exports = nextConfig
```

**Analysis:**
- Allows images from Vercel Blob storage
- Can be extended for other image sources
- ENHANCEMENT: Add file size limits, caching policies, image optimization

---

## 9. Tailwind Configuration

**File:** `/home/user/dragonai/tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... more colors
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
```

**Analysis:**
- Full CSS variables support for theming
- Dark mode enabled
- shadcn/ui animations included
- Responsive design pre-configured
- Ready for custom color schemes

---

## 10. Component Configuration

**File:** `/home/user/dragonai/components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

**Analysis:**
- shadcn/ui configured for React Server Components (rsc: true)
- Components go in @/components directory
- Utilities go in @/lib/utils
- Ready to add components with: `npx shadcn-ui@latest add [name]`

---

## 11. TypeScript Configuration

**File:** `/home/user/dragonai/tsconfig.json`

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Analysis:**
- Path alias configured: `@/*` maps to root directory
- Strict mode enabled for type safety
- Next.js plugin configured
- Uses JSX preserve (Next.js handles JSX)

---

## 12. Environment Variables

**File:** `/home/user/dragonai/.env.example`

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/dragonai?schema=public"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key-here"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token-here"
```

**Analysis:**
- All necessary environment variables defined
- Database connection string for PostgreSQL
- NextAuth configuration keys
- OpenAI API key for LLM integration
- Vercel Blob token for file storage
- ENHANCEMENT: Add document processing config variables (file size limits, allowed types, etc)

---

## Proposed Structure for Document Processing

### New Prisma Models (To Be Added)

```prisma
model Document {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  filename      String
  originalName  String
  fileSize      Int
  mimeType      String
  
  blobUrl       String    @unique
  status        DocumentStatus @default(PENDING)
  
  content       DocumentContent?
  processingJob ProcessingJob?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([userId])
  @@index([status])
}

model DocumentContent {
  id            String    @id @default(cuid())
  documentId    String    @unique
  document      Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  extractedText String    @db.Text
  metadata      String?   @db.Text  // JSON string with document metadata
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model ProcessingJob {
  id            String    @id @default(cuid())
  documentId    String    @unique
  document      Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  status        JobStatus @default(PENDING)
  progress      Int       @default(0)
  
  errorMessage  String?
  startedAt     DateTime?
  completedAt   DateTime?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum DocumentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum JobStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  RETRYING
}
```

---

## Summary of Implementation Gaps

| Area | Current State | Needed |
|------|---------------|--------|
| Database | User model only | Document, DocumentContent, ProcessingJob models |
| API Routes | /api/health only | /api/documents/* endpoints (upload, list, process, etc) |
| Components | Empty directories | Upload, List, Preview, Status components |
| Authentication | next-auth installed, not configured | Authentication middleware |
| File Handling | Vercel Blob configured | Upload service, validation, storage logic |
| Processing | OpenAI client available | Document parsing, extraction, processing service |

