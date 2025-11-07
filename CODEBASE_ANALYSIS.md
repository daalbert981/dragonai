# Dragon AI - Codebase Analysis & Document Processing Integration Guide

## Executive Summary

Dragon AI is a Next.js 14 based AI-powered teaching assistant platform with a modern tech stack. The project is in early stage development with a clean, modular structure ready for feature implementation. Currently, there is **no existing file upload or document handling infrastructure**, making it a greenfield opportunity for implementing a comprehensive document processing pipeline.

---

## 1. PROJECT STRUCTURE OVERVIEW

### Directory Layout
```
dragonai/
├── app/                          # Next.js App Router (main application)
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   │   └── page.tsx          # Login page (stub)
│   │   └── register/
│   │       └── page.tsx          # Registration page (stub)
│   ├── admin/
│   │   └── page.tsx              # Admin dashboard (stub)
│   ├── student/
│   │   └── page.tsx              # Student dashboard (stub)
│   ├── superadmin/
│   │   └── page.tsx              # Superadmin dashboard (stub)
│   ├── api/                      # API routes
│   │   └── health/
│   │       └── route.ts          # Health check endpoint
│   ├── globals.css               # Global Tailwind styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components (.gitkeep - empty)
│   └── shared/                   # Shared components (.gitkeep - empty)
├── lib/
│   ├── prisma.ts                 # Prisma client singleton
│   └── utils.ts                  # Utility functions (cn() for Tailwind)
├── types/
│   └── index.ts                  # TypeScript type definitions
├── prisma/
│   └── schema.prisma             # Database schema
├── public/                       # Static assets (MISSING - needs creation)
└── config files                  # tsconfig.json, next.config.js, etc.
```

### Frontend/Backend Organization

**Frontend (Colocated with Backend):**
- Next.js App Router handles all UI rendering
- Components organized in `/components` (currently empty with .gitkeep files)
- Pages organized in `/app` directory
- Styling via Tailwind CSS with shadcn/ui components

**Backend (API Routes):**
- API routes in `/app/api/` directory
- Currently only has a health check endpoint
- Full Next.js API route support available
- Prisma ORM for database interactions

**Database:**
- PostgreSQL with Prisma ORM
- Schema defined in `/prisma/schema.prisma`
- Migrations in `/prisma/migrations/` (not yet created)

---

## 2. TECH STACK & DEPENDENCIES

### Core Framework
- **Next.js 14.0.4** - React framework with App Router, API routes, server components
- **React 18.2.0** - UI library
- **TypeScript 5.3.3** - Type safety

### Database & ORM
- **PostgreSQL** - Database (via connection string in env)
- **Prisma 5.7.1** - ORM for database operations
- **@prisma/client 5.7.1** - Prisma runtime client

### Authentication
- **next-auth 4.24.5** - Authentication middleware (not yet configured)
- **JWT support** - Via NextAuth.js

### UI & Styling
- **Tailwind CSS 3.4.0** - Utility-first CSS framework
- **shadcn/ui** - Pre-configured but no components added yet
  - Radix UI primitives:
    - @radix-ui/react-avatar
    - @radix-ui/react-dialog
    - @radix-ui/react-dropdown-menu
    - @radix-ui/react-label
    - @radix-ui/react-select
    - @radix-ui/react-slot
- **Lucide React 0.294.0** - Icon library

### File Storage & AI
- **@vercel/blob 0.15.1** - Cloud file storage integration (pre-configured)
- **openai 4.20.1** - OpenAI API client for AI features

### State Management & Data Fetching
- **Zustand 4.4.7** - Lightweight state management
- **@tanstack/react-query 5.14.2** - Data fetching & caching

### Forms & Validation
- **react-hook-form 7.49.2** - Form state management
- **zod 3.22.4** - Schema validation library

### Utilities
- **clsx 2.0.0** - Conditional CSS class management
- **tailwind-merge 2.1.0** - Merge Tailwind classes without conflicts

---

## 3. CURRENT DATABASE MODEL

### User Model (Only Model Currently)
```prisma
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

### Key Observations
- **Minimal schema** - Only User model defined
- **No file/document models** - Needs to be created
- **No relationships** - Ready for expansion
- **Password field present** - Basic auth setup planned
- **Role-based system** - Three-tier role system (STUDENT, ADMIN, SUPERADMIN)

---

## 4. API ROUTES & CURRENT ENDPOINTS

### Existing Routes

**GET /api/health**
- Location: `/home/user/dragonai/app/api/health/route.ts`
- Purpose: Health check endpoint
- Returns: `{ status: 'ok', timestamp: ISO_STRING, service: 'Dragon AI API' }`
- Current Usage: Can verify API is running

### API Architecture Notes
- Using Next.js 14 App Router convention (route.ts files)
- Supports both GET and POST (only GET implemented so far)
- Ready for middleware, authentication, and additional routes
- No existing authentication middleware

---

## 5. FRONTEND COMPONENTS & UI

### Current Component Status

**Existing Pages (Stubs):**
1. **Home Page** (`/app/page.tsx`)
   - Simple welcome message
   - "Welcome to Dragon AI"
   - Placeholder text

2. **Authentication Pages** (Group route: `/app/(auth)/`)
   - **Login** (`/app/(auth)/login/page.tsx`) - Form placeholder
   - **Register** (`/app/(auth)/register/page.tsx`) - Form placeholder
   - Both marked with comments: "/* Form will be implemented here */"

3. **Dashboard Pages**
   - **Student Dashboard** (`/app/student/page.tsx`) - Placeholder
   - **Admin Dashboard** (`/app/admin/page.tsx`) - Placeholder
   - **Superadmin Dashboard** (`/app/superadmin/page.tsx`) - Placeholder

### Component Directory Status
- `/components/ui/` - Empty (.gitkeep file)
- `/components/shared/` - Empty (.gitkeep file)
- No shadcn/ui components have been installed yet
- Ready to add components via: `npx shadcn-ui@latest add [component-name]`

### UI Framework Readiness
- shadcn/ui pre-configured in `components.json`
- Tailwind CSS fully configured
- Dark mode support configured
- Container and responsive design support ready
- Ready for component installation

---

## 6. EXISTING FILE HANDLING INFRASTRUCTURE

### Current State: NO EXISTING IMPLEMENTATION

**File Storage (Ready but Unused):**
- Vercel Blob is included in dependencies (`@vercel/blob 0.15.1`)
- Environment variable configured: `BLOB_READ_WRITE_TOKEN`
- Next.js configuration allows images from Vercel Blob CDN:
  ```js
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
    ],
  }
  ```

**What's Missing:**
- No file upload endpoints
- No document models in database
- No file processing services
- No document storage logic
- No file download/preview endpoints
- No document management components

---

## 7. DOCUMENT PROCESSING INTEGRATION OPPORTUNITIES

### Recommended Architecture for Implementation

```
Document Processing Pipeline
│
├── Frontend Layer
│   ├── File Upload Component (Need to create)
│   ├── Document Browser/List Component (Need to create)
│   ├── Document Preview Component (Need to create)
│   └── Processing Status Component (Need to create)
│
├── API Layer (Need to create routes)
│   ├── POST /api/documents/upload - Handle file uploads
│   ├── GET /api/documents - List documents
│   ├── GET /api/documents/:id - Get document details
│   ├── POST /api/documents/:id/process - Trigger processing
│   ├── GET /api/documents/:id/preview - Get preview
│   └── DELETE /api/documents/:id - Delete document
│
├── Processing Service (Need to create)
│   ├── PDF text extraction
│   ├── File type validation
│   ├── OpenAI API integration
│   ├── Processing status tracking
│   └── Error handling
│
├── Database Models (Need to create)
│   ├── Document model
│   ├── DocumentContent model (for extracted text)
│   ├── ProcessingJob model (for tracking)
│   └── Relations to User model
│
└── Storage Layer (Ready to use)
    └── Vercel Blob Storage (configured)
```

### Integration Points by Feature Area

#### 1. Student Dashboard
- Document upload interface
- Document list with status
- View uploaded documents
- Download processed versions

#### 2. Admin Dashboard
- Bulk document management
- Processing queue management
- Analytics on document processing
- User document management

#### 3. Superadmin Dashboard
- System-wide processing metrics
- Configuration management
- User activity monitoring

---

## 8. RECOMMENDED IMPLEMENTATION ROADMAP

### Phase 1: Core Infrastructure (Foundation)
1. **Database Models** - Add Document, ProcessingJob, DocumentContent models
2. **Storage Setup** - Configure Vercel Blob integration
3. **API Endpoints** - Create basic CRUD endpoints
4. **Authentication Middleware** - Secure endpoints with NextAuth

### Phase 2: File Handling
1. **Upload Component** - React component for file selection
2. **Upload Endpoint** - POST /api/documents/upload
3. **File Validation** - Type and size validation
4. **Storage Integration** - Save to Vercel Blob

### Phase 3: Document Processing
1. **Processing Service** - PDF/document parsing
2. **AI Integration** - OpenAI API for content analysis
3. **Status Tracking** - Database tracking of processing jobs
4. **Error Handling** - Robust error management and retry logic

### Phase 4: User Interface
1. **Document Upload UI** - File browser, drag-drop
2. **Document List UI** - Grid/table view with filters
3. **Document Preview** - Display processed content
4. **Processing Status** - Real-time status updates

### Phase 5: Advanced Features
1. **Batch Processing** - Multiple document handling
2. **Analytics** - Document processing metrics
3. **Export** - Multiple format export
4. **Collaboration** - Sharing and commenting

---

## 9. ENVIRONMENT CONFIGURATION

### Current Environment Variables
```env
DATABASE_URL              # PostgreSQL connection string
NEXTAUTH_SECRET          # NextAuth.js secret (needs generation)
NEXTAUTH_URL             # App URL (http://localhost:3000 dev)
OPENAI_API_KEY           # OpenAI API key (for AI features)
BLOB_READ_WRITE_TOKEN    # Vercel Blob storage token
```

### What's Needed for Document Processing
- All above configured
- Optional: File size limits in next.config.js
- Optional: Allowed file types configuration

---

## 10. KEY FILES REFERENCE

| File | Purpose | Status |
|------|---------|--------|
| `/prisma/schema.prisma` | Database schema | Minimal, needs expansion |
| `/lib/prisma.ts` | Prisma client singleton | Ready to use |
| `/lib/utils.ts` | Utility functions | Basic, can expand |
| `/types/index.ts` | Type definitions | Minimal, needs expansion |
| `/components.json` | shadcn/ui configuration | Configured, ready to use |
| `/tailwind.config.ts` | Styling configuration | Fully configured |
| `/next.config.js` | Next.js configuration | Has Vercel Blob support |
| `/app/api/health/route.ts` | Example API route | Good reference for structure |

---

## 11. QUICK START CHECKLIST FOR DOCUMENT PROCESSING

- [ ] Install shadcn/ui components (Dialog, Button, Input, Card, etc.)
- [ ] Create Document, ProcessingJob database models in Prisma
- [ ] Generate and run Prisma migrations
- [ ] Create API routes structure in `/app/api/documents/`
- [ ] Implement file upload service with Vercel Blob
- [ ] Create document processing service with PDF parsing
- [ ] Build React components for file upload and management
- [ ] Integrate OpenAI API for content analysis
- [ ] Create document listing and preview interfaces
- [ ] Add authentication middleware to document endpoints
- [ ] Implement status tracking and error handling
- [ ] Add testing for document processing pipeline

---

## 12. ARCHITECTURE ADVANTAGES

The current setup provides several advantages for document processing:

1. **Serverless-ready** - Deploy to Vercel with Blob storage
2. **Type-safe** - Full TypeScript support throughout
3. **Modern stack** - Latest React, Next.js, and tooling
4. **Pre-configured storage** - Vercel Blob already in dependencies
5. **AI-ready** - OpenAI client already available
6. **Clean modular structure** - Easy to add new features
7. **Form handling ready** - React Hook Form + Zod for validation
8. **Data fetching** - React Query for efficient API calls
9. **State management** - Zustand for lightweight app state
10. **Beautiful UI framework** - shadcn/ui + Tailwind for professional UI

---

## 13. POTENTIAL CHALLENGES & SOLUTIONS

| Challenge | Solution |
|-----------|----------|
| No authentication middleware yet | Implement NextAuth.js middleware before securing upload endpoints |
| Empty component library | Add needed shadcn/ui components incrementally |
| No database migrations | Use Prisma migrations for schema versioning |
| File size limits | Configure in Next.js and API route handlers |
| Large file handling | Implement chunked uploads for large files |
| Processing queue management | Use database + cron jobs or job queue service |
| Real-time status updates | WebSockets or polling with React Query |

