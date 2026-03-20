/**
 * Bulk Student Upload API
 *
 * Allows instructors to upload a CSV file with student information
 * Creates accounts for new students and enrolls them in the course
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

interface CSVRow {
  firstName: string
  lastName: string
  email: string
}

/**
 * Parse CSV content into structured data
 */
function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV must contain at least a header row and one data row')
  }

  // Parse header (case-insensitive)
  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const firstNameIdx = header.findIndex(h => h.includes('first') && h.includes('name'))
  const lastNameIdx = header.findIndex(h => h.includes('last') && h.includes('name'))
  const emailIdx = header.findIndex(h => h.includes('email'))

  if (firstNameIdx === -1 || lastNameIdx === -1 || emailIdx === -1) {
    throw new Error('CSV must contain columns: First Name, Last Name, Email (in any order)')
  }

  // Parse data rows
  const rows: CSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Skip empty lines

    const values = line.split(',').map(v => v.trim())
    if (values.length < 3) continue // Skip incomplete rows

    rows.push({
      firstName: values[firstNameIdx],
      lastName: values[lastNameIdx],
      email: values[emailIdx].toLowerCase()
    })
  }

  return rows
}

/**
 * Generate a secure setup token for new users
 */
function generateSetupToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * POST /api/admin/courses/[courseId]/students/bulk-upload
 *
 * Upload CSV file and bulk enroll students
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await requireRole('INSTRUCTOR')
    const userId = parseInt((session.user as any).id)
    const { courseId } = params

    // Verify instructor has access to this course
    const instructorAccess = await prisma.courseInstructor.findFirst({
      where: {
        courseId,
        userId
      }
    })

    if (!instructorAccess) {
      return NextResponse.json(
        { error: 'Access denied - You are not an instructor for this course' },
        { status: 403 }
      )
    }

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Read and parse CSV
    const content = await file.text()
    const students = parseCSV(content)

    if (students.length === 0) {
      return NextResponse.json(
        { error: 'No valid student data found in CSV' },
        { status: 400 }
      )
    }

    // Build the base URL from the request
    const baseUrl = req.headers.get('x-forwarded-proto') && req.headers.get('host')
      ? `${req.headers.get('x-forwarded-proto')}://${req.headers.get('host')}`
      : new URL(req.url).origin

    const results = {
      total: students.length,
      enrolled: [] as string[],
      created: [] as { email: string; setupUrl: string }[],
      errors: [] as { email: string; error: string }[]
    }

    // Process each student
    for (const student of students) {
      try {
        // Validate email format
        if (!student.email || !student.email.includes('@')) {
          results.errors.push({
            email: student.email,
            error: 'Invalid email format'
          })
          continue
        }

        // Check if user exists
        let user = await prisma.user.findUnique({
          where: { email: student.email }
        })

        // If user doesn't exist, create with setup token
        if (!user) {
          const username = student.email.split('@')[0]
          const setupToken = generateSetupToken()
          const setupTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

          user = await prisma.user.create({
            data: {
              username: username,
              email: student.email,
              password: null, // No password yet - will be set during setup
              classId: 'STUDENT',
              setupToken,
              setupTokenExpiry
            }
          })

          results.created.push({
            email: student.email,
            setupUrl: `${baseUrl}/setup/${setupToken}`
          })
          console.log(`[BULK UPLOAD] Created new user: ${student.email} with setup token`)
        }

        // Check if already enrolled
        const existingEnrollment = await prisma.courseEnrollment.findUnique({
          where: {
            courseId_userId: {
              courseId,
              userId: user.id
            }
          }
        })

        if (existingEnrollment) {
          results.errors.push({
            email: student.email,
            error: 'Already enrolled in this course'
          })
          continue
        }

        // Enroll in course
        await prisma.courseEnrollment.create({
          data: {
            courseId,
            userId: user.id
          }
        })

        results.enrolled.push(student.email)
        console.log(`[BULK UPLOAD] Enrolled: ${student.email}`)

      } catch (error) {
        console.error(`[BULK UPLOAD] Error processing ${student.email}:`, error)
        results.errors.push({
          email: student.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('[BULK UPLOAD] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process CSV upload'
      },
      { status: 500 }
    )
  }
}
