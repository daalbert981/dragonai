import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/admin/CourseCard';
import { Plus } from 'lucide-react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

async function getCourses(userId: number) {
  // Get all courses where user is an instructor
  const courses = await prisma.course.findMany({
    where: {
      instructors: {
        some: {
          userId: userId,
        },
      },
    },
    include: {
      _count: {
        select: {
          enrollments: true,
          materials: true,
        },
      },
      instructors: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return courses;
}

export default async function AdminDashboard() {
  let session;
  try {
    session = await requireRole('INSTRUCTOR');
  } catch (error) {
    console.error('[ADMIN DASHBOARD] Auth error:', error);
    redirect('/login');
  }

  const userId = parseInt((session.user as any).id);

  // Additional validation - if userId is invalid, redirect to login
  if (isNaN(userId) || !userId) {
    console.error('[ADMIN DASHBOARD] Invalid userId:', userId);
    redirect('/login');
  }

  const courses = await getCourses(userId);

  return (
    <>
      <DashboardHeader
        userName={session?.user?.name}
        userEmail={session?.user?.email}
        userRole={(session?.user as any)?.role}
      />
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Instructor Dashboard</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
              Manage your courses, students, and materials
            </p>
          </div>
          <Link href="/admin/courses/create">
            <Button size="lg" className="w-full sm:w-auto">
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
    </>
  );
}
