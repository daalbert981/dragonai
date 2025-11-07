# Email Notifications System

## Overview

The Dragon AI email notification system provides a comprehensive solution for sending transactional emails to students, admins, and instructors. Built with **Resend** as the email service provider, it includes professional templates, logging, error handling, and a REST API.

## Features

- ✅ **Multiple Email Types**: Welcome emails, new material notifications, assignment reminders, and more
- ✅ **Professional Templates**: Beautiful, responsive HTML email templates with consistent branding
- ✅ **Email Logging**: Complete audit trail of all sent emails with delivery status tracking
- ✅ **Error Handling**: Robust error handling with automatic retry capability
- ✅ **User Preferences**: Per-user email notification settings
- ✅ **REST API**: Easy-to-use API endpoints for sending and tracking emails
- ✅ **Test Endpoints**: Development endpoints for testing email templates

## Setup

### 1. Install Dependencies

```bash
npm install resend
```

### 2. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Email Service (Resend)
RESEND_API_KEY="re_your-resend-api-key-here"
EMAIL_FROM="Dragon AI <noreply@dragonai.com>"
EMAIL_FROM_NAME="Dragon AI"
```

**Getting a Resend API Key:**
1. Sign up at [resend.com](https://resend.com)
2. Verify your domain (or use their test domain for development)
3. Generate an API key from the dashboard
4. Add the key to your `.env` file

### 3. Run Database Migration

```bash
npm run db:generate
npm run db:push
```

This will create the `EmailLog` table and add email preferences to the User model.

## Database Schema

### EmailLog Model

Tracks all sent emails with delivery status:

```prisma
model EmailLog {
  id          String      @id @default(cuid())
  userId      String?
  user        User?       @relation(fields: [userId], references: [id])
  email       String
  subject     String
  type        EmailType
  status      EmailStatus @default(PENDING)
  error       String?
  metadata    Json?
  sentAt      DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

enum EmailType {
  WELCOME
  EMAIL_VERIFICATION
  PASSWORD_RESET
  NEW_MATERIAL
  ASSIGNMENT_REMINDER
  ASSIGNMENT_GRADED
  COURSE_INVITATION
  ANNOUNCEMENT
}

enum EmailStatus {
  PENDING
  SENT
  FAILED
  BOUNCED
  COMPLAINED
}
```

### User Model Updates

Added email preferences:

```prisma
model User {
  emailNotifications Boolean @default(true)
  emailLogs          EmailLog[]
}
```

## Available Email Templates

### 1. Welcome Email
Sent to new students when they register.

**Data Required:**
- `name`: Student's name
- `email`: Student's email
- `loginUrl`: Link to login page (optional)

**Usage:**
```typescript
import { sendWelcomeEmail } from '@/lib/email/send';

await sendWelcomeEmail(userId, email, name, loginUrl);
```

### 2. New Material Notification
Notifies students when new course material is added.

**Data Required:**
- `studentName`: Student's name
- `courseName`: Name of the course
- `materialTitle`: Title of the new material
- `materialType`: Type ('video' | 'document' | 'quiz' | 'assignment' | 'other')
- `materialUrl`: Link to the material
- `instructorName`: Instructor's name (optional)

**Usage:**
```typescript
import { sendNewMaterialEmail } from '@/lib/email/send';

await sendNewMaterialEmail(userId, email, {
  studentName: 'John Doe',
  courseName: 'Introduction to AI',
  materialTitle: 'Neural Networks Fundamentals',
  materialType: 'video',
  materialUrl: 'https://example.com/course/123/material/456',
  instructorName: 'Dr. Smith',
});
```

### 3. Assignment Reminder
Reminds students about upcoming assignment due dates.

**Data Required:**
- `studentName`: Student's name
- `assignmentTitle`: Title of the assignment
- `courseName`: Name of the course
- `dueDate`: Due date (Date object)
- `assignmentUrl`: Link to the assignment
- `daysUntilDue`: Number of days until due

**Features:**
- Urgency levels (changes color/styling based on days until due)
- Special formatting for assignments due today/tomorrow

**Usage:**
```typescript
import { sendAssignmentReminderEmail } from '@/lib/email/send';

const dueDate = new Date('2025-12-01');
await sendAssignmentReminderEmail(userId, email, {
  studentName: 'John Doe',
  assignmentTitle: 'Machine Learning Project',
  courseName: 'Introduction to AI',
  dueDate,
  assignmentUrl: 'https://example.com/assignment/789',
  daysUntilDue: 2,
});
```

## API Endpoints

### Send Email

**POST** `/api/email/send`

Send an email using a template.

**Request Body:**
```json
{
  "to": "student@example.com",
  "subject": "Optional custom subject",
  "type": "WELCOME",
  "data": {
    "name": "John Doe",
    "email": "student@example.com"
  },
  "userId": "user-id",
  "metadata": {
    "additionalInfo": "any"
  }
}
```

**Response:**
```json
{
  "success": true,
  "emailLogId": "log-id",
  "messageId": "resend-message-id"
}
```

### Test Email

**POST** `/api/email/test`

Send a test email for development/testing.

**Request Body:**
```json
{
  "to": "test@example.com",
  "type": "welcome"
}
```

Available types: `welcome`, `new-material`, `assignment-reminder`

**GET** `/api/email/test`

Get information about available test email types.

### Email Statistics

**GET** `/api/email/stats?userId=xxx`

Get email statistics (optionally filtered by user).

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 150,
    "sent": 145,
    "failed": 5,
    "pending": 0,
    "successRate": "96.67"
  }
}
```

### Email Logs

**GET** `/api/email/logs?userId=xxx&limit=50`

Get email logs for a specific user.

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "log-id",
      "email": "student@example.com",
      "subject": "Welcome to Dragon AI",
      "type": "WELCOME",
      "status": "SENT",
      "sentAt": "2025-11-07T10:30:00Z",
      "createdAt": "2025-11-07T10:30:00Z"
    }
  ],
  "count": 1
}
```

## Usage Examples

### Sending a Welcome Email

```typescript
import { sendWelcomeEmail } from '@/lib/email/send';

// In your registration handler
const result = await sendWelcomeEmail(
  user.id,
  user.email,
  user.name || 'Student',
  'https://dragonai.com/login'
);

if (result.success) {
  console.log('Welcome email sent:', result.messageId);
} else {
  console.error('Failed to send welcome email:', result.error);
}
```

### Notifying Students of New Material

```typescript
import { sendNewMaterialEmail } from '@/lib/email/send';

// When instructor uploads new material
const students = await getEnrolledStudents(courseId);

for (const student of students) {
  await sendNewMaterialEmail(student.id, student.email, {
    studentName: student.name,
    courseName: course.name,
    materialTitle: material.title,
    materialType: 'video',
    materialUrl: `https://dragonai.com/course/${courseId}/material/${material.id}`,
    instructorName: instructor.name,
  });
}
```

### Sending Assignment Reminders

```typescript
import { sendAssignmentReminderEmail } from '@/lib/email/send';

// Daily cron job to send reminders
const upcomingAssignments = await getUpcomingAssignments();

for (const assignment of upcomingAssignments) {
  const daysUntilDue = calculateDaysUntilDue(assignment.dueDate);

  // Send reminders 7 days, 3 days, 1 day, and on the due date
  if ([7, 3, 1, 0].includes(daysUntilDue)) {
    const enrollments = await getAssignmentEnrollments(assignment.id);

    for (const enrollment of enrollments) {
      await sendAssignmentReminderEmail(
        enrollment.student.id,
        enrollment.student.email,
        {
          studentName: enrollment.student.name,
          assignmentTitle: assignment.title,
          courseName: assignment.course.name,
          dueDate: assignment.dueDate,
          assignmentUrl: `https://dragonai.com/assignment/${assignment.id}`,
          daysUntilDue,
        }
      );
    }
  }
}
```

### Checking User Preferences

```typescript
import { canSendEmailToUser } from '@/lib/email/send';

// Before sending any email
const canSend = await canSendEmailToUser(userId);
if (canSend) {
  await sendEmail(...);
}
```

## Testing

### Test with API Endpoint

```bash
# Test welcome email
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "type": "welcome"
  }'

# Test new material email
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "type": "new-material"
  }'

# Test assignment reminder
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "type": "assignment-reminder"
  }'
```

### Development Tips

1. **Use Resend's Test Mode**: During development, use Resend's test domain to avoid affecting real email deliverability.

2. **Check Email Logs**: Monitor the `EmailLog` table to track all sent emails and debug issues.

3. **View Email Statistics**: Use `/api/email/stats` to monitor success rates.

4. **Test Templates**: Use the `/api/email/test` endpoint to preview emails before deploying.

## Customization

### Adding New Email Templates

1. Create a new template file in `lib/email/templates/`:

```typescript
// lib/email/templates/custom-email.ts
import { baseEmailTemplate, createButton } from './base';

export const customEmailTemplate = {
  subject: (data) => `Custom Subject`,
  html: (data) => {
    const content = `
      <h2>Custom Email</h2>
      <p>Your content here</p>
      ${createButton('Action', data.actionUrl)}
    `;
    return baseEmailTemplate({ content });
  },
  text: (data) => `Plain text version`,
};
```

2. Add the template to `lib/email/templates/index.ts`:

```typescript
import { customEmailTemplate } from './custom-email';

export const emailTemplates = {
  // ... existing templates
  CUSTOM: customEmailTemplate,
};
```

3. Add the email type to the Prisma schema:

```prisma
enum EmailType {
  // ... existing types
  CUSTOM
}
```

4. Create a helper function in `lib/email/send.ts`:

```typescript
export async function sendCustomEmail(userId, email, data) {
  return sendEmail({
    to: email,
    subject: '',
    type: EmailType.CUSTOM,
    data,
    userId,
  });
}
```

### Customizing Email Styles

Edit `lib/email/templates/base.ts` to customize:
- Colors and branding
- Header/footer content
- Typography
- Button styles
- Layout

## Troubleshooting

### Emails Not Sending

1. **Check API Key**: Verify `RESEND_API_KEY` is set correctly in `.env`
2. **Check Domain**: Ensure your domain is verified in Resend dashboard
3. **Check Logs**: Query the `EmailLog` table for error messages
4. **Check Console**: Look for error messages in application logs

### Email Going to Spam

1. **Verify Domain**: Set up SPF, DKIM, and DMARC records
2. **Warm Up**: Gradually increase sending volume
3. **Content**: Avoid spam trigger words
4. **Engagement**: Remove unengaged recipients

### Rate Limiting

Resend has rate limits. For bulk sending:
1. Batch emails in groups
2. Add delays between batches
3. Consider upgrading your Resend plan

## Future Enhancements

- [ ] Email verification template
- [ ] Password reset template
- [ ] Assignment graded notification
- [ ] Course invitation template
- [ ] Announcement template
- [ ] Email preference management UI
- [ ] Bulk email sending with queuing
- [ ] Scheduled email sending
- [ ] Email analytics dashboard
- [ ] A/B testing for email templates
- [ ] Webhook handling for bounces/complaints

## Support

For issues or questions:
- Check the [Resend documentation](https://resend.com/docs)
- Review the email logs in the database
- Test with the `/api/email/test` endpoint
- Check application logs for error messages

---

**Built with ❤️ for Dragon AI**
