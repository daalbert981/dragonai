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
   * Not used for o1 models (use reasoningEffort instead)
   */
  temperature?: number

  /**
   * Reasoning effort for reasoning models ('minimal', 'low', 'medium', 'high')
   * Replaces temperature for o1 and GPT-5 models
   */
  reasoningEffort?: string

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
  model: 'gpt-5.4-mini',
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
): Promise<AsyncIterable<any>> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  // Prepend system message if provided
  const messagesWithSystem: ChatCompletionMessageParam[] = finalConfig.systemPrompt
    ? [
        { role: 'system', content: finalConfig.systemPrompt },
        ...messages
      ]
    : messages

  // Determine model type for parameter handling
  const isOSeriesModel = /^o[1-9]/.test(finalConfig.model || '')
  const isGPT5Model = finalConfig.model?.startsWith('gpt-5') || false

  try {
    // GPT-5+ models use the Responses API (different from chat completions)
    if (isGPT5Model) {
      // Separate system prompt from conversation
      const systemMessage = messagesWithSystem.find(m => m.role === 'system')
      const conversationMessages = messagesWithSystem.filter(m => m.role !== 'system')

      // Convert conversation to input string
      const inputText = conversationMessages.map(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant'
        return `${role}: ${msg.content}`
      }).join('\n\n')

      // Build request parameters
      const responseParams: any = {
        model: finalConfig.model!,
        input: inputText || 'Hello',
        stream: true, // Try streaming first
        max_output_tokens: finalConfig.maxTokens
      }

      // Add instructions (system prompt) if available
      if (systemMessage) {
        responseParams.instructions = systemMessage.content
      } else if (finalConfig.systemPrompt) {
        responseParams.instructions = finalConfig.systemPrompt
      }

      // Add reasoning effort if specified
      // gpt-5.1-chat-latest (Instant) only supports 'medium' - skip for speed
      // gpt-5.1 (Thinking) supports 'low', 'medium', 'high'
      if (finalConfig.reasoningEffort && finalConfig.model !== 'gpt-5.1-chat-latest') {
        responseParams.reasoning = { effort: finalConfig.reasoningEffort }
      }

      try {
        // Try true streaming first
        const stream = await openai.responses.create(responseParams)
        return stream as any
      } catch (streamError: any) {
        // Check if error is due to organization verification
        const isVerificationError = streamError.code === 'unsupported_value' &&
                                    streamError.message?.includes('organization must be verified')

        if (isVerificationError) {
          console.warn('[GPT-5] Organization verification required for streaming, falling back to non-streaming')

          // Fall back to non-streaming
          const nonStreamParams = { ...responseParams, stream: false }
          const response = await openai.responses.create(nonStreamParams)
          const fullText = response.output_text || ''

          // Convert to stream format by yielding the full response at once
          const convertToStream = async function* () {
            yield {
              choices: [{
                delta: { content: fullText },
                finish_reason: 'stop'
              }]
            }
          }

          return convertToStream()
        } else {
          // Different error - re-throw
          console.error('[GPT-5 STREAM] Error details:', {
            message: streamError.message,
            status: streamError.status,
            type: streamError.type,
            code: streamError.code
          })
          throw streamError
        }
      }
    }

    // o-series and other models use chat completions API
    const baseParams: any = {
      model: finalConfig.model!,
      messages: messagesWithSystem,
      max_tokens: finalConfig.maxTokens,
      stream: true,
      ...finalConfig.openAIParams
    }

    // Handle reasoning/temperature parameters
    if (isOSeriesModel && finalConfig.reasoningEffort) {
      // o-series models (o1, o3, o4-mini) use reasoning_effort parameter
      baseParams.reasoning_effort = finalConfig.reasoningEffort
    } else {
      // Other models use temperature
      baseParams.temperature = finalConfig.temperature
    }

    const stream = await openai.chat.completions.create(baseParams)

    return stream as any
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
  stream: AsyncIterable<any>
): ReadableStream {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          // Handle both chat completions format and Responses API format
          let delta = ''
          let finishReason = null

          if (event.choices) {
            delta = event.choices[0]?.delta?.content || ''
            finishReason = event.choices[0]?.finish_reason
          } else if (event.type === 'response.output_text.delta') {
            delta = event.delta || ''
          } else if (event.type === 'response.done' || event.type === 'response.completed') {
            finishReason = 'stop'
          } else if (event.type === 'response.failed' || event.type === 'response.error') {
            console.error('[SSE] Responses API error:', event)
            throw new Error(event.error?.message || 'Response failed')
          }

          if (delta) {
            // Format as SSE
            const sseData = `data: ${JSON.stringify({
              delta,
              done: false
            })}\n\n`

            controller.enqueue(encoder.encode(sseData))
          }

          // Check if stream is done
          if (finishReason) {
            const doneData = `data: ${JSON.stringify({
              delta: '',
              done: true,
              finishReason
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
      // Stream cancelled by client
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

  // Determine model type for parameter handling
  const isOSeriesModel = /^o[1-9]/.test(finalConfig.model || '')
  const isGPT5Model = finalConfig.model?.startsWith('gpt-5') || false

  try {
    // GPT-5+ models use the Responses API (different from chat completions)
    if (isGPT5Model) {
      // Separate system prompt from conversation
      const systemMessage = messagesWithSystem.find(m => m.role === 'system')
      const conversationMessages = messagesWithSystem.filter(m => m.role !== 'system')

      // Convert conversation to input string
      const inputText = conversationMessages.map(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant'
        return `${role}: ${msg.content}`
      }).join('\n\n')

      // Use responses.create() API for GPT-5 with correct structure
      const responseParams: any = {
        model: finalConfig.model!,
        input: inputText,
        stream: false,
        max_output_tokens: finalConfig.maxTokens
      }

      // Add instructions (system prompt) if available
      if (systemMessage) {
        responseParams.instructions = systemMessage.content
      } else if (finalConfig.systemPrompt) {
        responseParams.instructions = finalConfig.systemPrompt
      }

      // Add reasoning effort if specified
      // gpt-5.1-chat-latest (Instant) only supports 'medium' - skip for speed
      // gpt-5.1 (Thinking) supports 'low', 'medium', 'high'
      if (finalConfig.reasoningEffort && finalConfig.model !== 'gpt-5.1-chat-latest') {
        responseParams.reasoning = { effort: finalConfig.reasoningEffort }
      }

      // Use responses API directly (SDK v6+ supports it)
      const response = await openai.responses.create(responseParams)
      return response.output_text || ''
    }

    // o-series and other models use chat completions API
    const baseParams: any = {
      model: finalConfig.model!,
      messages: messagesWithSystem,
      max_tokens: finalConfig.maxTokens,
      ...finalConfig.openAIParams
    }

    // Handle reasoning/temperature parameters
    if (isOSeriesModel && finalConfig.reasoningEffort) {
      // o-series models (o1, o3, o4-mini) use reasoning_effort parameter
      baseParams.reasoning_effort = finalConfig.reasoningEffort
    } else {
      // Other models use temperature
      baseParams.temperature = finalConfig.temperature
    }

    const completion = await openai.chat.completions.create(baseParams)

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
