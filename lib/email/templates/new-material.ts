import { NewMaterialEmailData } from '@/types/email';
import { baseEmailTemplate, createButton, createInfoBox } from './base';

// Material type icons and labels
const materialTypeConfig = {
  video: { icon: '🎥', label: 'Video' },
  document: { icon: '📄', label: 'Document' },
  quiz: { icon: '❓', label: 'Quiz' },
  assignment: { icon: '📝', label: 'Assignment' },
  other: { icon: '📚', label: 'Material' },
};

export const newMaterialEmailTemplate = {
  subject: (data: NewMaterialEmailData) => {
    const config = materialTypeConfig[data.materialType];
    return `New ${config.label} Available: ${data.materialTitle}`;
  },

  html: (data: NewMaterialEmailData) => {
    const config = materialTypeConfig[data.materialType];

    const content = `
      <h2 style="color: #333333; margin-top: 0;">New Learning Material Available! ${config.icon}</h2>

      <p>Hi ${data.studentName},</p>

      <p>Great news! New learning material has been added to your course <strong>${data.courseName}</strong>.</p>

      ${createInfoBox(`
        <strong style="color: #667eea;">${config.icon} ${config.label} Details:</strong>
        <div style="margin-top: 10px;">
          <strong>${data.materialTitle}</strong>
          ${data.instructorName ? `<br><small style="color: #6c757d;">Added by ${data.instructorName}</small>` : ''}
        </div>
      `)}

      <p>This new ${config.label.toLowerCase()} is now available for you to explore. Don't miss out on this learning opportunity!</p>

      <div style="text-align: center;">
        ${createButton(`View ${config.label}`, data.materialUrl)}
      </div>

      <p style="margin-top: 30px; color: #6c757d; font-size: 14px;">
        💡 <strong>Tip:</strong> Stay on top of your learning by checking new materials regularly!
      </p>
    `;

    return baseEmailTemplate({
      preheader: `New ${config.label.toLowerCase()} added: ${data.materialTitle}`,
      content,
    });
  },

  text: (data: NewMaterialEmailData) => {
    const config = materialTypeConfig[data.materialType];

    return `
New Learning Material Available! ${config.icon}

Hi ${data.studentName},

Great news! New learning material has been added to your course ${data.courseName}.

${config.icon} ${config.label} Details:
${data.materialTitle}
${data.instructorName ? `Added by ${data.instructorName}` : ''}

This new ${config.label.toLowerCase()} is now available for you to explore. Don't miss out on this learning opportunity!

View the material at:
${data.materialUrl}

💡 Tip: Stay on top of your learning by checking new materials regularly!

---
Dragon AI
Your intelligent teaching assistant
    `.trim();
  },
};
