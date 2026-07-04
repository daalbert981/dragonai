import { describe, it, expect } from 'vitest'
import {
  sanitizeFilename,
  validateExtension,
  validateMimeType,
  validateFileSize,
  scanFileContent,
  generateUniqueFilename,
  formatFileSize,
  FILE_SIZE_LIMITS,
} from '@/lib/file-validation'

describe('validateExtension', () => {
  it('accepts whitelisted document and code extensions', () => {
    expect(validateExtension('syllabus.pdf')).toBe(true)
    expect(validateExtension('notes.docx')).toBe(true)
    expect(validateExtension('data.csv')).toBe(true)
    expect(validateExtension('script.py')).toBe(true)
  })

  it('blocks dangerous executable extensions', () => {
    expect(validateExtension('malware.exe')).toBe(false)
    expect(validateExtension('script.sh')).toBe(false)
    expect(validateExtension('payload.dll')).toBe(false)
  })
})

describe('validateMimeType', () => {
  it('requires the MIME type to match the extension', () => {
    expect(validateMimeType('doc.pdf', 'application/pdf')).toBe(true)
    expect(validateMimeType('doc.pdf', 'application/x-msdownload')).toBe(false)
  })
})

describe('validateFileSize', () => {
  it('enforces category limits', () => {
    expect(validateFileSize(FILE_SIZE_LIMITS.DOCUMENT, 'big.pdf')).toBe(true)
    expect(validateFileSize(FILE_SIZE_LIMITS.DOCUMENT + 1, 'big.pdf')).toBe(false)
    expect(validateFileSize(0, 'empty.pdf')).toBe(false)
  })
})

describe('sanitizeFilename', () => {
  it('neutralizes path traversal and unsafe characters', () => {
    const cleaned = sanitizeFilename('../../etc/passwd')
    expect(cleaned).not.toContain('..')
    expect(cleaned).not.toContain('/')
  })
})

describe('scanFileContent', () => {
  it('flags script content and passes plain text', () => {
    expect(scanFileContent('plain lecture notes about strategy')).toBe(true)
    expect(scanFileContent('<script>fetch("http://evil")</script>')).toBe(false)
  })
})

describe('generateUniqueFilename', () => {
  it('namespaces by user and preserves the extension', () => {
    const name = generateUniqueFilename('My Notes.pdf', '42')
    expect(name).toContain('42')
    expect(name.endsWith('.pdf')).toBe(true)
    expect(name).not.toBe(generateUniqueFilename('My Notes.pdf', '42'))
  })
})

describe('formatFileSize', () => {
  it('formats bytes human-readably', () => {
    expect(formatFileSize(1024)).toMatch(/1(\.0+)? ?KB/i)
    expect(formatFileSize(5 * 1024 * 1024)).toMatch(/5(\.0+)? ?MB/i)
  })
})
