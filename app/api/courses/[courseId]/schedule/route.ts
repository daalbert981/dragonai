import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/courses/[courseId]/schedule - Get all class sessions for a course
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params;

    const classSessions = await prisma.classSession.findMany({
      where: { courseId },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json(classSessions);
  } catch (error) {
    console.error('Error fetching class sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class sessions' },
      { status: 500 }
    );
  }
}

// POST /api/courses/[courseId]/schedule - Create a new class session
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params;
    const body = await request.json();

    const { title, description, startTime, endTime, location, instructorId } = body;

    // Validate required fields
    if (!title || !startTime || !endTime || !instructorId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the class session
    const classSession = await prisma.classSession.create({
      data: {
        courseId,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        instructorId,
        status: 'SCHEDULED',
      },
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

    return NextResponse.json(classSession, { status: 201 });
  } catch (error) {
    console.error('Error creating class session:', error);
    return NextResponse.json(
      { error: 'Failed to create class session' },
      { status: 500 }
    );
  }
}
