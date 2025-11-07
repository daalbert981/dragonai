'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ClassSession {
  id?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  status?: string;
}

interface ClassSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  instructorId: string;
  session?: ClassSession;
  onSuccess: () => void;
}

export function ClassSessionDialog({
  open,
  onOpenChange,
  courseId,
  instructorId,
  session,
  onSuccess,
}: ClassSessionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ClassSession>({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
  });

  // Reset form when dialog opens with new session or closes
  useEffect(() => {
    if (open && session) {
      // Editing existing session
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);

      setFormData({
        ...session,
        startTime: startTime.toISOString().slice(0, 16),
        endTime: endTime.toISOString().slice(0, 16),
      });
    } else if (open && !session) {
      // Creating new session - set default times
      const now = new Date();
      const start = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration

      setFormData({
        title: '',
        description: '',
        startTime: start.toISOString().slice(0, 16),
        endTime: end.toISOString().slice(0, 16),
        location: '',
      });
    }
  }, [open, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = session
        ? `/api/courses/${courseId}/schedule/${session.id}`
        : `/api/courses/${courseId}/schedule`;

      const method = session ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          instructorId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save class session');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving class session:', error);
      alert('Failed to save class session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{session ? 'Edit Class Session' : 'Add New Class Session'}</DialogTitle>
          <DialogDescription>
            {session
              ? 'Update the details of this class session.'
              : 'Create a new class session for this course.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Week 1: Introduction to AI"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the class content..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Room 101 or Zoom link"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : session ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
