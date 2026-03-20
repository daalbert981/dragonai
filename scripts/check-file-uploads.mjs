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
  console.log('Checking file uploads...\n');

  try {
    // Get all file uploads
    const fileUploads = await prisma.fileUpload.findMany({
      orderBy: {
        uploadedAt: 'desc'
      },
      take: 10
    });

    console.log(`Found ${fileUploads.length} file uploads\n`);
    console.log('='.repeat(80) + '\n');

    fileUploads.forEach((file, index) => {
      console.log(`File ${index + 1}:`);
      console.log(`  ID: ${file.id}`);
      console.log(`  Original Name: ${file.originalName}`);
      console.log(`  MIME Type: ${file.mimeType}`);
      console.log(`  Status: ${file.status}`);
      console.log(`  User ID: ${file.userId}`);
      console.log(`  Message ID: ${file.messageId || '(not linked to message)'}`);
      console.log(`  Size: ${file.size} bytes`);
      console.log(`  Uploaded: ${file.uploadedAt}`);
      console.log(`  Has Extracted Text: ${!!file.extractedText}`);
      if (file.extractedText) {
        console.log(`  Extracted Text Length: ${file.extractedText.length} characters`);
        console.log(`  Extracted Text Preview: ${file.extractedText.substring(0, 200)}...`);
      }
      console.log(`  Token Count: ${file.tokenCount || 'N/A'}`);
      if (file.processingError) {
        console.log(`  Processing Error: ${file.processingError}`);
      }
      console.log('');
    });

    // Check if any files are linked to messages
    const linkedFiles = await prisma.fileUpload.findMany({
      where: {
        messageId: { not: null }
      },
      include: {
        message: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            sessionId: true
          }
        }
      }
    });

    console.log('='.repeat(80));
    console.log(`\nFiles linked to messages: ${linkedFiles.length}\n`);

    linkedFiles.forEach((file, index) => {
      console.log(`Linked File ${index + 1}:`);
      console.log(`  File: ${file.originalName}`);
      console.log(`  Message ID: ${file.messageId}`);
      console.log(`  Session ID: ${file.message?.sessionId}`);
      console.log(`  Message Content: ${file.message?.content.substring(0, 100)}...`);
      console.log(`  Has Extracted Text: ${!!file.extractedText}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
