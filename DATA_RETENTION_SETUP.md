# Data Retention & Privacy Compliance Setup

This document explains how the session retention system works and how to ensure compliance with data privacy regulations (GDPR, FERPA, etc.).

## How Session Retention Works

The system has three retention policies that instructors can configure per course:

1. **Forever** - Sessions are kept indefinitely until manually deleted
2. **Never** - Sessions are deleted automatically (immediate deletion)
3. **Custom** - Sessions are deleted after a specified time period (days + hours)

## Automatic Deletion Mechanisms

### 1. Real-time Deletion (On User Access)

When a student accesses their chat interface, the system automatically:
- Deletes sessions that have expired based on the course's retention policy
- Only shows sessions within the retention period
- Ensures compliance every time the sessions API is called

**Location**: `/app/api/courses/[courseId]/sessions/route.ts`

### 2. Background Cleanup Job

A dedicated API endpoint performs system-wide cleanup:

**Endpoint**: `POST /api/cleanup-expired-sessions`

This endpoint:
- Scans all courses and their retention policies
- Deletes expired sessions across the entire system
- Logs all deletions for audit purposes
- Returns a detailed report of what was deleted

**Preview Mode**: `GET /api/cleanup-expired-sessions`
- Shows what would be deleted without actually deleting
- Useful for auditing and verification

## How the System Tracks Deletions

**No deletion dates are stored.** Instead:

1. Each session has an `updatedAt` timestamp (automatically maintained)
2. Each course has retention settings (policy, days, hours)
3. On cleanup, the system calculates:
   ```
   cutoffDate = currentTime - (retentionDays × 24 + retentionHours)
   deleteSessions where updatedAt < cutoffDate
   ```

**Important:** Without automated cleanup, data sits in the database even if it should be deleted. You MUST set up one of the automated cleanup methods below.

---

## Setting Up Automated Cleanup

### ⭐ Option 1: External Cron Service (RECOMMENDED - Zero RAM)

**Best for:** All deployments, especially Heroku/Vercel/cloud hosting

**Resource Impact:** ZERO - External service makes HTTP requests

**Popular Services:**
- **cron-job.org** (Free, reliable, no account required for public URLs)
- **UptimeRobot** (Free, also monitors uptime)
- **EasyCron** (Free tier available)

**Setup Example (cron-job.org):**

1. **Generate API Key:**
   ```bash
   # Mac/Linux
   openssl rand -hex 32

   # Save this key - you'll need it!
   ```

2. **Add to Environment Variables:**
   ```bash
   # In your .env.local (development)
   CLEANUP_API_KEY="your-generated-key-here"

   # In production (Heroku example)
   heroku config:set CLEANUP_API_KEY="your-generated-key-here"
   ```

3. **Set up cron-job.org:**
   - Go to https://cron-job.org
   - Create free account
   - Click "Create cronjob"
   - Settings:
     - Title: "DragonAI Session Cleanup"
     - URL: `https://your-app.com/api/cleanup-expired-sessions`
     - Method: POST
     - **Headers:** Click "Add header"
       - Key: `Authorization`
       - Value: `Bearer your-generated-key-here`
     - Schedule: Every 6 hours (recommended)
   - Save and enable

4. **Test it works:**
   ```bash
   curl -X POST https://your-app.com/api/cleanup-expired-sessions \
     -H "Authorization: Bearer your-api-key"
   ```

**Pros:**
- Zero server resources
- Works with any deployment platform
- Easy to monitor and manage
- No code changes needed

**Cons:**
- Requires external service dependency
- May need to whitelist IP addresses

---

### Option 2: Heroku Scheduler (Recommended for Heroku)

If you're deploying on Heroku:

```bash
# Add the scheduler add-on
heroku addons:create scheduler:standard

# Open the scheduler dashboard
heroku addons:open scheduler
```

In the Heroku Scheduler dashboard:
- Add a new job
- Command: `curl -X POST https://your-app.herokuapp.com/api/cleanup-expired-sessions`
- Frequency: Every hour (or as needed)

### Option 2: Vercel Cron Jobs

If deploying on Vercel, create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cleanup-expired-sessions",
      "schedule": "0 * * * *"
    }
  ]
}
```

This runs the cleanup every hour.

### Option 3: Application-Level Scheduler (Uses ~5-10MB RAM)

**Best for:** Self-hosted deployments where external services are not allowed

**Resource Impact:** LOW - Adds ~5-10MB RAM, minimal CPU (only runs every 6 hours)

**Setup:**

1. Open `/Users/da692/Dropbox/Py/dragonai/instrumentation.ts`
2. Uncomment these lines:
   ```typescript
   const { startScheduler } = await import('./lib/scheduler')
   startScheduler()
   ```
3. Restart your server

The scheduler will automatically:
- Start when the server starts
- Run cleanup every 6 hours
- Log all operations to console
- Survive server restarts

**Pros:**
- No external dependencies
- Built into your application
- Easy to customize schedule

**Cons:**
- Uses additional RAM (~5-10MB)
- Only runs while server is running
- Doesn't run if server is down

**Customizing Schedule:**

Edit `/lib/scheduler.ts` and change the cron pattern:
```typescript
// Every 6 hours (default)
cron.schedule('0 */6 * * *', ...)

// Every hour
cron.schedule('0 * * * *', ...)

// Every day at 2 AM
cron.schedule('0 2 * * *', ...)

// Every 30 minutes
cron.schedule('*/30 * * * *', ...)
```

---

### Option 4: Server Cron (Self-hosted)

If self-hosting, add to your server's crontab:

```bash
# Edit crontab
crontab -e

# Add this line to run cleanup every hour
0 * * * * curl -X POST https://your-domain.com/api/cleanup-expired-sessions
```

## Which Option Should I Choose?

| Feature | External Cron | Heroku Scheduler | Vercel Cron | App Scheduler | Server Cron |
|---------|---------------|------------------|-------------|---------------|-------------|
| **RAM Impact** | ✅ Zero | ✅ Zero | ✅ Zero | ⚠️ 5-10MB | ✅ Zero |
| **CPU Impact** | ✅ Zero | ✅ Zero | ✅ Zero | ⚠️ Minimal | ✅ Zero |
| **Setup Difficulty** | ✅ Easy | ✅ Easy | ✅ Very Easy | ⚠️ Medium | ⚠️ Medium |
| **Reliability** | ✅ High | ✅ High | ✅ High | ⚠️ Medium* | ✅ High |
| **Cost** | ✅ Free | 💰 May cost | ✅ Free | ✅ Free | ✅ Free |
| **Platform** | ✅ Any | Heroku only | Vercel only | ✅ Any | Self-host only |
| **Dependencies** | ⚠️ External | ⚠️ Add-on | ✅ Native | ✅ None | ✅ None |

*App Scheduler only runs while server is up

**Recommendations:**
- **Heroku deployment?** → Use Heroku Scheduler
- **Vercel deployment?** → Use Vercel Cron
- **Other cloud (AWS, Azure, GCP)?** → Use External Cron Service
- **Self-hosted with restrictions?** → Use Application Scheduler
- **Self-hosted Linux server?** → Use Server Cron

---

## Testing the Cleanup

**IMPORTANT:** The cleanup API requires authentication.

### Test the preview mode:
```bash
curl https://your-domain.com/api/cleanup-expired-sessions \
  -H "Authorization: Bearer your-api-key"
```

This shows what would be deleted without actually deleting.

### Test actual cleanup:
```bash
curl -X POST https://your-domain.com/api/cleanup-expired-sessions \
  -H "Authorization: Bearer your-api-key"
```

This performs the actual deletion.

### Without authentication (should fail):
```bash
# This should return 401 Unauthorized
curl -X POST https://your-domain.com/api/cleanup-expired-sessions
```

## Compliance Recommendations

### For GDPR Compliance:
- Set retention policies appropriate for your data processing purposes
- Document your retention periods in your privacy policy
- Run cleanup at least daily
- Keep audit logs of deletions

### For FERPA Compliance:
- Configure retention based on institutional policies
- Ensure sessions are deleted when no longer educationally necessary
- Document retention periods in student communications

### For General Privacy Best Practices:
- Default to shorter retention periods
- Allow instructors to customize per course
- Run automated cleanup frequently (every 1-6 hours)
- Monitor cleanup logs for issues

## Monitoring & Logs

All cleanup operations log to the server console:

```
[CLEANUP] Starting expired sessions cleanup...
[CLEANUP] Processing course: CS101 (Introduction to Programming)
[CLEANUP] Retention policy: custom
[CLEANUP] Cutoff date: 2025-11-07T10:00:00.000Z
[CLEANUP] Deleted 15 expired sessions
[CLEANUP] Total sessions deleted: 15
```

Monitor these logs to ensure cleanup is running as expected.

## Manual Cleanup

To manually trigger cleanup at any time:

```bash
# Via curl
curl -X POST https://your-domain.com/api/cleanup-expired-sessions

# Or use the existing cleanup scripts
node scripts/cleanup-sessions.mjs
```

## Session Deletion Behavior

### "Never" Policy:
- Sessions are deleted as soon as student accesses the chat interface
- Background cleanup also removes any remaining sessions
- Essentially provides no persistent history

### "Custom" Policy:
- Sessions older than the specified time are permanently deleted
- Calculation: (days × 24) + hours = total retention period
- Based on session's `updatedAt` timestamp

### "Forever" Policy:
- No automatic deletion
- Sessions persist indefinitely
- Manual deletion only

## Database Cascade Behavior

When a session is deleted:
- All messages in that session are also deleted (CASCADE)
- All file uploads linked to those messages are deleted (CASCADE)
- This ensures complete data removal

## Important Notes

1. **Deletions are permanent** - There is no recovery once a session is deleted
2. **Timezone considerations** - All timestamps are stored in UTC
3. **Active sessions** - The `updatedAt` timestamp is updated whenever a message is added
4. **Initial setup** - Run cleanup manually first time to remove old sessions

## Verification

To verify the system is working:

1. Set a course to "never" retention policy
2. Create a test chat session
3. Navigate away and back to the chat interface
4. The session should be gone
5. Check server logs for deletion confirmation

## Support

For issues or questions about data retention:
- Check server logs for cleanup execution
- Verify retention policies are set correctly in course settings
- Ensure cleanup cron job is running (if using scheduled cleanup)
- Test with preview mode first before running actual cleanup
