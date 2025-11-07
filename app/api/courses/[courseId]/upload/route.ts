/**
 * File Upload API Route
 *
 * Handles file uploads with:
 * - Security validation (course access, file type, size)
 * - Rate limiting
 * - Upload to cloud storage (GCS via Vercel Blob)
 * - Database record creation
 */

import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { prisma } from '@/lib/prisma'
import { validateCourseAccess } from '@/lib/security'
import { validateFile, generateUniqueFilename } from '@/lib/file-validation'
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limit'
import { ApiResponse, FileUploadResponse } from '@/types'

/**
 * POST /api/courses/[courseId]/upload
 *
 * Upload a file to cloud storage and create database record.
 *
 * @body file - File to upload (multipart/form-data)
 * @returns File upload record with URL
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params

    // TODO: Get user ID from session
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Unauthorized - Please log in'
        },
        { status: 401 }
      )
    }

    // Validate course access
    const hasAccess = await validateCourseAccess(userId, courseId)

    if (!hasAccess) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Access denied - You are not enrolled in this course'
        },
        { status: 403 }
      )
    }

    // Rate limiting
    const rateLimit = await rateLimiter(userId, 'file_upload', RATE_LIMITS.FILE_UPLOAD)

    if (!rateLimit.allowed) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Too many uploads. Please try again in ${rateLimit.resetIn} seconds.`
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetIn.toString()
          }
        }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'No file provided'
        },
        { status: 400 }
      )
    }

    // Validate file
    const validation = await validateFile(file)

    if (!validation.valid) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: validation.error || 'File validation failed'
        },
        { status: 400 }
      )
    }

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(
      validation.sanitizedFilename || file.name,
      userId
    )

    // Upload to Vercel Blob (alternative to GCS for this demo)
    // For production GCS, you would use @google-cloud/storage instead
    const blob = await put(uniqueFilename, file, {
      access: 'public',
      addRandomSuffix: false
    })

    // Create temporary message for the upload
    // In a real scenario, this would be associated with a message
    // For now, we'll create a placeholder that will be linked later
    const tempMessage = await prisma.chatMessage.create({
      data: {
        sessionId: 'temp', // Will be updated when message is sent
        userId,
        role: 'USER',
        content: '[File attachment]',
        isStreaming: false
      }
    })

    // Create file upload record
    const fileUpload = await prisma.fileUpload.create({
      data: {
        messageId: tempMessage.id,
        userId,
        filename: uniqueFilename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: blob.url,
        status: 'COMPLETED'
      }
    })

    return NextResponse.json<ApiResponse<FileUploadResponse>>(
      {
        success: true,
        data: {
          fileUpload: {
            id: fileUpload.id,
            messageId: fileUpload.messageId,
            userId: fileUpload.userId,
            filename: fileUpload.filename,
            originalName: fileUpload.originalName,
            mimeType: fileUpload.mimeType,
            size: fileUpload.size,
            url: fileUpload.url,
            status: fileUpload.status,
            uploadedAt: fileUpload.uploadedAt
          }
        },
        message: 'File uploaded successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error uploading file:', error)

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/courses/[courseId]/upload/[fileId]
 *
 * Delete an uploaded file (optional endpoint for cleanup).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'File ID required'
        },
        { status: 400 }
      )
    }

    // TODO: Get user ID from session
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      )
    }

    // Verify file ownership
    const fileUpload = await prisma.fileUpload.findUnique({
      where: { id: fileId }
    })

    if (!fileUpload) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'File not found'
        },
        { status: 404 }
      )
    }

    if (fileUpload.userId !== userId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Access denied'
        },
        { status: 403 }
      )
    }

    // Delete from database
    await prisma.fileUpload.delete({
      where: { id: fileId }
    })

    // Note: In production, you should also delete from blob storage
    // using the del() function from @vercel/blob

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'File deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting file:', error)

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Failed to delete file'
      },
      { status: 500 }
    )
  }
}
