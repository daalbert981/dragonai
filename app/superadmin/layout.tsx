import { requireRole } from "@/lib/auth-helpers"

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole("SUPERADMIN")

  return <>{children}</>
}
