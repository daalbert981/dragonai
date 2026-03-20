'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Search, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface Student {
  id: number;
  username: string;
  email: string | null;
  classId: string;
}

interface AddStudentModalProps {
  courseId: string;
  onAddStudent: (data: { email: string; username?: string; password?: string; createNew?: boolean }) => Promise<void>;
}

export function AddStudentModal({ courseId, onAddStudent }: AddStudentModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Available students list
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // New student form
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Fetch available students when dialog opens
  useEffect(() => {
    if (open) {
      fetchAvailableStudents();
    }
  }, [open]);

  const fetchAvailableStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/available-students`);
      if (!response.ok) throw new Error('Failed to fetch students');
      const data = await response.json();
      setAvailableStudents(data.students || []);
    } catch (err) {
      console.error('Error fetching available students:', err);
      setAvailableStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSubmitExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const selectedStudent = availableStudents.find(s => s.id === selectedStudentId);
    if (!selectedStudent || !selectedStudent.email) {
      setError('Please select a student');
      return;
    }

    setLoading(true);

    try {
      await onAddStudent({ email: selectedStudent.email, createNew: false });
      setSelectedStudentId(null);
      setSearchQuery('');
      setOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  // Filter students based on search query
  const filteredStudents = availableStudents.filter(student =>
    student.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.email && student.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onAddStudent({
        email: newEmail,
        username: newUsername,
        password: newPassword,
        createNew: true,
      });
      setNewEmail('');
      setNewUsername('');
      setNewPassword('');
      setOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create and enroll student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Student to Course</DialogTitle>
          <DialogDescription>
            Enroll an existing student or create a new student account
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="existing" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Existing Student</TabsTrigger>
            <TabsTrigger value="new">New Student</TabsTrigger>
          </TabsList>

          <TabsContent value="existing">
            <form onSubmit={handleSubmitExisting}>
              <div className="space-y-4 py-4">
                {/* Search Input */}
                <div className="space-y-2">
                  <Label htmlFor="search">Search Students</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Students List */}
                <div className="space-y-2">
                  <Label>Available Students ({filteredStudents.length})</Label>
                  {loadingStudents ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      {searchQuery ? 'No students match your search' : 'No available students to enroll'}
                    </div>
                  ) : (
                    <div className="border rounded-md max-h-[300px] overflow-y-auto">
                      {filteredStudents.map((student) => (
                        <div
                          key={student.id}
                          className={`flex items-center space-x-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 ${
                            selectedStudentId === student.id ? 'bg-muted' : ''
                          }`}
                          onClick={() => setSelectedStudentId(student.id)}
                        >
                          <Checkbox
                            checked={selectedStudentId === student.id}
                            onCheckedChange={(checked) => {
                              setSelectedStudentId(checked ? student.id : null);
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{student.username}</p>
                            {student.email && (
                              <p className="text-xs text-muted-foreground truncate">
                                {student.email}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !selectedStudentId}>
                  {loading ? 'Enrolling...' : 'Enroll Student'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="new">
            <form onSubmit={handleSubmitNew}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-username">Username</Label>
                  <Input
                    id="new-username"
                    type="text"
                    placeholder="e.g., jsmith"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    minLength={3}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 3 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-email">Email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="student@drexel.edu"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 8 characters
                  </p>
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create & Enroll'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
