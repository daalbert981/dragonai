/**
 * Email Sending (Resend)
 *
 * Active only when RESEND_API_KEY and EMAIL_FROM are configured; callers
 * should check isEmailConfigured() and fall back to the CSV workflow
 * otherwise. Sends are sequential with a small delay upstream (Resend
 * free tier allows ~2 requests/second).
 */

import { Resend } from 'resend'

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

export interface SetupEmailParams {
  to: string
  setupUrl: string
  courseName: string
}

export async function sendSetupEmail({
  to,
  setupUrl,
  courseName,
}: SetupEmailParams): Promise<{ sent: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    return { sent: false, error: 'Email is not configured (RESEND_API_KEY / EMAIL_FROM)' }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const html = `
    <div style="font-family: Inter, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 16px;">Welcome to Dragon AI</h2>
      <p>You've been enrolled in <strong>${escapeHtml(courseName)}</strong> on Dragon AI, your course's AI teaching assistant.</p>
      <p>Click the button below to set up your account (choose a username and password):</p>
      <p style="margin: 24px 0;">
        <a href="${setupUrl}" style="background: #111; color: #FFC600; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Set up your account
        </a>
      </p>
      <p style="font-size: 13px; color: #666;">Or copy this link: <br />${setupUrl}</p>
      <p style="font-size: 13px; color: #666;">This link expires in 7 days. If it has expired, contact your instructor.</p>
    </div>
  `

  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject: `Set up your Dragon AI account — ${courseName}`,
      html,
    })

    if (error) {
      return { sent: false, error: error.message }
    }
    return { sent: true }
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Send failed' }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
