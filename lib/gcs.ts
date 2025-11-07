/**
 * File storage utilities using Vercel Blob
 * This module provides file upload, download, and deletion functionality
 */

import { put, del, list } from '@vercel/blob';

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

/**
 * Upload a file to Vercel Blob storage
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

    const blob = await put(path, file, {
      access: 'public',
    });

    return {
      url: blob.url,
      filename: path,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
}

/**
 * Upload multiple files to Vercel Blob storage
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
 * Delete a file from Vercel Blob storage
 * @param url - URL of the file to delete
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
}

/**
 * Delete multiple files from Vercel Blob storage
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
    const { blobs } = await list({ prefix });
    return blobs.map((blob) => blob.url);
  } catch (error) {
    console.error('Error listing files:', error);
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

/**
 * Validate file type
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns True if file type is allowed
 */
export function validateFileType(
  file: File,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Validate file size
 * @param file - File to validate
 * @param maxSizeInMB - Maximum file size in megabytes
 * @returns True if file size is within limit
 */
export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

/**
 * Format file size to human-readable string
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
