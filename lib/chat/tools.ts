/**
 * Chat Tool Definitions & Execution
 *
 * Currently a single tool: read_material — lets the model pull the full
 * extracted text of a course material on demand instead of inlining
 * everything into the system prompt.
 *
 * Extracted verbatim from app/api/courses/[courseId]/chat/stream/route.ts.
 */

import { truncateToTokenLimit } from '@/lib/token-budget'

export interface ToolCallAccumulator {
  id: string
  name: string
  arguments: string
}

/**
 * Build the read_material tool definition, or undefined when no
 * materials have extractable text.
 */
export function buildTools(readableMaterials: any[]) {
  if (readableMaterials.length === 0) {
    return undefined
  }

  return [
    {
      type: 'function' as const,
      function: {
        name: 'read_material',
        description:
          'Read the full text content of a course material. Only use this when you need specific details not covered by the syllabus summary.',
        parameters: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: `The original filename of the material to read. Available files: ${readableMaterials
                .map((m) => m.originalName)
                .join(', ')}`,
            },
          },
          required: ['filename'],
        },
      },
    },
  ]
}

/**
 * Execute a read_material tool call. Emits a toolCall SSE event so the
 * client can show an indicator, and returns the (token-capped) text.
 */
export async function executeToolCall(
  toolCall: ToolCallAccumulator,
  ctx: { readableMaterials: any[] },
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
): Promise<string> {
  if (toolCall.name !== 'read_material') {
    return JSON.stringify({ error: `Unknown tool: ${toolCall.name}` })
  }

  let args: { filename: string }
  try {
    args = JSON.parse(toolCall.arguments)
  } catch {
    return JSON.stringify({ error: 'Invalid tool arguments' })
  }

  // Find matching material
  const material = ctx.readableMaterials.find(
    (m) => m.originalName === args.filename || m.filename === args.filename
  )

  if (!material || !material.extractedText) {
    return JSON.stringify({
      error: `Material not found or has no extractable text: ${args.filename}`,
    })
  }

  // Send tool call indicator to client
  const toolEvent = `data: ${JSON.stringify({
    delta: '',
    done: false,
    toolCall: { name: 'read_material', filename: material.originalName },
  })}\n\n`
  controller.enqueue(encoder.encode(toolEvent))

  // Truncate to reasonable size (max ~30k tokens)
  const text = truncateToTokenLimit(material.extractedText, 30000)

  return text
}
