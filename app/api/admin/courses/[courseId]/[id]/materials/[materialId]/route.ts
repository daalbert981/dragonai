import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteFile } from '@/lib/gcs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; materialId: string } }
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

    // Get material
    const material = await prisma.courseMaterial.findUnique({
      where: { id: params.materialId },
    });

    if (!material || material.courseId !== params.id) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }

    // Delete file from storage
    await deleteFile(material.storageUrl);

    // Delete material from database
    await prisma.courseMaterial.delete({
      where: { id: params.materialId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting material:', error);

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to delete material' },
      { status: 500 }
    );
  }
}
