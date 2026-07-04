/**
 * File Cleanup Utilities
 *
 * Shared deletion paths that keep Google Cloud Storage in sync with the
 * database. Every place that deletes ChatSessions or FileUpload rows must
 * go through these helpers — deleting only the DB rows orphans the
 * uploaded files in GCS indefinitely (FERPA: student files must actually
 * be deleted when their data is deleted).
 *
 * GCS deletion is best-effort: a failed object delete is logged but never
 * blocks the database deletion.
 */

import { Storage } from '@google-cloud/storage'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  ...(process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY
    ? {
        credentials: {
          client_email: process.env.GCS_CLIENT_EMAIL,
          private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
      }
    : process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
    : {}),
})

const bucketName = process.env.GCS_BUCKET_NAME

/**
 * Delete GCS objects by object name (FileUpload.filename), best-effort.
 */
export async function deleteGcsObjects(
  filenames: string[]
): Promise<{ deleted: number; failed: number }> {
  if (filenames.length === 0 || !bucketName) {
    return { deleted: 0, failed: 0 }
  }

  const bucket = storage.bucket(bucketName)
  let deleted = 0
  let failed = 0

  for (const filename of filenames) {
    try {
      await bucket.file(filename).delete()
      deleted++
    } catch (error) {
      failed++
      console.warn(
        `[FILE-CLEANUP] Failed to delete GCS object ${filename}:`,
        (error as Error).message
      )
    }
  }

  return { deleted, failed }
}

/**
 * Delete chat sessions matching `where`, including their uploaded files
 * in GCS. DB cascade removes messages and FileUpload rows.
 */
export async function deleteSessionsWithFiles(
  where: Prisma.ChatSessionWhereInput
): Promise<{ sessions: number; files: number; filesFailed: number }> {
  const sessions = await prisma.chatSession.findMany({
    where,
    select: {
      id: true,
      messages: {
        select: {
          fileUploads: { select: { filename: true } },
        },
      },
    },
  })

  if (sessions.length === 0) {
    return { sessions: 0, files: 0, filesFailed: 0 }
  }

  const filenames = sessions.flatMap((s) =>
    s.messages.flatMap((m) => m.fileUploads.map((f) => f.filename))
  )

  const gcs = await deleteGcsObjects(filenames)

  const result = await prisma.chatSession.deleteMany({
    where: { id: { in: sessions.map((s) => s.id) } },
  })

  return { sessions: result.count, files: gcs.deleted, filesFailed: gcs.failed }
}

/**
 * Delete ALL of a user's chat data and uploaded files (GCS + DB).
 * Covers orphan uploads that were never attached to a message
 * (FileUpload.messageId is nullable), which session-based deletion misses.
 *
 * Does NOT delete the user row itself.
 */
export async function deleteUserChatDataWithFiles(
  userId: number
): Promise<{ sessions: number; files: number; filesFailed: number }> {
  const uploads = await prisma.fileUpload.findMany({
    where: { userId },
    select: { filename: true },
  })

  const gcs = await deleteGcsObjects(uploads.map((u) => u.filename))

  // Orphan uploads are not cascade-deleted with sessions
  await prisma.fileUpload.deleteMany({ where: { userId } })

  const userSessions = await prisma.chatSession.findMany({
    where: { userId },
    select: { id: true },
  })

  let sessionCount = 0
  if (userSessions.length > 0) {
    const sessionIds = userSessions.map((s) => s.id)
    await prisma.chatMessage.deleteMany({ where: { sessionId: { in: sessionIds } } })
    const result = await prisma.chatSession.deleteMany({ where: { userId } })
    sessionCount = result.count
  }

  return { sessions: sessionCount, files: gcs.deleted, filesFailed: gcs.failed }
}
