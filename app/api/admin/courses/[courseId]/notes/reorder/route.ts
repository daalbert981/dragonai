import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const isSuperadmin = (session.user as any).role === 'SUPERADMIN'
    if (!isSuperadmin) {
      const link = await prisma.courseInstructor.findFirst({
        where: { courseId: params.courseId, userId },
        select: { id: true },
      })
      if (!link) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await req.json()
    const { orderedIds } = body as { orderedIds: string[] }

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: 'orderedIds array required' }, { status: 400 })
    }

    // Verify all IDs belong to this course
    const notes = await prisma.classNote.findMany({
      where: { courseId: params.courseId, id: { in: orderedIds } },
      select: { id: true },
    })
    const existingIds = new Set(notes.map((n) => n.id))
    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        return NextResponse.json({ error: `Note ${id} not found in course` }, { status: 400 })
      }
    }

    // Batch update sort orders
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.classNote.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[NOTES] Error reordering:', error)
    return NextResponse.json({ error: 'Failed to reorder notes' }, { status: 500 })
  }
}
