import { EmailType, EmailStatus } from '@prisma/client';
import { resend, emailConfig, isEmailConfigured } from './client';
import { emailTemplates } from './templates';
import { prisma } from '@/lib/prisma';
import { SendEmailRequest, SendEmailResponse } from '@/types/email';

/**
 * Send an email with template rendering and logging
 */
export async function sendEmail(
  request: SendEmailRequest
): Promise<SendEmailResponse> {
  const { to, subject: customSubject, type, data, userId, metadata } = request;

  // Check if email is configured
  if (!isEmailConfigured()) {
    console.warn('Email service is not configured. Skipping email send.');
    return {
      success: false,
      error: 'Email service is not configured',
    };
  }

  // Create email log entry
  const emailLog = await prisma.emailLog.create({
    data: {
      userId,
      email: to,
      subject: customSubject,
      type,
      status: EmailStatus.PENDING,
      metadata: metadata as any,
    },
  });

  try {
    // Get the template for this email type
    const template = emailTemplates[type];
    if (!template) {
      throw new Error(`No template found for email type: ${type}`);
    }

    // Generate email content
    const subject = customSubject || template.subject(data);
    const html = template.html(data);
    const text = template.text(data);

    // Send email via Resend
    const result = await resend.emails.send({
      from: emailConfig.from,
      to,
      subject,
      html,
      text,
      replyTo: emailConfig.replyTo,
    });

    // Update email log with success
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: EmailStatus.SENT,
        sentAt: new Date(),
      },
    });

    return {
      success: true,
      emailLogId: emailLog.id,
      messageId: result.data?.id,
    };
  } catch (error) {
    // Update email log with failure
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: EmailStatus.FAILED,
        error: errorMessage,
      },
    });

    console.error('Failed to send email:', error);

    return {
      success: false,
      emailLogId: emailLog.id,
      error: errorMessage,
    };
  }
}

/**
 * Send a welcome email to a new user
 */
export async function sendWelcomeEmail(
  userId: string,
  email: string,
  name: string,
  loginUrl?: string
) {
  return sendEmail({
    to: email,
    subject: `Welcome to Dragon AI, ${name}! 🎉`,
    type: EmailType.WELCOME,
    data: { name, email, loginUrl },
    userId,
  });
}

/**
 * Send a new material notification email
 */
export async function sendNewMaterialEmail(
  userId: string,
  email: string,
  data: {
    studentName: string;
    courseName: string;
    materialTitle: string;
    materialType: 'video' | 'document' | 'quiz' | 'assignment' | 'other';
    materialUrl: string;
    instructorName?: string;
  }
) {
  return sendEmail({
    to: email,
    subject: '', // Will use template's subject
    type: EmailType.NEW_MATERIAL,
    data,
    userId,
    metadata: {
      courseName: data.courseName,
      materialTitle: data.materialTitle,
    },
  });
}

/**
 * Send an assignment reminder email
 */
export async function sendAssignmentReminderEmail(
  userId: string,
  email: string,
  data: {
    studentName: string;
    assignmentTitle: string;
    courseName: string;
    dueDate: Date;
    assignmentUrl: string;
    daysUntilDue: number;
  }
) {
  return sendEmail({
    to: email,
    subject: '', // Will use template's subject
    type: EmailType.ASSIGNMENT_REMINDER,
    data,
    userId,
    metadata: {
      courseName: data.courseName,
      assignmentTitle: data.assignmentTitle,
      dueDate: data.dueDate.toISOString(),
    },
  });
}

/**
 * Check if a user has email notifications enabled
 */
export async function canSendEmailToUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailNotifications: true },
  });

  return user?.emailNotifications ?? true;
}

/**
 * Get email logs for a user
 */
export async function getUserEmailLogs(
  userId: string,
  limit: number = 50
) {
  return prisma.emailLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get email statistics
 */
export async function getEmailStats(userId?: string) {
  const where = userId ? { userId } : {};

  const [total, sent, failed, pending] = await Promise.all([
    prisma.emailLog.count({ where }),
    prisma.emailLog.count({ where: { ...where, status: EmailStatus.SENT } }),
    prisma.emailLog.count({ where: { ...where, status: EmailStatus.FAILED } }),
    prisma.emailLog.count({ where: { ...where, status: EmailStatus.PENDING } }),
  ]);

  return {
    total,
    sent,
    failed,
    pending,
    successRate: total > 0 ? ((sent / total) * 100).toFixed(2) : '0',
  };
}
