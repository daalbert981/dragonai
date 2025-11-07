import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  documentIds?: string[];
  sessionId?: string;
}

/**
 * POST /api/chat - Chat with AI using document context
 */
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, documentIds, sessionId } = body;

    // TODO: Get userId from session
    const userId = 'demo-user-id';

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    // Get document context if documentIds provided
    let documentContext = '';
    if (documentIds && documentIds.length > 0) {
      try {
        const documents = await prisma.document.findMany({
          where: {
            id: { in: documentIds },
            status: 'COMPLETED',
          },
          include: {
            chunks: {
              orderBy: { chunkIndex: 'asc' },
            },
          },
        });

        documentContext = documents
          .map((doc: any) => {
            const docText = doc.chunks.map((c: any) => c.content).join('\n\n');
            return `=== ${doc.originalName} ===\n\n${docText}`;
          })
          .join('\n\n---\n\n');
      } catch (error) {
        console.error('Error fetching document context:', error);
        // Continue without context rather than failing
      }
    }

    // Build system message with document context
    const systemMessage: OpenAI.Chat.ChatCompletionMessageParam = {
      role: 'system',
      content: documentContext
        ? `You are a helpful AI assistant. You have access to the following course materials:

${documentContext}

Use this information to provide accurate, helpful answers to the user's questions. If the answer isn't in the provided materials, let the user know that.`
        : 'You are a helpful AI assistant for students. Answer questions clearly and concisely.',
    };

    // Prepare messages for OpenAI
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      systemMessage,
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // Create chat completion with streaming
    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: openaiMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }

          // Save to database if sessionId provided
          if (sessionId && fullResponse) {
            try {
              // Save user message
              await prisma.chatMessage.create({
                data: {
                  sessionId,
                  role: 'USER',
                  content: messages[messages.length - 1].content,
                  documentIds: documentIds || [],
                },
              });

              // Save assistant message
              await prisma.chatMessage.create({
                data: {
                  sessionId,
                  role: 'ASSISTANT',
                  content: fullResponse,
                  documentIds: documentIds || [],
                },
              });
            } catch (error) {
              console.error('Error saving messages:', error);
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
