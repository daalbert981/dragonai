import { PrismaClient } from '@prisma/client';

const DATABASE_URL = "postgres://ub4k0m1t3kp0jf:***REDACTED***@c57oa7dm3pc281.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/de5ohdk3foejht";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function main() {
  console.log('Testing file context query for existing session...\n');

  try {
    // Use the most recent session that has files (cmhtyjcgp000t2xmwwmups8e4)
    const sessionId = 'cmhtyjcgp000t2xmwwmups8e4';
    const messageLimit = 10;

    console.log(`Session ID: ${sessionId}`);
    console.log(`Message Limit: ${messageLimit}\n`);

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: messageLimit,
      include: {
        fileUploads: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            extractedText: true,
            parsedData: true,
            tokenCount: true,
            url: true,
            status: true
          }
        }
      }
    });

    console.log(`Found ${messages.length} messages\n`);
    console.log('='.repeat(80) + '\n');

    messages.reverse();

    messages.forEach((msg, idx) => {
      console.log(`Message ${idx + 1}:`);
      console.log(`  ID: ${msg.id}`);
      console.log(`  Role: ${msg.role}`);
      console.log(`  Content: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
      console.log(`  File Uploads: ${msg.fileUploads?.length || 0}`);

      if (msg.fileUploads && msg.fileUploads.length > 0) {
        msg.fileUploads.forEach((file, fileIdx) => {
          console.log(`    File ${fileIdx + 1}:`);
          console.log(`      Name: ${file.originalName}`);
          console.log(`      Status: ${file.status}`);
          console.log(`      Has Extracted Text: ${!!file.extractedText}`);
          if (file.extractedText) {
            console.log(`      Extracted Text Length: ${file.extractedText.length} characters`);
            console.log(`      Preview: ${file.extractedText.substring(0, 150)}...`);
          }
        });
      }
      console.log('');
    });

    // Now simulate the file context building logic
    console.log('='.repeat(80));
    console.log('\nSimulating File Context Building:\n');

    let fileContext = '';
    messages.forEach((msg, idx) => {
      console.log(`Processing message ${idx + 1}: has ${msg.fileUploads?.length || 0} file uploads`);
      if (msg.fileUploads && msg.fileUploads.length > 0) {
        msg.fileUploads.forEach(file => {
          console.log(`  File: ${file.originalName}, status: ${file.status}, hasText: ${!!file.extractedText}`);
          if (file.extractedText) {
            fileContext += `\n\n[File: ${file.originalName}]\n${file.extractedText}\n`;
            console.log(`    ✓ Added ${file.extractedText.length} characters to file context`);
          }
        });
      }
    });

    console.log(`\n${'='.repeat(80)}`);
    console.log(`\nFinal File Context Length: ${fileContext.length} characters`);
    console.log(`File Context Empty: ${fileContext.length === 0}`);

    if (fileContext.length > 0) {
      console.log(`\nFile Context Preview (first 500 chars):\n${fileContext.substring(0, 500)}...`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
