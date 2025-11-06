import { PrismaClient, UserRole } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Hash passwords
  const adminPassword = await bcrypt.hash('Admin123!', 10)
  const instructorPassword = await bcrypt.hash('Instructor123!', 10)
  const studentPassword = await bcrypt.hash('Student123!', 10)

  // Create superadmin user
  const superadmin = await prisma.user.upsert({
    where: { email: 'admin@drexel.edu' },
    update: {},
    create: {
      email: 'admin@drexel.edu',
      name: 'Super Admin',
      password: adminPassword,
      role: UserRole.SUPERADMIN,
    },
  })
  console.log('✓ Created superadmin user:', superadmin.email)

  // Create instructor user
  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@drexel.edu' },
    update: {},
    create: {
      email: 'instructor@drexel.edu',
      name: 'Dr. Jane Smith',
      password: instructorPassword,
      role: UserRole.INSTRUCTOR,
    },
  })
  console.log('✓ Created instructor user:', instructor.email)

  // Create student users
  const student1 = await prisma.user.upsert({
    where: { email: 'student1@drexel.edu' },
    update: {},
    create: {
      email: 'student1@drexel.edu',
      name: 'John Doe',
      password: studentPassword,
      role: UserRole.STUDENT,
    },
  })
  console.log('✓ Created student user:', student1.email)

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@drexel.edu' },
    update: {},
    create: {
      email: 'student2@drexel.edu',
      name: 'Alice Johnson',
      password: studentPassword,
      role: UserRole.STUDENT,
    },
  })
  console.log('✓ Created student user:', student2.email)

  // Create a sample course
  const course = await prisma.course.upsert({
    where: { code: 'CS101' },
    update: {},
    create: {
      name: 'Introduction to Computer Science',
      code: 'CS101',
      description: 'A foundational course in computer science covering programming fundamentals, algorithms, and data structures.',
      instructorId: instructor.id,
      systemPrompt: `You are an AI teaching assistant for CS101: Introduction to Computer Science.
Your role is to help students understand programming concepts, debug code, and learn problem-solving skills.
Always encourage critical thinking and guide students toward solutions rather than providing direct answers.
Be patient, supportive, and adapt your explanations to the student's level of understanding.`,
      modelConfig: {
        model: 'claude-sonnet-4',
        temperature: 0.7,
        reasoning_level: 'medium',
      },
      syllabusInfo: `Course Syllabus:
Week 1-2: Python Basics & Variables
Week 3-4: Control Flow & Loops
Week 5-6: Functions & Modules
Week 7-8: Data Structures (Lists, Dicts)
Week 9-10: Object-Oriented Programming
Week 11-12: File I/O & Error Handling
Week 13-14: Algorithms & Complexity
Week 15: Final Project`,
      timezone: 'America/New_York',
      isActive: true,
    },
  })
  console.log('✓ Created sample course:', course.code)

  // Enroll students in the course
  const enrollment1 = await prisma.courseEnrollment.upsert({
    where: {
      userId_courseId: {
        userId: student1.id,
        courseId: course.id,
      },
    },
    update: {},
    create: {
      userId: student1.id,
      courseId: course.id,
    },
  })
  console.log('✓ Enrolled', student1.name, 'in', course.code)

  const enrollment2 = await prisma.courseEnrollment.upsert({
    where: {
      userId_courseId: {
        userId: student2.id,
        courseId: course.id,
      },
    },
    update: {},
    create: {
      userId: student2.id,
      courseId: course.id,
    },
  })
  console.log('✓ Enrolled', student2.name, 'in', course.code)

  // Create some sample class schedules
  const now = new Date()
  const nextWeek = new Date(now)
  nextWeek.setDate(now.getDate() + 7)
  const lastWeek = new Date(now)
  lastWeek.setDate(now.getDate() - 7)

  await prisma.classSchedule.create({
    data: {
      courseId: course.id,
      title: 'Introduction to Python',
      description: 'First lecture covering Python basics and setup',
      sessionDate: lastWeek,
      sessionType: 'PAST',
    },
  })
  console.log('✓ Created past class schedule')

  await prisma.classSchedule.create({
    data: {
      courseId: course.id,
      title: 'Control Flow and Conditionals',
      description: 'Deep dive into if statements, loops, and control structures',
      sessionDate: nextWeek,
      sessionType: 'UPCOMING',
    },
  })
  console.log('✓ Created upcoming class schedule')

  console.log('\n✅ Database seeding completed successfully!')
  console.log('\nTest credentials:')
  console.log('Superadmin: admin@drexel.edu / Admin123!')
  console.log('Instructor: instructor@drexel.edu / Instructor123!')
  console.log('Students: student1@drexel.edu / Student123!')
  console.log('          student2@drexel.edu / Student123!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Error during seeding:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
