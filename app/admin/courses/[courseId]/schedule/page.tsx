'use client';

import { useState, useEffect, use } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ArrowLeft } from 'lucide-react';
import { ClassSessionDialog } from '@/components/schedule/class-session-dialog';
import { CalendarView } from '@/components/schedule/calendar-view';
import Link from 'next/link';

interface ClassSession {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  status: string;
  instructor: {
    id: string;
    name: string;
    email: string;
  };
}

export default function SchedulePage({ params }: { params: Promise<{ courseId: string }> }) {
  const resolvedParams = use(params);
  const { courseId } = resolvedParams;

  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | undefined>();

  // Mock instructor ID - in production, get from auth session
  const instructorId = 'mock-instructor-id';

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/schedule`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [courseId]);

  const handleAddSession = () => {
    setEditingSession(undefined);
    setDialogOpen(true);
  };

  const handleEditSession = (session: ClassSession) => {
    setEditingSession(session);
    setDialogOpen(true);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/courses/${courseId}/schedule/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchSessions();
      } else {
        alert('Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session');
    }
  };

  const handleDialogSuccess = () => {
    fetchSessions();
  };

  // Separate upcoming and past sessions
  const now = new Date();
  const upcomingSessions = sessions.filter(
    (s) => new Date(s.startTime) >= now && s.status !== 'CANCELLED'
  );
  const pastSessions = sessions.filter(
    (s) => new Date(s.endTime) < now || s.status === 'COMPLETED'
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading schedule...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/admin/courses/${courseId}`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Class Schedule</h1>
            <p className="text-muted-foreground">Manage class sessions for this course</p>
          </div>
        </div>
        <Button onClick={handleAddSession}>
          <Plus className="h-4 w-4 mr-2" />
          Add Class
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Classes</CardDescription>
            <CardTitle className="text-3xl">{sessions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming Classes</CardDescription>
            <CardTitle className="text-3xl">{upcomingSessions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Past Classes</CardDescription>
            <CardTitle className="text-3xl">{pastSessions.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
          <CardDescription>
            View and manage all class sessions. Click on a session to edit it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CalendarView
            sessions={sessions}
            onEditSession={handleEditSession}
            onDeleteSession={handleDeleteSession}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <ClassSessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        courseId={courseId}
        instructorId={instructorId}
        session={editingSession}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
