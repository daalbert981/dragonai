import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

async function verifyInstructorAccess(courseId: string, session: any) {
  const userId = parseInt(session.user.id)
  if ((session.user as any).role === 'SUPERADMIN') return true
  const link = await prisma.courseInstructor.findFirst({
    where: { courseId, userId },
    select: { id: true },
  })
  return !!link
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { courseId: string; noteId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await verifyInstructorAccess(params.courseId, session))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await prisma.classNote.findUnique({
      where: { id: params.noteId },
      select: { id: true, courseId: true },
    })
    if (!existing || existing.courseId !== params.courseId) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    const body = await req.json()
    const data: any = {}
    if (body.type !== undefined && ['PRIOR', 'UPCOMING'].includes(body.type)) data.type = body.type
    if (body.title !== undefined) data.title = body.title
    if (body.content !== undefined) data.content = body.content
    if (body.activeAt !== undefined) data.activeAt = new Date(body.activeAt)
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

    const updated = await prisma.classNote.update({
      where: { id: params.noteId },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[NOTES] Error updating:', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { courseId: string; noteId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await verifyInstructorAccess(params.courseId, session))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await prisma.classNote.findUnique({
      where: { id: params.noteId },
      select: { id: true, courseId: true },
    })
    if (!existing || existing.courseId !== params.courseId) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    await prisma.classNote.delete({ where: { id: params.noteId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[NOTES] Error deleting:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
