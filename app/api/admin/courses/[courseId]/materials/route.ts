import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadFile, generateUniqueFilename } from '@/lib/gcs';
import { extractTextFromFile } from '@/lib/file-parser';

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    // Require instructor role
    const session = await requireRole('INSTRUCTOR');
    const instructorId = parseInt((session.user as any).id);

    // Verify instructor has access to this course
    const course = await prisma.course.findFirst({
      where: {
        id: params.courseId,
        instructors: {
          some: {
            userId: instructorId,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found or access denied' },
        { status: 404 }
      );
    }

    // Get all materials for this course
    const materials = await prisma.courseMaterial.findMany({
      where: {
        courseId: params.courseId,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    return NextResponse.json(materials);
  } catch (error: any) {
    console.error('Error fetching materials:', error);

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    // Require instructor role
    const session = await requireRole('INSTRUCTOR');
    const instructorId = parseInt((session.user as any).id);

    // Verify instructor has access to this course
    const course = await prisma.course.findFirst({
      where: {
        id: params.courseId,
        instructors: {
          some: {
            userId: instructorId,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found or access denied' },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSizeInBytes = 50 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Upload file to storage
    const uniqueFilename = generateUniqueFilename(file.name);
    const uploadResult = await uploadFile(
      new File([file], uniqueFilename, { type: file.type }),
      `courses/${params.courseId}/materials`
    );

    // Attempt text extraction for RAG (best-effort, non-blocking)
    let extractedText: string | null = null
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      extractedText = await extractTextFromFile(buffer, file.name, file.type)
    } catch (err) {
      // Text extraction failed (e.g., PDF, unsupported type) — continue without it
      console.log(`[MATERIALS] Text extraction skipped for ${file.name}: ${err instanceof Error ? err.message : 'Unknown'}`)
    }

    // Save material to database
    const material = await prisma.courseMaterial.create({
      data: {
        courseId: params.courseId,
        filename: uploadResult.filename,
        originalName: file.name,
        fileSize: uploadResult.size,
        mimeType: uploadResult.mimeType,
        storageUrl: uploadResult.url,
        description: description || null,
        extractedText,
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error: any) {
    console.error('Error uploading material:', error);

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to upload material' },
      { status: 500 }
    );
  }
}
