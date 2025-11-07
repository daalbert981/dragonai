# Chat API Documentation

Complete OpenAI-powered chat API with streaming responses and file processing capabilities.

## Features

- ✅ **OpenAI Streaming**: Real-time streaming responses using GPT-4
- ✅ **File Processing**: Upload and process PDFs, DOCX, images
- ✅ **Document Context**: Include uploaded documents in chat context
- ✅ **Session Management**: Organize chats by course and session
- ✅ **Message History**: Track full conversation history
- ✅ **OCR Support**: Extract text from images using OpenAI Vision
- ✅ **Course Organization**: Group chats by courses

## Database Schema

### Models Created

1. **Course** - Organize chat content by course
2. **ChatSession** - Individual chat sessions within courses
3. **Message** - Individual messages with role (USER/ASSISTANT/SYSTEM)
4. **Document** - Uploaded files with extracted text

## API Endpoints

### 1. Course Management

#### GET /api/courses
Get all courses (optionally filtered by userId)

**Query Parameters:**
- `userId` (optional): Filter by user
- `includeInactive` (optional): Include inactive courses

**Response:**
```json
{
  "courses": [
    {
      "id": "course_id",
      "name": "Introduction to AI",
      "description": "Course description",
      "isActive": true,
      "user": { "id": "user_id", "name": "John Doe", "email": "john@example.com" },
      "stats": { "sessionCount": 5, "documentCount": 3 },
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/courses
Create a new course

**Request Body:**
```json
{
  "name": "Introduction to AI",
  "description": "Learn the basics of AI",
  "userId": "user_id"
}
```

**Response:** `201 Created`

#### PATCH /api/courses?courseId=xxx
Update a course

#### DELETE /api/courses?courseId=xxx
Delete a course

---

### 2. Session Management

#### GET /api/chat/[courseId]/sessions
Get all sessions for a course

**Query Parameters:**
- `userId` (optional): Filter by user
- `limit` (optional, default: 50, max: 100)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "sessions": [
    {
      "id": "session_id",
      "title": "Chat about linear algebra",
      "courseId": "course_id",
      "user": { "id": "user_id", "name": "John Doe" },
      "messageCount": 12,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### POST /api/chat/[courseId]/sessions
Create a new chat session

**Request Body:**
```json
{
  "title": "New Chat",
  "userId": "user_id"
}
```

**Response:** `201 Created`

#### DELETE /api/chat/[courseId]/sessions?sessionId=xxx
Delete a chat session

---

### 3. File Upload & Processing

#### POST /api/chat/[courseId]/upload
Upload and process a document

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file` (required): File to upload
- `userId` (required): User ID
- `enableOCR` (optional): Enable OCR for images (default: false)

**Supported File Types:**
- PDF: `application/pdf`
- DOCX: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Text: `text/plain`, `text/markdown`

**Max File Size:** 10MB

**Response:** `201 Created`
```json
{
  "document": {
    "id": "doc_id",
    "name": "lecture_notes.pdf",
    "originalName": "lecture_notes.pdf",
    "mimeType": "application/pdf",
    "size": 1024000,
    "url": "https://blob.vercel-storage.com/...",
    "status": "PROCESSING",
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  "message": "File uploaded successfully. Processing in background."
}
```

#### GET /api/chat/[courseId]/upload
Get document(s) for a course

**Query Parameters:**
- `documentId` (optional): Get specific document

**Response:**
```json
{
  "document": {
    "id": "doc_id",
    "name": "lecture_notes.pdf",
    "status": "COMPLETED",
    "extractedText": "Full extracted text...",
    "metadata": {
      "pageCount": 10,
      "wordCount": 2500,
      "processingMethod": "pdf-parse"
    }
  }
}
```

#### DELETE /api/chat/[courseId]/upload?documentId=xxx
Delete a document

---

### 4. Chat (Streaming)

#### POST /api/chat/[courseId]/send
Send a message and get streaming AI response

**Request Body:**
```json
{
  "sessionId": "session_id",
  "userId": "user_id",
  "message": "Explain gradient descent",
  "documentIds": ["doc1_id", "doc2_id"],
  "model": "gpt-4-turbo-preview",
  "temperature": 0.7,
  "maxTokens": 2000
}
```

**Response:** `200 OK` with streaming body

**Custom Headers:**
- `X-User-Message-Id`: ID of the saved user message
- `X-Session-Id`: Session ID
- `X-User-Id`: User ID

**Streaming Format:** Uses Vercel AI SDK streaming format

#### GET /api/chat/[courseId]/send?sessionId=xxx
Get messages for a session

**Query Parameters:**
- `sessionId` (required)
- `limit` (optional, default: 50, max: 100)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "messages": [
    {
      "id": "msg_id",
      "content": "Message content",
      "role": "USER",
      "user": { "id": "user_id", "name": "John Doe" },
      "tokenCount": 25,
      "documentIds": ["doc_id"],
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

#### PUT /api/chat/[courseId]/send
Save assistant's response after streaming completes

**Request Body:**
```json
{
  "sessionId": "session_id",
  "userId": "user_id",
  "content": "Full assistant response"
}
```

---

## Implementation Files

### Core Libraries

1. **lib/openai-stream.ts**
   - `createChatStream()`: Create streaming OpenAI response
   - `createChatCompletion()`: Non-streaming completion
   - `estimateTokenCount()`: Estimate token usage

2. **lib/document-processor.ts**
   - `processDocument()`: Route to appropriate processor
   - `processPDF()`: Extract text from PDFs
   - `processDOCX()`: Extract text from Word documents
   - `processImage()`: OCR using OpenAI Vision
   - `getSupportedMimeTypes()`: List supported types
   - `validateFileSize()`: Check file size limits

### API Routes

1. **app/api/courses/route.ts** - Course CRUD operations
2. **app/api/chat/[courseId]/sessions/route.ts** - Session management
3. **app/api/chat/[courseId]/upload/route.ts** - File upload & processing
4. **app/api/chat/[courseId]/send/route.ts** - Chat with streaming

## Environment Variables Required

```env
# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token-here

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/dragonai?schema=public
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

Dependencies installed:
- `openai` - OpenAI API client
- `ai` - Vercel AI SDK for streaming
- `pdf-parse` - PDF text extraction
- `mammoth` - DOCX text extraction
- `sharp` - Image processing
- `@vercel/blob` - File storage

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

### 3. Set Up Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Or run migrations
npm run db:migrate
```

### 4. Run Development Server

```bash
npm run dev
```

## Usage Examples

### Example 1: Create Course and Start Chat

```javascript
// 1. Create a course
const courseRes = await fetch('/api/courses', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Machine Learning 101',
    description: 'Introduction to ML',
    userId: 'user_123'
  })
})
const { course } = await courseRes.json()

// 2. Create a chat session
const sessionRes = await fetch(`/api/chat/${course.id}/sessions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Learning about Neural Networks',
    userId: 'user_123'
  })
})
const { session } = await sessionRes.json()

// 3. Send a message with streaming
const response = await fetch(`/api/chat/${course.id}/send`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: session.id,
    userId: 'user_123',
    message: 'What is a neural network?'
  })
})

// 4. Handle streaming response
const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  const chunk = decoder.decode(value)
  console.log(chunk) // Display streaming text
}
```

### Example 2: Upload Document and Use in Chat

```javascript
// 1. Upload a PDF
const formData = new FormData()
formData.append('file', pdfFile)
formData.append('userId', 'user_123')

const uploadRes = await fetch(`/api/chat/${courseId}/upload`, {
  method: 'POST',
  body: formData
})
const { document } = await uploadRes.json()

// 2. Wait for processing (poll status)
let doc = document
while (doc.status === 'PROCESSING') {
  await new Promise(resolve => setTimeout(resolve, 2000))
  const statusRes = await fetch(`/api/chat/${courseId}/upload?documentId=${doc.id}`)
  const data = await statusRes.json()
  doc = data.document
}

// 3. Use document in chat
const chatRes = await fetch(`/api/chat/${courseId}/send`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: session.id,
    userId: 'user_123',
    message: 'Summarize this document',
    documentIds: [doc.id] // Include document context
  })
})
```

## Features & Capabilities

### Document Processing

- **PDFs**: Extracts all text content with page count
- **DOCX**: Extracts formatted text content
- **Images**: OCR using OpenAI Vision API (gpt-4-vision-preview)
- **Text Files**: Direct text extraction
- **Truncation**: Limits text to 50,000 characters to manage token usage

### Chat Features

- **Context-Aware**: Includes last 10 messages for conversation continuity
- **Document Context**: Automatically includes selected documents in prompts
- **Token Tracking**: Estimates and stores token usage per message
- **Streaming**: Real-time response streaming for better UX
- **Error Handling**: Comprehensive error handling and validation

### Security & Validation

- File type validation (MIME type checking)
- File size limits (10MB max)
- Input validation using Zod schemas
- User authorization checks
- SQL injection protection via Prisma ORM

## Next Steps

1. **Authentication**: Integrate NextAuth for user authentication
2. **Rate Limiting**: Add rate limiting to prevent abuse
3. **Webhooks**: Add webhooks for document processing completion
4. **Analytics**: Track usage metrics and costs
5. **Frontend**: Build React components to consume these APIs
6. **Testing**: Add unit and integration tests

## Troubleshooting

### Common Issues

1. **Prisma Client Not Generated**
   - Run `npm run db:generate`
   - Ensure DATABASE_URL is set correctly

2. **OpenAI API Errors**
   - Check OPENAI_API_KEY is valid
   - Verify you have API credits
   - Check model availability (gpt-4-turbo-preview)

3. **Blob Storage Errors**
   - Verify BLOB_READ_WRITE_TOKEN is set
   - Check Vercel Blob Storage is enabled

4. **Document Processing Failures**
   - Check file type is supported
   - Ensure file is under 10MB
   - Enable OCR for images: `enableOCR=true`

## License

MIT
