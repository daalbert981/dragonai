'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Loader2,
  Save,
  Clock,
} from 'lucide-react'

interface ClassNote {
  id: string
  type: string
  title: string
  activeAt: string
  expiresAt: string | null
  sortOrder: number
}

export default function ReorderNotesPage({
  params,
}: {
  params: { courseId: string }
}) {
  const [notes, setNotes] = useState<ClassNote[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/courses/${params.courseId}/notes`)
      if (!res.ok) throw new Error('Failed to load notes')
      setNotes(await res.json())
    } catch {
      setError('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }, [params.courseId])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const move = (type: string, index: number, direction: -1 | 1) => {
    const group = notes.filter((n) => n.type === type)
    const rest = notes.filter((n) => n.type !== type)
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= group.length) return

    const newGroup = [...group]
    const [item] = newGroup.splice(index, 1)
    newGroup.splice(targetIndex, 0, item)

    setNotes([...rest, ...newGroup].sort((a, b) => {
      if (a.type !== b.type) return a.type < b.type ? -1 : 1
      return 0
    }))
    setDirty(true)
    setSuccess('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Save each type group separately
      for (const type of ['PRIOR', 'UPCOMING']) {
        const group = notes.filter((n) => n.type === type)
        if (group.length === 0) continue

        const res = await fetch(
          `/api/admin/courses/${params.courseId}/notes/reorder`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderedIds: group.map((n) => n.id) }),
          }
        )
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to save order')
        }
      }

      setDirty(false)
      setSuccess('Order saved')
      await fetchNotes()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const priorNotes = notes.filter((n) => n.type === 'PRIOR')
  const upcomingNotes = notes.filter((n) => n.type === 'UPCOMING')

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Link href={`/admin/courses/${params.courseId}/settings`}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Settings
        </Button>
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reorder Class Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Notes at the top appear first in the AI assistant's context
          </p>
        </div>
        <Button onClick={handleSave} disabled={!dirty || saving} size="sm">
          {saving ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1 h-3.5 w-3.5" />
          )}
          Save Order
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive mb-4">{error}</p>
      )}
      {success && (
        <p className="text-sm text-emerald-600 mb-4">{success}</p>
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No notes to reorder. Add notes from the settings page first.
        </p>
      ) : (
        <div className="space-y-6">
          <ReorderGroup
            label="Prior Classes"
            description="Shown in <prior_classes> — top note appears first"
            notes={priorNotes}
            type="PRIOR"
            onMove={move}
          />
          <ReorderGroup
            label="Upcoming Classes"
            description="Shown in <upcoming_classes> — top note appears first"
            notes={upcomingNotes}
            type="UPCOMING"
            onMove={move}
          />
        </div>
      )}
    </div>
  )
}

function ReorderGroup({
  label,
  description,
  notes,
  type,
  onMove,
}: {
  label: string
  description: string
  notes: ClassNote[]
  type: string
  onMove: (type: string, index: number, direction: -1 | 1) => void
}) {
  if (notes.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{label}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {notes.map((note, i) => (
          <div
            key={note.id}
            className="flex items-center gap-2 rounded-md border px-3 py-2"
          >
            <div className="flex flex-col gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                disabled={i === 0}
                onClick={() => onMove(type, i, -1)}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                disabled={i === notes.length - 1}
                onClick={() => onMove(type, i, 1)}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{note.title}</p>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(note.activeAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                {note.expiresAt && (
                  <span>
                    {' — expires '}
                    {new Date(note.expiresAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
              #{i + 1}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
