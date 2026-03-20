'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StudentTable } from '@/components/admin/StudentTable';
import { AddStudentModal } from '@/components/admin/AddStudentModal';
import { BulkUploadStudentsModal } from '@/components/admin/BulkUploadStudentsModal';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function StudentsManagementPage({
  params,
}: {
  params: { courseId: string };
}) {
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/admin/courses/${params.courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      const data = await response.json();
      setCourse(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [params.courseId]);

  const handleAddStudent = async (data: {
    email: string;
    username?: string;
    password?: string;
    createNew?: boolean;
  }) => {
    const response = await fetch(
      `/api/admin/courses/${params.courseId}/students`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const responseData = await response.json();
      throw new Error(responseData.error || 'Failed to add student');
    }

    await fetchCourse();
  };

  const handleRemoveStudent = async (userId: string) => {
    const response = await fetch(
      `/api/admin/courses/${params.courseId}/students/${userId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to remove student');
    }

    await fetchCourse();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p className="text-muted-foreground mb-6">{error || 'Course not found'}</p>
          <Link href="/admin">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Link href={`/admin/courses/${params.courseId}`}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Course
        </Button>
      </Link>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Student Management</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          {course.name} ({course.code})
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <CardTitle>Enrolled Students</CardTitle>
              <CardDescription>
                Manage students enrolled in this course
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <BulkUploadStudentsModal
                courseId={params.courseId}
                onUploadComplete={fetchCourse}
              />
              <AddStudentModal courseId={params.courseId} onAddStudent={handleAddStudent} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StudentTable
            students={course.enrollments}
            onRemoveStudent={handleRemoveStudent}
          />
        </CardContent>
      </Card>
    </div>
  );
}
