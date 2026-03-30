'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from 'lucide-react'

export function JoinCourseForm() {
  const router = useRouter()
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
      // Refresh the page to show the new course
      setTimeout(() => router.refresh(), 1500)
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <UserPlus className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">Join a Course</CardTitle>
            <CardDescription>
              Enter a registration token from your instructor to enroll in a course
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800 mb-4">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-800 mb-4">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <Input
            type="text"
            placeholder="Paste your course registration token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !token.trim()} size="default">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Join Course
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
