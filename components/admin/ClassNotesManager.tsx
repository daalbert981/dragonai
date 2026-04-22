'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  ArrowUpDown,
  Clock,
  CalendarClock,
  AlertCircle,
} from 'lucide-react'

interface ClassNote {
  id: string
  type: string
  title: string
  content: string
  activeAt: string
  expiresAt: string | null
  sortOrder: number
  createdAt: string
}

interface ClassNotesManagerProps {
  courseId: string
}

function toLocalDatetimeString(iso: string): string {
  const d = new Date(iso)
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function noteStatus(note: ClassNote): 'active' | 'scheduled' | 'expired' {
  const now = new Date()
  const activeAt = new Date(note.activeAt)
  if (activeAt > now) return 'scheduled'
  if (note.expiresAt && new Date(note.expiresAt) <= now) return 'expired'
  return 'active'
}

const statusConfig = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

const emptyForm = {
  type: 'PRIOR' as string,
  title: '',
  content: '',
  activeAt: '',
  expiresAt: '',
}

export function ClassNotesManager({ courseId }: ClassNotesManagerProps) {
  const [notes, setNotes] = useState<ClassNote[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/notes`)
      if (!res.ok) throw new Error('Failed to load')
      setNotes(await res.json())
    } catch {
      setError('Failed to load class notes')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const resetForm = () => {
    setForm(emptyForm)
    setShowForm(false)
    setEditingId(null)
    setError('')
  }

  const openNewForm = () => {
    setForm({
      ...emptyForm,
      activeAt: toLocalDatetimeString(new Date().toISOString()),
    })
    setEditingId(null)
    setShowForm(true)
  }

  const openEditForm = (note: ClassNote) => {
    setForm({
      type: note.type,
      title: note.title,
      content: note.content,
      activeAt: toLocalDatetimeString(note.activeAt),
      expiresAt: note.expiresAt ? toLocalDatetimeString(note.expiresAt) : '',
    })
    setEditingId(note.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim() || !form.activeAt) {
      setError('Title, content, and active date are required')
      return
    }
    setError('')
    setSaving(true)

    try {
      const payload = {
        type: form.type,
        title: form.title.trim(),
        content: form.content.trim(),
        activeAt: new Date(form.activeAt).toISOString(),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      }

      const url = editingId
        ? `/api/admin/courses/${courseId}/notes/${editingId}`
        : `/api/admin/courses/${courseId}/notes`

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      resetForm()
      await fetchNotes()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (noteId: string) => {
    if (!confirm('Delete this class note?')) return
    setDeletingId(noteId)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/notes/${noteId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      await fetchNotes()
    } catch {
      alert('Failed to delete note')
    } finally {
      setDeletingId(null)
    }
  }

  const priorNotes = notes.filter((n) => n.type === 'PRIOR')
  const upcomingNotes = notes.filter((n) => n.type === 'UPCOMING')

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Class Notes</CardTitle>
            <CardDescription>
              Add notes about prior or upcoming sessions. Active notes appear in the AI assistant's context.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/courses/${courseId}/notes/reorder`}>
              <Button type="button" variant="outline" size="sm">
                <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
                Reorder
              </Button>
            </Link>
            <Button type="button" size="sm" onClick={openNewForm} disabled={showForm}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Note
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add / Edit form */}
        {showForm && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {editingId ? 'Edit Note' : 'New Note'}
              </p>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIOR">Prior Class</SelectItem>
                    <SelectItem value="UPCOMING">Upcoming Class</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Week 5 — Regression Analysis"
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Content</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="What was covered / what's coming up..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Active from (New York time)</Label>
                <Input
                  type="datetime-local"
                  value={form.activeAt}
                  onChange={(e) => setForm({ ...form, activeAt: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expires (optional)</Label>
                <Input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={resetForm} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                {editingId ? 'Update' : 'Add Note'}
              </Button>
            </div>
          </div>
        )}

        {/* Note lists grouped by type */}
        {notes.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No class notes yet. Click "Add Note" to create one.
          </p>
        )}

        {priorNotes.length > 0 && (
          <NoteSection
            label="Prior Classes"
            notes={priorNotes}
            onEdit={openEditForm}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        )}

        {upcomingNotes.length > 0 && (
          <NoteSection
            label="Upcoming Classes"
            notes={upcomingNotes}
            onEdit={openEditForm}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        )}
      </CardContent>
    </Card>
  )
}

function NoteSection({
  label,
  notes,
  onEdit,
  onDelete,
  deletingId,
}: {
  label: string
  notes: ClassNote[]
  onEdit: (n: ClassNote) => void
  onDelete: (id: string) => void
  deletingId: string | null
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {label}
      </p>
      <div className="space-y-2">
        {notes.map((note) => {
          const status = noteStatus(note)
          const cfg = statusConfig[status]
          return (
            <div
              key={note.id}
              className="rounded-md border px-3 py-2.5 flex flex-col sm:flex-row sm:items-start gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{note.title}</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.className}`}
                  >
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {note.content}
                </p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(note.activeAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                  {note.expiresAt && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      expires{' '}
                      {new Date(note.expiresAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(note)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDelete(note.id)}
                  disabled={deletingId === note.id}
                >
                  {deletingId === note.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
