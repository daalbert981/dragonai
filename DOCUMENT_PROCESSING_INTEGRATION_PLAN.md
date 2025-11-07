# Dragon AI - Document Processing Pipeline Integration Plan

## Overview

This document outlines the strategic approach for integrating comprehensive document processing capabilities into the Dragon AI platform. The platform is built on a modern, well-architected tech stack with all foundational components in place.

---

## Current State Assessment

### Readiness Matrix

| Component | Status | Confidence | Notes |
|-----------|--------|-----------|-------|
| **Tech Stack** | 100% Ready | Very High | Latest Next.js, React, TypeScript |
| **Infrastructure** | 80% Ready | High | Vercel Blob configured, PostgreSQL ready |
| **Architecture** | 100% Ready | Very High | Clean, modular structure |
| **Database** | 20% Ready | Medium | User model only, needs document models |
| **API Routes** | 10% Ready | Low | Health check only, needs document endpoints |
| **Frontend** | 5% Ready | Low | Stubs only, needs UI components |
| **Authentication** | 0% Ready | Low | NextAuth installed but not configured |
| **File Handling** | 0% Ready | Low | No implementation yet |

### Key Strengths
1. Modern tech stack with excellent DX (Developer Experience)
2. Vercel Blob pre-configured for file storage
3. OpenAI client ready for AI integration
4. React Query for efficient data fetching
5. Prisma for type-safe database operations
6. Shadcn/ui + Tailwind for professional UI
7. TypeScript for full type safety
8. Clean project structure ready for expansion

### Key Gaps
1. No document/file models in database
2. No authentication middleware
3. No file upload endpoints
4. No document processing service
5. No UI components for document management
6. No file validation logic
7. No error handling framework
8. No real-time processing status updates

---

## Implementation Strategy

### Phase 1: Foundation (Weeks 1-2)

#### 1.1 Database Schema Extension
**Objective:** Create database models for document management

**Tasks:**
- [ ] Add `Document` model to Prisma schema
- [ ] Add `DocumentContent` model for extracted text
- [ ] Add `ProcessingJob` model for tracking
- [ ] Create relationships between models
- [ ] Add proper indexes for query performance
- [ ] Create and run Prisma migration

**Files to Create/Modify:**
- `/prisma/schema.prisma` - Add new models
- `/types/index.ts` - Add Document, DocumentContent, ProcessingJob types

**Estimated Effort:** 2-3 hours

**Reference Models:**
```prisma
model Document {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
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

enum DocumentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

#### 1.2 Authentication Middleware
**Objective:** Secure API endpoints with NextAuth

**Tasks:**
- [ ] Configure NextAuth.js in app/api/auth/[...nextauth]/route.ts
- [ ] Create authentication middleware
- [ ] Add session validation to API routes
- [ ] Set up JWT strategy
- [ ] Test authentication flow

**Files to Create:**
- `/app/api/auth/[...nextauth]/route.ts` - NextAuth config
- `/lib/auth.ts` - Authentication utilities
- `/middleware.ts` - Request middleware

**Estimated Effort:** 4-6 hours

#### 1.3 Type Definitions
**Objective:** Create comprehensive TypeScript types

**Tasks:**
- [ ] Add Document-related types to `/types/index.ts`
- [ ] Create API request/response types
- [ ] Create processing status types
- [ ] Add error handling types

**Estimated Effort:** 1-2 hours

### Phase 2: API Layer (Weeks 2-3)

#### 2.1 Document Upload Endpoint
**Objective:** Implement file upload with validation

**Create:** `/app/api/documents/upload/route.ts`

**Responsibilities:**
- Validate file type and size
- Generate unique filename
- Upload to Vercel Blob
- Create Document record in database
- Create initial ProcessingJob
- Return upload confirmation

**Key Features:**
- File size validation (e.g., max 50MB)
- Allowed MIME types whitelist (PDF, DOCX, PPTX, etc.)
- Virus/malware scanning (optional: ClamAV integration)
- Error handling with meaningful messages
- Transaction rollback on failure

**API Endpoint:**
```
POST /api/documents/upload
Content-Type: multipart/form-data

Request:
  file: File
  
Response:
  {
    success: boolean
    documentId: string
    filename: string
    status: string
    message?: string
  }
```

**Estimated Effort:** 6-8 hours

#### 2.2 Document List Endpoint
**Objective:** Retrieve user's documents with filtering

**Create:** `/app/api/documents/route.ts`

**Responsibilities:**
- Query documents for authenticated user
- Support pagination
- Support filtering by status
- Return document metadata with processing status
- Handle authorization

**API Endpoint:**
```
GET /api/documents?page=1&limit=10&status=PENDING

Response:
  {
    documents: Document[]
    total: number
    page: number
    limit: number
  }
```

**Estimated Effort:** 3-4 hours

#### 2.3 Document Details Endpoint
**Objective:** Get specific document with processing details

**Create:** `/app/api/documents/[id]/route.ts`

**Responsibilities:**
- Retrieve document by ID
- Include content and processing job details
- Verify user authorization
- Return full document information

**Estimated Effort:** 2-3 hours

#### 2.4 Processing Status Endpoint
**Objective:** Get real-time processing status

**Create:** `/app/api/documents/[id]/status/route.ts`

**Responsibilities:**
- Return current processing status
- Include progress percentage
- Return error details if failed
- Support polling or WebSocket (optional)

**Estimated Effort:** 2-3 hours

#### 2.5 Document Preview Endpoint
**Objective:** Get processed document content

**Create:** `/app/api/documents/[id]/preview/route.ts`

**Responsibilities:**
- Return extracted text
- Return document metadata
- Return processing summary
- Format content for display

**Estimated Effort:** 2-3 hours

#### 2.6 Delete Document Endpoint
**Objective:** Remove document and associated data

**Create:** `/app/api/documents/[id]/route.ts` (DELETE)

**Responsibilities:**
- Delete from database
- Delete from Vercel Blob storage
- Clean up processing jobs
- Cascade delete related records

**Estimated Effort:** 2-3 hours

**Total API Layer Effort:** 17-24 hours

### Phase 3: Processing Service (Weeks 3-4)

#### 3.1 Document Parser Service
**Objective:** Extract text from various document formats

**Create:** `/lib/services/documentParser.ts`

**Supports:**
- PDF text extraction (pdfjs or pdfParse)
- DOCX extraction (docx library)
- PPTX extraction (pptx library)
- Plain text support
- Metadata extraction

**Key Features:**
- Handles corrupted files gracefully
- Extracts metadata (title, author, creation date)
- Preserves document structure
- Returns structured data

**Estimated Effort:** 8-12 hours

#### 3.2 OpenAI Integration Service
**Objective:** Process extracted text with AI

**Create:** `/lib/services/aiProcessor.ts`

**Responsibilities:**
- Send extracted text to OpenAI
- Extract key concepts
- Generate summary
- Identify main topics
- Create Q&A pairs
- Format results

**Key Features:**
- Chunking for large documents
- Retry logic for API failures
- Token limit management
- Cost tracking
- Error recovery

**Estimated Effort:** 6-8 hours

#### 3.3 Processing Queue Service
**Objective:** Manage asynchronous document processing

**Create:** `/lib/services/processingQueue.ts`

**Options:**
- Option A: Database-based queue (simple, suitable for initial MVP)
- Option B: Bull Queue with Redis (scalable, for production)
- Option C: Background Jobs (for more complex workflows)

**Responsibilities:**
- Queue documents for processing
- Track processing status
- Handle retries
- Manage concurrency
- Update processing job status

**Estimated Effort (Database Queue):** 4-6 hours
**Estimated Effort (Redis Queue):** 8-10 hours

#### 3.4 Background Job Handler
**Objective:** Process documents asynchronously

**Implementation Options:**
- Option A: API Route with cron job (simple)
- Option B: Next.js custom server with job runner
- Option C: External job service (more scalable)

**Responsibilities:**
- Process queued documents
- Call parser service
- Call AI processor
- Update database
- Handle errors
- Trigger notifications

**Estimated Effort:** 6-8 hours

**Total Processing Service Effort:** 24-34 hours

### Phase 4: Frontend Components (Weeks 4-5)

#### 4.1 File Upload Component
**Location:** `/components/shared/DocumentUpload.tsx`

**Features:**
- Drag-and-drop interface
- File browser
- File validation feedback
- Progress indicator
- Error messages

**Tech Stack:**
- React Hook Form
- Zod validation
- shadcn/ui components

**Estimated Effort:** 4-5 hours

#### 4.2 Document List Component
**Location:** `/components/shared/DocumentList.tsx`

**Features:**
- Table/grid view
- Sorting and filtering
- Pagination
- Status indicators
- Action buttons (download, delete, view)

**Estimated Effort:** 4-5 hours

#### 4.3 Document Preview Component
**Location:** `/components/shared/DocumentPreview.tsx`

**Features:**
- Display extracted text
- Show metadata
- Display summary
- Show key concepts
- Show Q&A pairs

**Estimated Effort:** 3-4 hours

#### 4.4 Processing Status Component
**Location:** `/components/shared/ProcessingStatus.tsx`

**Features:**
- Progress bar
- Status text
- Time estimates
- Error messages
- Retry buttons

**Estimated Effort:** 2-3 hours

#### 4.5 Update Student Dashboard
**Location:** `/app/student/page.tsx`

**Changes:**
- Add upload section
- Add document list
- Add processing status
- Add download options

**Estimated Effort:** 3-4 hours

#### 4.6 Update Admin Dashboard
**Location:** `/app/admin/page.tsx`

**Features:**
- View all student documents
- Bulk operations
- Processing queue management
- Analytics

**Estimated Effort:** 4-5 hours

**Total Frontend Effort:** 20-26 hours

### Phase 5: Testing & Refinement (Weeks 5-6)

#### 5.1 Unit Tests
**Location:** `/__tests__/`

**Coverage:**
- Document parser service
- AI processor service
- Validation logic
- API route handlers

**Estimated Effort:** 8-10 hours

#### 5.2 Integration Tests
**Coverage:**
- Upload workflow
- Processing pipeline
- API endpoints
- Database operations

**Estimated Effort:** 6-8 hours

#### 5.3 E2E Tests
**Tool:** Cypress or Playwright

**Coverage:**
- Complete user workflows
- Error scenarios
- Performance testing

**Estimated Effort:** 6-8 hours

#### 5.4 Performance Optimization
**Focus:**
- API response times
- Database query optimization
- Processing speed
- UI responsiveness

**Estimated Effort:** 4-6 hours

**Total Testing Effort:** 24-32 hours

---

## Technology Selection Details

### Document Parsing Libraries

**PDF Extraction:**
```bash
npm install pdf-parse  # OR
npm install pdfjs-dist
```

**DOCX Extraction:**
```bash
npm install docxtemplater docx
```

**PPTX Extraction:**
```bash
npm install pptxjs
```

### Processing Queue

**Option 1: Simple Database Queue (Recommended for MVP)**
```typescript
// Use Prisma to query pending jobs
// Run cron job every N seconds
// Update status as processing completes
```

**Option 2: Bull Queue (Recommended for Scale)**
```bash
npm install bull
npm install redis
```

**Option 3: Next.js Cron (Vercel Crons)**
```
/app/api/cron/process-documents/route.ts
```

---

## Database Schema (Complete)

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  password      String?
  role          UserRole  @default(STUDENT)
  
  documents     Document[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Document {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  filename      String          // Stored filename in Blob
  originalName  String          // Original filename from upload
  fileSize      Int             // File size in bytes
  mimeType      String          // MIME type (application/pdf, etc)
  
  blobUrl       String    @unique  // URL in Vercel Blob
  status        DocumentStatus  @default(PENDING)
  
  content       DocumentContent?
  processingJob ProcessingJob?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([userId])
  @@index([status])
  @@index([createdAt])
}

model DocumentContent {
  id            String    @id @default(cuid())
  documentId    String    @unique
  document      Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  extractedText String    @db.Text  // Full extracted text
  
  summary       String?   @db.Text  // AI-generated summary
  keyPhrases    String?   @db.Text  // JSON array of key phrases
  topics        String?   @db.Text  // JSON array of topics
  
  metadata      String?   @db.Text  // JSON with document metadata
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model ProcessingJob {
  id            String    @id @default(cuid())
  documentId    String    @unique
  document      Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  status        JobStatus @default(PENDING)
  progress      Int       @default(0)  // 0-100
  
  errorMessage  String?
  
  startedAt     DateTime?
  completedAt   DateTime?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([status])
  @@index([createdAt])
}

enum UserRole {
  STUDENT
  ADMIN
  SUPERADMIN
}

enum DocumentStatus {
  PENDING          // Uploaded, waiting to process
  PROCESSING       // Currently being processed
  COMPLETED        // Processing successful
  FAILED           // Processing failed
}

enum JobStatus {
  PENDING          // Queued for processing
  IN_PROGRESS      // Currently processing
  COMPLETED        // Successfully processed
  FAILED           // Processing failed
  RETRYING         // Retrying after failure
}
```

---

## API Endpoints Reference

### Documents Management

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/documents/upload` | Upload new document | Required |
| GET | `/api/documents` | List user documents | Required |
| GET | `/api/documents/:id` | Get document details | Required |
| GET | `/api/documents/:id/status` | Get processing status | Required |
| GET | `/api/documents/:id/preview` | Get processed content | Required |
| GET | `/api/documents/:id/download` | Download original file | Required |
| DELETE | `/api/documents/:id` | Delete document | Required |

### Processing Management (Admin/Superadmin)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/admin/documents/process` | Trigger manual processing | Admin |
| GET | `/api/admin/documents/queue` | View processing queue | Admin |
| POST | `/api/admin/documents/:id/retry` | Retry failed processing | Admin |
| GET | `/api/admin/analytics` | Processing analytics | Admin |

---

## Environment Variables Required

```env
# Existing
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="..."
OPENAI_API_KEY="..."
BLOB_READ_WRITE_TOKEN="..."

# Document Processing
DOCUMENT_MAX_FILE_SIZE=52428800  # 50MB in bytes
DOCUMENT_ALLOWED_TYPES="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"

# AI Processing
DOCUMENT_ENABLE_AI_PROCESSING=true
DOCUMENT_EXTRACT_SUMMARY=true
DOCUMENT_EXTRACT_KEY_PHRASES=true
DOCUMENT_EXTRACT_TOPICS=true

# Processing Queue
PROCESSING_QUEUE_TYPE="database"  # or "redis"
PROCESSING_WORKER_CONCURRENCY=3
PROCESSING_RETRY_ATTEMPTS=3
PROCESSING_RETRY_DELAY=5000

# Redis (if using Redis queue)
REDIS_URL="redis://..."
```

---

## Recommended Implementation Order

1. **Week 1:** Database schema, types, authentication
2. **Week 2-3:** API endpoints, upload service
3. **Week 3-4:** Processing services, background jobs
4. **Week 4-5:** Frontend components, dashboards
5. **Week 5-6:** Testing, optimization, refinement

**Total Timeline:** 4-6 weeks for MVP

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Large file uploads | Performance, timeouts | Implement chunked uploads, stream processing |
| Processing failures | Data integrity | Implement retry logic, error logging |
| Storage costs | Budget | Implement file cleanup, size limits |
| API rate limits | Processing delays | Implement batching, queue management |
| Database performance | Query slowness | Add proper indexes, optimize queries |

### Operational Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Disk space | Service outage | Monitor usage, auto-cleanup old files |
| Processing queue backup | Delayed processing | Implement priority queue, auto-scaling |
| Security vulnerabilities | Data breach | Input validation, virus scanning, auth checks |
| User confusion | Support burden | Clear UI, error messages, documentation |

---

## Success Metrics

### Performance Metrics
- Upload response time: < 2 seconds
- Processing time: < 30 seconds per document (PDF)
- API response time: < 500ms (p95)
- UI responsiveness: < 100ms for interactions

### Quality Metrics
- Test coverage: > 80%
- Error rate: < 1%
- Processing success rate: > 95%
- User satisfaction: > 4.5/5

### Business Metrics
- Documents uploaded: Increasing
- Processing success: > 95%
- User retention: Increasing
- Support tickets: Decreasing

---

## Conclusion

The Dragon AI platform has an excellent foundation for implementing document processing. With a modern tech stack, clean architecture, and all necessary infrastructure in place, the project is positioned for successful document processing integration.

The recommended 4-6 week timeline provides a realistic path to MVP with room for iteration and refinement. Early focus on database schema, authentication, and core API endpoints will enable parallel work on processing services and frontend components.

Key success factors:
1. Start with solid database schema
2. Secure API endpoints early
3. Implement robust error handling
4. Test thoroughly at each phase
5. Monitor performance and costs
6. Gather user feedback iteratively

---

## Next Steps

1. Review and approve implementation plan
2. Set up development environment
3. Create database migration
4. Start Phase 1 implementation
5. Set up CI/CD pipeline
6. Begin development sprints

