/**
 * Chat Sessions API Route
 *
 * Manages chat session history for students
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { validateCourseAccess } from '@/lib/security';

/**
 * GET /api/courses/[courseId]/sessions
 *
 * Get all chat sessions for the current user in this course
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    // Get user from session with error handling
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (error) {
      console.error('[API] Session error:', error);
      return NextResponse.json(
        { error: 'Invalid session - please log in again' },
        { status: 401 }
      );
    }

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

    // Get course retention settings
    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      select: {
        sessionRetentionPolicy: true,
        sessionRetentionDays: true,
        sessionRetentionHours: true
      }
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Build where clause based on retention policy
    const whereClause: any = {
      userId,
      courseId: params.courseId,
      messages: {
        some: {} // Only sessions with at least one message
      }
    };

    // Apply retention policy - DELETE old sessions for compliance

    if (course.sessionRetentionPolicy === 'never') {
      // For "never" policy, DELETE all sessions for this user in this course
      const deleteResult = await prisma.chatSession.deleteMany({
        where: {
          userId,
          courseId: params.courseId
        }
      });

      return NextResponse.json({
        success: true,
        sessions: []
      });
    } else if (course.sessionRetentionPolicy === 'custom') {
      // Calculate cutoff date based on retention period
      const retentionDays = course.sessionRetentionDays || 0;
      const retentionHours = course.sessionRetentionHours || 0;
      const totalHours = retentionDays * 24 + retentionHours;

      if (totalHours > 0) {
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - totalHours);


        // DELETE sessions older than the cutoff date
        const deleteResult = await prisma.chatSession.deleteMany({
          where: {
            userId,
            courseId: params.courseId,
            updatedAt: {
              lt: cutoffDate
            }
          }
        });

        // Only include sessions updated after the cutoff date
        whereClause.updatedAt = {
          gte: cutoffDate
        };
      } else {
        // Delete all sessions if retention is set to 0
        const deleteResult = await prisma.chatSession.deleteMany({
          where: {
            userId,
            courseId: params.courseId
          }
        });

        return NextResponse.json({
          success: true,
          sessions: []
        });
      }
    } else {
    }
    // For "forever" policy, no deletion needed

    // Get sessions based on retention policy
    const sessions = await prisma.chatSession.findMany({
      where: whereClause,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'asc' },
          select: {
            content: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Format response with preview of first message
    const formattedSessions = sessions.map(s => ({
      id: s.id,
      courseId: s.courseId,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      messageCount: s._count.messages,
      preview: s.messages[0]?.content.substring(0, 100) || 'New chat',
      firstMessageDate: s.messages[0]?.createdAt || s.createdAt
    }));


    return NextResponse.json({
      success: true,
      sessions: formattedSessions
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
