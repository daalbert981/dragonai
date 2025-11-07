import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { requireRole } from "@/lib/auth-helpers"
import { StatCard } from "@/components/superadmin/StatCard"
import { Users, BookOpen, GraduationCap, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

async function getStats() {
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/superadmin/stats`, {
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

export default async function SuperadminDashboard() {
  await requireRole("SUPERADMIN")

  const stats = await getStats()

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Failed to load statistics</p>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          description="All registered users"
        />
        <StatCard
          title="Total Courses"
          value={stats.totalCourses}
          icon={BookOpen}
          description="All courses in system"
        />
        <StatCard
          title="Instructors"
          value={stats.totalInstructors}
          icon={UserCog}
          description="Admin users"
        />
        <StatCard
          title="Students"
          value={stats.totalStudents}
          icon={GraduationCap}
          description="Student users"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link href="/app/superadmin/users/create">
              <Button className="w-full" variant="outline">
                Create New User
              </Button>
            </Link>
            <Link href="/app/superadmin/users">
              <Button className="w-full" variant="outline">
                Manage Users
              </Button>
            </Link>
            <Link href="/app/superadmin/courses">
              <Button className="w-full" variant="outline">
                View All Courses
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              No recent activity to display
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
