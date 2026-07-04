/**
 * Token Budgeting
 *
 * Single source of truth for token counting and context-size caps.
 * Counting uses tiktoken (lib/file-parser.ts) — not the chars/4
 * approximation that used to live in lib/openai-stream.ts.
 */

import { estimateTokenCount, truncateToTokenLimit } from '@/lib/file-parser'

export { estimateTokenCount, truncateToTokenLimit }

/**
 * Cap on the total tokens of student-uploaded file content inlined into
 * the system prompt. Matches the spirit of the 30k read_material cap;
 * kept lower because inlined content rides along on EVERY request in
 * the conversation.
 */
export const FILE_CONTEXT_TOKEN_BUDGET = 20_000

/**
 * Build the inlined file-context block from uploaded files, staying
 * within `budget` tokens across ALL files. Files are processed in the
 * order given (chronological); once the budget is exhausted, remaining
 * files are listed by name only.
 */
export function budgetFileContext(
  files: Array<{
    originalName: string
    extractedText: string | null
    mimeType: string | null
    url: string
    status: string
  }>,
  budget: number = FILE_CONTEXT_TOKEN_BUDGET
): string {
  let context = ''
  let remaining = budget

  for (const file of files) {
    if (file.extractedText) {
      if (remaining <= 0) {
        context += `\n\n[File: ${file.originalName} - content omitted, token budget exhausted]\n`
        continue
      }
      const text = truncateToTokenLimit(file.extractedText, remaining)
      remaining -= estimateTokenCount(text)
      context += `\n\n[File: ${file.originalName}]\n${text}\n`
    } else if (file.mimeType?.startsWith('image/')) {
      context += `\n\n[Image file: ${file.originalName} - URL: ${file.url}]\n`
    } else if (file.status === 'FAILED') {
      context += `\n\n[File: ${file.originalName} - Processing failed]\n`
    } else if (file.status === 'PROCESSING') {
      context += `\n\n[File: ${file.originalName} - Currently processing...]\n`
    }
  }

  return context
}
