/**
 * OpenAI Streaming Utilities
 *
 * Provides utilities for streaming OpenAI responses in real-time
 * using Server-Sent Events (SSE) or custom streaming formats.
 */

import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Stream configuration options
 */
export interface StreamConfig {
  /**
   * OpenAI model to use
   */
  model?: string

  /**
   * Temperature for response generation (0-2)
   */
  temperature?: number

  /**
   * Maximum tokens in response
   */
  maxTokens?: number

  /**
   * System prompt for context
   */
  systemPrompt?: string

  /**
   * Additional OpenAI parameters
   */
  openAIParams?: Partial<OpenAI.Chat.ChatCompletionCreateParams>
}

/**
 * Default streaming configuration
 */
const DEFAULT_CONFIG: StreamConfig = {
  model: 'gpt-4-turbo-preview',
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: 'You are a helpful AI teaching assistant. Provide clear, educational responses to student questions.'
}

/**
 * Create a streaming chat completion
 *
 * @param messages - Array of chat messages
 * @param config - Stream configuration
 * @returns AsyncIterable of OpenAI stream chunks
 */
export async function createChatStream(
  messages: ChatCompletionMessageParam[],
  config: StreamConfig = {}
): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  // Prepend system message if provided
  const messagesWithSystem: ChatCompletionMessageParam[] = finalConfig.systemPrompt
    ? [
        { role: 'system', content: finalConfig.systemPrompt },
        ...messages
      ]
    : messages

  try {
    const stream = await openai.chat.completions.create({
      model: finalConfig.model!,
      messages: messagesWithSystem,
      temperature: finalConfig.temperature,
      max_tokens: finalConfig.maxTokens,
      stream: true,
      ...finalConfig.openAIParams
    })

    return stream
  } catch (error) {
    console.error('Error creating chat stream:', error)
    throw error
  }
}

/**
 * Convert OpenAI stream to Server-Sent Events (SSE) format
 *
 * @param stream - OpenAI stream
 * @returns ReadableStream for SSE response
 */
export function streamToSSE(
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
): ReadableStream {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || ''

          if (delta) {
            // Format as SSE
            const sseData = `data: ${JSON.stringify({
              delta,
              done: false
            })}\n\n`

            controller.enqueue(encoder.encode(sseData))
          }

          // Check if stream is done
          if (chunk.choices[0]?.finish_reason) {
            const doneData = `data: ${JSON.stringify({
              delta: '',
              done: true,
              finishReason: chunk.choices[0].finish_reason
            })}\n\n`

            controller.enqueue(encoder.encode(doneData))
            break
          }
        }

        controller.close()
      } catch (error) {
        console.error('Error in SSE stream:', error)

        const errorData = `data: ${JSON.stringify({
          delta: '',
          done: true,
          error: error instanceof Error ? error.message : 'Stream error occurred'
        })}\n\n`

        controller.enqueue(encoder.encode(errorData))
        controller.close()
      }
    },

    cancel() {
      // Cleanup if needed
      console.log('Stream cancelled by client')
    }
  })
}

/**
 * Convert OpenAI stream to a simple text stream
 *
 * @param stream - OpenAI stream
 * @returns ReadableStream of text chunks
 */
export function streamToText(
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
): ReadableStream {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || ''

          if (delta) {
            controller.enqueue(encoder.encode(delta))
          }

          if (chunk.choices[0]?.finish_reason) {
            break
          }
        }

        controller.close()
      } catch (error) {
        console.error('Error in text stream:', error)
        controller.error(error)
      }
    }
  })
}

/**
 * Consume an entire stream and return the complete text
 * Useful for non-streaming contexts
 *
 * @param stream - OpenAI stream
 * @returns Complete generated text
 */
export async function consumeStream(
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
): Promise<string> {
  let fullText = ''

  try {
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || ''
      fullText += delta
    }

    return fullText
  } catch (error) {
    console.error('Error consuming stream:', error)
    throw error
  }
}

/**
 * Create a chat completion without streaming (for simpler use cases)
 *
 * @param messages - Array of chat messages
 * @param config - Configuration options
 * @returns Complete chat response
 */
export async function createChatCompletion(
  messages: ChatCompletionMessageParam[],
  config: StreamConfig = {}
): Promise<string> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  const messagesWithSystem: ChatCompletionMessageParam[] = finalConfig.systemPrompt
    ? [
        { role: 'system', content: finalConfig.systemPrompt },
        ...messages
      ]
    : messages

  try {
    const completion = await openai.chat.completions.create({
      model: finalConfig.model!,
      messages: messagesWithSystem,
      temperature: finalConfig.temperature,
      max_tokens: finalConfig.maxTokens,
      ...finalConfig.openAIParams
    })

    return completion.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('Error creating chat completion:', error)
    throw error
  }
}

/**
 * Count tokens in a message (approximate)
 * For production, consider using tiktoken library for accurate counting
 *
 * @param text - Text to count tokens for
 * @returns Approximate token count
 */
export function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token
  // This is a simplification - use tiktoken for accurate counts
  return Math.ceil(text.length / 4)
}

/**
 * Truncate messages to fit within token limit
 *
 * @param messages - Array of messages
 * @param maxTokens - Maximum total tokens
 * @returns Truncated messages array
 */
export function truncateMessages(
  messages: ChatCompletionMessageParam[],
  maxTokens: number
): ChatCompletionMessageParam[] {
  const truncated: ChatCompletionMessageParam[] = []
  let totalTokens = 0

  // Iterate from most recent to oldest
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    const content = typeof message.content === 'string' ? message.content : ''
    const tokens = estimateTokenCount(content)

    if (totalTokens + tokens > maxTokens) {
      break
    }

    truncated.unshift(message)
    totalTokens += tokens
  }

  return truncated
}

/**
 * Format messages for OpenAI API from database messages
 *
 * @param dbMessages - Messages from database
 * @returns Formatted messages for OpenAI
 */
export function formatMessagesForOpenAI(
  dbMessages: Array<{
    role: string
    content: string
  }>
): ChatCompletionMessageParam[] {
  return dbMessages.map(msg => ({
    role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
    content: msg.content
  }))
}

/**
 * Create a streaming response for Next.js API routes
 *
 * @param stream - OpenAI stream
 * @param headers - Additional headers
 * @returns Response object with streaming body
 */
export function createStreamingResponse(
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  headers: Record<string, string> = {}
): Response {
  const sseStream = streamToSSE(stream)

  return new Response(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...headers
    }
  })
}

/**
 * Handle streaming errors gracefully
 *
 * @param error - Error object
 * @returns Error response
 */
export function handleStreamError(error: unknown): Response {
  console.error('Streaming error:', error)

  const errorMessage = error instanceof Error ? error.message : 'An error occurred while streaming'

  const encoder = new TextEncoder()
  const errorData = `data: ${JSON.stringify({
    delta: '',
    done: true,
    error: errorMessage
  })}\n\n`

  return new Response(encoder.encode(errorData), {
    status: 500,
    headers: {
      'Content-Type': 'text/event-stream'
    }
  })
}
