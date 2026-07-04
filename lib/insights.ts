/**
 * Course Question Insights
 *
 * Clusters recent student questions into anonymized themes so instructors
 * can see what students struggle with — without reading anyone's chats.
 *
 * Privacy guarantees:
 * - Only message CONTENT is used; no user IDs, usernames, or emails are
 *   fetched or sent to OpenAI
 * - The prompt instructs the model to strip any personal details that
 *   appear inside question text
 * - Results are aggregate themes with counts, replacing prior rows
 */

import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import { truncateToTokenLimit } from '@/lib/token-budget'

const INSIGHT_WINDOW_DAYS = 30
const INSIGHT_INPUT_TOKEN_BUDGET = 60_000
const INSIGHT_MODEL = 'gpt-5.4-mini'
const MIN_QUESTIONS = 5

export interface InsightGenerationResult {
  generated: boolean
  reason?: string
  themes?: number
  questionCount?: number
}

export async function generateCourseInsights(
  courseId: string
): Promise<InsightGenerationResult> {
  const periodEnd = new Date()
  const periodStart = new Date()
  periodStart.setDate(periodStart.getDate() - INSIGHT_WINDOW_DAYS)

  // Content only — deliberately no user fields
  const questions = await prisma.chatMessage.findMany({
    where: {
      role: 'USER',
      createdAt: { gte: periodStart },
      session: { courseId },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { content: true },
  })

  const usable = questions
    .map((q) => q.content.trim())
    .filter((c) => c.length >= 10)

  if (usable.length < MIN_QUESTIONS) {
    return {
      generated: false,
      reason: `Not enough student questions in the last ${INSIGHT_WINDOW_DAYS} days (need at least ${MIN_QUESTIONS}, found ${usable.length}).`,
    }
  }

  const questionBlock = truncateToTokenLimit(
    usable.map((q, i) => `${i + 1}. ${q}`).join('\n'),
    INSIGHT_INPUT_TOKEN_BUDGET
  )

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const completion = await openai.chat.completions.create({
    model: INSIGHT_MODEL,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'question_themes',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            themes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  theme: { type: 'string' },
                  description: { type: 'string' },
                  questionCount: { type: 'integer' },
                },
                required: ['theme', 'description', 'questionCount'],
                additionalProperties: false,
              },
            },
          },
          required: ['themes'],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: 'system',
        content:
          'You cluster student questions from a university course into themes for the instructor. Produce 3-8 themes. For each: a short theme name, a one-sentence description of what students are asking, and how many of the numbered questions fall under it. NEVER include names, emails, or any personal details that appear inside question text — describe topics only.',
      },
      {
        role: 'user',
        content: `Cluster these ${usable.length} student questions into themes:\n\n${questionBlock}`,
      },
    ],
  })

  const parsed = JSON.parse(completion.choices[0]?.message?.content || '{"themes":[]}')
  const themes: Array<{ theme: string; description: string; questionCount: number }> =
    parsed.themes || []

  if (themes.length === 0) {
    return { generated: false, reason: 'The model returned no themes.' }
  }

  // Replace prior insights for this course
  await prisma.$transaction([
    prisma.courseInsight.deleteMany({ where: { courseId } }),
    prisma.courseInsight.createMany({
      data: themes.map((t) => ({
        courseId,
        theme: t.theme,
        description: t.description,
        questionCount: t.questionCount,
        periodStart,
        periodEnd,
      })),
    }),
  ])

  return { generated: true, themes: themes.length, questionCount: usable.length }
}
