'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Upload, Sparkles, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { extractTextFromPDF, isPDF } from '@/lib/pdf-extractor-client';

interface CourseSettingsFormProps {
  course: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    syllabus: string | null;
    syllabusSynthesisPrompt: string | null;
    systemPrompt: string | null;
    priorClasses: string | null;
    upcomingClasses: string | null;
    model: string;
    temperature: number;
    timezone: string;
    reasoningLevel: string | null;
    messageHistoryLimit: number;
    sessionRetentionPolicy: string;
    sessionRetentionDays: number | null;
    sessionRetentionHours: number | null;
    isActive: boolean;
  };
}

export function CourseSettingsForm({ course }: CourseSettingsFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [showSynthesisPrompt, setShowSynthesisPrompt] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: course.name,
    code: course.code,
    description: course.description || '',
    syllabus: course.syllabus || '',
    syllabusSynthesisPrompt: course.syllabusSynthesisPrompt || '',
    systemPrompt: course.systemPrompt || '',
    priorClasses: course.priorClasses || '',
    upcomingClasses: course.upcomingClasses || '',
    model: course.model,
    temperature: course.temperature,
    timezone: course.timezone || 'America/New_York',
    reasoningLevel: course.reasoningLevel || 'medium',
    messageHistoryLimit: course.messageHistoryLimit || 10,
    sessionRetentionPolicy: course.sessionRetentionPolicy || 'forever',
    sessionRetentionDays: course.sessionRetentionDays ?? 30,
    sessionRetentionHours: course.sessionRetentionHours ?? 0,
    isActive: course.isActive,
  });

  // Check if the selected model uses reasoning_effort instead of temperature
  // This includes o-series models (o1, o3, o4-mini) and GPT-5+ models (via responses API)
  const isReasoningModel = /^o[1-9]/.test(formData.model) || formData.model.startsWith('gpt-5');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/courses/${course.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update course settings');
      }

      router.push(`/admin/courses/${course.id}`);
      router.refresh();
    } catch (error) {
      console.error('Error updating course:', error);
      alert('Failed to update course settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
      ];

      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a PDF, DOCX, DOC, or TXT file.');
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSynthesizeSyllabus = async () => {
    if (!selectedFile) {
      alert('Please select a syllabus file first');
      return;
    }

    setIsSynthesizing(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', selectedFile);

      // If it's a PDF, extract text client-side first
      if (isPDF(selectedFile)) {
        console.log('[SYLLABUS] Extracting PDF text client-side...');
        const pdfResult = await extractTextFromPDF(selectedFile);

        if (pdfResult.error || !pdfResult.text) {
          throw new Error(pdfResult.error || 'Failed to extract text from PDF');
        }

        // Send extracted text to server
        formDataToSend.append('extractedText', pdfResult.text);
        console.log(`[SYLLABUS] Extracted ${pdfResult.text.length} characters from ${pdfResult.numPages} pages`);
      }

      // Include custom prompt if set
      if (formData.syllabusSynthesisPrompt) {
        formDataToSend.append('customPrompt', formData.syllabusSynthesisPrompt);
      }

      const response = await fetch(`/api/admin/courses/${course.id}/synthesize-syllabus`, {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to synthesize syllabus');
      }

      const result = await response.json();

      // Update the syllabus field with synthesized content
      setFormData({
        ...formData,
        syllabus: result.data.synthesizedContent
      });

      // Clear the selected file
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      alert('Syllabus synthesized successfully! Review and edit the content below, then save.');
    } catch (error) {
      console.error('Error synthesizing syllabus:', error);
      alert(error instanceof Error ? error.message : 'Failed to synthesize syllabus. Please try again.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Course identification and description</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Course Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Course Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Brief description of the course"
            />
          </div>

          {/* Syllabus with AI Synthesis */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Syllabus</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSynthesisPrompt(!showSynthesisPrompt)}
                className="text-xs"
              >
                {showSynthesisPrompt ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                {showSynthesisPrompt ? 'Hide' : 'Edit'} AI Synthesis Prompt
              </Button>
            </div>

            {/* Synthesis Prompt Editor (Collapsible) */}
            {showSynthesisPrompt && (
              <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                <Label htmlFor="syllabusSynthesisPrompt" className="text-sm">
                  Custom Synthesis Prompt (Optional)
                </Label>
                <Textarea
                  id="syllabusSynthesisPrompt"
                  value={formData.syllabusSynthesisPrompt}
                  onChange={(e) => setFormData({ ...formData, syllabusSynthesisPrompt: e.target.value })}
                  rows={8}
                  placeholder="Leave empty to use the default synthesis prompt. Custom prompt defines how the AI should analyze and summarize syllabus documents."
                  className="text-sm font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  This prompt controls how the AI extracts key insights from uploaded syllabus files. Leave empty to use intelligent defaults.
                </p>
              </div>
            )}

            {/* File Upload Section */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileSelect}
                className="hidden"
                id="syllabus-file-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSynthesizing}
              >
                <Upload className="h-4 w-4 mr-2" />
                {selectedFile ? 'Change File' : 'Upload Syllabus'}
              </Button>

              {selectedFile && (
                <>
                  <span className="text-sm text-muted-foreground flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    {selectedFile.name}
                  </span>
                  <Button
                    type="button"
                    onClick={handleSynthesizeSyllabus}
                    disabled={isSynthesizing}
                    size="sm"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isSynthesizing ? 'Synthesizing...' : 'Synthesize with AI'}
                  </Button>
                </>
              )}
            </div>

            {/* Syllabus Text Area */}
            <Textarea
              id="syllabus"
              value={formData.syllabus}
              onChange={(e) => setFormData({ ...formData, syllabus: e.target.value })}
              rows={10}
              placeholder="Upload a syllabus file (PDF, DOCX, DOC, or TXT) and click 'Synthesize with AI' to auto-populate, or type/paste the syllabus content directly here."
              disabled={isSynthesizing}
            />
            <p className="text-xs text-muted-foreground">
              The AI teaching assistant will use this syllabus to provide context-aware help to students.
              {isSynthesizing && ' Please wait while the AI analyzes your syllabus...'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
            <Label htmlFor="isActive">Course is active</Label>
          </div>
        </CardContent>
      </Card>

      {/* AI Assistant Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>AI Assistant Configuration</CardTitle>
          <CardDescription>Configure how the AI assistant behaves for this course</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              rows={8}
              placeholder="Instructions for the AI assistant. This defines the assistant's personality, knowledge scope, and behavior when helping students."
            />
            <p className="text-xs text-muted-foreground">
              This prompt will be sent with every conversation to define how the AI should behave.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priorClasses">Prior Classes Information</Label>
            <Textarea
              id="priorClasses"
              value={formData.priorClasses}
              onChange={(e) => setFormData({ ...formData, priorClasses: e.target.value })}
              rows={4}
              placeholder="Information about previous class sessions (topics covered, assignments given, discussions held, etc.)"
            />
            <p className="text-xs text-muted-foreground">
              This will be included in the AI assistant's context as &lt;prior_classes&gt; with each request.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="upcomingClasses">Upcoming Classes Information</Label>
            <Textarea
              id="upcomingClasses"
              value={formData.upcomingClasses}
              onChange={(e) => setFormData({ ...formData, upcomingClasses: e.target.value })}
              rows={4}
              placeholder="Information about upcoming class sessions (topics to be covered, assignments due, exam dates, etc.)"
            />
            <p className="text-xs text-muted-foreground">
              This will be included in the AI assistant's context as &lt;upcoming_classes&gt; with each request.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">AI Model</Label>
              <Select
                value={formData.model}
                onValueChange={(value) => setFormData({ ...formData, model: value })}
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {/* GPT-5.4 Series (Latest - March 2026) */}
                  <SelectItem value="gpt-5.4">GPT-5.4 (Latest Flagship)</SelectItem>
                  <SelectItem value="gpt-5.4-mini">GPT-5.4 Mini (Best Value)</SelectItem>
                  <SelectItem value="gpt-5.4-nano">GPT-5.4 Nano (Lightweight)</SelectItem>

                  {/* GPT-5.2 Series */}
                  <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>

                  {/* GPT-5.1 Series */}
                  <SelectItem value="gpt-5.1">GPT-5.1 Thinking (Advanced Reasoning)</SelectItem>
                  <SelectItem value="gpt-5.1-chat-latest">GPT-5.1 Instant (Fastest)</SelectItem>

                  {/* GPT-5 Series */}
                  <SelectItem value="gpt-5">GPT-5</SelectItem>
                  <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>

                  {/* o-series Reasoning Models */}
                  <SelectItem value="o4-mini">o4-mini (Fast Reasoning & Vision)</SelectItem>
                  <SelectItem value="o3">o3 (Advanced Reasoning)</SelectItem>
                  <SelectItem value="o3-mini">o3-mini</SelectItem>
                  <SelectItem value="o1">o1 (Previous Gen Reasoning)</SelectItem>
                  <SelectItem value="o1-mini">o1-mini</SelectItem>

                  {/* GPT-4.1 Series (Non-reasoning, 1M context) */}
                  <SelectItem value="gpt-4.1">GPT-4.1 (1M Context)</SelectItem>
                  <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini (1M Context, Low Cost)</SelectItem>
                  <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano (1M Context, Cheapest)</SelectItem>

                  {/* GPT-4o Series (Legacy) */}
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the AI model to use for this course
              </p>
            </div>

            {isReasoningModel ? (
              <div className="space-y-2">
                <Label htmlFor="reasoningLevel">Reasoning Effort</Label>
                <Select
                  value={formData.reasoningLevel}
                  onValueChange={(value) => setFormData({ ...formData, reasoningLevel: value })}
                >
                  <SelectTrigger id="reasoningLevel">
                    <SelectValue placeholder="Select reasoning effort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal - Fastest (GPT-5+ only)</SelectItem>
                    <SelectItem value="low">Low - Faster, less thorough</SelectItem>
                    <SelectItem value="medium">Medium - Balanced (Recommended)</SelectItem>
                    <SelectItem value="high">High - Slower, most thorough</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  For reasoning models (o-series, GPT-5+): Controls computational effort for reasoning (replaces temperature)
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature: {formData.temperature.toFixed(1)}</Label>
                <input
                  type="range"
                  id="temperature"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Focused (0.0)</span>
                  <span>Creative (2.0)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Lower = more focused and deterministic, Higher = more creative and varied
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) => setFormData({ ...formData, timezone: value })}
            >
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                <SelectItem value="Pacific/Honolulu">Hawaii Time (HST)</SelectItem>
                <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The AI assistant will receive the current date/time in this timezone with every request
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="messageHistoryLimit">Message History Limit</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                id="messageHistoryLimit"
                min="1"
                max="100"
                value={formData.messageHistoryLimit}
                onChange={(e) => setFormData({ ...formData, messageHistoryLimit: parseInt(e.target.value) || 10 })}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">messages</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Number of previous messages to include in each AI response for context. Higher values provide more context but increase costs and may hit token limits. Recommended: 10-30
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle>Session Management</CardTitle>
          <CardDescription>Configure how chat sessions are stored and managed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sessionRetentionPolicy">Session Retention Policy</Label>
            <Select
              value={formData.sessionRetentionPolicy}
              onValueChange={(value) => setFormData({ ...formData, sessionRetentionPolicy: value })}
            >
              <SelectTrigger id="sessionRetentionPolicy">
                <SelectValue placeholder="Select retention policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="forever">Forever - Sessions are kept indefinitely</SelectItem>
                <SelectItem value="never">Never - Sessions deleted after completion</SelectItem>
                <SelectItem value="custom">Custom - Delete after specified time</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.sessionRetentionPolicy === 'forever' && 'Chat sessions will be stored indefinitely until manually deleted.'}
              {formData.sessionRetentionPolicy === 'never' && 'Chat sessions will be automatically deleted when students leave the chat page.'}
              {formData.sessionRetentionPolicy === 'custom' && 'Chat sessions will be automatically deleted after the specified time period.'}
            </p>
          </div>

          {formData.sessionRetentionPolicy === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="sessionRetentionDays">Days</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    id="sessionRetentionDays"
                    min="0"
                    max="365"
                    value={formData.sessionRetentionDays || 0}
                    onChange={(e) => setFormData({ ...formData, sessionRetentionDays: parseInt(e.target.value) || 0 })}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionRetentionHours">Hours</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    id="sessionRetentionHours"
                    min="0"
                    max="23"
                    value={formData.sessionRetentionHours || 0}
                    onChange={(e) => setFormData({ ...formData, sessionRetentionHours: parseInt(e.target.value) || 0 })}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              </div>

              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">
                  Sessions older than {formData.sessionRetentionDays || 0} days and {formData.sessionRetentionHours || 0} hours will be automatically deleted.
                  {(formData.sessionRetentionDays === 0 && formData.sessionRetentionHours === 0) && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium"> Warning: This will delete sessions immediately!</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/admin/courses/${course.id}`)}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete this course and all associated data (students, materials, chat sessions)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            onClick={async () => {
              if (!confirm(`Are you sure you want to delete "${course.name}"? This action cannot be undone. All students, materials, and chat history will be permanently removed.`)) {
                return;
              }
              try {
                const response = await fetch(`/api/admin/courses/${course.id}`, {
                  method: 'DELETE',
                });
                if (!response.ok) {
                  const data = await response.json();
                  throw new Error(data.error || 'Failed to delete course');
                }
                router.push('/admin');
                router.refresh();
              } catch (error) {
                alert(error instanceof Error ? error.message : 'Failed to delete course');
              }
            }}
            disabled={isLoading}
          >
            Delete Course
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
