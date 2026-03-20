/**
 * Check Recent File Uploads
 *
 * Lists recent file upload attempts to diagnose upload issues
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecentUploads() {
  try {
    console.log('🔍 Checking recent file uploads...\n');

    // Get recent file uploads
    const recentUploads = await prisma.fileUpload.findMany({
      orderBy: { uploadedAt: 'desc' },
      take: 10,
      include: {
        message: {
          select: {
            id: true,
            content: true,
            sessionId: true
          }
        }
      }
    });

    if (recentUploads.length === 0) {
      console.log('❌ No file uploads found in database');
      return;
    }

    console.log(`Found ${recentUploads.length} recent uploads:\n`);

    recentUploads.forEach((upload, index) => {
      console.log(`${index + 1}. ${upload.originalName}`);
      console.log(`   ID: ${upload.id}`);
      console.log(`   MIME Type: ${upload.mimeType || 'unknown'}`);
      console.log(`   Size: ${upload.size} bytes`);
      console.log(`   Status: ${upload.status}`);
      console.log(`   Uploaded: ${upload.uploadedAt.toISOString()}`);
      console.log(`   Has extracted text: ${!!upload.extractedText}`);
      console.log(`   Text length: ${upload.extractedText?.length || 0} chars`);
      console.log(`   Token count: ${upload.tokenCount || 0}`);
      console.log(`   Processing error: ${upload.processingError || 'none'}`);
      console.log(`   Linked to message: ${upload.messageId ? 'Yes' : 'No'}`);

      if (upload.message) {
        console.log(`   Message content: "${upload.message.content.substring(0, 60)}..."`);
      }

      console.log('');
    });

    // Check for PDFs specifically
    const pdfUploads = recentUploads.filter(u => u.mimeType === 'application/pdf');
    if (pdfUploads.length > 0) {
      console.log(`\n⚠️  Found ${pdfUploads.length} PDF upload(s):`);
      pdfUploads.forEach(pdf => {
        console.log(`   - ${pdf.originalName}`);
        console.log(`     Status: ${pdf.status}`);
        console.log(`     Error: ${pdf.processingError || 'none'}`);
        console.log(`     Has text: ${!!pdf.extractedText}`);
      });
      console.log('\nNote: PDF text extraction is currently disabled due to webpack issues.');
      console.log('PDFs will upload but the chatbot cannot read their content.');
    }

    // Check for failed uploads
    const failedUploads = recentUploads.filter(u => u.status === 'FAILED');
    if (failedUploads.length > 0) {
      console.log(`\n❌ Found ${failedUploads.length} failed upload(s):`);
      failedUploads.forEach(failed => {
        console.log(`   - ${failed.originalName}`);
        console.log(`     Error: ${failed.processingError}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking uploads:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentUploads();
