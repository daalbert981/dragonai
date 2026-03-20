import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Map classId to UserRole
const ROLE_MAPPING = {
  'admin': 'admin',
  'instructor': 'instructor',
  'student': 'student',
}

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
      username: 'admin',
      password: adminPassword,
      classId: 'admin',
    },
  })
  console.log('✓ Created superadmin user:', superadmin.email)

  // Create instructor user
  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@drexel.edu' },
    update: {},
    create: {
      email: 'instructor@drexel.edu',
      username: 'instructor',
      password: instructorPassword,
      classId: 'instructor',
    },
  })
  console.log('✓ Created instructor user:', instructor.email)

  // Create student users
  const student1 = await prisma.user.upsert({
    where: { email: 'student1@drexel.edu' },
    update: {},
    create: {
      email: 'student1@drexel.edu',
      username: 'student1',
      password: studentPassword,
      classId: 'student',
    },
  })
  console.log('✓ Created student user:', student1.email)

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@drexel.edu' },
    update: {},
    create: {
      email: 'student2@drexel.edu',
      username: 'student2',
      password: studentPassword,
      classId: 'student',
    },
  })
  console.log('✓ Created student user:', student2.email)

  console.log('\nNote: Course creation skipped - Course model needs to be updated to match database schema')

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
