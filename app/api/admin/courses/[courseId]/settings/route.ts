import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await requireRole('INSTRUCTOR');
    const userId = parseInt((session.user as any).id);

    // Verify instructor has access to this course
    const existingCourse = await prisma.course.findFirst({
      where: {
        id: params.courseId,
        instructors: {
          some: {
            userId: userId,
          },
        },
      },
    });

    if (!existingCourse) {
      return NextResponse.json(
        { error: 'Course not found or access denied' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Update course settings
    const updatedCourse = await prisma.course.update({
      where: {
        id: params.courseId,
      },
      data: {
        name: body.name,
        code: body.code,
        description: body.description || null,
        syllabus: body.syllabus || null,
        syllabusSynthesisPrompt: body.syllabusSynthesisPrompt || null,
        systemPrompt: body.systemPrompt || null,
        priorClasses: body.priorClasses || null,
        upcomingClasses: body.upcomingClasses || null,
        model: body.model,
        temperature: body.temperature,
        timezone: body.timezone || 'America/New_York',
        reasoningLevel: body.reasoningLevel || null,
        messageHistoryLimit: body.messageHistoryLimit || 10,
        sessionRetentionPolicy: body.sessionRetentionPolicy || 'forever',
        sessionRetentionDays: body.sessionRetentionDays ?? null,
        sessionRetentionHours: body.sessionRetentionHours ?? null,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({ success: true, course: updatedCourse });
  } catch (error) {
    console.error('Error updating course settings:', error);
    return NextResponse.json(
      { error: 'Failed to update course settings' },
      { status: 500 }
    );
  }
}
