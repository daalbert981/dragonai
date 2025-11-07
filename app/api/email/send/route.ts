import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { EmailType } from '@prisma/client';
import { sendEmail } from '@/lib/email/send';

// Validation schema for email send request
const sendEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().optional(),
  type: z.nativeEnum(EmailType),
  data: z.record(z.any()),
  userId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * POST /api/email/send
 * Send an email using a template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = sendEmailSchema.safeParse(body);
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

    const emailRequest = validation.data;

    // Send email
    const result = await sendEmail(emailRequest);

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
      emailLogId: result.emailLogId,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error in email send API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
