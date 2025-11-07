import { Resend } from 'resend';

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('RESEND_API_KEY is not set. Email functionality will be disabled.');
}

export const resend = new Resend(resendApiKey || 'dummy-key');

// Email configuration
export const emailConfig = {
  from: process.env.EMAIL_FROM || 'Dragon AI <onboarding@resend.dev>',
  fromName: process.env.EMAIL_FROM_NAME || 'Dragon AI',
  replyTo: process.env.EMAIL_REPLY_TO,
};

// Check if email service is configured
export const isEmailConfigured = (): boolean => {
  return !!resendApiKey && resendApiKey !== 'dummy-key';
};
