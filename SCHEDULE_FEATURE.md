# Class Schedule Feature

This document describes the newly implemented class schedule feature for Dragon AI.

## Overview

The class schedule feature allows administrators to create, manage, and view class sessions for their courses. It includes a calendar view, automatic status tracking, and integration with the AI chat context.

## Features Implemented

### 1. Database Schema

**New Models:**
- `Course`: Represents a course with instructor, dates, and metadata
- `Enrollment`: Links students to courses
- `ClassSession`: Individual class meetings with scheduling information
- `ClassStatus`: Enum for tracking class state (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)

**Location:** `prisma/schema.prisma`

### 2. API Endpoints

#### Class Schedule Management
- `GET /api/courses/[courseId]/schedule` - List all class sessions for a course
- `POST /api/courses/[courseId]/schedule` - Create a new class session
- `GET /api/courses/[courseId]/schedule/[sessionId]` - Get a specific class session
- `PATCH /api/courses/[courseId]/schedule/[sessionId]` - Update a class session
- `DELETE /api/courses/[courseId]/schedule/[sessionId]` - Delete a class session

#### Chat Context Integration
- `GET /api/students/[studentId]/upcoming-classes` - Get upcoming classes for AI chat context
  - Query params:
    - `limit`: Number of classes to return (default: 5)
    - `format`: 'json' or 'text' (default: 'json')

### 3. UI Components

**Schedule Page:**
- Location: `/app/admin/courses/[courseId]/schedule/page.tsx`
- Features:
  - Calendar view with monthly navigation
  - List view for chronological display
  - Stats cards showing total, upcoming, and past classes
  - Click-to-edit functionality

**Class Session Dialog:**
- Location: `/components/schedule/class-session-dialog.tsx`
- Form for creating/editing class sessions
- Fields: title, description, start/end time, location

**Calendar View:**
- Location: `/components/schedule/calendar-view.tsx`
- Monthly calendar grid showing all class sessions
- Color-coded by status
- Switch between month and list views

### 4. Helper Functions

**Location:** `lib/schedule-helpers.ts`

Functions:
- `getUpcomingClassesForStudent(studentId, limit)` - Fetch upcoming classes for a student
- `getUpcomingClassesForCourse(courseId)` - Fetch upcoming classes for a course
- `formatClassesForChatContext(classes)` - Format classes for AI chat context
- `updatePastClassesStatus()` - Automatically mark past classes as completed

### 5. UI Components Library

Created essential shadcn/ui components:
- Button
- Card
- Dialog
- Input
- Label
- Textarea
- Badge

Location: `/components/ui/`

## Usage

### For Administrators

1. Navigate to `/admin/courses/[courseId]/schedule`
2. Click "Add Class" to create a new class session
3. Fill in the form with class details:
   - Title (required)
   - Description (optional)
   - Start and end times (required)
   - Location (optional)
4. View classes in calendar or list view
5. Click on a class to edit it
6. Delete classes using the delete button

### For AI Chat Integration

When initializing a chat session for a student, fetch their upcoming classes:

```typescript
// Example usage in chat initialization
const response = await fetch(`/api/students/${studentId}/upcoming-classes?format=text&limit=5`);
const data = await response.json();

// Add to AI context
const systemMessage = `
You are an AI tutor for this student.

Upcoming Classes:
${data.context}

Use this information to provide context-aware assistance.
`;
```

### Automatic Status Updates

To automatically update past classes to COMPLETED status, call the helper function:

```typescript
import { updatePastClassesStatus } from '@/lib/schedule-helpers';

// Can be called via cron job or API endpoint
await updatePastClassesStatus();
```

## Database Migration

To apply the schema changes to your database:

```bash
# Create a migration
npx prisma migrate dev --name add_schedule_models

# Or push schema directly (development only)
npx prisma db push

# Generate Prisma Client
npx prisma generate
```

## Future Enhancements

Potential improvements:
1. Email notifications for upcoming classes
2. Recurring class patterns (weekly classes)
3. Attendance tracking
4. Class materials/resources attachment
5. Student view of their schedule
6. Integration with calendar exports (iCal)
7. Video conferencing integration (Zoom, Meet)
8. Real-time updates using WebSockets
9. Bulk import/export of schedules
10. Time zone support for distributed classes

## Technical Notes

- Uses Next.js 14 App Router with Server Components where appropriate
- Client components marked with 'use client' directive
- Prisma ORM for database interactions
- React Hook Form could be added for better form validation
- Zod schemas could be added for API validation
- Authentication middleware should be added to protect routes

## Files Created

### Database
- `prisma/schema.prisma` (modified)

### API Routes
- `app/api/courses/[courseId]/schedule/route.ts`
- `app/api/courses/[courseId]/schedule/[sessionId]/route.ts`
- `app/api/students/[studentId]/upcoming-classes/route.ts`

### UI Components
- `components/ui/button.tsx`
- `components/ui/card.tsx`
- `components/ui/dialog.tsx`
- `components/ui/input.tsx`
- `components/ui/label.tsx`
- `components/ui/textarea.tsx`
- `components/ui/badge.tsx`

### Schedule Components
- `components/schedule/class-session-dialog.tsx`
- `components/schedule/calendar-view.tsx`

### Pages
- `app/admin/courses/[courseId]/schedule/page.tsx`

### Utilities
- `lib/schedule-helpers.ts`

### Documentation
- `SCHEDULE_FEATURE.md` (this file)

## Questions or Issues?

If you encounter any issues or have questions about this feature, please open an issue in the project repository.
