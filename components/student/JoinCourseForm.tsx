'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Loader2, UserPlus } from 'lucide-react'

export function JoinCourseForm() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) return

    try {
      setIsLoading(true)
      setError('')
      setSuccess('')

      const response = await fetch('/api/courses/enroll-with-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationToken: token.trim() }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to join course.')
        return
      }

      setSuccess(result.message)
      setToken('')
      setTimeout(() => router.refresh(), 1500)
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <UserPlus className="h-3.5 w-3.5" />
        <span>Join a course with token</span>
        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {isOpen && (
        <div className="mt-3 p-3 rounded-lg border bg-muted/30">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-2 text-xs text-red-800 mb-3">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-2 text-xs text-green-800 mb-3">
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Paste registration token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isLoading}
              className="flex-1 h-9 text-sm"
            />
            <Button type="submit" disabled={isLoading || !token.trim()} size="sm">
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                'Join'
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
