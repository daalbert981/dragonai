"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UserRole, UserStatus } from "@prisma/client"
import { Edit, UserCheck, UserX } from "lucide-react"
import { RoleEditModal } from "./RoleEditModal"

interface User {
  id: string
  name: string | null
  email: string
  role: UserRole
  status: UserStatus
  createdAt: Date
}

interface UserTableProps {
  users: User[]
  onRoleUpdate: (userId: string, role: UserRole) => Promise<void>
  onStatusToggle: (userId: string, status: UserStatus) => Promise<void>
}

export function UserTable({ users, onRoleUpdate, onStatusToggle }: UserTableProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "SUPERADMIN":
        return "destructive"
      case "ADMIN":
        return "default"
      case "STUDENT":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getStatusBadgeVariant = (status: UserStatus) => {
    return status === "ACTIVE" ? "default" : "outline"
  }

  const handleEditRole = (user: User) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const handleRoleUpdate = async (role: UserRole) => {
    if (selectedUser) {
      await onRoleUpdate(selectedUser.id, role)
      setIsModalOpen(false)
      setSelectedUser(null)
    }
  }

  const toggleStatus = async (user: User) => {
    const newStatus = user.status === "ACTIVE" ? UserStatus.SUSPENDED : UserStatus.ACTIVE
    await onStatusToggle(user.id, newStatus)
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(user.status)}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditRole(user)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit Role
                    </Button>
                    <Button
                      variant={user.status === "ACTIVE" ? "destructive" : "default"}
                      size="sm"
                      onClick={() => toggleStatus(user)}
                    >
                      {user.status === "ACTIVE" ? (
                        <>
                          <UserX className="h-4 w-4 mr-1" />
                          Suspend
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedUser && (
        <RoleEditModal
          user={selectedUser}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedUser(null)
          }}
          onSave={handleRoleUpdate}
        />
      )}
    </>
  )
}
