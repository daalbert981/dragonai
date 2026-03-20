/**
 * File storage utilities using Google Cloud Storage
 * This module provides file upload, download, and deletion functionality
 */

import { Storage } from '@google-cloud/storage';

// Initialize Google Cloud Storage
// Supports both env var credentials (production/Heroku) and key file (local dev)
const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  ...(process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY
    ? {
        credentials: {
          client_email: process.env.GCS_CLIENT_EMAIL,
          private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
      }
    : process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
    : {}),
});

const bucketName = process.env.GCS_BUCKET_NAME || 'user_summaries';
const bucket = storage.bucket(bucketName);

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

/**
 * Upload a file to Google Cloud Storage
 * @param file - File to upload
 * @param folder - Optional folder path (e.g., 'courses/materials')
 * @returns Upload result with URL and metadata
 */
export async function uploadFile(
  file: File,
  folder?: string
): Promise<UploadResult> {
  try {
    const filename = file.name;
    const path = folder ? `${folder}/${filename}` : filename;

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a reference to the file in GCS
    const gcsFile = bucket.file(path);

    // Upload the file
    await gcsFile.save(buffer, {
      metadata: {
        contentType: file.type || 'application/octet-stream',
      },
    });

    // Generate a signed URL that expires in 10 years (for long-term access)
    // Note: For uniform bucket-level access, we use signed URLs instead of public URLs
    const [signedUrl] = await gcsFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000 * 10, // 10 years
    });

    return {
      url: signedUrl,
      filename: path,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
    };
  } catch (error) {
    console.error('Error uploading file to GCS:', error);
    throw new Error('Failed to upload file');
  }
}

/**
 * Upload multiple files to Google Cloud Storage
 * @param files - Array of files to upload
 * @param folder - Optional folder path
 * @returns Array of upload results
 */
export async function uploadFiles(
  files: File[],
  folder?: string
): Promise<UploadResult[]> {
  const uploads = files.map((file) => uploadFile(file, folder));
  return Promise.all(uploads);
}

/**
 * Delete a file from Google Cloud Storage
 * @param url - URL of the file to delete (can be signed URL or regular URL)
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    // Extract the file path from the URL
    // Handle both signed URLs and regular URLs
    let filePath: string;

    if (url.includes('?')) {
      // Signed URL format: https://storage.googleapis.com/bucket-name/path?GoogleAccessId=...
      const urlWithoutQuery = url.split('?')[0];
      const pathMatch = urlWithoutQuery.match(new RegExp(`${bucketName}/(.*)`));
      if (!pathMatch) {
        throw new Error('Invalid GCS URL format');
      }
      filePath = decodeURIComponent(pathMatch[1]);
    } else {
      // Regular URL format: https://storage.googleapis.com/bucket-name/path/to/file
      const urlParts = url.split(`https://storage.googleapis.com/${bucketName}/`);
      if (urlParts.length < 2) {
        throw new Error('Invalid GCS URL format');
      }
      filePath = urlParts[1];
    }

    const gcsFile = bucket.file(filePath);
    await gcsFile.delete();
  } catch (error) {
    console.error('Error deleting file from GCS:', error);
    throw new Error('Failed to delete file');
  }
}

/**
 * Delete multiple files from Google Cloud Storage
 * @param urls - Array of URLs to delete
 */
export async function deleteFiles(urls: string[]): Promise<void> {
  const deletions = urls.map((url) => deleteFile(url));
  await Promise.all(deletions);
}

/**
 * List files in a folder
 * @param prefix - Folder prefix (e.g., 'courses/materials')
 * @returns Array of file URLs
 */
export async function listFiles(prefix?: string): Promise<string[]> {
  try {
    const [files] = await bucket.getFiles({ prefix });
    return files.map(
      (file) => `https://storage.googleapis.com/${bucketName}/${file.name}`
    );
  } catch (error) {
    console.error('Error listing files from GCS:', error);
    throw new Error('Failed to list files');
  }
}

/**
 * Generate a unique filename with timestamp
 * @param originalName - Original filename
 * @returns Unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.replace(`.${extension}`, '');
  const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-');

  return `${sanitizedName}-${timestamp}-${randomString}.${extension}`;
}
