"use client"

import { useEffect, useState } from "react"
import { UserTable } from "@/components/superadmin/UserTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserRole, UserStatus } from "@prisma/client"
import Link from "next/link"
import { Search } from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string
  role: UserRole
  status: UserStatus
  createdAt: Date
}

interface UsersResponse {
  users: User[]
  total: number
  page: number
  totalPages: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search,
      })

      if (roleFilter !== "all") {
        params.append("role", roleFilter)
      }

      const response = await fetch(`/api/superadmin/users?${params}`)
      if (response.ok) {
        const data: UsersResponse = await response.json()
        setUsers(data.users)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, search, roleFilter])

  const handleRoleUpdate = async (userId: string, role: UserRole) => {
    try {
      const response = await fetch(`/api/superadmin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      })

      if (response.ok) {
        fetchUsers()
      } else {
        const error = await response.text()
        alert(`Failed to update role: ${error}`)
      }
    } catch (error) {
      console.error("Failed to update role:", error)
      alert("Failed to update role")
    }
  }

  const handleStatusToggle = async (userId: string, status: UserStatus) => {
    try {
      const response = await fetch(`/api/superadmin/users/${userId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        fetchUsers()
      } else {
        const error = await response.text()
        alert(`Failed to update status: ${error}`)
      }
    } catch (error) {
      console.error("Failed to update status:", error)
      alert("Failed to update status")
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Users Management</h2>
        <Link href="/app/superadmin/users/create">
          <Button>Create User</Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(value) => {
            setRoleFilter(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="STUDENT">Students</SelectItem>
            <SelectItem value="ADMIN">Instructors</SelectItem>
            <SelectItem value="SUPERADMIN">Super Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <>
          <UserTable
            users={users}
            onRoleUpdate={handleRoleUpdate}
            onStatusToggle={handleStatusToggle}
          />

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
