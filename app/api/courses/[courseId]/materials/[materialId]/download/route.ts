/**
 * Material download proxy
 *
 * Authorizes access (instructor of course OR enrolled student OR superadmin),
 * records a non-invasive download event (counts only — no content captured),
 * then redirects to the GCS signed URL.
 *
 * The MaterialDownload insert is best-effort — if the table doesn't exist yet
 * (e.g., between deploy and `prisma db push`), the download still succeeds.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string; materialId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userIdRaw = (session.user as any).id
    const userId = parseInt(userIdRaw)
    if (!userId || isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }
    const userRole = (session.user as any).role as string | undefined

    const material = await prisma.courseMaterial.findUnique({
      where: { id: params.materialId },
      select: { id: true, courseId: true, storageUrl: true, originalName: true },
    })

    if (!material || material.courseId !== params.courseId) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    // Authorize: superadmin, course instructor, or enrolled student
    let allowed = userRole === 'SUPERADMIN'
    if (!allowed) {
      const isInstructor = await prisma.courseInstructor.findFirst({
        where: { courseId: params.courseId, userId },
        select: { id: true },
      })
      allowed = !!isInstructor
    }
    if (!allowed) {
      const isEnrolled = await prisma.courseEnrollment.findFirst({
        where: { courseId: params.courseId, userId },
        select: { id: true },
      })
      allowed = !!isEnrolled
    }

    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Record event (best-effort — never blocks the download)
    try {
      await (prisma as any).materialDownload.create({
        data: {
          materialId: material.id,
          courseId: material.courseId,
          userId,
          userRole: userRole ?? null,
        },
      })
    } catch (err) {
      console.warn('[DOWNLOAD] Could not record event:', err instanceof Error ? err.message : err)
    }

    return NextResponse.redirect(material.storageUrl, { status: 302 })
  } catch (error) {
    console.error('[DOWNLOAD] Error:', error)
    return NextResponse.json({ error: 'Failed to download' }, { status: 500 })
  }
}
