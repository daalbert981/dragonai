import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { PrismaClient } from '@prisma/client';
import { documentProcessor } from '@/lib/services/document-processor';

const prisma = new PrismaClient();

// Supported MIME types
const SUPPORTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
  'image/jpg',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const courseId = formData.get('courseId') as string | null;

    // TODO: Get userId from session - for now using a placeholder
    // In production, use: const session = await getServerSession(authOptions);
    const userId = 'demo-user-id'; // Replace with actual user ID from session

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type. Supported types: ${SUPPORTED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Convert file to buffer for processing
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create document record
    const document = await prisma.document.create({
      data: {
        filename: blob.url.split('/').pop() || file.name,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        blobUrl: blob.url,
        userId,
        courseId: courseId || undefined,
        status: 'PENDING',
      },
    });

    // Process document asynchronously
    documentProcessor.processDocument(document.id, buffer, file.type)
      .catch(error => {
        console.error('Background processing error:', error);
      });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.originalName,
        size: document.size,
        status: document.status,
        createdAt: document.createdAt,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
