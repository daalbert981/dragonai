'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { AlertCircle, Check, Copy, Key, Loader2, RefreshCw, Trash2 } from 'lucide-react'

interface TokenInfo {
  hasToken: boolean
  token: string | null
  expiresAt: string | null
  isExpired: boolean
}

const EXPIRY_OPTIONS = [
  { value: '24', label: '24 hours' },
  { value: '48', label: '48 hours' },
  { value: '168', label: '1 week' },
  { value: '336', label: '2 weeks' },
  { value: '720', label: '30 days' },
]

export function RegistrationTokenManager({ courseId }: { courseId: string }) {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState('')
  const [expiryHours, setExpiryHours] = useState('168')
  const [copied, setCopied] = useState(false)
  const [showToken, setShowToken] = useState(false)

  const fetchToken = async () => {
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/registration-token`)
      if (!response.ok) throw new Error('Failed to fetch token')
      const data = await response.json()
      setTokenInfo(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchToken()
  }, [courseId])

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      setError('')
      const response = await fetch(`/api/admin/courses/${courseId}/registration-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiryHours: parseInt(expiryHours) }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate token')
      }

      setShowToken(true)
      await fetchToken()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke this registration token? Students will no longer be able to register with it.')) {
      return
    }

    try {
      setRevoking(true)
      setError('')
      const response = await fetch(`/api/admin/courses/${courseId}/registration-token`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to revoke token')

      setShowToken(false)
      await fetchToken()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRevoking(false)
    }
  }

  const getRegistrationUrl = () => {
    if (!tokenInfo?.token) return ''
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}/register?token=${tokenInfo.token}`
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatExpiry = (expiresAt: string) => {
    const date = new Date(expiresAt)
    return date.toLocaleString()
  }

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Student Registration</CardTitle>
              <CardDescription>
                Generate a token for students to self-register and enroll
              </CardDescription>
            </div>
          </div>
          {tokenInfo?.hasToken && !tokenInfo.isExpired && (
            <Badge variant="default">Active</Badge>
          )}
          {tokenInfo?.hasToken && tokenInfo.isExpired && (
            <Badge variant="destructive">Expired</Badge>
          )}
          {!tokenInfo?.hasToken && (
            <Badge variant="secondary">No Token</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Active token display */}
        {tokenInfo?.hasToken && tokenInfo.token && (
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Registration Link</p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={getRegistrationUrl()}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(getRegistrationUrl())}
                  title="Copy link"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {showToken && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Token</p>
                <code className="block rounded bg-muted p-2 text-xs font-mono break-all">
                  {tokenInfo.token}
                </code>
              </div>
            )}

            {!showToken && (
              <button
                onClick={() => setShowToken(true)}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Show raw token
              </button>
            )}

            {tokenInfo.expiresAt && (
              <p className="text-sm text-muted-foreground">
                {tokenInfo.isExpired
                  ? `Expired on ${formatExpiry(tokenInfo.expiresAt)}`
                  : `Expires on ${formatExpiry(tokenInfo.expiresAt)}`}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevoke}
                disabled={revoking}
              >
                {revoking ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-3 w-3" />
                )}
                Revoke
              </Button>
            </div>
          </div>
        )}

        {/* Generate / Regenerate controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 pt-2 border-t">
          <div className="space-y-2 w-full sm:w-auto">
            <p className="text-sm font-medium">
              {tokenInfo?.hasToken ? 'Regenerate Token' : 'Generate Token'}
            </p>
            <Select value={expiryHours} onValueChange={setExpiryHours}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Token duration" />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            size="sm"
          >
            {generating ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-3 w-3" />
            )}
            {tokenInfo?.hasToken ? 'Regenerate' : 'Generate'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
