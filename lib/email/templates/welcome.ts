import { WelcomeEmailData } from '@/types/email';
import { baseEmailTemplate, createButton, createInfoBox } from './base';

export const welcomeEmailTemplate = {
  subject: (data: WelcomeEmailData) => `Welcome to Dragon AI, ${data.name}! 🎉`,

  html: (data: WelcomeEmailData) => {
    const loginUrl = data.loginUrl || 'http://localhost:3000/login';

    const content = `
      <h2 style="color: #333333; margin-top: 0;">Welcome aboard, ${data.name}! 🚀</h2>

      <p>We're thrilled to have you join Dragon AI, your intelligent teaching assistant platform!</p>

      <p>Dragon AI is designed to help you learn more effectively with:</p>

      ${createInfoBox(`
        <strong>✨ Smart Features for Your Success:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>📚 Access course materials anytime, anywhere</li>
          <li>📝 Track assignments and deadlines</li>
          <li>🎯 Receive personalized notifications</li>
          <li>💬 Get AI-powered assistance</li>
          <li>📊 Monitor your progress</li>
        </ul>
      `)}

      <p>Ready to get started? Click the button below to log in to your account:</p>

      <div style="text-align: center;">
        ${createButton('Go to Dashboard', loginUrl)}
      </div>

      <p style="margin-top: 30px;">If you have any questions or need assistance, don't hesitate to reach out to your instructor or administrator.</p>

      <p style="color: #667eea; font-weight: 600;">Happy learning! 📖</p>
    `;

    return baseEmailTemplate({
      preheader: 'Welcome to Dragon AI - Your intelligent learning companion',
      content,
    });
  },

  text: (data: WelcomeEmailData) => {
    const loginUrl = data.loginUrl || 'http://localhost:3000/login';

    return `
Welcome to Dragon AI, ${data.name}!

We're thrilled to have you join Dragon AI, your intelligent teaching assistant platform!

Dragon AI is designed to help you learn more effectively with:

✨ Smart Features for Your Success:
- 📚 Access course materials anytime, anywhere
- 📝 Track assignments and deadlines
- 🎯 Receive personalized notifications
- 💬 Get AI-powered assistance
- 📊 Monitor your progress

Ready to get started? Visit your dashboard at:
${loginUrl}

If you have any questions or need assistance, don't hesitate to reach out to your instructor or administrator.

Happy learning! 📖

---
Dragon AI
Your intelligent teaching assistant
    `.trim();
  },
};
