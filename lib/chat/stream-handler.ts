/**
 * Chat Stream Handler
 *
 * Consumes the OpenAI stream (Chat Completions or Responses API),
 * handles read_material tool calls transparently (recursing into a
 * follow-up stream), forwards content deltas as SSE events, and
 * persists the assistant message when the stream finishes.
 *
 * Extracted verbatim from app/api/courses/[courseId]/chat/stream/route.ts;
 * token counting now uses tiktoken via lib/token-budget.ts.
 */

import { prisma } from '@/lib/prisma'
import { createChatStream } from '@/lib/openai-stream'
import { estimateTokenCount } from '@/lib/token-budget'
import { executeToolCall, type ToolCallAccumulator } from '@/lib/chat/tools'

export interface StreamContext {
  sessionId: string
  userIdInt: number
  courseId: string
  formattedMessages: any[]
  streamOptions: any
  readableMaterials: any[]
  isGPT5Model: boolean
  tools: any[] | undefined
}

/**
 * Wrap the OpenAI stream in an SSE Response, processing tool calls.
 */
export function createSseResponse(
  openaiStream: AsyncIterable<any>,
  ctx: StreamContext
): Response {
  const encoder = new TextEncoder()

  const sseStream = new ReadableStream({
    async start(controller) {
      try {
        await processStream(openaiStream, controller, encoder, ctx)
        controller.close()
      } catch (error) {
        console.error('Error in SSE stream:', error)
        const errorData = `data: ${JSON.stringify({
          delta: '',
          done: true,
          error: error instanceof Error ? error.message : 'Stream error occurred',
        })}\n\n`
        controller.enqueue(encoder.encode(errorData))
        controller.close()
      }
    },
  })

  return new Response(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

async function saveAssistantMessage(
  ctx: StreamContext,
  fullResponse: string
): Promise<string | null> {
  const tokenCount = estimateTokenCount(fullResponse)
  try {
    const saved = await prisma.chatMessage.create({
      data: {
        sessionId: ctx.sessionId,
        userId: ctx.userIdInt,
        role: 'ASSISTANT',
        content: fullResponse,
        tokenCount,
      },
    })
    await prisma.chatSession.update({
      where: { id: ctx.sessionId },
      data: { updatedAt: new Date() },
    })
    return saved.id
  } catch (error) {
    console.error('Error saving ASSISTANT message:', error)
    return null
  }
}

/**
 * Process the OpenAI stream, handling tool calls transparently
 */
export async function processStream(
  stream: AsyncIterable<any>,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  ctx: StreamContext
) {
  let fullResponse = ''
  let toolCallAccumulator: ToolCallAccumulator | null = null

  for await (const event of stream) {
    // --- Chat Completions API tool call handling ---
    if (event.choices?.[0]?.delta?.tool_calls) {
      const tc = event.choices[0].delta.tool_calls[0]
      if (tc.id) {
        toolCallAccumulator = { id: tc.id, name: tc.function?.name || '', arguments: '' }
      }
      if (tc.function?.arguments) {
        toolCallAccumulator!.arguments += tc.function.arguments
      }

      if (event.choices[0].finish_reason === 'tool_calls') {
        const result = await executeToolCall(toolCallAccumulator!, ctx, controller, encoder)

        const messagesWithToolResult = [
          { role: 'system', content: ctx.streamOptions.systemPrompt },
          ...ctx.formattedMessages,
          {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: toolCallAccumulator!.id,
                type: 'function',
                function: {
                  name: toolCallAccumulator!.name,
                  arguments: toolCallAccumulator!.arguments,
                },
              },
            ],
          },
          {
            role: 'tool',
            tool_call_id: toolCallAccumulator!.id,
            content: result,
          },
        ]

        const followUpOptions = { ...ctx.streamOptions }
        delete followUpOptions.systemPrompt
        followUpOptions.openAIParams = {}
        followUpOptions.tools = undefined

        const followUpStream = await createChatStream(
          messagesWithToolResult as any,
          { ...followUpOptions, systemPrompt: undefined }
        )

        await processStream(followUpStream, controller, encoder, {
          ...ctx,
          tools: undefined,
        })
        return
      }
      continue
    }

    // --- Responses API (GPT-5) tool call handling ---
    if (event.type === 'response.output_item.added' && event.item?.type === 'function_call') {
      toolCallAccumulator = {
        id: event.item.call_id || event.item.id || 'call_' + Date.now(),
        name: event.item.name || '',
        arguments: '',
      }
      continue
    }

    if (event.type === 'response.function_call_arguments.delta') {
      if (toolCallAccumulator) {
        toolCallAccumulator.arguments += event.delta || ''
      }
      continue
    }

    if (event.type === 'response.function_call_arguments.done') {
      if (toolCallAccumulator) {
        // Execute the tool call
        const result = await executeToolCall(toolCallAccumulator, ctx, controller, encoder)

        // For Responses API, we use a non-streaming follow-up with tool output
        // then stream a second call for the final answer
        const followUpOptions = { ...ctx.streamOptions }
        followUpOptions.tools = undefined

        // Build conversation with tool result appended to instructions
        const toolResultPrompt = `${ctx.streamOptions.systemPrompt}\n\n--- Tool Result ---\nThe read_material tool was called for "${
          toolCallAccumulator.name === 'read_material'
            ? JSON.parse(toolCallAccumulator.arguments).filename
            : 'unknown'
        }". Here is the content:\n\n${result}\n\n--- End Tool Result ---\nNow answer the student's question using this material. Do not mention that you used a tool.`

        const followUpStream = await createChatStream(ctx.formattedMessages, {
          ...followUpOptions,
          systemPrompt: toolResultPrompt,
        })

        await processStream(followUpStream, controller, encoder, {
          ...ctx,
          tools: undefined,
        })
        return
      }
      continue
    }

    // --- Normal content handling ---
    let delta = ''
    let isFinished = false

    if (event.choices) {
      delta = event.choices[0]?.delta?.content || ''
      isFinished = !!event.choices[0]?.finish_reason
    } else if (event.type === 'response.output_text.delta') {
      delta = event.delta || ''
    } else if (event.type === 'response.done' || event.type === 'response.completed') {
      // Only mark finished if we have content (not if it was just a tool call response)
      if (fullResponse) isFinished = true
    }

    if (delta) {
      fullResponse += delta
      const sseData = `data: ${JSON.stringify({ delta, done: false })}\n\n`
      controller.enqueue(encoder.encode(sseData))
    }

    if (isFinished && fullResponse) {
      const messageId = await saveAssistantMessage(ctx, fullResponse)

      const doneData = `data: ${JSON.stringify({ delta: '', done: true, finishReason: 'stop', messageId })}\n\n`
      controller.enqueue(encoder.encode(doneData))
      return
    }
  }

  // If stream ended without explicit finish (edge case)
  if (fullResponse) {
    const messageId = await saveAssistantMessage(ctx, fullResponse)
    const doneData = `data: ${JSON.stringify({ delta: '', done: true, finishReason: 'stop', messageId })}\n\n`
    controller.enqueue(encoder.encode(doneData))
  }
}
