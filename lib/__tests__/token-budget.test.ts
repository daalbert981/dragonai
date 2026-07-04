import { describe, it, expect } from 'vitest'
import { budgetFileContext, estimateTokenCount } from '@/lib/token-budget'

const textFile = (name: string, text: string) => ({
  originalName: name,
  extractedText: text,
  mimeType: 'application/pdf',
  url: `https://storage/x/${name}`,
  status: 'COMPLETED',
})

describe('budgetFileContext', () => {
  it('inlines small files fully', () => {
    const ctx = budgetFileContext([textFile('notes.pdf', 'short content')])
    expect(ctx).toContain('[File: notes.pdf]')
    expect(ctx).toContain('short content')
  })

  it('truncates content to stay within the budget', () => {
    const huge = 'lecture word '.repeat(20_000) // far over budget
    const ctx = budgetFileContext([textFile('huge.pdf', huge)], 500)
    expect(estimateTokenCount(ctx)).toBeLessThan(700) // budget + markers
    expect(ctx).toContain('truncated')
  })

  it('lists later files by name only once the budget is exhausted', () => {
    const big = 'word '.repeat(2_000)
    const ctx = budgetFileContext(
      [textFile('first.pdf', big), textFile('second.pdf', 'small')],
      100
    )
    expect(ctx).toContain('[File: first.pdf]')
    expect(ctx).toContain('second.pdf - content omitted')
    expect(ctx).not.toContain('\nsmall')
  })

  it('describes images and failed/processing files without spending budget', () => {
    const ctx = budgetFileContext([
      { originalName: 'pic.png', extractedText: null, mimeType: 'image/png', url: 'u', status: 'COMPLETED' },
      { originalName: 'bad.pdf', extractedText: null, mimeType: 'application/pdf', url: 'u', status: 'FAILED' },
    ])
    expect(ctx).toContain('[Image file: pic.png')
    expect(ctx).toContain('Processing failed')
  })
})
