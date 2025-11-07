import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'
import {
  processDocument,
  isSupportedMimeType,
  validateFileSize,
} from '@/lib/document-processor'

/**
 * POST /api/chat/[courseId]/upload
 * Upload and process a document file
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const userId = formData.get('userId') as string | null
    const enableOCR = formData.get('enableOCR') === 'true'

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Validate file type
    if (!isSupportedMimeType(file.type)) {
      return NextResponse.json(
        {
          error: 'Unsupported file type',
          message: `File type ${file.type} is not supported. Supported types: PDF, DOCX, images (JPEG, PNG, GIF, WebP), and text files.`,
        },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    if (!validateFileSize(file.size)) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: 'File size must be less than 10MB',
        },
        { status: 400 }
      )
    }

    // Create initial document record with PROCESSING status
    const document = await prisma.document.create({
      data: {
        name: file.name,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: '', // Will be updated after upload
        courseId,
        userId,
        status: 'PROCESSING',
      },
    })

    try {
      // Upload file to Vercel Blob Storage
      const blob = await put(`documents/${courseId}/${document.id}-${file.name}`, file, {
        access: 'public',
        addRandomSuffix: true,
      })

      // Update document with blob URL
      await prisma.document.update({
        where: { id: document.id },
        data: { url: blob.url },
      })

      // Process document in background (don't await)
      processDocumentInBackground(document.id, file, enableOCR)

      // Return immediately with processing status
      return NextResponse.json(
        {
          document: {
            id: document.id,
            name: document.name,
            originalName: document.originalName,
            mimeType: document.mimeType,
            size: document.size,
            url: blob.url,
            status: 'PROCESSING',
            createdAt: document.createdAt.toISOString(),
          },
          message: 'File uploaded successfully. Processing in background.',
        },
        { status: 201 }
      )
    } catch (uploadError) {
      // If upload fails, mark document as failed
      await prisma.document.update({
        where: { id: document.id },
        data: { status: 'FAILED' },
      })

      throw uploadError
    }
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

/**
 * Process document asynchronously
 */
async function processDocumentInBackground(
  documentId: string,
  file: File,
  enableOCR: boolean
) {
  try {
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Process document
    const result = await processDocument(buffer, file.type, {
      maxTextLength: 50000,
      enableOCR,
    })

    // Update document with extracted text
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'COMPLETED',
        extractedText: result.text,
        metadata: result.metadata,
      },
    })

    console.log(`Document ${documentId} processed successfully`)
  } catch (error) {
    console.error(`Failed to process document ${documentId}:`, error)

    // Mark document as failed
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'FAILED',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    })
  }
}

/**
 * GET /api/chat/[courseId]/upload?documentId=xxx
 * Get document status and details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      // If no documentId, return all documents for the course
      const documents = await prisma.document.findMany({
        where: { courseId: params.courseId },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({
        documents: documents.map(doc => ({
          id: doc.id,
          name: doc.name,
          originalName: doc.originalName,
          mimeType: doc.mimeType,
          size: doc.size,
          url: doc.url,
          status: doc.status,
          metadata: doc.metadata,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        })),
      })
    }

    // Get specific document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        courseId: params.courseId,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      document: {
        id: document.id,
        name: document.name,
        originalName: document.originalName,
        mimeType: document.mimeType,
        size: document.size,
        url: document.url,
        status: document.status,
        extractedText: document.extractedText,
        metadata: document.metadata,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to fetch document:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/chat/[courseId]/upload?documentId=xxx
 * Delete a document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    // Verify document exists and belongs to the course
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        courseId: params.courseId,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Delete document from database
    // Note: We're not deleting from Blob storage to avoid complexity
    // In production, you might want to implement cleanup
    await prisma.document.delete({
      where: { id: documentId },
    })

    return NextResponse.json(
      { success: true, message: 'Document deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to delete document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
