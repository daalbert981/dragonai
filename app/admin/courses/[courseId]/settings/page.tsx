import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardHeader } from '@/components/DashboardHeader';
import { CourseSettingsForm } from '@/components/admin/CourseSettingsForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

async function getCourse(courseId: string, userId: number, role: string) {
  // Superadmins can access any course
  if (role === 'SUPERADMIN') {
    return prisma.course.findUnique({ where: { id: courseId } });
  }
  // Instructors can only access their own courses
  return prisma.course.findFirst({
    where: {
      id: courseId,
      instructors: { some: { userId } },
    },
  });
}

export default async function CourseSettingsPage({
  params,
}: {
  params: { courseId: string };
}) {
  let session;
  try {
    session = await requireRole('INSTRUCTOR');
  } catch (error) {
    redirect('/login');
  }

  const userId = parseInt((session.user as any).id);
  const userRole = (session.user as any).role;
  const course = await getCourse(params.courseId, userId, userRole);

  if (!course) {
    redirect('/admin');
  }

  return (
    <>
      <DashboardHeader
        userName={session?.user?.name}
        userEmail={session?.user?.email}
        userRole={(session?.user as any)?.role}
      />
      <div className="container mx-auto py-6 sm:py-8 px-3 sm:px-4">
        <Link href={`/admin/courses/${params.courseId}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course
          </Button>
        </Link>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Course Settings</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Configure course details and AI assistant behavior
          </p>
        </div>

        <CourseSettingsForm course={course} />
      </div>
    </>
  );
}
