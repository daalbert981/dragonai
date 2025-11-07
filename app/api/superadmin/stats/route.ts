import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== UserRole.SUPERADMIN) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Get statistics
    const [totalUsers, totalCourses, totalInstructors, totalStudents] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.user.count({ where: { role: UserRole.ADMIN } }),
      prisma.user.count({ where: { role: UserRole.STUDENT } }),
    ])

    return NextResponse.json({
      totalUsers,
      totalCourses,
      totalInstructors,
      totalStudents,
    })
  } catch (error) {
    console.error("[STATS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
