'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Users, MessageSquare, TrendingUp, FileText, Activity, Upload, Download } from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalEnrolled: number;
    activeStudents: number;
    engagementRate: number;
    totalSessions: number;
    totalMessages: number;
    recentMessages: number;
    fileUploads: number;
    avgMessagesPerSession: number;
    materialsTotal?: number;
    materialsRecent?: number;
    downloadsTotal?: number;
    downloadsRecent?: number;
  };
  topStudents: Array<{
    userId: number;
    username: string;
    email: string;
    messageCount: number;
  }>;
  activityByDay: {
    labels: string[];
    data: number[];
  };
  activityByHour: {
    labels: string[];
    data: number[];
  };
  activityByDate?: {
    labels: string[];
    messages: number[];
    sessions: number[];
    activeStudents: number[];
    anyActivityStudents: number[];
    newEnrollments: number[];
    attachments: number[];
    materialsUploaded: number[];
    materialsDownloaded: number[];
  };
  topDownloaded?: Array<{
    materialId: string;
    originalName: string;
    downloadCount: number;
  }>;
  window?: { days: number; timezone: string };
}

export default function CourseAnalyticsPage({
  params,
}: {
  params: { courseId: string };
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    fetchAnalytics(windowDays);
  }, [params.courseId, windowDays]);

  const fetchAnalytics = async (days: number) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/courses/${params.courseId}/analytics?days=${days}`
      );
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p className="text-muted-foreground mb-6">{error || 'Failed to load analytics'}</p>
          <Link href={`/admin/courses/${params.courseId}`}>
            <Button>Back to Course</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { overview, topStudents, activityByDay, activityByHour } = analytics;

  // Find peak activity day and hour
  const peakDayIndex = activityByDay.data.indexOf(Math.max(...activityByDay.data));
  const peakDay = activityByDay.labels[peakDayIndex];
  const peakHourIndex = activityByHour.data.indexOf(Math.max(...activityByHour.data));
  const peakHour = activityByHour.labels[peakHourIndex];

  return (
    <div className="container mx-auto py-8 px-4">
      <Link href={`/admin/courses/${params.courseId}`}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Course
        </Button>
      </Link>

      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-2">Course Analytics</h1>
          <p className="text-muted-foreground">
            Engagement metrics for this course only
            {analytics.window?.timezone ? ` · timezone ${analytics.window.timezone}` : ''}
          </p>
        </div>
        <div className="inline-flex rounded-md border bg-muted/30 p-1 self-start">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setWindowDays(d)}
              className={`px-3 py-1 text-xs font-medium rounded ${
                windowDays === d
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalEnrolled}</div>
            <p className="text-xs text-muted-foreground">
              {overview.activeStudents} active ({Math.round(overview.engagementRate)}% engagement)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {overview.recentMessages} in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              {overview.avgMessagesPerSession} avg messages/session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">File Uploads</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.fileUploads}</div>
            <p className="text-xs text-muted-foreground">
              Submitted by students
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Active Students */}
        <Card>
          <CardHeader>
            <CardTitle>Most Active Students</CardTitle>
            <CardDescription>Top 5 students by message count</CardDescription>
          </CardHeader>
          <CardContent>
            {topStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet</p>
            ) : (
              <div className="space-y-3">
                {topStudents.map((student, index) => (
                  <div key={student.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{student.username}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{student.messageCount}</p>
                      <p className="text-xs text-muted-foreground">messages</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Patterns */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Patterns</CardTitle>
            <CardDescription>Peak usage times</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Most Active Day</h4>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-lg font-semibold">{peakDay}</span>
                <span className="text-sm text-muted-foreground">
                  ({activityByDay.data[peakDayIndex]} messages)
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Peak Hour</h4>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-lg font-semibold">{peakHour}</span>
                <span className="text-sm text-muted-foreground">
                  ({activityByHour.data[peakHourIndex]} messages)
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Engagement Rate</h4>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-lg font-semibold">{overview.engagementRate}%</span>
                <span className="text-sm text-muted-foreground">
                  ({overview.activeStudents}/{overview.totalEnrolled} students)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File Activity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Course Materials Uploaded</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.materialsTotal ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {overview.materialsRecent ?? 0} in last {windowDays} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Material Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.downloadsTotal ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {overview.downloadsRecent ?? 0} in last {windowDays} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat Attachments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.fileUploads}</div>
            <p className="text-xs text-muted-foreground">
              From students in chat
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity by Calendar Date */}
      {analytics.activityByDate && analytics.activityByDate.labels.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Activity by Date</CardTitle>
            <CardDescription>
              Daily breakdown for the last {windowDays} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DateTimelineChart data={analytics.activityByDate} />
            <DateBreakdownTable data={analytics.activityByDate} />
          </CardContent>
        </Card>
      )}

      {/* Top Downloaded Materials */}
      {analytics.topDownloaded && analytics.topDownloaded.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Most Downloaded Materials</CardTitle>
            <CardDescription>Top 5 by download count (all time)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.topDownloaded.map((m, i) => (
                <div key={m.materialId} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-xs flex-shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-sm truncate">{m.originalName}</p>
                  </div>
                  <p className="text-sm font-semibold flex-shrink-0">
                    {m.downloadCount} {m.downloadCount === 1 ? 'download' : 'downloads'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity by Day Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Activity by Day of Week</CardTitle>
          <CardDescription>Message distribution across the week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activityByDay.labels.map((day, index) => {
              const count = activityByDay.data[index];
              const maxCount = Math.max(...activityByDay.data);
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

              return (
                <div key={day} className="flex items-center gap-3">
                  <div className="w-12 text-sm font-medium">{day}</div>
                  <div className="flex-1">
                    <div className="h-8 bg-muted rounded-md overflow-hidden">
                      <div
                        className="h-full bg-primary/70 flex items-center px-3 text-xs font-medium text-white transition-all"
                        style={{ width: `${percentage}%` }}
                      >
                        {count > 0 && count}
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-sm text-muted-foreground text-right">
                    {count} msg{count !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Activity by Hour Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activity by Hour</CardTitle>
          <CardDescription>Message distribution throughout the day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {activityByHour.labels.map((hour, index) => {
              const count = activityByHour.data[index];
              const maxCount = Math.max(...activityByHour.data);
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

              // Only show hours with activity or nearby hours for context
              if (count === 0 && index % 3 !== 0) return null;

              return (
                <div key={hour} className="flex items-center gap-3">
                  <div className="w-14 text-xs font-medium">{hour}</div>
                  <div className="flex-1">
                    <div className="h-6 bg-muted rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-primary/60 flex items-center px-2 text-xs font-medium text-white transition-all"
                        style={{ width: `${percentage}%` }}
                      >
                        {count > 0 && count}
                      </div>
                    </div>
                  </div>
                  <div className="w-16 text-xs text-muted-foreground text-right">
                    {count} msg{count !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type DateSeries = NonNullable<AnalyticsData['activityByDate']>;

function DateTimelineChart({ data }: { data: DateSeries }) {
  const series: Array<{ key: keyof DateSeries; label: string; color: string }> = [
    { key: 'messages', label: 'Messages', color: 'bg-primary/70' },
    { key: 'sessions', label: 'New sessions', color: 'bg-blue-500/70' },
    { key: 'activeStudents', label: 'Students who chatted', color: 'bg-emerald-500/70' },
    { key: 'anyActivityStudents', label: 'Any-activity students', color: 'bg-teal-500/70' },
    { key: 'newEnrollments', label: 'New enrollments', color: 'bg-indigo-500/70' },
    { key: 'attachments', label: 'Chat attachments', color: 'bg-amber-500/70' },
    { key: 'materialsUploaded', label: 'Materials uploaded', color: 'bg-purple-500/70' },
    { key: 'materialsDownloaded', label: 'Material downloads', color: 'bg-rose-500/70' },
  ];

  // Show ticks every 7 days for readability
  const tickEvery = data.labels.length > 30 ? 14 : data.labels.length > 14 ? 7 : 1;

  return (
    <div className="space-y-4">
      {series.map((s) => {
        const values = (data[s.key] as number[]) || [];
        const total = values.reduce((a, b) => a + b, 0);
        // Each series gets its own max so small-count series (messages,
        // chatters) aren't squashed by large-count series (enrollment bursts).
        const seriesMax = Math.max(1, ...values);
        const peak = values.reduce((a, b) => Math.max(a, b), 0);
        return (
          <div key={s.key}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium">{s.label}</p>
              <p className="text-xs text-muted-foreground">
                {total} total · peak {peak}/day
              </p>
            </div>
            <div className="flex items-end gap-px h-16 bg-muted/30 rounded-sm p-1">
              {values.map((v, i) => {
                const h = v > 0 ? Math.max(6, (v / seriesMax) * 100) : 0;
                return (
                  <div
                    key={i}
                    title={`${data.labels[i]}: ${v}`}
                    className="flex-1 min-w-0 flex items-end"
                  >
                    <div
                      className={`w-full rounded-sm ${s.color}`}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
        {data.labels.map((label, i) =>
          i % tickEvery === 0 || i === data.labels.length - 1 ? (
            <span key={i}>{label.slice(5)}</span>
          ) : null
        )}
      </div>
    </div>
  );
}

function DateBreakdownTable({ data }: { data: DateSeries }) {
  const [showZeros, setShowZeros] = useState(false);

  const rows = data.labels.map((date, i) => ({
    date,
    messages: data.messages[i] ?? 0,
    activeStudents: data.activeStudents[i] ?? 0,
    anyActivityStudents: data.anyActivityStudents?.[i] ?? 0,
    newEnrollments: data.newEnrollments?.[i] ?? 0,
    sessions: data.sessions[i] ?? 0,
    attachments: data.attachments[i] ?? 0,
    materialsUploaded: data.materialsUploaded[i] ?? 0,
    materialsDownloaded: data.materialsDownloaded[i] ?? 0,
  }));

  const filtered = showZeros
    ? rows
    : rows.filter(
        (r) =>
          r.messages ||
          r.activeStudents ||
          r.anyActivityStudents ||
          r.newEnrollments ||
          r.sessions ||
          r.attachments ||
          r.materialsUploaded ||
          r.materialsDownloaded
      );

  const ordered = [...filtered].reverse();

  const formatDateLabel = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">Daily breakdown</p>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showZeros}
            onChange={(e) => setShowZeros(e.target.checked)}
            className="h-3 w-3"
          />
          Show days with no activity
        </label>
      </div>
      {ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No activity in this window.
        </p>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium text-right">Messages</th>
                <th
                  className="px-3 py-2 font-medium text-right"
                  title="Unique students who sent at least one chat message that day"
                >
                  Students who chatted
                </th>
                <th
                  className="px-3 py-2 font-medium text-right"
                  title="Unique students who did any tracked activity that day: chat, upload, download, or enrolled"
                >
                  Any activity
                </th>
                <th
                  className="px-3 py-2 font-medium text-right"
                  title="Number of students who enrolled in this course on that day"
                >
                  New enrollments
                </th>
                <th className="px-3 py-2 font-medium text-right">Sessions</th>
                <th className="px-3 py-2 font-medium text-right">Attachments</th>
                <th className="px-3 py-2 font-medium text-right">Uploads</th>
                <th className="px-3 py-2 font-medium text-right">Downloads</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((r) => (
                <tr key={r.date} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="font-medium">{formatDateLabel(r.date)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {r.date}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.messages}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.activeStudents}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.anyActivityStudents}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.newEnrollments}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.sessions}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.attachments}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.materialsUploaded}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.materialsDownloaded}
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
