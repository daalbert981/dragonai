import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { UserRole } from "@prisma/client"
import { redirect } from "next/navigation"

export async function requireAuth() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  return session
}

export async function requireRole(role: UserRole | UserRole[]) {
  const session = await requireAuth()

  const allowedRoles = Array.isArray(role) ? role : [role]

  if (!allowedRoles.includes(session.user.role)) {
    redirect("/")
  }

  return session
}
