import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, UserStatus } from "@prisma/client"

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== UserRole.SUPERADMIN) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    if (!status || !Object.values(UserStatus).includes(status)) {
      return new NextResponse("Invalid status", { status: 400 })
    }

    // Prevent changing own status
    if (params.id === session.user.id) {
      return new NextResponse("Cannot change your own status", { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("[USER_STATUS_UPDATE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
