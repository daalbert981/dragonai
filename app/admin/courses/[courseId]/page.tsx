import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileText, BookOpen, Settings, BarChart3 } from 'lucide-react';
import Link from 'next/link';

async function getCourseDetails(courseId: string, userId: number, role: string) {
  const whereClause = role === 'SUPERADMIN'
    ? { id: courseId }
    : { id: courseId, instructors: { some: { userId } } };

  return prisma.course.findFirst({
    where: whereClause,
    include: {
      _count: {
        select: {
          enrollments: true,
          materials: true,
          instructors: true,
        },
      },
      enrollments: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: {
          enrolledAt: 'desc',
        },
      },
      materials: {
        orderBy: {
          uploadedAt: 'desc',
        },
        take: 10,
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
  });
}

export default async function CourseManagementPage({
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
  const course = await getCourseDetails(params.courseId, userId, userRole);

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
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold truncate">{course.name}</h1>
              <p className="text-muted-foreground mt-1 sm:mt-2 font-mono text-sm">{course.code}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link href={`/admin/courses/${course.id}/analytics`}>
                <Button variant="outline" size="sm" className="sm:size-default">
                  <BarChart3 className="sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </Button>
              </Link>
              <Link href={`/admin/courses/${course.id}/settings`}>
                <Button variant="outline" size="sm" className="sm:size-default">
                  <Settings className="sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </Link>
            </div>
          </div>
          {course.description && (
            <p className="text-muted-foreground mt-4">{course.description}</p>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enrolled Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{course._count.enrollments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Course Materials</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{course._count.materials}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Instructors</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{course._count.instructors}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Instructors */}
          <Card>
            <CardHeader>
              <CardTitle>Instructors</CardTitle>
              <CardDescription>Teaching staff for this course</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {course.instructors.map((instructor) => (
                  <div
                    key={instructor.userId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{instructor.user.username}</div>
                      <div className="text-sm text-muted-foreground">{instructor.user.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Enrolled Students */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Enrolled Students</CardTitle>
                  <CardDescription>Students enrolled in this course</CardDescription>
                </div>
                <Link href={`/admin/courses/${course.id}/students`}>
                  <Button variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Students
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {course.enrollments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">
                      No students enrolled yet
                    </p>
                    <Link href={`/admin/courses/${course.id}/students`}>
                      <Button size="sm">
                        <Users className="mr-2 h-4 w-4" />
                        Add Students
                      </Button>
                    </Link>
                  </div>
                ) : (
                  course.enrollments.map((enrollment) => (
                    <div
                      key={enrollment.userId}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{enrollment.user.username}</div>
                        <div className="text-sm text-muted-foreground">{enrollment.user.email}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course Materials */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Course Materials</CardTitle>
                <CardDescription>Recent uploads (latest 10)</CardDescription>
              </div>
              <Link href={`/admin/courses/${course.id}/materials`}>
                <Button>
                  <FileText className="mr-2 h-4 w-4" />
                  Manage Materials
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {course.materials.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No materials uploaded yet
                </p>
              ) : (
                course.materials.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{material.originalName}</div>
                        {material.description && (
                          <div className="text-sm text-muted-foreground">{material.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-xs text-muted-foreground">
                        {new Date(material.uploadedAt).toLocaleDateString()}
                      </div>
                      {material.mimeType && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {material.mimeType}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
