import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== UserRole.SUPERADMIN) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await request.json()
    const { name, email, role, password } = body

    if (!email || !role) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return new NextResponse("User already exists", { status: 400 })
    }

    // Generate password if not provided
    const userPassword = password || Math.random().toString(36).slice(-8)
    const hashedPassword = await bcrypt.hash(userPassword, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user, generatedPassword: password ? null : userPassword })
  } catch (error) {
    console.error("[USER_CREATE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
