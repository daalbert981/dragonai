'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, ArrowRight } from 'lucide-react';

interface CourseCardProps {
  course: {
    id: string;
    name: string;
    code: string;
    description?: string | null;
    _count: {
      enrollments: number;
      materials: number;
    };
  };
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{course.name}</CardTitle>
            <CardDescription className="mt-1">{course.code}</CardDescription>
          </div>
          <Badge variant="secondary">{course.code}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {course.description}
          </p>
        )}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{course._count.enrollments} students</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{course._count.materials} materials</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/admin/courses/${course.id}`} className="w-full">
          <Button variant="outline" className="w-full">
            Manage Course
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
