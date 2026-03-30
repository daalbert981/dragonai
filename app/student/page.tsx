import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, MessageSquare, FileText } from 'lucide-react'
import { DashboardHeader } from '@/components/DashboardHeader'
import { JoinCourseForm } from '@/components/student/JoinCourseForm'

async function getEnrolledCourses(userId: number) {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          isActive: true,
          _count: {
            select: {
              materials: true,
            },
          },
        },
      },
    },
    orderBy: {
      enrolledAt: 'desc',
    },
  })

  return enrollments.map(e => e.course)
}

export default async function StudentDashboard() {
  let session
  try {
    session = await requireAuth()
  } catch (error) {
    console.error('[STUDENT DASHBOARD] Auth error:', error)
    redirect('/login')
  }

  const userId = parseInt((session.user as any).id)

  // Additional validation - if userId is invalid, redirect to login
  if (isNaN(userId) || !userId) {
    console.error('[STUDENT DASHBOARD] Invalid userId:', userId)
    redirect('/login')
  }

  const courses = await getEnrolledCourses(userId)

  return (
    <>
      <DashboardHeader
        userName={session.user?.name}
        userEmail={session.user?.email}
        userRole={(session.user as any)?.role}
      />
      <div className="container mx-auto py-6 sm:py-8 px-3 sm:px-4">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">My Courses</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Access your enrolled courses and start chatting with the AI assistant
          </p>
        </div>

      <JoinCourseForm />

      {courses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
            <p className="text-muted-foreground">
              Use a registration token from your instructor to join a course.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{course.name}</CardTitle>
                      <CardDescription className="text-sm font-mono">
                        {course.code}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {course.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {course.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>{course._count.materials} materials</span>
                  </div>
                </div>

                <Link href={`/student/courses/${course.id}/chat`}>
                  <Button className="w-full" size="lg">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Open Chat
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </>
  )
}
