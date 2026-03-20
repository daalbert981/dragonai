'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MaterialUpload } from '@/components/admin/MaterialUpload';
import { ArrowLeft, Download, Trash2, Loader2, Pencil, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { formatFileSize } from '@/lib/file-utils';

export default function MaterialsManagementPage({
  params,
}: {
  params: { courseId: string };
}) {
  const [course, setCourse] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [courseRes, materialsRes] = await Promise.all([
        fetch(`/api/admin/courses/${params.courseId}`),
        fetch(`/api/admin/courses/${params.courseId}/materials`),
      ]);

      if (!courseRes.ok) throw new Error('Failed to fetch course');
      if (!materialsRes.ok) throw new Error('Failed to fetch materials');

      const courseData = await courseRes.json();
      const materialsData = await materialsRes.json();

      setCourse(courseData);
      setMaterials(materialsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.courseId]);

  const handleUpload = async (file: File, description: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description);

    const response = await fetch(
      `/api/admin/courses/${params.courseId}/materials`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to upload material');
    }

    await fetchData();
  };

  const handleDelete = async (materialId: string) => {
    if (!confirm('Are you sure you want to delete this material?')) {
      return;
    }

    setDeletingId(materialId);
    try {
      const response = await fetch(
        `/api/admin/courses/${params.courseId}/materials/${materialId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete material');
      }

      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditDescription = async (materialId: string) => {
    setSavingId(materialId);
    try {
      const response = await fetch(
        `/api/admin/courses/${params.courseId}/materials/${materialId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: editDescription }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update description');
      }

      setEditingId(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p className="text-muted-foreground mb-6">{error || 'Course not found'}</p>
          <Link href="/admin">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Link href={`/admin/courses/${params.courseId}`}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Course
        </Button>
      </Link>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Course Materials</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          {course.name} ({course.code})
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <MaterialUpload onUpload={handleUpload} />
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Materials</CardTitle>
              <CardDescription>
                All materials uploaded for this course
              </CardDescription>
            </CardHeader>
            <CardContent>
              {materials.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No materials uploaded yet
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filename</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materials.map((material) => (
                        <TableRow key={material.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{material.originalName}</p>
                              {editingId === material.id ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <input
                                    type="text"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    placeholder="Add a description..."
                                    className="text-xs border rounded px-2 py-1 flex-1 min-w-0"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleEditDescription(material.id);
                                      if (e.key === 'Escape') setEditingId(null);
                                    }}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleEditDescription(material.id)}
                                    disabled={savingId === material.id}
                                  >
                                    <Check className="h-3 w-3 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => setEditingId(null)}
                                    disabled={savingId === material.id}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <button
                                  className="flex items-center gap-1 text-xs text-muted-foreground mt-1 hover:text-foreground group"
                                  onClick={() => {
                                    setEditingId(material.id);
                                    setEditDescription(material.description || '');
                                  }}
                                >
                                  {material.description || (
                                    <span className="italic">No description</span>
                                  )}
                                  <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatFileSize(material.fileSize)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(material.uploadedAt), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <a href={material.storageUrl} download>
                                <Button variant="ghost" size="icon">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </a>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(material.id)}
                                disabled={deletingId === material.id}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
