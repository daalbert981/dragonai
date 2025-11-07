import { requireRole } from "@/lib/auth-helpers"
import { CreateUserForm } from "@/components/superadmin/CreateUserForm"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function CreateUserPage() {
  await requireRole("SUPERADMIN")

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center gap-4">
        <Link href="/app/superadmin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </Link>
      </div>

      <div className="max-w-2xl">
        <CreateUserForm />
      </div>
    </div>
  )
}
