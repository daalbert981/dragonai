'use client'

import { useSession, signOut } from 'next-auth/react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Avatar from '@radix-ui/react-avatar'
import { LogOut, User, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function UserMenu() {
  const { data: session } = useSession()
  const router = useRouter()

  if (!session?.user) return null

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-purple-100 text-purple-800'
      case 'INSTRUCTOR':
        return 'bg-blue-100 text-blue-800'
      case 'STUDENT':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'Super Admin'
      case 'INSTRUCTOR':
        return 'Instructor'
      case 'STUDENT':
        return 'Student'
      default:
        return role
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <Avatar.Root className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
            <Avatar.Fallback className="text-sm font-semibold">
              {getInitials(session.user.name)}
            </Avatar.Fallback>
          </Avatar.Root>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[220px] rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
          sideOffset={5}
          align="end"
        >
          {/* User Info */}
          <div className="px-3 py-2 mb-2 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-900">
              {session.user.name || 'User'}
            </p>
            <p className="text-xs text-gray-600 truncate">
              {session.user.email}
            </p>
            <span
              className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${getRoleBadgeColor(
                session.user.role
              )}`}
            >
              {getRoleLabel(session.user.role)}
            </span>
          </div>

          {/* Menu Items */}
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm text-gray-700 outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100"
            onSelect={() => router.push('/profile')}
          >
            <User className="h-4 w-4" />
            <span>Profile</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm text-gray-700 outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100"
            onSelect={() => router.push('/settings')}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-gray-200" />

          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm text-red-600 outline-none transition-colors hover:bg-red-50 focus:bg-red-50"
            onSelect={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
