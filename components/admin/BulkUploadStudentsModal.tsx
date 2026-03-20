'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Upload, Download, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BulkUploadStudentsModalProps {
  courseId: string;
  onUploadComplete: () => void;
}

interface UploadResult {
  total: number;
  enrolled: string[];
  created: Array<{ email: string; setupUrl: string }>;
  errors: Array<{ email: string; error: string }>;
}

export function BulkUploadStudentsModal({
  courseId,
  onUploadComplete,
}: BulkUploadStudentsModalProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a CSV file');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(
        `/api/admin/courses/${courseId}/students/bulk-upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload CSV');
      }

      setResult(data.results);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh the student list after a short delay
      setTimeout(() => {
        onUploadComplete();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'First Name,Last Name,Email\nJohn,Doe,john.doe@example.com\nJane,Smith,jane.smith@example.com';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-upload-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedFile(null);
    setError('');
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Students</DialogTitle>
          <DialogDescription>
            Upload a CSV file with student information to enroll multiple students at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium mb-1">CSV Format</h4>
                <p className="text-sm text-muted-foreground">
                  Your CSV must contain these columns: <strong>First Name</strong>, <strong>Last Name</strong>, <strong>Email</strong>
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select CSV File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
              </p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results Display */}
          {result && (
            <div className="space-y-3 border rounded-lg p-4">
              <h4 className="font-medium">Upload Results</h4>

              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                  <span>{result.enrolled.length} students successfully enrolled</span>
                </div>

                {result.created.length > 0 && (
                  <div className="flex items-center text-sm">
                    <AlertCircle className="h-4 w-4 mr-2 text-blue-600" />
                    <span>{result.created.length} new accounts created</span>
                  </div>
                )}

                {result.errors.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-destructive">
                      <XCircle className="h-4 w-4 mr-2" />
                      <span>{result.errors.length} errors occurred</span>
                    </div>
                    <div className="ml-6 space-y-1 max-h-40 overflow-y-auto">
                      {result.errors.map((err, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground">
                          • {err.email}: {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {result.created.length > 0 && (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      New students need their personal setup link to create a password.
                      Setup links expire in 7 days. Download the CSV below to email each student their link.
                    </AlertDescription>
                  </Alert>

                  {/* Setup URLs table */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Email</th>
                          <th className="text-left px-3 py-2 font-medium">Setup Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y max-h-48 overflow-y-auto">
                        {result.created.map((student, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">{student.email}</td>
                            <td className="px-3 py-2">
                              <button
                                className="text-xs text-blue-600 hover:underline truncate max-w-[300px] block text-left"
                                onClick={() => navigator.clipboard.writeText(student.setupUrl)}
                                title="Click to copy"
                              >
                                {student.setupUrl}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Download CSV for mail merge */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const csvContent = 'Email,Setup Link\n' +
                        result.created.map(s => `${s.email},${s.setupUrl}`).join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'student-setup-links.csv';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Setup Links CSV (for mail merge)
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Close
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload and Enroll
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
