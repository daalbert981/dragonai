# Document Processing Pipeline

## Overview

The Dragon AI document processing pipeline enables students to upload course materials (PDFs, DOCX, images) and chat with an AI assistant that uses these documents as context.

## Features

### 1. Document Parser
- **PDF Support**: Extracts text from PDF documents
- **DOCX Support**: Processes Microsoft Word documents
- **OCR for Images**: Extracts text from JPG/PNG images using Tesseract.js
- **Metadata Extraction**: Captures page count, word count, and processing time

### 2. Text Chunking
- **Intelligent Splitting**: Uses LangChain's RecursiveCharacterTextSplitter
- **Adaptive Chunk Size**: Automatically adjusts based on document length
- **Overlap Strategy**: 20% overlap between chunks for context preservation
- **Quality Filtering**: Removes low-quality chunks

### 3. API Endpoints

#### Documents
- `POST /api/documents/upload` - Upload a new document
- `GET /api/documents` - List all documents (with pagination)
- `GET /api/documents/[id]` - Get document details with chunks
- `PATCH /api/documents/[id]` - Update document metadata
- `DELETE /api/documents/[id]` - Delete a document
- `POST /api/documents/[id]/reprocess` - Reprocess a failed document
- `GET /api/documents/[id]/download` - Download original document

#### Chat
- `POST /api/chat` - Send a message with optional document context (streaming)
- `GET /api/chat/sessions` - List all chat sessions
- `POST /api/chat/sessions` - Create a new chat session
- `GET /api/chat/sessions/[id]` - Get session with messages
- `PATCH /api/chat/sessions/[id]` - Update session title
- `DELETE /api/chat/sessions/[id]` - Delete a session

### 4. Frontend Components
- **DocumentUpload**: Drag-and-drop file upload with progress tracking
- **DocumentList**: Table view of all documents with status indicators
- **ChatInterface**: Real-time chat with document selection sidebar

## Architecture

### Database Schema

```prisma
model Document {
  id              String           @id @default(cuid())
  filename        String
  originalName    String
  mimeType        String
  size            Int
  blobUrl         String
  status          DocumentStatus   @default(PENDING)
  errorMessage    String?
  userId          String
  courseId        String?
  chunks          DocumentChunk[]
}

model DocumentChunk {
  id          String   @id @default(cuid())
  documentId  String
  content     String   @db.Text
  chunkIndex  Int
  metadata    Json?
  document    Document @relation(...)
}

model ChatSession {
  id          String        @id @default(cuid())
  title       String?
  userId      String
  messages    ChatMessage[]
}

model ChatMessage {
  id            String      @id @default(cuid())
  sessionId     String
  role          MessageRole
  content       String      @db.Text
  documentIds   String[]
  session       ChatSession @relation(...)
}
```

### Processing Flow

1. **Upload**: User uploads file via API
2. **Storage**: File stored in Vercel Blob
3. **Database**: Document record created with PENDING status
4. **Processing** (async):
   - Status updated to PROCESSING
   - Parse document based on MIME type
   - Clean and normalize text
   - Split into chunks with optimal size
   - Filter quality chunks
   - Store chunks in database
   - Status updated to COMPLETED or FAILED
5. **Chat**: AI retrieves relevant chunks and uses as context

### Services

#### DocumentParser (`lib/services/document-parser.ts`)
- Parses PDF, DOCX, and images
- Extracts text and metadata
- Handles errors gracefully

#### TextChunker (`lib/services/text-chunker.ts`)
- Splits text into chunks
- Validates chunk quality
- Provides statistics

#### DocumentProcessor (`lib/services/document-processor.ts`)
- Orchestrates parsing and chunking
- Manages database updates
- Handles async processing

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dragonai"

# OpenAI
OPENAI_API_KEY="sk-..."

# Vercel Blob
BLOB_READ_WRITE_TOKEN="vercel_blob_..."

# NextAuth (optional for now)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"
```

### Supported File Types

- PDF: `application/pdf`
- DOCX: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- DOC: `application/msword`
- Images: `image/jpeg`, `image/png`, `image/jpg`

### Limits

- Max file size: 10MB
- Max chunk size: 1500 characters (adaptive)
- Chunk overlap: 20%
- Processing timeout: 60 seconds

## Usage Examples

### Upload a Document

```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('courseId', 'optional-course-id');

const response = await fetch('/api/documents/upload', {
  method: 'POST',
  body: formData,
});

const { document } = await response.json();
```

### Chat with Document Context

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'What is the main topic?' }
    ],
    documentIds: ['doc-id-1', 'doc-id-2'],
  }),
});

// Handle streaming response
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  // Process chunk...
}
```

## Error Handling

All API endpoints use comprehensive error handling:

- **400 Bad Request**: Validation errors
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Duplicate resource
- **500 Internal Error**: Server error

Example error response:

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "path": "file",
      "message": "File size must be less than 10MB"
    }
  ]
}
```

## Testing

To test the pipeline:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/documents`

3. Upload a test document (PDF, DOCX, or image)

4. Wait for processing to complete

5. Select the document in the chat sidebar

6. Ask questions about the document content

## Future Enhancements

- [ ] Vector embeddings for semantic search
- [ ] Support for more file types (PPT, Excel, etc.)
- [ ] Batch processing with queue system
- [ ] Real-time progress notifications
- [ ] Document versioning
- [ ] Collaborative annotations
- [ ] Export chat conversations
- [ ] Advanced search with filters

## Dependencies

### Core
- **pdf-parse**: PDF text extraction
- **mammoth**: DOCX parsing
- **tesseract.js**: OCR for images
- **sharp**: Image processing
- **langchain**: Text splitting
- **@vercel/blob**: File storage
- **openai**: AI chat

### Database
- **@prisma/client**: Type-safe database access
- **postgresql**: Primary database

### Frontend
- **next**: React framework
- **react**: UI library
- **lucide-react**: Icons
- **tailwindcss**: Styling

## Troubleshooting

### Document processing fails
- Check file size (must be < 10MB)
- Verify file type is supported
- Check BLOB_READ_WRITE_TOKEN is valid
- Review error message in document record

### Chat not using document context
- Ensure document status is COMPLETED
- Verify document is selected in sidebar
- Check OPENAI_API_KEY is set

### OCR not working
- Ensure image is clear and readable
- Try preprocessing image (increase contrast)
- Check Tesseract.js is properly installed

## Support

For issues or questions, please refer to the main project README.
