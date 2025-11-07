import { z } from 'zod'

// CSV row schema for validation
export const studentCsvRowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  studentId: z.string().optional(),
})

export type StudentCsvRow = z.infer<typeof studentCsvRowSchema>

export interface CsvParseResult {
  validRows: StudentCsvRow[]
  errors: CsvRowError[]
  totalRows: number
}

export interface CsvRowError {
  row: number
  data: Record<string, string>
  errors: string[]
}

/**
 * Parses CSV content and validates each row
 * Expected CSV format: name,email,studentId (optional)
 * First row should be headers
 */
export function parseCsvContent(csvContent: string): CsvParseResult {
  const lines = csvContent.trim().split('\n')

  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row')
  }

  const headers = parseCSVRow(lines[0])
  const validRows: StudentCsvRow[] = []
  const errors: CsvRowError[] = []

  // Validate headers
  const requiredHeaders = ['name', 'email']
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h.toLowerCase()))

  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`)
  }

  // Map header names to indices (case-insensitive)
  const headerMap: Record<string, number> = {}
  headers.forEach((header, index) => {
    headerMap[header.toLowerCase().trim()] = index
  })

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip empty lines
    if (!line) continue

    const values = parseCSVRow(line)
    const rowNumber = i + 1

    // Create row object
    const rowData: Record<string, string> = {}

    if (headerMap['name'] !== undefined) rowData.name = values[headerMap['name']]?.trim() || ''
    if (headerMap['email'] !== undefined) rowData.email = values[headerMap['email']]?.trim() || ''
    if (headerMap['studentid'] !== undefined) rowData.studentId = values[headerMap['studentid']]?.trim() || ''

    // Validate row
    const validation = studentCsvRowSchema.safeParse(rowData)

    if (validation.success) {
      validRows.push(validation.data)
    } else {
      errors.push({
        row: rowNumber,
        data: rowData,
        errors: validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      })
    }
  }

  return {
    validRows,
    errors,
    totalRows: lines.length - 1 // Exclude header row
  }
}

/**
 * Parses a single CSV row, handling quoted values and commas within quotes
 */
function parseCSVRow(row: string): string[] {
  const values: string[] = []
  let currentValue = ''
  let insideQuotes = false

  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    const nextChar = row[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentValue += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      // End of value
      values.push(currentValue)
      currentValue = ''
    } else {
      currentValue += char
    }
  }

  // Push the last value
  values.push(currentValue)

  return values
}

/**
 * Validates that emails are unique within the CSV
 */
export function validateUniqueEmails(rows: StudentCsvRow[]): CsvRowError[] {
  const emailMap = new Map<string, number[]>()
  const errors: CsvRowError[] = []

  rows.forEach((row, index) => {
    const email = row.email.toLowerCase()
    if (!emailMap.has(email)) {
      emailMap.set(email, [])
    }
    emailMap.get(email)!.push(index + 2) // +2 because row 1 is header, array is 0-indexed
  })

  emailMap.forEach((indices, email) => {
    if (indices.length > 1) {
      indices.forEach(rowNum => {
        const row = rows[rowNum - 2] // Convert back to array index
        errors.push({
          row: rowNum,
          data: row as unknown as Record<string, string>,
          errors: [`Duplicate email: ${email} appears in rows ${indices.join(', ')}`]
        })
      })
    }
  })

  return errors
}

/**
 * Creates a sample CSV template string
 */
export function generateCsvTemplate(): string {
  return `name,email,studentId
John Doe,john.doe@example.com,S12345
Jane Smith,jane.smith@example.com,S12346
Bob Johnson,bob.johnson@example.com,S12347`
}
