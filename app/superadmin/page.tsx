import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardHeader } from '@/components/DashboardHeader';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, GraduationCap, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { CreateUserForm } from '@/components/superadmin/CreateUserForm';
import { DeleteUserButton } from '@/components/superadmin/DeleteUserButton';

async function getSystemStats() {
  const [totalUsers, totalCourses, totalStudents, totalInstructors] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.user.count({ where: { classId: { notIn: ['admin', 'superadmin', 'instructor'] } } }),
    prisma.user.count({ where: { classId: 'instructor' } })
  ]);

  return { totalUsers, totalCourses, totalStudents, totalInstructors };
}

async function getAllUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      classId: true,
      createdAt: true,
      _count: {
        select: {
          enrollments: true,
          instructorCourses: true,
        }
      }
    },
    orderBy: {
      id: 'desc'
    }
  });

  // Map classId to role for display
  return users.map(user => ({
    ...user,
    role: user.classId === 'admin' || user.classId === 'superadmin' ? 'SUPERADMIN' :
          user.classId === 'instructor' ? 'INSTRUCTOR' : 'STUDENT',
    _count: {
      enrollments: user._count.enrollments,
      coursesInstructing: user._count.instructorCourses,
    }
  }));
}

async function getAllCourses() {
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          enrollments: true,
          materials: true,
          instructors: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });

  return courses;
}

export default async function SuperadminDashboard() {
  let session;
  try {
    session = await requireRole('SUPERADMIN');
  } catch (error) {
    console.error('[SUPERADMIN DASHBOARD] Auth error:', error);
    redirect('/login');
  }

  const [stats, users, courses] = await Promise.all([
    getSystemStats(),
    getAllUsers(),
    getAllCourses()
  ]);

  return (
    <>
      <DashboardHeader
        userName={session?.user?.name}
        userEmail={session?.user?.email}
        userRole={(session?.user as any)?.role}
      />
      <div className="container mx-auto py-6 sm:py-8 px-3 sm:px-4">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Superadmin Dashboard</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            System overview and user management
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All registered users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCourses}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active and inactive courses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Enrolled students
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Instructors</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInstructors}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Teaching staff
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Courses */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Courses</CardTitle>
            <CardDescription>Latest 10 courses in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/admin/courses/${course.id}`}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg gap-2 sm:gap-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{course.code}</div>
                    <div className="text-sm text-muted-foreground truncate">{course.name}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <div>{course._count.enrollments} students</div>
                    <div>{course._count.instructors} instructors</div>
                    <div>{course._count.materials} materials</div>
                    <div className={`px-2 py-0.5 rounded text-xs ${
                      course.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                      {course.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* All Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Complete list of system users</CardDescription>
              </div>
              <CreateUserForm />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-2 sm:gap-4"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{user.username}</div>
                    <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <div className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                      user.role === 'SUPERADMIN'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                        : user.role === 'INSTRUCTOR'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    }`}>
                      {user.role}
                    </div>
                    {user.role === 'STUDENT' && (
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {user._count.enrollments} courses
                      </div>
                    )}
                    {user.role === 'INSTRUCTOR' && (
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {user._count.coursesInstructing} teaching
                      </div>
                    )}
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                    <DeleteUserButton userId={user.id} username={user.username} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
