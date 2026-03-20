#!/usr/bin/env node

/**
 * Session Cleanup Script
 *
 * Automatically cleans up chat sessions based on course retention policies:
 * - "forever": Sessions are kept indefinitely (no cleanup)
 * - "never": Sessions are deleted if they haven't been updated in 24 hours
 * - "custom": Sessions are deleted after the specified days/hours
 *
 * Also deletes associated files from Google Cloud Storage.
 *
 * Usage:
 *   node scripts/cleanup-sessions.mjs [--dry-run]
 *
 * Options:
 *   --dry-run: Show what would be deleted without actually deleting
 */

import { PrismaClient } from '@prisma/client';
import { Storage } from '@google-cloud/storage';

const prisma = new PrismaClient();

// Initialize Google Cloud Storage
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});
const bucketName = process.env.GCS_BUCKET_NAME;

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run');

/**
 * Calculate the cutoff date for a retention policy
 */
function calculateCutoffDate(policy, days, hours) {
  const now = new Date();

  if (policy === 'never') {
    // For "never" policy, delete sessions older than 24 hours
    const cutoff = new Date(now);
    cutoff.setHours(cutoff.getHours() - 24);
    return cutoff;
  }

  if (policy === 'custom') {
    const totalHours = (days || 0) * 24 + (hours || 0);
    const cutoff = new Date(now);
    cutoff.setHours(cutoff.getHours() - totalHours);
    return cutoff;
  }

  return null; // No cutoff for "forever"
}

/**
 * Clean up sessions for a specific course
 */
async function cleanupCourseSession(course, dryRun = false) {
  const { id, name, code, sessionRetentionPolicy, sessionRetentionDays, sessionRetentionHours } = course;

  // Skip courses with "forever" retention
  if (sessionRetentionPolicy === 'forever') {
    console.log(`[${code}] Skipping - retention policy is "forever"`);
    return { deleted: 0, skipped: true };
  }

  // Calculate cutoff date
  const cutoffDate = calculateCutoffDate(
    sessionRetentionPolicy,
    sessionRetentionDays,
    sessionRetentionHours
  );

  if (!cutoffDate) {
    console.log(`[${code}] Skipping - invalid retention configuration`);
    return { deleted: 0, skipped: true };
  }

  console.log(`[${code}] Policy: ${sessionRetentionPolicy}`);
  if (sessionRetentionPolicy === 'custom') {
    console.log(`[${code}] Retention: ${sessionRetentionDays || 0} days, ${sessionRetentionHours || 0} hours`);
  }
  console.log(`[${code}] Cutoff date: ${cutoffDate.toISOString()}`);

  // Find sessions to delete
  const sessionsToDelete = await prisma.chatSession.findMany({
    where: {
      courseId: id,
      updatedAt: {
        lt: cutoffDate
      }
    },
    include: {
      messages: {
        include: {
          fileUploads: {
            select: {
              filename: true
            }
          }
        }
      }
    }
  });

  if (sessionsToDelete.length === 0) {
    console.log(`[${code}] No sessions to delete`);
    return { deleted: 0, skipped: false };
  }

  // Collect all file uploads from sessions
  const filesToDelete = [];
  for (const session of sessionsToDelete) {
    for (const message of session.messages) {
      for (const file of message.fileUploads) {
        filesToDelete.push(file.filename);
      }
    }
  }

  console.log(`[${code}] Found ${sessionsToDelete.length} sessions to delete`);
  if (filesToDelete.length > 0) {
    console.log(`[${code}] Found ${filesToDelete.length} files to delete from GCS`);
  }

  if (dryRun) {
    console.log(`[${code}] DRY RUN - Would delete:`);
    for (const session of sessionsToDelete) {
      console.log(`  - Session ${session.id.substring(0, 8)}... (${session.messages.length} messages, last updated: ${session.updatedAt.toISOString()})`);
    }
    if (filesToDelete.length > 0) {
      console.log(`[${code}] Would also delete ${filesToDelete.length} files from GCS`);
    }
    return { deleted: 0, wouldDelete: sessionsToDelete.length };
  }

  // Delete files from Google Cloud Storage first
  if (filesToDelete.length > 0 && bucketName) {
    const bucket = storage.bucket(bucketName);
    let deletedFiles = 0;

    for (const filename of filesToDelete) {
      try {
        await bucket.file(filename).delete();
        deletedFiles++;
      } catch (error) {
        console.warn(`[${code}] Failed to delete file ${filename} from GCS:`, error.message);
      }
    }

    console.log(`[${code}] Deleted ${deletedFiles}/${filesToDelete.length} files from GCS`);
  }

  // Delete sessions (cascade will delete messages and file upload records)
  const result = await prisma.chatSession.deleteMany({
    where: {
      id: {
        in: sessionsToDelete.map(s => s.id)
      }
    }
  });

  console.log(`[${code}] Deleted ${result.count} sessions from database`);
  return { deleted: result.count, skipped: false };
}

/**
 * Main cleanup function
 */
async function cleanupSessions() {
  console.log('='.repeat(60));
  console.log('Session Cleanup Script');
  console.log('='.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Get all courses
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        sessionRetentionPolicy: true,
        sessionRetentionDays: true,
        sessionRetentionHours: true
      }
    });

    console.log(`Found ${courses.length} courses`);
    console.log('');

    let totalDeleted = 0;
    let totalWouldDelete = 0;
    let coursesProcessed = 0;
    let coursesSkipped = 0;

    // Process each course
    for (const course of courses) {
      const result = await cleanupCourseSession(course, isDryRun);

      if (result.skipped) {
        coursesSkipped++;
      } else {
        coursesProcessed++;
      }

      totalDeleted += result.deleted || 0;
      totalWouldDelete += result.wouldDelete || 0;

      console.log('');
    }

    // Summary
    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`Courses processed: ${coursesProcessed}`);
    console.log(`Courses skipped: ${coursesSkipped}`);

    if (isDryRun) {
      console.log(`Would delete: ${totalWouldDelete} sessions`);
    } else {
      console.log(`Deleted: ${totalDeleted} sessions`);
    }

    console.log(`Completed at: ${new Date().toISOString()}`);
    console.log('');

  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupSessions();
