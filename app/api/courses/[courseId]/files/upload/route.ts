/**
 * File Upload API Route
 *
 * Handles file uploads for chat messages with:
 * - File validation
 * - Upload to Google Cloud Storage
 * - Automatic parsing and text extraction
 * - Token counting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { validateCourseAccess } from '@/lib/security';
import { validateFile, generateUniqueFilename } from '@/lib/file-validation';
import { parseFile } from '@/lib/file-parser';
import { uploadFile } from '@/lib/gcs';

/**
 * POST /api/courses/[courseId]/files/upload
 *
 * Upload a file to be attached to a chat message
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    // Get user from session
    const session = await getServerSession(authOptions);
    const userId = parseInt((session?.user as any)?.id);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate course access
    const hasAccess = await validateCourseAccess(userId.toString(), params.courseId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied - You are not enrolled in this course' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const messageId = formData.get('messageId') as string | null;
    const preExtractedText = formData.get('extractedText') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = await validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'File validation failed' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(
      validation.sanitizedFilename || file.name,
      userId.toString()
    );

    // Upload to Google Cloud Storage
    const uploadPath = `courses/${params.courseId}/uploads/${userId}`;
    let uploadResult;

    try {
      // Create a new File object with the unique filename
      const renamedFile = new File([file], uniqueFilename, { type: file.type });
      uploadResult = await uploadFile(renamedFile, uploadPath);
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Parse file content (async, non-blocking)
    let extractedText: string | null = null;
    let parsedData: any = null;
    let tokenCount: number | null = null;
    let processingError: string | null = null;
    let status = 'PROCESSING';

    try {
      // If pre-extracted text provided (from client-side PDF extraction), use it
      if (preExtractedText && file.type === 'application/pdf') {
        extractedText = preExtractedText;
        // Estimate token count for pre-extracted text
        tokenCount = Math.ceil(preExtractedText.length / 4);
        status = 'COMPLETED';
        parsedData = {
          type: 'pdf',
          extractedClientSide: true
        };
      } else {
        // Otherwise, parse server-side
        const parsed = await parseFile(file);
        extractedText = parsed.text;
        parsedData = parsed.data;
        tokenCount = parsed.metadata.tokenCount || null;
        status = 'COMPLETED';

        // Store warnings as processing errors if any
        if (parsed.metadata.warnings && parsed.metadata.warnings.length > 0) {
          processingError = parsed.metadata.warnings.join('; ');
        }
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      processingError = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
      status = 'FAILED';
    }

    // Create file upload record in database
    // Note: messageId will be set later when the file is attached to a message
    const fileUpload = await prisma.fileUpload.create({
      data: {
        userId,
        filename: uniqueFilename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: uploadResult.url,
        status,
        extractedText,
        parsedData: parsedData ? JSON.stringify(parsedData) : null,
        processingError,
        tokenCount
      }
    });

    // Return success with file metadata
    return NextResponse.json({
      success: true,
      file: {
        id: fileUpload.id,
        originalName: fileUpload.originalName,
        size: fileUpload.size,
        mimeType: fileUpload.mimeType,
        url: fileUpload.url,
        status: fileUpload.status,
        tokenCount: fileUpload.tokenCount,
        hasText: !!extractedText,
        extractedText: extractedText ? extractedText.substring(0, 200) + '...' : null, // Preview only
        processingError: fileUpload.processingError
      }
    }, { status: 201 });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upload file'
      },
      { status: 500 }
    );
  }
}
