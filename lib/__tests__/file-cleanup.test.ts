import { describe, it, expect, vi, beforeEach } from 'vitest'

const deleteObject = vi.hoisted(() => {
  process.env.GCS_BUCKET_NAME = 'test-bucket'
  return vi.fn()
})

vi.mock('@google-cloud/storage', () => ({
  Storage: class {
    bucket() {
      return {
        file: (name: string) => ({ delete: () => deleteObject(name) }),
      }
    }
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    chatSession: { findMany: vi.fn(), deleteMany: vi.fn() },
    chatMessage: { deleteMany: vi.fn() },
    fileUpload: { findMany: vi.fn(), deleteMany: vi.fn() },
  },
}))


import { prisma } from '@/lib/prisma'
import { deleteSessionsWithFiles, deleteUserChatDataWithFiles } from '@/lib/file-cleanup'

describe('deleteSessionsWithFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deleteObject.mockResolvedValue(undefined)
  })

  it('deletes GCS objects for all files attached to matched sessions', async () => {
    vi.mocked(prisma.chatSession.findMany).mockResolvedValue([
      { id: 's1', messages: [{ fileUploads: [{ filename: 'a.pdf' }, { filename: 'b.pdf' }] }] },
      { id: 's2', messages: [{ fileUploads: [] }] },
    ] as any)
    vi.mocked(prisma.chatSession.deleteMany).mockResolvedValue({ count: 2 } as any)

    const result = await deleteSessionsWithFiles({ courseId: 'c1' })

    expect(deleteObject).toHaveBeenCalledWith('a.pdf')
    expect(deleteObject).toHaveBeenCalledWith('b.pdf')
    expect(prisma.chatSession.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['s1', 's2'] } },
    })
    expect(result).toEqual({ sessions: 2, files: 2, filesFailed: 0 })
  })

  it('returns zeros without touching GCS when nothing matches', async () => {
    vi.mocked(prisma.chatSession.findMany).mockResolvedValue([] as any)

    const result = await deleteSessionsWithFiles({ courseId: 'c1' })

    expect(result).toEqual({ sessions: 0, files: 0, filesFailed: 0 })
    expect(deleteObject).not.toHaveBeenCalled()
    expect(prisma.chatSession.deleteMany).not.toHaveBeenCalled()
  })

  it('still deletes DB rows when a GCS deletion fails (best-effort)', async () => {
    vi.mocked(prisma.chatSession.findMany).mockResolvedValue([
      { id: 's1', messages: [{ fileUploads: [{ filename: 'gone.pdf' }] }] },
    ] as any)
    vi.mocked(prisma.chatSession.deleteMany).mockResolvedValue({ count: 1 } as any)
    deleteObject.mockRejectedValue(new Error('404'))

    const result = await deleteSessionsWithFiles({ courseId: 'c1' })

    expect(result.sessions).toBe(1)
    expect(result.filesFailed).toBe(1)
    expect(prisma.chatSession.deleteMany).toHaveBeenCalled()
  })
})

describe('deleteUserChatDataWithFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deleteObject.mockResolvedValue(undefined)
  })

  it('deletes orphan uploads (no message) plus sessions and messages', async () => {
    vi.mocked(prisma.fileUpload.findMany).mockResolvedValue([
      { filename: 'orphan.pdf' },
      { filename: 'attached.pdf' },
    ] as any)
    vi.mocked(prisma.chatSession.findMany).mockResolvedValue([{ id: 's1' }] as any)
    vi.mocked(prisma.chatSession.deleteMany).mockResolvedValue({ count: 1 } as any)

    const result = await deleteUserChatDataWithFiles(7)

    expect(deleteObject).toHaveBeenCalledWith('orphan.pdf')
    expect(prisma.fileUpload.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } })
    expect(prisma.chatMessage.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: { in: ['s1'] } },
    })
    expect(result).toEqual({ sessions: 1, files: 2, filesFailed: 0 })
  })
})
