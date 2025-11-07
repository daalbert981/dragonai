import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, FileText, Settings } from 'lucide-react';

async function getCourse(courseId: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/admin/courses/${courseId}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch course');
  }

  return response.json();
}

export default async function CourseManagementPage({
  params,
}: {
  params: { courseId: string };
}) {
  try {
    await requireRole('ADMIN');
  } catch (error) {
    redirect('/login');
  }

  const course = await getCourse(params.courseId);

  return (
    <div className="container mx-auto py-8 px-4">
      <Link href="/admin">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">{course.name}</h1>
          <Badge variant="secondary">{course.code}</Badge>
        </div>
        {course.description && (
          <p className="text-muted-foreground">{course.description}</p>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">
            <Users className="mr-2 h-4 w-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="materials">
            <FileText className="mr-2 h-4 w-4" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enrolled Students</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{course._count.enrollments}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{course._count.materials}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Model</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{course.model}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Manage your course with these quick actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href={`/admin/courses/${course.id}/students`}>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Students
                </Button>
              </Link>
              <Link href={`/admin/courses/${course.id}/materials`}>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Upload Materials
                </Button>
              </Link>
              <Link href={`/admin/courses/${course.id}/settings`}>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure AI Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Student Management</CardTitle>
              <CardDescription>
                For detailed student management, visit the dedicated students page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/admin/courses/${course.id}/students`}>
                <Button>Go to Students Page</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle>Materials Management</CardTitle>
              <CardDescription>
                For detailed materials management, visit the dedicated materials page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/admin/courses/${course.id}/materials`}>
                <Button>Go to Materials Page</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Course Settings</CardTitle>
              <CardDescription>
                For detailed settings configuration, visit the dedicated settings page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/admin/courses/${course.id}/settings`}>
                <Button>Go to Settings Page</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
