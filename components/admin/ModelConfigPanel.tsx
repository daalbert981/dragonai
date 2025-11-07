'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface ModelConfigPanelProps {
  initialConfig: {
    systemPrompt?: string | null;
    model: string;
    temperature: number;
    reasoningLevel?: string | null;
    syllabus?: string | null;
  };
  onSave: (config: {
    systemPrompt: string;
    model: string;
    temperature: number;
    reasoningLevel: string;
    syllabus: string;
  }) => Promise<void>;
}

const AI_MODELS = [
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'o1-preview', label: 'O1 Preview' },
  { value: 'o1-mini', label: 'O1 Mini' },
];

const REASONING_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function ModelConfigPanel({ initialConfig, onSave }: ModelConfigPanelProps) {
  const [systemPrompt, setSystemPrompt] = useState(initialConfig.systemPrompt || '');
  const [model, setModel] = useState(initialConfig.model);
  const [temperature, setTemperature] = useState(initialConfig.temperature);
  const [reasoningLevel, setReasoningLevel] = useState(initialConfig.reasoningLevel || 'medium');
  const [syllabus, setSyllabus] = useState(initialConfig.syllabus || '');
  const [loading, setLoading] = useState(false);

  const isO1Model = model.startsWith('o1');

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({
        systemPrompt,
        model,
        temperature,
        reasoningLevel,
        syllabus,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Model Configuration</CardTitle>
          <CardDescription>
            Configure the AI model settings for this course
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature">
              Temperature: {temperature.toFixed(1)}
            </Label>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={[temperature]}
              onValueChange={(value) => setTemperature(value[0])}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Lower values make output more focused, higher values more creative
            </p>
          </div>

          {isO1Model && (
            <div className="space-y-2">
              <Label htmlFor="reasoning">Reasoning Level</Label>
              <Select value={reasoningLevel} onValueChange={setReasoningLevel}>
                <SelectTrigger id="reasoning">
                  <SelectValue placeholder="Select reasoning level" />
                </SelectTrigger>
                <SelectContent>
                  {REASONING_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              placeholder="Enter the system prompt for the AI assistant..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              This prompt defines the AI's behavior and persona
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="syllabus">Course Syllabus</Label>
            <Textarea
              id="syllabus"
              placeholder="Enter the course syllabus..."
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              rows={8}
            />
            <p className="text-xs text-muted-foreground">
              The syllabus helps the AI understand course structure and topics
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={loading} className="w-full">
        {loading ? 'Saving...' : 'Save Configuration'}
      </Button>
    </div>
  );
}
