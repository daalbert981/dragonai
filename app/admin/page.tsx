import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/admin/CourseCard';
import { Plus } from 'lucide-react';

async function getCourses() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/admin/courses`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch courses');
  }

  return response.json();
}

export default async function AdminDashboard() {
  try {
    await requireRole('ADMIN');
  } catch (error) {
    redirect('/login');
  }

  const courses = await getCourses();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Instructor Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your courses, students, and materials
          </p>
        </div>
        <Link href="/admin/courses/create">
          <Button size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Create New Course
          </Button>
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
          <p className="text-muted-foreground mb-6">
            Get started by creating your first course
          </p>
          <Link href="/admin/courses/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Course
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course: any) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
