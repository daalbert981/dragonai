import { EmailType, EmailStatus } from '@prisma/client';

// Email template data interfaces
export interface WelcomeEmailData {
  name: string;
  email: string;
  loginUrl?: string;
}

export interface NewMaterialEmailData {
  studentName: string;
  courseName: string;
  materialTitle: string;
  materialType: 'video' | 'document' | 'quiz' | 'assignment' | 'other';
  materialUrl: string;
  instructorName?: string;
}

export interface AssignmentReminderEmailData {
  studentName: string;
  assignmentTitle: string;
  courseName: string;
  dueDate: Date;
  assignmentUrl: string;
  daysUntilDue: number;
}

export interface EmailVerificationData {
  name: string;
  verificationUrl: string;
}

export interface PasswordResetEmailData {
  name: string;
  resetUrl: string;
  expiresIn?: string;
}

export interface AssignmentGradedEmailData {
  studentName: string;
  assignmentTitle: string;
  courseName: string;
  grade: string;
  feedback?: string;
  assignmentUrl: string;
}

export interface CourseInvitationEmailData {
  studentName: string;
  courseName: string;
  instructorName: string;
  courseUrl: string;
  startDate?: Date;
}

export interface AnnouncementEmailData {
  recipientName: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}

// Union type for all email data
export type EmailTemplateData =
  | WelcomeEmailData
  | NewMaterialEmailData
  | AssignmentReminderEmailData
  | EmailVerificationData
  | PasswordResetEmailData
  | AssignmentGradedEmailData
  | CourseInvitationEmailData
  | AnnouncementEmailData;

// Email send request
export interface SendEmailRequest {
  to: string;
  subject: string;
  type: EmailType;
  data: EmailTemplateData;
  userId?: string;
  metadata?: Record<string, any>;
}

// Email send response
export interface SendEmailResponse {
  success: boolean;
  emailLogId?: string;
  messageId?: string;
  error?: string;
}

// Email template
export interface EmailTemplate {
  subject: (data: any) => string;
  html: (data: any) => string;
  text: (data: any) => string;
}
