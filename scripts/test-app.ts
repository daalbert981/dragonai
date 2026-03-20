import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Testing Dragon AI Application...\n')

  // Test 1: Check users exist
  console.log('1️⃣ Checking test users...')
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, classId: true }
  })
  console.log('✅ Found users:', users.length)
  users.forEach(u => console.log(`   - ${u.email} (${u.classId})`))

  // Test 2: Create a test course
  console.log('\n2️⃣ Creating test course...')

  const instructor = await prisma.user.findUnique({
    where: { email: 'instructor@drexel.edu' }
  })

  if (!instructor) {
    console.log('❌ Instructor not found!')
    return
  }

  // Check if course already exists
  let course = await prisma.course.findUnique({
    where: { code: 'CS101' }
  })

  if (course) {
    console.log('✅ Test course already exists:', course.name)
  } else {
    course = await prisma.course.create({
      data: {
        name: 'Introduction to Computer Science',
        code: 'CS101',
        description: 'A foundational course in computer science covering programming fundamentals, algorithms, and data structures.',
        syllabus: `Course Syllabus:
Week 1-2: Python Basics & Variables
Week 3-4: Control Flow & Loops
Week 5-6: Functions & Modules
Week 7-8: Data Structures (Lists, Dicts)
Week 9-10: Object-Oriented Programming
Week 11-12: File I/O & Error Handling
Week 13-14: Algorithms & Complexity
Week 15: Final Project`,
        systemPrompt: `You are an AI teaching assistant for CS101: Introduction to Computer Science.

Your role is to help students understand programming concepts, debug code, and learn problem-solving skills.
Always encourage critical thinking and guide students toward solutions rather than providing direct answers.
Be patient, supportive, and adapt your explanations to the student's level of understanding.`,
        model: 'gpt-5.4-mini',
        temperature: 0.7,
        reasoningLevel: 'medium',
        isActive: true,
      }
    })
    console.log('✅ Created course:', course.name)
  }

  // Test 3: Assign instructor to course
  console.log('\n3️⃣ Assigning instructor to course...')

  const existingAssignment = await prisma.courseInstructor.findUnique({
    where: {
      courseId_userId: {
        courseId: course.id,
        userId: instructor.id
      }
    }
  })

  if (existingAssignment) {
    console.log('✅ Instructor already assigned')
  } else {
    await prisma.courseInstructor.create({
      data: {
        courseId: course.id,
        userId: instructor.id,
      }
    })
    console.log('✅ Instructor assigned to course')
  }

  // Test 4: Enroll students
  console.log('\n4️⃣ Enrolling students...')

  const students = await prisma.user.findMany({
    where: {
      email: {
        in: ['student1@drexel.edu', 'student2@drexel.edu']
      }
    }
  })

  for (const student of students) {
    const existingEnrollment = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_userId: {
          courseId: course.id,
          userId: student.id
        }
      }
    })

    if (existingEnrollment) {
      console.log(`✅ ${student.email} already enrolled`)
    } else {
      await prisma.courseEnrollment.create({
        data: {
          courseId: course.id,
          userId: student.id,
        }
      })
      console.log(`✅ Enrolled ${student.email}`)
    }
  }

  // Test 5: Add sample class schedule
  console.log('\n5️⃣ Adding class schedule...')

  const scheduleCount = await prisma.classSchedule.count({
    where: { courseId: course.id }
  })

  if (scheduleCount > 0) {
    console.log(`✅ ${scheduleCount} schedule entries already exist`)
  } else {
    const now = new Date()
    const nextWeek = new Date(now)
    nextWeek.setDate(now.getDate() + 7)

    await prisma.classSchedule.create({
      data: {
        courseId: course.id,
        title: 'Introduction to Python',
        description: 'First lecture covering Python basics and setup',
        sessionDate: nextWeek,
        sessionType: 'UPCOMING',
      }
    })
    console.log('✅ Added upcoming class schedule')
  }

  // Test 6: Verify student can access course
  console.log('\n6️⃣ Verifying student course access...')

  const student1 = students[0]
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: {
      courseId_userId: {
        courseId: course.id,
        userId: student1.id
      }
    },
    include: {
      course: true
    }
  })

  if (enrollment) {
    console.log(`✅ ${student1.email} can access ${enrollment.course.name}`)
  } else {
    console.log(`❌ ${student1.email} cannot access course`)
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(50))
  console.log(`✅ Users: ${users.length}`)
  console.log(`✅ Course: ${course.name} (${course.code})`)
  console.log(`✅ Enrolled students: ${students.length}`)
  console.log(`✅ Class schedules: ${scheduleCount > 0 ? scheduleCount : 1}`)
  console.log('\n🎉 Application setup complete!')
  console.log('\n📝 Test credentials:')
  console.log('   Student: student1@drexel.edu / Student123!')
  console.log('   Instructor: instructor@drexel.edu / Instructor123!')
  console.log('\n🌐 Test URLs:')
  console.log(`   Login: http://localhost:3000/login`)
  console.log(`   Student Dashboard: http://localhost:3000/student`)
  console.log(`   Instructor Admin: http://localhost:3000/admin`)
  console.log(`   Course Chat: http://localhost:3000/student/courses/${course.id}/chat`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
