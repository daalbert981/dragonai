import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema for creating a course
const createCourseSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  userId: z.string().cuid(),
})

// Schema for updating a course
const updateCourseSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/courses
 * Get all courses (optionally filtered by userId)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: any = {}
    if (userId) {
      where.userId = userId
    }
    if (!includeInactive) {
      where.isActive = true
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            chatSessions: true,
            documents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      courses: courses.map(course => ({
        id: course.id,
        name: course.name,
        description: course.description,
        isActive: course.isActive,
        user: course.user,
        stats: {
          sessionCount: course._count.chatSessions,
          documentCount: course._count.documents,
        },
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Failed to fetch courses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/courses
 * Create a new course
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const result = createCourseSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error.format() },
        { status: 400 }
      )
    }

    const { name, description, userId } = result.data

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create course
    const course = await prisma.course.create({
      data: {
        name,
        description,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        course: {
          id: course.id,
          name: course.name,
          description: course.description,
          isActive: course.isActive,
          user: course.user,
          createdAt: course.createdAt.toISOString(),
          updatedAt: course.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create course:', error)
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/courses?courseId=xxx
 * Update a course
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate request body
    const result = updateCourseSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error.format() },
        { status: 400 }
      )
    }

    // Verify course exists
    const existingCourse = await prisma.course.findUnique({
      where: { id: courseId },
    })

    if (!existingCourse) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Update course
    const course = await prisma.course.update({
      where: { id: courseId },
      data: result.data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      course: {
        id: course.id,
        name: course.name,
        description: course.description,
        isActive: course.isActive,
        user: course.user,
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to update course:', error)
    return NextResponse.json(
      { error: 'Failed to update course' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/courses?courseId=xxx
 * Delete a course
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Delete course (cascade will delete sessions, messages, and documents)
    await prisma.course.delete({
      where: { id: courseId },
    })

    return NextResponse.json(
      { success: true, message: 'Course deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to delete course:', error)
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    )
  }
}
