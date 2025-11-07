import OpenAI from 'openai'
import { OpenAIStream, StreamingTextResponse } from 'ai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface StreamChatOptions {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  contextDocuments?: string[]
}

/**
 * Creates a streaming chat completion using OpenAI
 * @param options - Chat options including messages, model, and parameters
 * @returns StreamingTextResponse for Next.js API routes
 */
export async function createChatStream(
  options: StreamChatOptions
): Promise<StreamingTextResponse> {
  const {
    messages,
    model = 'gpt-4-turbo-preview',
    temperature = 0.7,
    maxTokens = 2000,
    contextDocuments = [],
  } = options

  // Prepare system message with context if documents are provided
  let systemMessage = 'You are a helpful AI assistant for students. You provide clear, accurate, and educational responses.'

  if (contextDocuments.length > 0) {
    systemMessage += '\n\nYou have access to the following course materials:\n\n' + contextDocuments.join('\n\n---\n\n')
  }

  const finalMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage },
    ...messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    })),
  ]

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: finalMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    })

    // Create a streaming response using Vercel AI SDK
    const stream = OpenAIStream(response)
    return new StreamingTextResponse(stream)
  } catch (error) {
    console.error('OpenAI streaming error:', error)
    throw new Error('Failed to create chat stream')
  }
}

/**
 * Estimates token count for a message (rough approximation)
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4)
}

/**
 * Creates a non-streaming chat completion for cases where full response is needed
 * @param options - Chat options
 * @returns Complete response text
 */
export async function createChatCompletion(
  options: StreamChatOptions
): Promise<string> {
  const {
    messages,
    model = 'gpt-4-turbo-preview',
    temperature = 0.7,
    maxTokens = 2000,
    contextDocuments = [],
  } = options

  let systemMessage = 'You are a helpful AI assistant for students.'

  if (contextDocuments.length > 0) {
    systemMessage += '\n\nCourse materials:\n\n' + contextDocuments.join('\n\n---\n\n')
  }

  const finalMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage },
    ...messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    })),
  ]

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: finalMessages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    })

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('OpenAI completion error:', error)
    throw new Error('Failed to create chat completion')
  }
}
