# Error Handling System

This document describes the comprehensive error handling system implemented in Dragon AI.

## Overview

The error handling system includes:
1. Custom error pages (404, 500)
2. Error boundaries for all major sections
3. Loading skeletons for all pages
4. Toast notification system using Sonner

## Components

### 1. Custom Error Pages

#### 404 Not Found Page
Location: `app/not-found.tsx`

Automatically displayed when a user navigates to a non-existent route.

#### 500 Error Page
Location: `app/error.tsx`

Catches runtime errors in the application and displays a user-friendly error message.

#### Global Error Page
Location: `app/global-error.tsx`

Catches critical errors in the root layout.

#### Section-Specific Error Pages
- `app/admin/error.tsx` - Admin dashboard errors
- `app/student/error.tsx` - Student dashboard errors
- `app/superadmin/error.tsx` - Super admin dashboard errors
- `app/(auth)/error.tsx` - Authentication errors

### 2. Error Boundaries

#### ErrorBoundary Component
Location: `components/error-boundary.tsx`

A reusable error boundary component that can wrap any part of your application.

```tsx
import { ErrorBoundary } from '@/components/error-boundary'

<ErrorBoundary fallback={<CustomErrorUI />}>
  <YourComponent />
</ErrorBoundary>
```

#### SectionErrorBoundary Component
Location: `components/section-error-boundary.tsx`

A specialized error boundary for major sections with a built-in fallback UI.

```tsx
import { SectionErrorBoundary } from '@/components/section-error-boundary'

<SectionErrorBoundary sectionName="Dashboard">
  <DashboardContent />
</SectionErrorBoundary>
```

### 3. Loading Skeletons

#### Available Loading Components

- **Skeleton** (`components/ui/skeleton.tsx`) - Base skeleton component
- **PageLoading** (`components/loading/page-loading.tsx`) - Full page loading state
- **CardLoading** (`components/loading/card-loading.tsx`) - Card skeleton
- **CardGridLoading** (`components/loading/card-loading.tsx`) - Grid of card skeletons
- **DashboardLoading** (`components/loading/dashboard-loading.tsx`) - Dashboard loading state
- **TableLoading** (`components/loading/table-loading.tsx`) - Table skeleton

#### Usage

Loading states are automatically shown by Next.js when you create a `loading.tsx` file:

```tsx
// app/your-route/loading.tsx
import { PageLoading } from '@/components/loading/page-loading'

export default function Loading() {
  return <PageLoading />
}
```

Or use them directly in your components:

```tsx
import { CardLoading } from '@/components/loading/card-loading'

function MyComponent() {
  const [isLoading, setIsLoading] = useState(true)

  if (isLoading) {
    return <CardLoading />
  }

  return <YourContent />
}
```

### 4. Toast Notification System

#### Toast Utility
Location: `lib/toast.ts`

A wrapper around Sonner with a clean API:

```tsx
import { toast } from '@/lib/toast'

// Success toast
toast.success('Operation successful!', {
  description: 'Your changes have been saved.',
  duration: 3000,
})

// Error toast
toast.error('Operation failed!', {
  description: 'Please try again later.',
})

// Warning toast
toast.warning('Warning!', {
  description: 'This action may have consequences.',
})

// Info toast
toast.info('Information', {
  description: 'Here is some useful information.',
})

// Loading toast
const loadingId = toast.loading('Processing...')
// Later, dismiss it:
toast.dismiss(loadingId)

// Promise toast
toast.promise(myAsyncFunction(), {
  loading: 'Processing...',
  success: 'Completed!',
  error: 'Failed!',
})
```

#### Toast Provider
Location: `components/providers/toast-provider.tsx`

Already integrated in the root layout. No additional setup needed.

## Error Handling Utilities

### Error Handler Functions
Location: `lib/error-handler.ts`

Utility functions for handling errors:

```tsx
import {
  handleApiError,
  handleValidationError,
  safeAsync,
  getErrorMessage
} from '@/lib/error-handler'

// Handle API errors
try {
  await api.call()
} catch (error) {
  handleApiError(error, 'Failed to fetch data')
}

// Handle validation errors
handleValidationError({
  email: ['Email is required'],
  password: ['Password must be at least 8 characters'],
})

// Safe async wrapper
const [error, data] = await safeAsync(
  fetchUserData(),
  'Failed to load user data'
)

if (error) {
  // Handle error
} else {
  // Use data
}
```

### useErrorHandler Hook
Location: `hooks/use-error-handler.ts`

A custom hook for error handling in components:

```tsx
import { useErrorHandler } from '@/hooks/use-error-handler'

function MyComponent() {
  const { handleError } = useErrorHandler()

  const handleSubmit = async () => {
    try {
      await submitData()
    } catch (error) {
      handleError(error, 'Failed to submit form')
    }
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

## Best Practices

### 1. Use Error Boundaries for Sections

Wrap major sections of your app with error boundaries to prevent errors from crashing the entire application:

```tsx
<SectionErrorBoundary sectionName="User Profile">
  <UserProfile />
</SectionErrorBoundary>
```

### 2. Show Loading States

Always provide loading states for async operations:

```tsx
import { DashboardLoading } from '@/components/loading/dashboard-loading'

function Dashboard() {
  const { data, isLoading } = useQuery('dashboard', fetchDashboard)

  if (isLoading) return <DashboardLoading />

  return <DashboardContent data={data} />
}
```

### 3. Use Toast Notifications for Feedback

Provide immediate feedback to users:

```tsx
const handleSave = async () => {
  try {
    await saveData()
    toast.success('Data saved successfully!')
  } catch (error) {
    toast.error('Failed to save data', {
      description: getErrorMessage(error)
    })
  }
}
```

### 4. Handle Promise States Elegantly

Use promise toast for async operations:

```tsx
const handleDelete = async () => {
  toast.promise(deleteItem(id), {
    loading: 'Deleting item...',
    success: 'Item deleted successfully!',
    error: 'Failed to delete item',
  })
}
```

## Testing Error Handling

A demo component is available to test the error handling system:

Location: `components/examples/error-handling-demo.tsx`

This component demonstrates:
- All toast notification types
- Error boundary functionality
- Error simulation

## Development vs Production

- In development, error messages are displayed in full
- In production, generic error messages are shown to users while full errors are logged to the console (and should be sent to an error tracking service)

## Future Enhancements

Consider integrating with error tracking services like:
- Sentry
- Rollbar
- LogRocket
- Datadog

These can be integrated in the error boundary `onError` callbacks and error handler utilities.
