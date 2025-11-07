import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadFile, generateUniqueFilename } from '@/lib/gcs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole('ADMIN');
    const userId = (session.user as any).id;

    // Verify instructor owns this course
    const course = await prisma.course.findFirst({
      where: {
        id: params.id,
        instructors: {
          some: {
            userId: userId,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    const materials = await prisma.courseMaterial.findMany({
      where: {
        courseId: params.id,
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole('ADMIN');
    const userId = (session.user as any).id;

    // Verify instructor owns this course
    const course = await prisma.course.findFirst({
      where: {
        id: params.id,
        instructors: {
          some: {
            userId: userId,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Upload file to storage
    const uniqueFilename = generateUniqueFilename(file.name);
    const uploadResult = await uploadFile(
      new File([file], uniqueFilename, { type: file.type }),
      `courses/${params.id}/materials`
    );

    // Save material to database
    const material = await prisma.courseMaterial.create({
      data: {
        courseId: params.id,
        filename: uploadResult.filename,
        originalName: file.name,
        fileSize: uploadResult.size,
        mimeType: uploadResult.mimeType,
        storageUrl: uploadResult.url,
        description: description || null,
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
