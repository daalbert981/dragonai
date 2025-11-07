import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { EmailType } from '@prisma/client';
import {
  sendWelcomeEmail,
  sendNewMaterialEmail,
  sendAssignmentReminderEmail
} from '@/lib/email/send';

// Validation schema for test email request
const testEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  type: z.enum(['welcome', 'new-material', 'assignment-reminder']),
});

/**
 * POST /api/email/test
 * Send a test email for development/testing purposes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = testEmailSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { to, type } = validation.data;

    let result;

    switch (type) {
      case 'welcome':
        result = await sendWelcomeEmail(
          'test-user-id',
          to,
          'Test User',
          'http://localhost:3000/student'
        );
        break;

      case 'new-material':
        result = await sendNewMaterialEmail(
          'test-user-id',
          to,
          {
            studentName: 'Test Student',
            courseName: 'Introduction to AI',
            materialTitle: 'Neural Networks Fundamentals',
            materialType: 'video',
            materialUrl: 'http://localhost:3000/course/123/material/456',
            instructorName: 'Dr. Smith',
          }
        );
        break;

      case 'assignment-reminder':
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 2); // Due in 2 days

        result = await sendAssignmentReminderEmail(
          'test-user-id',
          to,
          {
            studentName: 'Test Student',
            assignmentTitle: 'Machine Learning Project',
            courseName: 'Introduction to AI',
            dueDate,
            assignmentUrl: 'http://localhost:3000/course/123/assignment/789',
            daysUntilDue: 2,
          }
        );
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid email type',
          },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test ${type} email sent successfully to ${to}`,
      emailLogId: result.emailLogId,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error in test email API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/email/test
 * Get information about available test emails
 */
export async function GET() {
  return NextResponse.json({
    availableTypes: [
      {
        type: 'welcome',
        description: 'Welcome email for new students',
      },
      {
        type: 'new-material',
        description: 'Notification when new course material is added',
      },
      {
        type: 'assignment-reminder',
        description: 'Reminder for upcoming assignment due dates',
      },
    ],
    usage: {
      endpoint: '/api/email/test',
      method: 'POST',
      body: {
        to: 'recipient@example.com',
        type: 'welcome | new-material | assignment-reminder',
      },
    },
  });
}
