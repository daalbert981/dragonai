'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Student {
  id: string;
  userId: string;
  enrolledAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface StudentTableProps {
  students: Student[];
  onRemoveStudent: (userId: string) => Promise<void>;
}

export function StudentTable({ students, onRemoveStudent }: StudentTableProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

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
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell className="font-medium">
                {student.user.name || 'N/A'}
              </TableCell>
              <TableCell>{student.user.email}</TableCell>
              <TableCell>
                {format(new Date(student.enrolledAt), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(student.userId)}
                  disabled={removingId === student.userId}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
