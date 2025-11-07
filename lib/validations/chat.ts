import { z } from 'zod';

// Chat message validation
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Message content is required').max(10000, 'Message too long'),
});

// Chat request validation
export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1, 'At least one message required'),
  documentIds: z.array(z.string()).optional(),
  sessionId: z.string().optional(),
});

// Chat session creation validation
export const createSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

// Chat session update validation
export const updateSessionSchema = z.object({
  title: z.string().min(1).max(200),
});

// Bulk session delete validation
export const bulkDeleteSessionsSchema = z.object({
  sessionIds: z.array(z.string()).min(1, 'At least one session ID required'),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type CreateSession = z.infer<typeof createSessionSchema>;
export type UpdateSession = z.infer<typeof updateSessionSchema>;
export type BulkDeleteSessions = z.infer<typeof bulkDeleteSessionsSchema>;
