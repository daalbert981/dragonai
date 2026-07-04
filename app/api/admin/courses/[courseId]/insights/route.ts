/**
 * Course Insights API Route
 *
 * GET  — fetch stored insight themes for the course
 * POST — regenerate insights on demand (rate-limited to ~1/hour/course)
 *
 * Instructor-only. Insights are aggregated and anonymized (lib/insights.ts).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { rateLimiter } from '@/lib/rate-limit'
import { generateCourseInsights } from '@/lib/insights'

async function requireCourseInstructor(courseId: string) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  const role = (session?.user as any)?.role

  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (role !== 'SUPERADMIN') {
    const isInstructor = await prisma.courseInstructor.findFirst({
      where: { courseId, userId: parseInt(userId) },
    })
    if (!isInstructor) {
      return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }
  }

  return { userId }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const auth = await requireCourseInstructor(params.courseId)
  if ('error' in auth) return auth.error

  const insights = await prisma.courseInsight.findMany({
    where: { courseId: params.courseId },
    orderBy: { questionCount: 'desc' },
  })

  return NextResponse.json({ insights })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const auth = await requireCourseInstructor(params.courseId)
    if ('error' in auth) return auth.error

    // One generation per course per hour (OpenAI cost control)
    const rateLimit = await rateLimiter(`course:${params.courseId}`, 'insights', {
      maxRequests: 1,
      windowSeconds: 60 * 60,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Insights were generated recently. Try again in ${Math.ceil(
            rateLimit.resetIn / 60
          )} minutes.`,
        },
        { status: 429 }
      )
    }

    const result = await generateCourseInsights(params.courseId)

    if (!result.generated) {
      return NextResponse.json({ error: result.reason }, { status: 400 })
    }

    const insights = await prisma.courseInsight.findMany({
      where: { courseId: params.courseId },
      orderBy: { questionCount: 'desc' },
    })

    return NextResponse.json({ success: true, insights })
  } catch (error) {
    console.error('[INSIGHTS] Generation failed:', error)
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}
