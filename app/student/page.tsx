'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CourseCard } from '@/components/student/CourseCard'
import { CourseWithEnrollment } from '@/types'
import { BookOpen, ArrowRight, Loader2, GraduationCap } from 'lucide-react'

export default function StudentDashboard() {
  const [courses, setCourses] = useState<CourseWithEnrollment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCourses() {
      try {
        // TODO: Replace with actual session studentId when auth is implemented
        const studentId = 'temp-student-id' // Temporary for development
        const response = await fetch(`/api/student/courses?studentId=${studentId}`)

        if (response.ok) {
          const data = await response.json()
          // Show only first 3 courses on dashboard
          setCourses(data.courses.slice(0, 3))
        }
      } catch (err) {
        console.error('Error fetching courses:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [])

  return (
    <div className="container mx-auto py-10">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Student Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's your learning overview.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Enrolled Courses</h3>
          </div>
          <p className="text-3xl font-bold">{loading ? '...' : courses.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Active courses</p>
        </div>

        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">AI Assistant</h3>
          </div>
          <p className="text-3xl font-bold">24/7</p>
          <p className="text-sm text-muted-foreground mt-1">Available to help</p>
        </div>

        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center gap-3 mb-2">
            <ArrowRight className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Quick Access</h3>
          </div>
          <Link
            href="/student/courses"
            className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1 mt-3"
          >
            View All Courses
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Recent Courses Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Recent Courses</h2>
            <p className="text-sm text-muted-foreground">
              Your recently enrolled courses
            </p>
          </div>
          {courses.length > 0 && (
            <Link
              href="/student/courses"
              className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading your courses...</p>
            </div>
          </div>
        ) : courses.length === 0 ? (
          <div className="border rounded-lg p-12 text-center bg-muted/50">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Courses Yet</h3>
            <p className="text-muted-foreground mb-4">
              You are not enrolled in any courses at the moment.
            </p>
            <p className="text-sm text-muted-foreground">
              Contact your administrator to get enrolled in courses.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="border rounded-lg p-6 bg-muted/50">
        <h3 className="text-lg font-semibold mb-3">Getting Started</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Click on any course card to open the AI-powered course chat</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Ask questions about course materials and get instant help</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Your AI assistant is available 24/7 to support your learning</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
