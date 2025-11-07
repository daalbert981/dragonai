'use client';

import { useState, useEffect } from 'react';
import { File, Download, Trash2, RefreshCw, Eye, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Document {
  id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
  _count: {
    chunks: number;
  };
}

export default function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents');
      const data = await response.json();
      setDocuments(data.documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
      });
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setSelectedDocs(prev => {
        const newSet = new Set(prev);
        newSet.delete(docId);
        return newSet;
      });
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleReprocess = async (docId: string) => {
    try {
      await fetch(`/api/documents/${docId}/reprocess`, {
        method: 'POST',
      });
      // Update status optimistically
      setDocuments(prev => prev.map(d =>
        d.id === docId ? { ...d, status: 'PROCESSING' as const } : d
      ));
      // Refresh after a delay
      setTimeout(fetchDocuments, 2000);
    } catch (error) {
      console.error('Error reprocessing document:', error);
    }
  };

  const toggleSelection = (docId: string) => {
    setSelectedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) return;

    if (!confirm(`Delete ${selectedDocs.size} document(s)?`)) {
      return;
    }

    try {
      await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: Array.from(selectedDocs) }),
      });
      setDocuments(prev => prev.filter(d => !selectedDocs.has(d.id)));
      setSelectedDocs(new Set());
    } catch (error) {
      console.error('Error deleting documents:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'PROCESSING':
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case 'FAILED':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
        <div className="flex items-center space-x-2">
          {selectedDocs.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete ({selectedDocs.size})</span>
            </button>
          )}
          <button
            onClick={fetchDocuments}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-500">Upload your first document to get started</p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-6 py-3"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chunks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedDocs.has(doc.id)}
                      onChange={() => toggleSelection(doc.id)}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <File className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {doc.originalName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(doc.status)}
                      <span className="text-sm text-gray-600">{doc.status}</span>
                    </div>
                    {doc.errorMessage && (
                      <p className="text-xs text-red-500 mt-1">{doc.errorMessage}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatFileSize(doc.size)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {doc._count.chunks}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {doc.status === 'COMPLETED' && (
                        <button
                          onClick={() => handleDownload(doc)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      {doc.status === 'FAILED' && (
                        <button
                          onClick={() => handleReprocess(doc.id)}
                          className="text-yellow-600 hover:text-yellow-800"
                          title="Reprocess"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
