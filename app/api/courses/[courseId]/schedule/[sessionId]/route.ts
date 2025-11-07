import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/courses/[courseId]/schedule/[sessionId] - Get a specific class session
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string; sessionId: string } }
) {
  try {
    const { sessionId } = params;

    const classSession = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!classSession) {
      return NextResponse.json(
        { error: 'Class session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(classSession);
  } catch (error) {
    console.error('Error fetching class session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class session' },
      { status: 500 }
    );
  }
}

// PATCH /api/courses/[courseId]/schedule/[sessionId] - Update a class session
export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string; sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const body = await request.json();

    const { title, description, startTime, endTime, location, status } = body;

    // Build update data object
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (location !== undefined) updateData.location = location;
    if (status !== undefined) updateData.status = status;

    // Update the class session
    const classSession = await prisma.classSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(classSession);
  } catch (error) {
    console.error('Error updating class session:', error);
    return NextResponse.json(
      { error: 'Failed to update class session' },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[courseId]/schedule/[sessionId] - Delete a class session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string; sessionId: string } }
) {
  try {
    const { sessionId } = params;

    await prisma.classSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting class session:', error);
    return NextResponse.json(
      { error: 'Failed to delete class session' },
      { status: 500 }
    );
  }
}
