'use client';

import { useState, useCallback } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadedFile {
  id: string;
  filename: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export default function DocumentUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    uploadFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      uploadFiles(selectedFiles);
    }
  }, []);

  const uploadFiles = async (filesToUpload: File[]) => {
    for (const file of filesToUpload) {
      const tempId = `temp-${Date.now()}-${Math.random()}`;

      setFiles(prev => [...prev, {
        id: tempId,
        filename: file.name,
        size: file.size,
        status: 'uploading',
      }]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();

        setFiles(prev => prev.map(f =>
          f.id === tempId
            ? { ...f, id: data.document.id, status: 'processing' }
            : f
        ));

        // Poll for completion
        pollDocumentStatus(data.document.id);

      } catch (error) {
        setFiles(prev => prev.map(f =>
          f.id === tempId
            ? { ...f, status: 'failed', error: 'Upload failed' }
            : f
        ));
      }
    }
  };

  const pollDocumentStatus = async (documentId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 1 minute max

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setFiles(prev => prev.map(f =>
          f.id === documentId
            ? { ...f, status: 'failed', error: 'Processing timeout' }
            : f
        ));
        return;
      }

      try {
        const response = await fetch(`/api/documents/${documentId}`);
        const data = await response.json();

        if (data.document.status === 'COMPLETED') {
          setFiles(prev => prev.map(f =>
            f.id === documentId
              ? { ...f, status: 'completed' }
              : f
          ));
        } else if (data.document.status === 'FAILED') {
          setFiles(prev => prev.map(f =>
            f.id === documentId
              ? { ...f, status: 'failed', error: data.document.errorMessage }
              : f
          ));
        } else {
          attempts++;
          setTimeout(poll, 1000);
        }
      } catch (error) {
        attempts++;
        setTimeout(poll, 1000);
      }
    };

    poll();
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8
          transition-colors duration-200
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <Upload className="w-12 h-12 text-gray-400" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supports PDF, DOCX, and images (max 10MB)
            </p>
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Select Files
            </span>
          </label>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-4 bg-white border rounded-lg"
            >
              <div className="flex items-center space-x-3 flex-1">
                <File className="w-5 h-5 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {file.status === 'uploading' && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="text-xs text-gray-600">Uploading...</span>
                  </div>
                )}
                {file.status === 'processing' && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="text-xs text-gray-600">Processing...</span>
                  </div>
                )}
                {file.status === 'completed' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {file.status === 'failed' && (
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-xs text-red-600">{file.error}</span>
                  </div>
                )}

                <button
                  onClick={() => removeFile(file.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
