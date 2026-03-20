'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Users, MessageSquare, TrendingUp, FileText, Activity } from 'lucide-react';

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
}

export default function CourseAnalyticsPage({
  params,
}: {
  params: { courseId: string };
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [params.courseId]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/courses/${params.courseId}/analytics`);
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

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Course Analytics</h1>
        <p className="text-muted-foreground">
          Engagement metrics for this course only
        </p>
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
