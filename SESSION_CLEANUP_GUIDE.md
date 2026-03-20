# Session Cleanup Guide

## Problem

The session retention settings (configured by instructors) define how long chat sessions should be kept before deletion. However, the cleanup was **not running automatically**, causing old sessions to remain in the database even after their retention period expired.

## Solution

Two methods for running session cleanup:

### 1. Manual Cleanup Script

Run the cleanup script manually:

```bash
DATABASE_URL="your_database_url" node scripts/cleanup-sessions.mjs
```

**Dry run** (preview what would be deleted):
```bash
DATABASE_URL="your_database_url" node scripts/cleanup-sessions.mjs --dry-run
```

### 2. Automatic Cleanup API (Recommended)

A new API endpoint has been created that can be called by schedulers like Heroku Scheduler or cron jobs.

#### API Endpoints

**Preview cleanup (GET)**:
```bash
curl -X GET https://your-app.herokuapp.com/api/admin/cleanup-sessions \
  -H "Authorization: Bearer your-secret-token"
```

**Run cleanup (POST)**:
```bash
curl -X POST https://your-app.herokuapp.com/api/admin/cleanup-sessions \
  -H "Authorization: Bearer your-secret-token"
```

#### Setup Instructions

1. **Set environment variable** in `.env` or Heroku Config Vars:
   ```
   CLEANUP_SECRET_TOKEN=your-secure-random-token-here
   ```

2. **For Heroku deployment**, add Heroku Scheduler:
   ```bash
   heroku addons:create scheduler:standard
   ```

3. **Configure the scheduled job**:
   - Open Heroku Dashboard → Your App → Resources → Heroku Scheduler
   - Add a new job with this command:
     ```bash
     curl -X POST https://your-app-name.herokuapp.com/api/admin/cleanup-sessions \
       -H "Authorization: Bearer $CLEANUP_SECRET_TOKEN"
     ```
   - Set frequency: Every hour (or as needed)

## How It Works

### Retention Policies

1. **"forever"**: Sessions are never deleted
2. **"never"**: Sessions older than 24 hours are deleted
3. **"custom"**: Sessions are deleted after specified days/hours

### Cleanup Logic

For each course:
1. Calculate cutoff date: `now - (retentionDays * 24 + retentionHours) hours`
2. Find sessions where `updatedAt < cutoffDate`
3. Delete associated files from Google Cloud Storage
4. Delete sessions (cascade deletes messages and file records)

### Example

Course: MGMT450
- Retention: 0 days, 1 hour
- Current time: 2025-11-11 02:55:00
- Cutoff: 2025-11-11 01:55:00
- Sessions last updated before 01:55:00 will be deleted

## Current Status

✅ **Fixed** - Manual cleanup script working
✅ **Implemented** - API endpoint for automatic cleanup
✅ **Tested** - Deleted 1 old session from MGMT450 course

## Verification

Check current sessions and what would be deleted:

```bash
node scripts/check-retention-settings.mjs
```

This shows:
- Course retention settings
- Current sessions and their ages
- How many sessions are older than the cutoff

## Next Steps

To fully automate cleanup:

1. **Deploy to production** with the new API endpoint
2. **Set CLEANUP_SECRET_TOKEN** in production environment variables
3. **Configure Heroku Scheduler** (or other cron service) to call the API endpoint hourly
4. **Monitor logs** to ensure cleanup is running correctly

## Security Notes

- The API endpoint requires authentication via Bearer token
- Token should be a secure random string (use `openssl rand -hex 32` to generate)
- Never commit the token to git
- Only accessible to authorized scheduler services

## Testing

Test the preview endpoint to ensure it works:
```bash
curl -X GET http://localhost:5782/api/admin/cleanup-sessions \
  -H "Authorization: Bearer your-secret-token"
```

Response should show preview of what would be deleted:
```json
{
  "success": true,
  "timestamp": "2025-11-11T02:55:00.000Z",
  "preview": [
    {
      "course": "CS220",
      "name": "Introduction to Data Science",
      "policy": "forever",
      "sessionsToDelete": 0,
      "reason": "retention policy is forever"
    },
    {
      "course": "MGMT450",
      "name": "Business Strategy & Competitive Analysis",
      "policy": "custom",
      "retentionDays": 0,
      "retentionHours": 1,
      "cutoffDate": "2025-11-11T01:55:00.000Z",
      "sessionsToDelete": 0
    }
  ]
}
```
