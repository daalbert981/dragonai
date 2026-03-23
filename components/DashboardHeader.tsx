'use client'

import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogOut, User, Settings, ChevronDown } from 'lucide-react'
import { APP_VERSION } from '@/lib/version'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DashboardHeaderProps {
  userName?: string | null
  userEmail?: string | null
  userRole?: string | null
}

export function DashboardHeader({ userName, userEmail, userRole }: DashboardHeaderProps) {
  const router = useRouter()

  // Determine home path based on role
  const homePath = userRole === 'SUPERADMIN' ? '/superadmin'
    : userRole === 'INSTRUCTOR' ? '/admin'
    : '/student'

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo/Brand */}
        <Link href={homePath} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
          <h2 className="text-lg sm:text-xl font-bold truncate">Dragon AI</h2>
          <span className="hidden sm:inline text-xs text-muted-foreground">v{APP_VERSION}</span>
        </Link>

        {/* User Menu */}
        <div className="flex items-center flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1.5 sm:gap-2 max-w-[200px]">
                <User className="h-4 w-4 flex-shrink-0" />
                <div className="flex-col items-start hidden sm:flex">
                  <span className="text-sm font-medium truncate">{userName || 'User'}</span>
                  {userRole && (
                    <span className="text-xs text-muted-foreground">{userRole}</span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{userName}</span>
                  <span className="text-xs text-muted-foreground font-normal">{userEmail}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
