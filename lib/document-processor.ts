import pdf from 'pdf-parse'
import mammoth from 'mammoth'
import sharp from 'sharp'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ProcessedDocument {
  text: string
  metadata: {
    pageCount?: number
    wordCount?: number
    processingMethod: string
  }
}

export interface DocumentProcessorOptions {
  maxTextLength?: number
  enableOCR?: boolean
}

/**
 * Process a PDF file and extract text content
 */
async function processPDF(
  buffer: Buffer,
  options?: DocumentProcessorOptions
): Promise<ProcessedDocument> {
  try {
    const data = await pdf(buffer)

    let text = data.text
    const maxLength = options?.maxTextLength || 50000

    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '\n\n[Text truncated due to length...]'
    }

    return {
      text,
      metadata: {
        pageCount: data.numpages,
        wordCount: text.split(/\s+/).length,
        processingMethod: 'pdf-parse',
      },
    }
  } catch (error) {
    console.error('PDF processing error:', error)
    throw new Error('Failed to process PDF file')
  }
}

/**
 * Process a DOCX file and extract text content
 */
async function processDOCX(
  buffer: Buffer,
  options?: DocumentProcessorOptions
): Promise<ProcessedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer })

    let text = result.value
    const maxLength = options?.maxTextLength || 50000

    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '\n\n[Text truncated due to length...]'
    }

    return {
      text,
      metadata: {
        wordCount: text.split(/\s+/).length,
        processingMethod: 'mammoth',
      },
    }
  } catch (error) {
    console.error('DOCX processing error:', error)
    throw new Error('Failed to process DOCX file')
  }
}

/**
 * Process an image file using OpenAI Vision API
 */
async function processImage(
  buffer: Buffer,
  mimeType: string,
  options?: DocumentProcessorOptions
): Promise<ProcessedDocument> {
  try {
    // Resize image if too large to reduce costs
    const processedImage = await sharp(buffer)
      .resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer()

    // Convert to base64
    const base64Image = processedImage.toString('base64')
    const imageUrl = `data:${mimeType};base64,${base64Image}`

    if (!options?.enableOCR) {
      return {
        text: '[Image uploaded but OCR/Vision processing is disabled. Enable it to extract text from images.]',
        metadata: {
          processingMethod: 'image-skipped',
        },
      }
    }

    // Use OpenAI Vision API to extract text/description from image
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please extract and transcribe all text visible in this image. If there is no text, provide a detailed description of the image content. Focus on educational content, diagrams, charts, or any information that would be useful for studying.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    })

    const text = response.choices[0]?.message?.content || ''

    return {
      text,
      metadata: {
        wordCount: text.split(/\s+/).length,
        processingMethod: 'openai-vision',
      },
    }
  } catch (error) {
    console.error('Image processing error:', error)
    throw new Error('Failed to process image file')
  }
}

/**
 * Process a plain text file
 */
async function processText(
  buffer: Buffer,
  options?: DocumentProcessorOptions
): Promise<ProcessedDocument> {
  try {
    let text = buffer.toString('utf-8')
    const maxLength = options?.maxTextLength || 50000

    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '\n\n[Text truncated due to length...]'
    }

    return {
      text,
      metadata: {
        wordCount: text.split(/\s+/).length,
        processingMethod: 'text',
      },
    }
  } catch (error) {
    console.error('Text processing error:', error)
    throw new Error('Failed to process text file')
  }
}

/**
 * Main document processor that routes to appropriate handler based on MIME type
 */
export async function processDocument(
  buffer: Buffer,
  mimeType: string,
  options?: DocumentProcessorOptions
): Promise<ProcessedDocument> {
  const lowerMimeType = mimeType.toLowerCase()

  // Route to appropriate processor based on MIME type
  if (lowerMimeType === 'application/pdf') {
    return processPDF(buffer, options)
  } else if (
    lowerMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerMimeType === 'application/msword'
  ) {
    return processDOCX(buffer, options)
  } else if (lowerMimeType.startsWith('image/')) {
    return processImage(buffer, mimeType, options)
  } else if (lowerMimeType.startsWith('text/')) {
    return processText(buffer, options)
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`)
  }
}

/**
 * Get supported MIME types for document processing
 */
export function getSupportedMimeTypes(): string[] {
  return [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/markdown',
  ]
}

/**
 * Check if a MIME type is supported
 */
export function isSupportedMimeType(mimeType: string): boolean {
  const supported = getSupportedMimeTypes()
  const lowerMimeType = mimeType.toLowerCase()

  return supported.some(type => {
    if (type.endsWith('/*')) {
      const prefix = type.slice(0, -2)
      return lowerMimeType.startsWith(prefix)
    }
    return lowerMimeType === type
  })
}

/**
 * Validate file size (max 10MB by default)
 */
export function validateFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
  return size <= maxSize
}
