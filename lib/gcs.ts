import { Storage } from '@google-cloud/storage';

// Types
export interface UploadResult {
  url: string;
  filePath: string;
  fileName: string;
}

export interface DownloadResult {
  buffer: Buffer;
  mimeType: string;
}

// Initialize Storage client based on environment
let storage: Storage;

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // Local development - use JSON file
  storage = new Storage({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });
} else if (process.env.GCS_PRIVATE_KEY && process.env.GCS_CLIENT_EMAIL) {
  // Production - use individual environment variables
  storage = new Storage({
    projectId: process.env.GCS_PROJECT_ID,
    credentials: {
      client_email: process.env.GCS_CLIENT_EMAIL,
      private_key: process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
  });
} else {
  throw new Error(
    'GCS credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS or individual GCS env vars.'
  );
}

const bucketName = process.env.GCS_BUCKET_NAME || 'user_summaries';
const bucket = storage.bucket(bucketName);

/**
 * Upload a file to Google Cloud Storage
 * @param fileBuffer - The file buffer to upload
 * @param fileName - The original file name
 * @param mimeType - The MIME type of the file
 * @param courseId - The course ID for folder organization
 * @returns Upload result with signed URL and file path
 */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  courseId: string
): Promise<UploadResult> {
  try {
    // Create file path with folder structure: courses/{courseId}/uploads/{timestamp}-{fileName}
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `courses/${courseId}/uploads/${timestamp}-${sanitizedFileName}`;

    // Create file reference
    const file = bucket.file(filePath);

    // Upload the file
    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
          courseId,
        },
      },
    });

    // Generate signed URL (7 days expiration)
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      url: signedUrl,
      filePath,
      fileName: sanitizedFileName,
    };
  } catch (error) {
    console.error('Error uploading file to GCS:', error);
    throw new Error(
      `Failed to upload file to GCS: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete a file from Google Cloud Storage
 * @param filePath - The path of the file to delete
 * @returns True if deletion was successful
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const file = bucket.file(filePath);
    await file.delete();
    return true;
  } catch (error) {
    console.error('Error deleting file from GCS:', error);
    throw new Error(
      `Failed to delete file from GCS: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate a signed URL for temporary file access
 * @param filePath - The path of the file
 * @param expiresInMinutes - Expiration time in minutes (default: 60)
 * @returns Signed URL
 */
export async function getSignedUrl(
  filePath: string,
  expiresInMinutes: number = 60
): Promise<string> {
  try {
    const file = bucket.file(filePath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File not found: ${filePath}`);
    }

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error(
      `Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Download a file from Google Cloud Storage
 * @param filePath - The path of the file to download
 * @returns Download result with buffer and MIME type
 */
export async function downloadFile(filePath: string): Promise<DownloadResult> {
  try {
    const file = bucket.file(filePath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Download file
    const [buffer] = await file.download();

    // Get file metadata for MIME type
    const [metadata] = await file.getMetadata();
    const mimeType = metadata.contentType || 'application/octet-stream';

    return {
      buffer,
      mimeType,
    };
  } catch (error) {
    console.error('Error downloading file from GCS:', error);
    throw new Error(
      `Failed to download file from GCS: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if a file exists in Google Cloud Storage
 * @param filePath - The path of the file to check
 * @returns True if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
}

/**
 * List files in a specific folder
 * @param prefix - The folder prefix (e.g., 'courses/123/uploads/')
 * @returns Array of file paths
 */
export async function listFiles(prefix: string): Promise<string[]> {
  try {
    const [files] = await bucket.getFiles({ prefix });
    return files.map((file) => file.name);
  } catch (error) {
    console.error('Error listing files from GCS:', error);
    throw new Error(
      `Failed to list files from GCS: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
