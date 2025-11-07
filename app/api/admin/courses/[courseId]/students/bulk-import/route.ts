import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseCsvContent, validateUniqueEmails } from '@/lib/csv-parser'
import { generatePassword, hashPassword } from '@/lib/password'
import { sendBatchCredentialsEmails } from '@/lib/email'

export const maxDuration = 300 // 5 minutes for large imports

interface ImportResult {
  success: boolean
  imported: number
  failed: number
  errors: Array<{
    row: number
    email: string
    error: string
  }>
  emailsSent: number
  emailsFailed: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params

    // TODO: Add authentication check here
    // Example: const session = await getServerSession()
    // if (!session || session.user.role !== 'ADMIN') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, isActive: true }
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    if (!course.isActive) {
      return NextResponse.json(
        { error: 'Cannot import students to an inactive course' },
        { status: 400 }
      )
    }

    // Parse request body
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const sendEmails = formData.get('sendEmails') === 'true'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Read CSV content
    const csvContent = await file.text()

    // Parse and validate CSV
    let parseResult
    try {
      parseResult = parseCsvContent(csvContent)
    } catch (error) {
      return NextResponse.json(
        {
          error: 'CSV parsing failed',
          message: error instanceof Error ? error.message : 'Invalid CSV format'
        },
        { status: 400 }
      )
    }

    // Check for duplicate emails within CSV
    const duplicateErrors = validateUniqueEmails(parseResult.validRows)
    if (duplicateErrors.length > 0) {
      parseResult.errors.push(...duplicateErrors)
    }

    // Return early if there are validation errors
    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          imported: 0,
          failed: parseResult.errors.length,
          errors: parseResult.errors.map(err => ({
            row: err.row,
            email: err.data.email || 'N/A',
            error: err.errors.join(', ')
          })),
          validationErrors: parseResult.errors
        },
        { status: 400 }
      )
    }

    // Process each valid row
    const result: ImportResult = {
      success: true,
      imported: 0,
      failed: 0,
      errors: [],
      emailsSent: 0,
      emailsFailed: 0
    }

    const studentsToEmail: Array<{
      to: string
      name: string
      email: string
      password: string
      courseTitle: string
    }> = []

    for (let i = 0; i < parseResult.validRows.length; i++) {
      const row = parseResult.validRows[i]
      const rowNumber = i + 2 // Account for header row and 0-indexing

      try {
        // Check if user already exists
        let user = await prisma.user.findUnique({
          where: { email: row.email },
          select: { id: true, email: true, name: true }
        })

        const plainPassword = generatePassword(12)
        const hashedPassword = await hashPassword(plainPassword)
        let isNewUser = false

        if (!user) {
          // Create new user
          user = await prisma.user.create({
            data: {
              email: row.email,
              name: row.name,
              password: hashedPassword,
              role: 'STUDENT'
            },
            select: { id: true, email: true, name: true }
          })
          isNewUser = true
        }

        // Check if already enrolled
        const existingEnrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: course.id
            }
          }
        })

        if (existingEnrollment) {
          result.errors.push({
            row: rowNumber,
            email: row.email,
            error: 'Student already enrolled in this course'
          })
          result.failed++
          continue
        }

        // Create enrollment
        await prisma.enrollment.create({
          data: {
            userId: user.id,
            courseId: course.id
          }
        })

        result.imported++

        // Add to email queue only for new users
        if (sendEmails && isNewUser) {
          studentsToEmail.push({
            to: row.email,
            name: row.name,
            email: row.email,
            password: plainPassword,
            courseTitle: course.title
          })
        }
      } catch (error) {
        result.failed++
        result.errors.push({
          row: rowNumber,
          email: row.email,
          error: error instanceof Error ? error.message : 'Failed to create student'
        })
      }
    }

    // Send emails in batch if requested
    if (sendEmails && studentsToEmail.length > 0) {
      const emailResult = await sendBatchCredentialsEmails(studentsToEmail)
      result.emailsSent = emailResult.sent
      result.emailsFailed = emailResult.failed

      // Add email errors to result
      emailResult.errors.forEach(err => {
        result.errors.push({
          row: 0, // Email errors don't have row numbers
          email: err.email,
          error: `Email failed: ${err.error}`
        })
      })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Bulk import error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
