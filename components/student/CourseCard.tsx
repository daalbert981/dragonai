import Link from 'next/link'
import { BookOpen, Calendar, Clock } from 'lucide-react'
import { CourseWithEnrollment } from '@/types'

interface CourseCardProps {
  course: CourseWithEnrollment
}

export function CourseCard({ course }: CourseCardProps) {
  const enrolledDate = new Date(course.enrolledAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const semesterInfo = course.semester && course.year
    ? `${course.semester} ${course.year}`
    : null

  return (
    <Link
      href={`/student/courses/${course.id}/chat`}
      className="block group"
    >
      <div className="border rounded-lg p-6 hover:border-primary hover:shadow-md transition-all duration-200 bg-card">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-1 group-hover:text-primary transition-colors">
              {course.title}
            </h3>
            <p className="text-sm text-muted-foreground font-mono">
              {course.code}
            </p>
          </div>
          <div className="flex-shrink-0 ml-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        {course.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {course.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {semesterInfo && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{semesterInfo}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Enrolled {enrolledDate}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <span className="text-sm text-primary font-medium group-hover:underline">
            Open Course Chat →
          </span>
        </div>
      </div>
    </Link>
  )
}
