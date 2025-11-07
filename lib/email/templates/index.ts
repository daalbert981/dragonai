import { EmailType } from '@prisma/client';
import { EmailTemplate } from '@/types/email';
import { welcomeEmailTemplate } from './welcome';
import { newMaterialEmailTemplate } from './new-material';
import { assignmentReminderEmailTemplate } from './assignment-reminder';

// Map of email types to their templates
export const emailTemplates: Record<EmailType, EmailTemplate> = {
  WELCOME: welcomeEmailTemplate,
  NEW_MATERIAL: newMaterialEmailTemplate,
  ASSIGNMENT_REMINDER: assignmentReminderEmailTemplate,
  // Placeholders for other email types
  EMAIL_VERIFICATION: welcomeEmailTemplate, // TODO: Implement
  PASSWORD_RESET: welcomeEmailTemplate, // TODO: Implement
  ASSIGNMENT_GRADED: welcomeEmailTemplate, // TODO: Implement
  COURSE_INVITATION: welcomeEmailTemplate, // TODO: Implement
  ANNOUNCEMENT: welcomeEmailTemplate, // TODO: Implement
};

export * from './welcome';
export * from './new-material';
export * from './assignment-reminder';
