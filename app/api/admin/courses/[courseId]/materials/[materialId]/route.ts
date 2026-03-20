import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteFile } from '@/lib/gcs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string; materialId: string } }
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

    // Get the material and verify it belongs to this course
    const material = await prisma.courseMaterial.findUnique({
      where: { id: params.materialId },
    });

    if (!material || material.courseId !== params.courseId) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }

    // Delete file from storage
    try {
      await deleteFile(material.storageUrl);
    } catch (storageError) {
      console.error('Error deleting file from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete material from database
    await prisma.courseMaterial.delete({
      where: { id: params.materialId },
    });

    return NextResponse.json(
      { message: 'Material deleted successfully' },
      { status: 200 }
    );
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
