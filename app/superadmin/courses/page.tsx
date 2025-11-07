"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CourseStatus } from "@prisma/client"

interface Course {
  id: string
  name: string
  code: string
  description: string | null
  status: CourseStatus
  createdAt: Date
  instructor: {
    id: string
    name: string | null
    email: string
  }
  _count: {
    enrollments: number
  }
}

interface CoursesResponse {
  courses: Course[]
  total: number
  page: number
  totalPages: number
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [instructors, setInstructors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [instructorFilter, setInstructorFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      })

      if (instructorFilter !== "all") {
        params.append("instructorId", instructorFilter)
      }

      const response = await fetch(`/api/superadmin/courses?${params}`)
      if (response.ok) {
        const data: CoursesResponse = await response.json()
        setCourses(data.courses)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInstructors = async () => {
    try {
      const response = await fetch("/api/superadmin/users?role=ADMIN&limit=1000")
      if (response.ok) {
        const data = await response.json()
        setInstructors(data.users)
      }
    } catch (error) {
      console.error("Failed to fetch instructors:", error)
    }
  }

  useEffect(() => {
    fetchInstructors()
  }, [])

  useEffect(() => {
    fetchCourses()
  }, [page, instructorFilter])

  const getStatusBadgeVariant = (status: CourseStatus) => {
    return status === "ACTIVE" ? "default" : "outline"
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Courses Management</h2>
      </div>

      <div className="flex items-center gap-4">
        <Select
          value={instructorFilter}
          onValueChange={(value) => {
            setInstructorFilter(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Filter by instructor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Instructors</SelectItem>
            {instructors.map((instructor) => (
              <SelectItem key={instructor.id} value={instructor.id}>
                {instructor.name || instructor.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No courses found
                    </TableCell>
                  </TableRow>
                ) : (
                  courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.name}</TableCell>
                      <TableCell>{course.code}</TableCell>
                      <TableCell>
                        {course.instructor.name || course.instructor.email}
                      </TableCell>
                      <TableCell>{course._count.enrollments}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(course.status)}>
                          {course.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(course.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
