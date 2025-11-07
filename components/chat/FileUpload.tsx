'use client'

import React, { useRef, useState, useCallback } from 'react'
import { Upload, X, FileText, Image as ImageIcon, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { validateFile } from '@/lib/file-validation'
import { UploadProgress } from '@/types'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  /**
   * Course ID for upload context
   */
  courseId: string

  /**
   * Callback when files are successfully uploaded
   */
  onFilesUploaded: (fileIds: string[]) => void

  /**
   * Callback for upload errors
   */
  onError?: (error: string) => void

  /**
   * Maximum number of files allowed
   */
  maxFiles?: number

  /**
   * Whether upload is disabled
   */
  disabled?: boolean
}

interface UploadedFile {
  id: string
  file: File
  progress: UploadProgress
}

/**
 * File Upload Component
 */
export function FileUpload({
  courseId,
  onFilesUploaded,
  onError,
  maxFiles = 5,
  disabled = false
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * Handle file selection
   */
  const handleFiles = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return

    const fileArray = Array.from(selectedFiles)

    // Check max files limit
    if (files.length + fileArray.length > maxFiles) {
      onError?.(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Validate and add files
    for (const file of fileArray) {
      const validation = await validateFile(file)

      if (!validation.valid) {
        onError?.(validation.error || 'File validation failed')
        continue
      }

      const uploadedFile: UploadedFile = {
        id: `temp-${Date.now()}-${Math.random()}`,
        file,
        progress: {
          fileId: '',
          filename: file.name,
          progress: 0,
          status: 'uploading'
        }
      }

      setFiles(prev => [...prev, uploadedFile])

      // Start upload
      uploadFile(uploadedFile)
    }
  }, [files, maxFiles, onError])

  /**
   * Upload file to server
   */
  const uploadFile = async (uploadedFile: UploadedFile) => {
    try {
      // Update status to uploading
      setFiles(prev =>
        prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, progress: { ...f.progress, status: 'uploading' } }
            : f
        )
      )

      // Create form data
      const formData = new FormData()
      formData.append('file', uploadedFile.file)
      formData.append('courseId', courseId)

      // Upload with progress tracking
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setFiles(prev =>
            prev.map(f =>
              f.id === uploadedFile.id
                ? { ...f, progress: { ...f.progress, progress } }
                : f
            )
          )
        }
      })

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)

          setFiles(prev =>
            prev.map(f =>
              f.id === uploadedFile.id
                ? {
                    ...f,
                    progress: {
                      ...f.progress,
                      fileId: response.data.fileUpload.id,
                      progress: 100,
                      status: 'completed'
                    }
                  }
                : f
            )
          )

          // Notify parent of uploaded file ID
          onFilesUploaded([response.data.fileUpload.id])
        } else {
          throw new Error('Upload failed')
        }
      })

      // Handle errors
      xhr.addEventListener('error', () => {
        setFiles(prev =>
          prev.map(f =>
            f.id === uploadedFile.id
              ? {
                  ...f,
                  progress: {
                    ...f.progress,
                    status: 'error',
                    error: 'Upload failed'
                  }
                }
              : f
          )
        )
        onError?.('Failed to upload file')
      })

      // Send request
      xhr.open('POST', `/api/courses/${courseId}/upload`)
      xhr.send(formData)
    } catch (error) {
      console.error('Upload error:', error)
      setFiles(prev =>
        prev.map(f =>
          f.id === uploadedFile.id
            ? {
                ...f,
                progress: {
                  ...f.progress,
                  status: 'error',
                  error: 'Upload failed'
                }
              }
            : f
        )
      )
      onError?.('Failed to upload file')
    }
  }

  /**
   * Remove a file from the list
   */
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  /**
   * Handle drag and drop
   */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (!disabled) {
      handleFiles(e.dataTransfer.files)
    }
  }

  /**
   * Open file picker
   */
  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-3">
      {/* Upload area */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
          accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json,.md,.js,.ts,.jsx,.tsx,.py,.java"
        />

        <button
          onClick={openFilePicker}
          disabled={disabled}
          className="w-full p-6 text-center hover:bg-muted/50 transition-colors rounded-lg disabled:cursor-not-allowed"
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Images, documents, or code files (max {maxFiles} files)
          </p>
        </button>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((uploadedFile) => (
            <FileUploadItem
              key={uploadedFile.id}
              file={uploadedFile}
              onRemove={removeFile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Individual file upload item with progress
 */
interface FileUploadItemProps {
  file: UploadedFile
  onRemove: (id: string) => void
}

function FileUploadItem({ file, onRemove }: FileUploadItemProps) {
  const { file: fileObj, progress } = file

  const isImage = fileObj.type.startsWith('image/')
  const isCompleted = progress.status === 'completed'
  const isError = progress.status === 'error'
  const isUploading = progress.status === 'uploading'

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
      {/* File icon */}
      <div className="flex-shrink-0">
        {isImage ? (
          <ImageIcon className="h-5 w-5 text-blue-600" />
        ) : (
          <FileText className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileObj.name}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {formatFileSize(fileObj.size)}
          </p>

          {/* Progress bar */}
          {isUploading && (
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[120px]">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          )}

          {/* Status text */}
          {isUploading && (
            <span className="text-xs text-muted-foreground">{progress.progress}%</span>
          )}
        </div>
      </div>

      {/* Status icon */}
      <div className="flex-shrink-0">
        {isUploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
        {isError && <AlertCircle className="h-4 w-4 text-red-600" />}
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(file.id)}
        className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
        title="Remove file"
      >
        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  )
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export default FileUpload
