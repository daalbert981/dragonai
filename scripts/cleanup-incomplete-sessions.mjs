#!/usr/bin/env node

/**
 * Cleanup Incomplete Sessions Script
 *
 * Removes chat sessions that have no ASSISTANT messages (incomplete conversations)
 * This is useful for cleaning up sessions from before the AI response saving bug was fixed.
 *
 * Usage:
 *   node scripts/cleanup-incomplete-sessions.mjs [--dry-run]
 *
 * Options:
 *   --dry-run: Show what would be deleted without actually deleting
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run');

/**
 * Main cleanup function
 */
async function cleanupIncompleteSessions() {
  console.log('='.repeat(60));
  console.log('Incomplete Sessions Cleanup Script');
  console.log('='.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Find all sessions
    const allSessions = await prisma.chatSession.findMany({
      include: {
        messages: {
          select: {
            role: true
          }
        }
      }
    });

    console.log(`Total sessions: ${allSessions.length}`);
    console.log('');

    // Find incomplete sessions (no ASSISTANT messages)
    const incompleteSessions = allSessions.filter(session => {
      const hasAssistantMessage = session.messages.some(m => m.role === 'ASSISTANT');
      const hasUserMessage = session.messages.some(m => m.role === 'USER');

      // Incomplete if it has user messages but no assistant messages
      return hasUserMessage && !hasAssistantMessage;
    });

    // Find completely empty sessions (no messages at all)
    const emptySessions = allSessions.filter(session => session.messages.length === 0);

    console.log(`Incomplete sessions (has USER but no ASSISTANT messages): ${incompleteSessions.length}`);
    console.log(`Empty sessions (no messages at all): ${emptySessions.length}`);
    console.log(`Total to delete: ${incompleteSessions.length + emptySessions.length}`);
    console.log('');

    if (incompleteSessions.length === 0 && emptySessions.length === 0) {
      console.log('No incomplete or empty sessions to clean up!');
      return;
    }

    if (isDryRun) {
      console.log('DRY RUN - Would delete the following sessions:');
      console.log('');

      if (incompleteSessions.length > 0) {
        console.log('Incomplete sessions:');
        for (const session of incompleteSessions.slice(0, 10)) {
          console.log(`  - ${session.id} (${session.messages.length} USER messages)`);
        }
        if (incompleteSessions.length > 10) {
          console.log(`  ... and ${incompleteSessions.length - 10} more`);
        }
        console.log('');
      }

      if (emptySessions.length > 0) {
        console.log('Empty sessions:');
        for (const session of emptySessions.slice(0, 10)) {
          console.log(`  - ${session.id} (0 messages)`);
        }
        if (emptySessions.length > 10) {
          console.log(`  ... and ${emptySessions.length - 10} more`);
        }
        console.log('');
      }
    } else {
      const sessionIdsToDelete = [
        ...incompleteSessions.map(s => s.id),
        ...emptySessions.map(s => s.id)
      ];

      // Delete sessions (cascade will delete messages)
      const result = await prisma.chatSession.deleteMany({
        where: {
          id: {
            in: sessionIdsToDelete
          }
        }
      });

      console.log(`Deleted ${result.count} sessions`);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));

    if (isDryRun) {
      console.log(`Would delete: ${incompleteSessions.length + emptySessions.length} sessions`);
    } else {
      console.log(`Deleted: ${incompleteSessions.length + emptySessions.length} sessions`);
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
cleanupIncompleteSessions();
