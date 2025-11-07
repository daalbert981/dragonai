import { AssignmentReminderEmailData } from '@/types/email';
import { baseEmailTemplate, createButton, createInfoBox, formatEmailDate } from './base';

// Get urgency level based on days until due
const getUrgencyConfig = (daysUntilDue: number) => {
  if (daysUntilDue <= 1) {
    return {
      urgencyLevel: 'high',
      urgencyText: '🚨 URGENT',
      urgencyColor: '#dc3545',
      message: 'This assignment is due very soon!',
    };
  } else if (daysUntilDue <= 3) {
    return {
      urgencyLevel: 'medium',
      urgencyText: '⚠️ REMINDER',
      urgencyColor: '#ffc107',
      message: 'This assignment is due in a few days.',
    };
  } else {
    return {
      urgencyLevel: 'low',
      urgencyText: '📌 REMINDER',
      urgencyColor: '#667eea',
      message: 'Don\'t forget about this upcoming assignment.',
    };
  }
};

export const assignmentReminderEmailTemplate = {
  subject: (data: AssignmentReminderEmailData) => {
    const config = getUrgencyConfig(data.daysUntilDue);
    if (data.daysUntilDue === 0) {
      return `🚨 Due Today: ${data.assignmentTitle}`;
    } else if (data.daysUntilDue === 1) {
      return `⚠️ Due Tomorrow: ${data.assignmentTitle}`;
    } else {
      return `📌 Reminder: ${data.assignmentTitle} due in ${data.daysUntilDue} days`;
    }
  },

  html: (data: AssignmentReminderEmailData) => {
    const config = getUrgencyConfig(data.daysUntilDue);
    const formattedDate = formatEmailDate(data.dueDate);

    let timeRemaining = '';
    if (data.daysUntilDue === 0) {
      timeRemaining = 'Due <strong style="color: #dc3545;">TODAY</strong>';
    } else if (data.daysUntilDue === 1) {
      timeRemaining = 'Due <strong style="color: #ffc107;">TOMORROW</strong>';
    } else {
      timeRemaining = `Due in <strong style="color: ${config.urgencyColor};">${data.daysUntilDue} days</strong>`;
    }

    const content = `
      <h2 style="color: #333333; margin-top: 0;">
        <span style="color: ${config.urgencyColor};">${config.urgencyText}</span> Assignment Reminder
      </h2>

      <p>Hi ${data.studentName},</p>

      <p>${config.message}</p>

      ${createInfoBox(`
        <strong style="color: #667eea; font-size: 16px;">📝 ${data.assignmentTitle}</strong>
        <div style="margin-top: 12px; line-height: 1.8;">
          <div><strong>Course:</strong> ${data.courseName}</div>
          <div><strong>Due Date:</strong> ${formattedDate}</div>
          <div style="margin-top: 8px; font-size: 18px;">${timeRemaining}</div>
        </div>
      `)}

      ${data.daysUntilDue <= 1 ? `
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <strong>⏰ Time is running out!</strong>
          <p style="margin: 8px 0 0 0;">Make sure to submit your assignment before the deadline to avoid late penalties.</p>
        </div>
      ` : ''}

      <p>Click the button below to view the assignment details and submit your work:</p>

      <div style="text-align: center;">
        ${createButton('View Assignment', data.assignmentUrl)}
      </div>

      <p style="margin-top: 30px; color: #6c757d; font-size: 14px;">
        💡 <strong>Pro Tip:</strong> Plan your time wisely and start working on assignments early to avoid last-minute stress!
      </p>
    `;

    return baseEmailTemplate({
      preheader: `Assignment reminder: ${data.assignmentTitle} - ${timeRemaining}`,
      content,
    });
  },

  text: (data: AssignmentReminderEmailData) => {
    const config = getUrgencyConfig(data.daysUntilDue);
    const formattedDate = formatEmailDate(data.dueDate);

    let timeRemaining = '';
    if (data.daysUntilDue === 0) {
      timeRemaining = 'Due TODAY';
    } else if (data.daysUntilDue === 1) {
      timeRemaining = 'Due TOMORROW';
    } else {
      timeRemaining = `Due in ${data.daysUntilDue} days`;
    }

    return `
${config.urgencyText} Assignment Reminder

Hi ${data.studentName},

${config.message}

📝 Assignment Details:
${data.assignmentTitle}

Course: ${data.courseName}
Due Date: ${formattedDate}
${timeRemaining}

${data.daysUntilDue <= 1 ? '⏰ Time is running out! Make sure to submit your assignment before the deadline to avoid late penalties.\n' : ''}

View and submit your assignment at:
${data.assignmentUrl}

💡 Pro Tip: Plan your time wisely and start working on assignments early to avoid last-minute stress!

---
Dragon AI
Your intelligent teaching assistant
    `.trim();
  },
};
