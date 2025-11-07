# Google Cloud Storage Setup

This guide explains how to set up Google Cloud Storage (GCS) for the Dragon AI application.

## Prerequisites

- A Google Cloud Platform (GCP) account
- A GCS bucket created (e.g., `user_summaries`)
- A service account with Storage Admin or Storage Object Admin permissions

## Local Development

### Step 1: Get Your Service Account JSON File

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** > **Service Accounts**
3. Create a new service account or select an existing one
4. Grant it the **Storage Admin** or **Storage Object Admin** role
5. Click **Keys** > **Add Key** > **Create new key**
6. Choose **JSON** format and download the file

### Step 2: Configure Your Project

1. Create a `static` folder in your project root:
   ```bash
   mkdir static
   ```

2. Place your JSON file in the `static` folder:
   ```bash
   cp ~/Downloads/your-service-account-key.json static/gcs-service-account.json
   ```

3. Create a `.env.local` file (or update your existing one) with:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS="./static/gcs-service-account.json"
   GCS_BUCKET_NAME="user_summaries"
   ```

### Step 3: Install Dependencies

```bash
npm install
```

The `@google-cloud/storage` package is already included in `package.json`.

### Step 4: Test Your Setup

You can test your GCS setup by creating a simple test file:

```typescript
import { uploadFile } from './lib/gcs';

async function testUpload() {
  const buffer = Buffer.from('Hello, GCS!');
  const result = await uploadFile(buffer, 'test.txt', 'text/plain', 'test-course');
  console.log('Upload successful:', result);
}

testUpload().catch(console.error);
```

## Production Deployment

For production environments (e.g., Vercel, Railway, AWS), you should use individual environment variables instead of a JSON file.

### Step 1: Extract Credentials from JSON

Open your service account JSON file and extract these values:

- `project_id` → `GCS_PROJECT_ID`
- `client_email` → `GCS_CLIENT_EMAIL`
- `private_key` → `GCS_PRIVATE_KEY`

### Step 2: Set Environment Variables

In your production environment, set these environment variables:

```env
GCS_BUCKET_NAME="user_summaries"
GCS_PROJECT_ID="your-project-id"
GCS_CLIENT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here...\n-----END PRIVATE KEY-----\n"
```

**Important Notes:**
- The `GCS_PRIVATE_KEY` must include the full private key, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers
- Newlines in the private key should be represented as `\n`
- Most deployment platforms handle this automatically when you paste the key

### Step 3: Verify Production Setup

The application will automatically detect which authentication method to use:
- If `GOOGLE_APPLICATION_CREDENTIALS` is set, it uses the JSON file (local dev)
- If `GCS_PRIVATE_KEY` and `GCS_CLIENT_EMAIL` are set, it uses individual env vars (production)

## GCS Bucket Configuration

### Bucket Permissions

Ensure your service account has these permissions:
- `storage.objects.create` - Upload files
- `storage.objects.delete` - Delete files
- `storage.objects.get` - Download files
- `storage.objects.list` - List files

### CORS Configuration (if needed for browser uploads)

If you plan to allow direct browser uploads, configure CORS on your bucket:

```json
[
  {
    "origin": ["http://localhost:3000", "https://yourdomain.com"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS configuration:
```bash
gsutil cors set cors.json gs://user_summaries
```

## File Organization

Files are organized in GCS with the following structure:

```
courses/
  {courseId}/
    uploads/
      {timestamp}-{filename}
```

For example:
```
courses/course-123/uploads/1699564800000-document.pdf
```

## API Functions

The `lib/gcs.ts` module exports these functions:

### uploadFile(fileBuffer, fileName, mimeType, courseId)
Uploads a file to GCS and returns a signed URL valid for 7 days.

```typescript
const result = await uploadFile(buffer, 'document.pdf', 'application/pdf', 'course-123');
// Returns: { url, filePath, fileName }
```

### deleteFile(filePath)
Deletes a file from GCS.

```typescript
await deleteFile('courses/course-123/uploads/1699564800000-document.pdf');
```

### getSignedUrl(filePath, expiresInMinutes)
Generates a temporary signed URL for file access.

```typescript
const url = await getSignedUrl('courses/course-123/uploads/file.pdf', 60);
// URL expires in 60 minutes
```

### downloadFile(filePath)
Downloads a file as a buffer for processing.

```typescript
const { buffer, mimeType } = await downloadFile('courses/course-123/uploads/file.pdf');
```

### fileExists(filePath)
Check if a file exists in GCS.

```typescript
const exists = await fileExists('courses/course-123/uploads/file.pdf');
```

### listFiles(prefix)
List all files with a given prefix.

```typescript
const files = await listFiles('courses/course-123/uploads/');
```

## Security Best Practices

1. **Never commit your JSON file to version control**
   - The `static/` folder is already in `.gitignore`
   - The `.json` pattern is excluded (except `package.json`, `tsconfig.json`, etc.)

2. **Use least privilege permissions**
   - Service account should only have Storage Object Admin, not full Storage Admin
   - Consider using separate service accounts for different environments

3. **Rotate credentials regularly**
   - Update service account keys at least annually
   - Remove old keys after updating

4. **Monitor access logs**
   - Enable GCS audit logging
   - Monitor for unusual access patterns

## Troubleshooting

### Error: "GCS credentials not configured"
- Verify `GOOGLE_APPLICATION_CREDENTIALS` points to a valid JSON file
- OR verify all three production env vars are set: `GCS_PROJECT_ID`, `GCS_CLIENT_EMAIL`, `GCS_PRIVATE_KEY`

### Error: "The caller does not have permission"
- Verify your service account has the correct IAM roles
- Check that the bucket name is correct in `GCS_BUCKET_NAME`

### Error: "No such object"
- Verify the file path is correct
- Check that the file was successfully uploaded

### Error: "Invalid JWT"
- Verify the private key is correctly formatted
- Ensure `\n` characters are preserved in the private key

## Additional Resources

- [Google Cloud Storage Node.js Client](https://googleapis.dev/nodejs/storage/latest/)
- [GCS Authentication Guide](https://cloud.google.com/docs/authentication/getting-started)
- [GCS Best Practices](https://cloud.google.com/storage/docs/best-practices)
