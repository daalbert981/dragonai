'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { generateCsvTemplate } from '@/lib/csv-parser'

interface ImportError {
  row: number
  email: string
  error: string
}

interface ImportResult {
  success: boolean
  imported: number
  failed: number
  errors: ImportError[]
  emailsSent?: number
  emailsFailed?: number
}

export default function StudentImportPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [sendEmails, setSendEmails] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        alert('Please select a CSV file')
        return
      }
      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleDownloadTemplate = () => {
    const template = generateCsvTemplate()
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student-import-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first')
      return
    }

    setIsUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sendEmails', sendEmails.toString())

      const response = await fetch(
        `/api/admin/courses/${courseId}/students/bulk-import`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const data = await response.json()

      if (!response.ok) {
        // Handle validation errors
        if (data.validationErrors) {
          setResult({
            success: false,
            imported: 0,
            failed: data.failed || data.validationErrors.length,
            errors: data.errors || data.validationErrors.map((err: any) => ({
              row: err.row,
              email: err.data?.email || 'N/A',
              error: err.errors.join(', ')
            }))
          })
        } else {
          throw new Error(data.message || data.error || 'Import failed')
        }
      } else {
        setResult(data)
        // Reset file input if successful
        if (data.success && data.imported > 0) {
          setFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-5xl">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/courses/${courseId}/students`)}
        >
          ← Back to Students
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import Students from CSV</CardTitle>
          <CardDescription>
            Upload a CSV file to bulk import students into this course. Students will be
            created with auto-generated passwords and optionally emailed their credentials.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Instructions */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-sm">CSV Format Requirements:</h3>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>
                <strong>Required columns:</strong> name, email
              </li>
              <li>
                <strong>Optional columns:</strong> studentId
              </li>
              <li>First row must be headers</li>
              <li>Each student will get a randomly generated secure password</li>
              <li>Duplicate emails within the CSV will be rejected</li>
              <li>Students already enrolled in this course will be skipped</li>
            </ul>
            <Button
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={handleDownloadTemplate}
            >
              Download CSV Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="file-upload"
                className="block text-sm font-medium mb-2"
              >
                Select CSV File
              </label>
              <Input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {/* Email Option */}
            <div className="flex items-center space-x-2">
              <input
                id="send-emails"
                type="checkbox"
                checked={sendEmails}
                onChange={(e) => setSendEmails(e.target.checked)}
                disabled={isUploading}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label
                htmlFor="send-emails"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Send welcome emails with login credentials to new students
              </label>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full"
            >
              {isUploading ? 'Importing...' : 'Import Students'}
            </Button>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Success Summary */}
              {result.success && result.imported > 0 && (
                <Alert>
                  <AlertTitle>Import Completed</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-1 mt-2">
                      <p>
                        <Badge variant="default" className="mr-2">
                          {result.imported} Imported
                        </Badge>
                        {result.failed > 0 && (
                          <Badge variant="destructive" className="mr-2">
                            {result.failed} Failed
                          </Badge>
                        )}
                      </p>
                      {sendEmails && result.emailsSent !== undefined && (
                        <p className="text-sm">
                          Emails sent: {result.emailsSent}
                          {result.emailsFailed! > 0 &&
                            `, ${result.emailsFailed} failed to send`}
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Errors Table */}
              {result.errors && result.errors.length > 0 && (
                <div>
                  <Alert variant="destructive" className="mb-4">
                    <AlertTitle>Import Errors</AlertTitle>
                    <AlertDescription>
                      {result.errors.length} {result.errors.length === 1 ? 'row' : 'rows'}{' '}
                      could not be imported. See details below.
                    </AlertDescription>
                  </Alert>

                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Row</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.errors.map((error, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono">
                              {error.row || '-'}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {error.email}
                            </TableCell>
                            <TableCell className="text-sm text-destructive">
                              {error.error}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="mt-6 text-sm text-muted-foreground space-y-2">
        <p>
          <strong>Note:</strong> This operation cannot be undone. Please review your CSV
          file carefully before importing.
        </p>
        <p>
          For large imports (100+ students), the process may take a few minutes. Please be
          patient and do not refresh the page.
        </p>
      </div>
    </div>
  )
}
