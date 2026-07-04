import { describe, it, expect } from 'vitest'
import { estimateTokenCount, truncateToTokenLimit } from '@/lib/file-parser'

// tiktoken-based counting from lib/file-parser.ts — the foundation for the
// unified token budgeting module (Phase 5).

describe('estimateTokenCount (tiktoken)', () => {
  it('counts tokens for typical prose', () => {
    const count = estimateTokenCount('The quick brown fox jumps over the lazy dog.')
    expect(count).toBeGreaterThan(5)
    expect(count).toBeLessThan(20)
  })

  it('returns 0 for empty text', () => {
    expect(estimateTokenCount('')).toBe(0)
  })

  it('scales roughly linearly with repeated content', () => {
    const one = estimateTokenCount('lecture notes ')
    const hundred = estimateTokenCount('lecture notes '.repeat(100))
    expect(hundred).toBeGreaterThan(one * 50)
  })
})

describe('truncateToTokenLimit', () => {
  it('returns short text unchanged', () => {
    expect(truncateToTokenLimit('short text', 100)).toBe('short text')
  })

  it('truncates long text under the limit and marks it', () => {
    const long = 'word '.repeat(5000)
    const truncated = truncateToTokenLimit(long, 100)
    expect(truncated).toContain('truncated')
    // Allow slack for the truncation marker itself
    expect(estimateTokenCount(truncated)).toBeLessThan(150)
  })
})
