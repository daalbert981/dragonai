import { z } from 'zod';

// Document upload validation
export const documentUploadSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => file.size <= 10 * 1024 * 1024,
    'File size must be less than 10MB'
  ).refine(
    (file) => [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ].includes(file.type),
    'File type not supported. Supported: PDF, DOCX, JPG, PNG'
  ),
  courseId: z.string().optional(),
});

// Document update validation
export const documentUpdateSchema = z.object({
  courseId: z.string().nullable().optional(),
});

// Document query validation
export const documentQuerySchema = z.object({
  courseId: z.string().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Bulk delete validation
export const bulkDeleteSchema = z.object({
  documentIds: z.array(z.string()).min(1, 'At least one document ID required'),
});

export type DocumentUpload = z.infer<typeof documentUploadSchema>;
export type DocumentUpdate = z.infer<typeof documentUpdateSchema>;
export type DocumentQuery = z.infer<typeof documentQuerySchema>;
export type BulkDelete = z.infer<typeof bulkDeleteSchema>;
