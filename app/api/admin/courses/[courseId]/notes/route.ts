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

export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await verifyInstructorAccess(params.courseId, session))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const notes = await prisma.classNote.findMany({
      where: { courseId: params.courseId },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error('[NOTES] Error fetching:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await verifyInstructorAccess(params.courseId, session))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { type, title, content, activeAt, expiresAt } = body

    if (!type || !['PRIOR', 'UPCOMING'].includes(type)) {
      return NextResponse.json({ error: 'type must be PRIOR or UPCOMING' }, { status: 400 })
    }
    if (!title || !content || !activeAt) {
      return NextResponse.json({ error: 'title, content, and activeAt are required' }, { status: 400 })
    }

    // New notes get sortOrder 0 (newest first); shift existing notes down
    await prisma.classNote.updateMany({
      where: { courseId: params.courseId, type },
      data: { sortOrder: { increment: 1 } },
    })

    const note = await prisma.classNote.create({
      data: {
        courseId: params.courseId,
        type,
        title,
        content,
        activeAt: new Date(activeAt),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        sortOrder: 0,
      },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('[NOTES] Error creating:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
