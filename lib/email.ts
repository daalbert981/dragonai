// Email utility for sending student credentials
// Using Resend for email delivery

export interface SendCredentialsEmailParams {
  to: string
  name: string
  email: string
  password: string
  courseTitle?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Sends welcome email with login credentials to a new student
 */
export async function sendCredentialsEmail(
  params: SendCredentialsEmailParams
): Promise<EmailResult> {
  const { to, name, email, password, courseTitle } = params

  // Check if Resend is configured
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Email not sent.')
    return {
      success: false,
      error: 'Email service not configured'
    }
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Dragon AI</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Dragon AI</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px; margin-top: 0;">Hi ${name},</p>

            <p style="font-size: 16px;">
              ${courseTitle
                ? `You've been enrolled in <strong>${courseTitle}</strong>. `
                : 'You\'ve been enrolled in a course. '
              }
              Your student account has been created and you can now access the Dragon AI platform.
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #667eea; margin: 25px 0;">
              <h2 style="margin-top: 0; color: #667eea; font-size: 18px;">Your Login Credentials</h2>
              <p style="margin: 10px 0;">
                <strong>Email:</strong><br>
                <code style="background: #f3f4f6; padding: 5px 10px; border-radius: 4px; font-size: 14px;">${email}</code>
              </p>
              <p style="margin: 10px 0;">
                <strong>Password:</strong><br>
                <code style="background: #f3f4f6; padding: 5px 10px; border-radius: 4px; font-size: 14px;">${password}</code>
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/login"
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Log In to Dragon AI
              </a>
            </div>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>⚠️ Security Tip:</strong> Please change your password after your first login for security purposes.
              </p>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              If you have any questions or need assistance, please don't hesitate to reach out to your instructor or our support team.
            </p>

            <p style="font-size: 14px; color: #6b7280;">
              Best regards,<br>
              The Dragon AI Team
            </p>
          </div>

          <div style="text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;">
            <p style="margin: 5px 0;">This is an automated message. Please do not reply to this email.</p>
            <p style="margin: 5px 0;">© ${new Date().getFullYear()} Dragon AI. All rights reserved.</p>
          </div>
        </body>
      </html>
    `

    const text = `
Welcome to Dragon AI, ${name}!

${courseTitle ? `You've been enrolled in ${courseTitle}.` : 'You\'ve been enrolled in a course.'}

Your Login Credentials:
Email: ${email}
Password: ${password}

Log in at: ${appUrl}/login

Security Tip: Please change your password after your first login.

If you have any questions, please contact your instructor or our support team.

Best regards,
The Dragon AI Team
    `.trim()

    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Dragon AI <noreply@dragonai.com>',
      to,
      subject: courseTitle ? `Welcome to ${courseTitle} - Your Login Credentials` : 'Welcome to Dragon AI - Your Login Credentials',
      html,
      text,
    })

    return {
      success: true,
      messageId: response.data?.id
    }
  } catch (error) {
    console.error('Failed to send email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Sends a batch of credential emails
 */
export async function sendBatchCredentialsEmails(
  students: SendCredentialsEmailParams[]
): Promise<{ sent: number; failed: number; errors: Array<{ email: string; error: string }> }> {
  const results = await Promise.allSettled(
    students.map(student => sendCredentialsEmail(student))
  )

  let sent = 0
  let failed = 0
  const errors: Array<{ email: string; error: string }> = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      sent++
    } else {
      failed++
      const error = result.status === 'fulfilled'
        ? result.value.error
        : (result.reason instanceof Error ? result.reason.message : 'Unknown error')

      errors.push({
        email: students[index].to,
        error: error || 'Unknown error'
      })
    }
  })

  return { sent, failed, errors }
}
