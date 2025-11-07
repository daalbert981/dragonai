"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { UserRole } from "@prisma/client"

interface User {
  id: string
  name: string | null
  email: string
  role: UserRole
}

interface RoleEditModalProps {
  user: User
  isOpen: boolean
  onClose: () => void
  onSave: (role: UserRole) => Promise<void>
}

export function RoleEditModal({ user, isOpen, onClose, onSave }: RoleEditModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave(selectedRole)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User Role</DialogTitle>
          <DialogDescription>
            Change the role for {user.name || user.email}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select
            value={selectedRole}
            onValueChange={(value) => setSelectedRole(value as UserRole)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STUDENT">Student</SelectItem>
              <SelectItem value="ADMIN">Admin (Instructor)</SelectItem>
              <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
