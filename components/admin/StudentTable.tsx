'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, MailPlus, Check } from 'lucide-react';
import { format } from 'date-fns';

interface Student {
  id: string;
  userId: string;
  enrolledAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    setupPending?: boolean;
  };
}

interface StudentTableProps {
  students: Student[];
  onRemoveStudent: (userId: string) => Promise<void>;
  courseId?: string;
}

export function StudentTable({ students, onRemoveStudent, courseId }: StudentTableProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [resendState, setResendState] = useState<Record<string, 'sending' | 'sent' | 'error'>>({});

  const handleRemove = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this student from the course?')) {
      return;
    }

    setRemovingId(userId);
    try {
      await onRemoveStudent(userId);
    } finally {
      setRemovingId(null);
    }
  };

  const handleResendSetup = async (userId: string) => {
    if (!courseId) return;
    setResendState((s) => ({ ...s, [userId]: 'sending' }));
    try {
      const res = await fetch(
        `/api/admin/courses/${courseId}/students/${userId}/resend-setup`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send');
      }
      setResendState((s) => ({ ...s, [userId]: 'sent' }));
    } catch (err: any) {
      setResendState((s) => ({ ...s, [userId]: 'error' }));
      alert(err.message);
    }
  };

  if (students.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No students enrolled yet
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Enrolled Date</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell className="font-medium">
                {student.user.name || 'N/A'}
                {student.user.setupPending && (
                  <span className="ml-2 text-xs rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                    setup pending
                  </span>
                )}
              </TableCell>
              <TableCell>{student.user.email}</TableCell>
              <TableCell>
                {format(new Date(student.enrolledAt), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {student.user.setupPending && courseId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleResendSetup(student.userId)}
                      disabled={resendState[student.userId] === 'sending'}
                      title="Resend setup email (regenerates the link)"
                    >
                      {resendState[student.userId] === 'sent' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <MailPlus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(student.userId)}
                    disabled={removingId === student.userId}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
