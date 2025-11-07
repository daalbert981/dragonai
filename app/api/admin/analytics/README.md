# Instructor Analytics API

## Overview

The Analytics API provides comprehensive insights into student engagement and activity within courses. Instructors can generate detailed reports to understand student behavior, identify common questions, and track engagement metrics.

## Endpoint

```
GET /api/admin/analytics/[courseId]
```

## Authentication

This endpoint requires admin or instructor authentication. Only instructors can access analytics for their own courses.

## Query Parameters

- `format` (optional): Response format
  - `json` (default): Returns JSON data
  - `csv`: Returns CSV file for download

## Response Format

### JSON Response

```typescript
{
  course: {
    id: string
    name: string
    code: string
    instructor: string
    createdAt: Date
  }
  summary: {
    totalStudents: number
    totalMessages: number
    uniqueActiveStudents: number
    participationRate: number        // Percentage of students who have sent messages
    messagesLast30Days: number
    messagesLast7Days: number
    avgMessagesPerStudent: number
    responseRate: number              // Percentage of messages with AI responses
    avgResponseLength: number         // Average character count of responses
  }
  studentMetrics: Array<{
    studentId: string
    studentName: string
    studentEmail: string
    messageCount: number
    avgMessageLength: number
    daysActive: number               // Number of unique days student was active
    lastActive: Date | null
    engagementScore: number          // 0-100 score based on activity
    enrolledAt: Date
  }>
  activityTimeline: Array<{
    date: string                     // ISO date string
    messageCount: number
  }>
  peakActivityHours: Array<{
    hour: number                     // 0-23 (24-hour format)
    count: number
  }>
  commonQuestions: Array<{
    text: string
    count: number                    // How many times similar questions were asked
    keywords: string[]
  }>
  topKeywords: Array<{
    keyword: string
    count: number
  }>
  engagementDistribution: {
    high: number                     // Students with score 70-100
    medium: number                   // Students with score 40-69
    low: number                      // Students with score 0-39
  }
}
```

### CSV Response

When `format=csv`, the endpoint returns a downloadable CSV file with the following sections:

1. **Course Information**: Basic course details
2. **Summary Metrics**: Overall statistics
3. **Student Engagement Metrics**: Per-student breakdown
4. **Activity Timeline**: Daily message counts (last 30 days)
5. **Common Questions**: Frequently asked questions
6. **Top Keywords**: Most common keywords in student messages
7. **Engagement Distribution**: Student count by engagement level

## Features

### 1. Student Engagement Metrics

Calculates a comprehensive engagement score (0-100) for each student based on:
- **Message Volume** (40 points max): Number of messages sent
- **Message Quality** (30 points max): Average message length
- **Consistency** (30 points max): Number of days active

### 2. Chat Log Processing

Analyzes all chat messages to provide:
- Activity patterns over time
- Peak activity hours
- Response rates
- Message and response statistics

### 3. Common Questions Analysis

Uses keyword extraction and pattern matching to:
- Identify frequently asked questions
- Extract common keywords from student messages
- Group similar questions together
- Provide instructors with insights into student confusion points

### 4. Activity Timeline

Provides daily message counts for the last 30 days, enabling instructors to:
- Track engagement trends
- Identify periods of low activity
- Correlate activity with course events

### 5. CSV Export

Generates downloadable reports that can be:
- Imported into Excel/Google Sheets
- Shared with department heads
- Used for grading or assessment
- Archived for record-keeping

## Usage Examples

### Fetch JSON Analytics

```typescript
const response = await fetch('/api/admin/analytics/course_123')
const analytics = await response.json()

console.log(`Total students: ${analytics.summary.totalStudents}`)
console.log(`Participation rate: ${analytics.summary.participationRate}%`)
```

### Download CSV Report

```typescript
const response = await fetch('/api/admin/analytics/course_123?format=csv')
const blob = await response.blob()
const url = window.URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'analytics-report.csv'
a.click()
```

### Display Top Questions

```typescript
const analytics = await fetch('/api/admin/analytics/course_123').then(r => r.json())

analytics.commonQuestions.forEach(q => {
  console.log(`${q.text} (asked ${q.count} times)`)
})
```

## Engagement Score Calculation

The engagement score is calculated using the following formula:

```
messageScore = min(messageCount * 2, 40)
lengthScore = min(avgMessageLength / 10, 30)
consistencyScore = min(daysActive * 3, 30)

engagementScore = messageScore + lengthScore + consistencyScore
```

This ensures a balanced score that rewards:
- Regular interaction with the AI assistant
- Thoughtful, detailed questions
- Consistent engagement over time

## Error Responses

### 404 Not Found
```json
{
  "error": "Course not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to generate analytics"
}
```

## Performance Considerations

- Analytics are computed on-demand for real-time data
- Large courses (>1000 students) may take 2-3 seconds to process
- Consider caching results for frequently accessed courses
- CSV exports are optimized for large datasets

## Future Enhancements

Potential additions to the analytics system:
- Time-based filtering (custom date ranges)
- Comparison between multiple courses
- Sentiment analysis of student messages
- Predictive analytics for at-risk students
- Integration with LMS platforms
- Automated weekly/monthly report emails
