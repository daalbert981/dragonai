# Data Retention Cleanup - Quick Summary

## How It Works

### Tracking (No Extra Storage)
- Sessions have an `updatedAt` timestamp (automatic)
- Courses have retention settings (days + hours)
- System calculates: `cutoffDate = now - retention period`
- Deletes: `sessions where updatedAt < cutoffDate`

### When Deletion Happens

**Currently (Incomplete):**
1. ✅ When student loads chat interface
2. ❌ NOT automatic in background

**After Setup (Complete):**
1. ✅ When student loads chat interface
2. ✅ Automatic background cleanup (every 1-6 hours)

---

## Setup Options (Choose ONE)

### 🌟 RECOMMENDED: External Cron Service
**Resource Impact:** ZERO RAM, ZERO CPU

**Best free service:** cron-job.org

**Setup (5 minutes):**

1. **Generate API Key:**
   ```bash
   openssl rand -hex 32
   # Save this key!
   ```

2. **Add to your environment:**
   ```bash
   # .env.local
   CLEANUP_API_KEY="your-generated-key"

   # Production
   heroku config:set CLEANUP_API_KEY="your-generated-key"
   ```

3. **Set up cron-job.org:**
   - Go to https://cron-job.org/en/
   - Sign up (free)
   - Create new job:
     - URL: `https://your-app.com/api/cleanup-expired-sessions`
     - Method: POST
     - Headers: `Authorization: Bearer your-generated-key`
     - Schedule: Every 6 hours
4. Done!

**Why this is best:**
- No server resources used
- Works with any hosting platform
- Easy to monitor
- Reliable
- Free forever

---

### Alternative Options

#### Heroku Scheduler
- For Heroku deployments only
- May have monthly cost
- Zero RAM impact
- Very reliable

#### Vercel Cron
- For Vercel deployments only
- Completely free
- Zero RAM impact
- Built-in, very easy

#### Application Scheduler
- Uses ~5-10MB RAM
- For when external services aren't allowed
- Already coded, just uncomment in `instrumentation.ts`
- Only runs when server is up

#### Server Cron (Linux)
- For self-hosted servers
- Zero RAM impact
- Requires shell access

---

## Recommended Cleanup Frequency

| Retention Policy | Recommended Frequency | Reasoning |
|------------------|----------------------|-----------|
| "Never" | Every 1-2 hours | Quick deletion important |
| Custom (< 7 days) | Every 2-4 hours | Compliance sensitive |
| Custom (7-30 days) | Every 6-12 hours | Balanced approach |
| Custom (> 30 days) | Every 12-24 hours | Less time-critical |
| "Forever" | Daily | Just cleanup check |

**Best default:** Every 6 hours (good balance for all policies)

---

## Security Note

**✅ API Key Authentication is REQUIRED**

The cleanup endpoint is protected with API key authentication to prevent unauthorized access.

**What this means:**
- External services need your API key to trigger cleanup
- Without the key, cleanup requests are rejected
- Your data is protected from unauthorized deletion

**Setup:**
```bash
# 1. Generate a strong API key
openssl rand -hex 32

# 2. Add to .env.local
CLEANUP_API_KEY="your-generated-key"

# 3. Use in requests
curl -H "Authorization: Bearer your-key" ...
```

See `EXTERNAL_CRON_SECURITY.md` for detailed security analysis.

---

## Quick Test (Before Setting Up Automation)

### 1. Preview what would be deleted:
```bash
curl https://your-app.com/api/cleanup-expired-sessions \
  -H "Authorization: Bearer your-api-key"
```

### 2. Test without auth (should fail):
```bash
# Should return 401 Unauthorized
curl https://your-app.com/api/cleanup-expired-sessions
```

### 3. Actually delete (test):
```bash
curl -X POST https://your-app.com/api/cleanup-expired-sessions \
  -H "Authorization: Bearer your-api-key"
```

### 4. Check logs:
```
[CLEANUP] Total sessions deleted: 5
```

---

## Is This Enough for Compliance?

### ✅ YES, if you set up automated cleanup

With automated cleanup running every 1-6 hours:
- GDPR ✅ Data deleted within retention period
- FERPA ✅ Educational records properly managed
- HIPAA ✅ (if applicable) PHI deleted on schedule
- SOC 2 ✅ Data retention policy enforced

### ❌ NO, if you only rely on user logins

Without automation:
- Data sits in database indefinitely
- Depends on users logging in
- Not compliance-ready
- Audit risk

---

## RAM Usage Comparison

| Method | RAM Used | Notes |
|--------|----------|-------|
| External Cron | 0 MB | Just HTTP requests |
| Heroku Scheduler | 0 MB | Just HTTP requests |
| Vercel Cron | 0 MB | Just HTTP requests |
| **Application Scheduler** | **5-10 MB** | node-cron library |
| Server Cron | 0 MB | OS-level, outside app |

**For a typical Next.js app using ~200-500MB RAM:**
- Adding 5-10MB = ~1-2% increase
- Negligible for most deployments
- Only use if external cron isn't an option

---

## What Happens to the Data?

### Deleted from Database
When a session is deleted:
1. ❌ Session record deleted
2. ❌ All messages in that session deleted (CASCADE)
3. ❌ All file uploads for those messages deleted (CASCADE)
4. ❌ File metadata deleted

### Files on Cloud Storage (GCS)
File uploads on Google Cloud Storage:
- **NOT automatically deleted** (requires separate GCS lifecycle policy)
- Database just removes reference
- Orphaned files remain in bucket

**To fully delete files:**
You'll need to set up GCS Object Lifecycle Management:
```
gsutil lifecycle set lifecycle.json gs://your-bucket
```

Or create a separate cleanup job to delete unreferenced files.

---

## Action Required

**For Production Deployment:**

1. ✅ Test cleanup API works
2. ✅ Choose one automation method
3. ✅ Set up automated cleanup
4. ✅ Verify it runs successfully
5. ✅ Document in your privacy policy
6. ⚠️ (Optional) Set up GCS file cleanup

**Minimum for compliance:** Steps 1-4 must be done
