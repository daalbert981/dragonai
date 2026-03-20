import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function testLogin() {
  console.log('🔐 Testing Login Flow...\n')

  // Test 1: Check if student user exists
  console.log('1️⃣ Checking student user...')
  const student = await prisma.user.findUnique({
    where: { email: 'student1@drexel.edu' }
  })

  if (!student) {
    console.log('❌ Student user not found!')
    return
  }

  console.log('✅ Found student:', {
    id: student.id,
    username: student.username,
    email: student.email,
    classId: student.classId,
    hasPassword: !!student.password
  })

  // Test 2: Test password
  console.log('\n2️⃣ Testing password...')
  const testPassword = 'Student123!'

  if (!student.password) {
    console.log('❌ Student has no password!')
    return
  }

  const isValid = await bcrypt.compare(testPassword, student.password)
  console.log(`Password "${testPassword}" valid:`, isValid)

  if (!isValid) {
    console.log('❌ Password does not match!')
    console.log('Hash in DB:', student.password)
    return
  }

  console.log('✅ Password matches!')

  // Test 3: Check enrollments
  console.log('\n3️⃣ Checking course enrollments...')
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId: student.id },
    include: {
      course: true
    }
  })

  console.log(`✅ Found ${enrollments.length} enrollments`)
  enrollments.forEach(e => {
    console.log(`   - ${e.course.code}: ${e.course.name}`)
  })

  if (enrollments.length === 0) {
    console.log('⚠️ No course enrollments found!')
  }

  // Test 4: Check what role would be assigned
  console.log('\n4️⃣ Checking role mapping...')
  const role = student.classId === 'admin' || student.classId === 'superadmin' ? 'SUPERADMIN' :
               student.classId === 'instructor' ? 'INSTRUCTOR' : 'STUDENT'
  console.log(`ClassId "${student.classId}" maps to role: ${role}`)

  console.log('\n' + '='.repeat(50))
  console.log('✅ LOGIN TEST COMPLETE')
  console.log('='.repeat(50))
  console.log('Student can login with:')
  console.log('  Email: student1@drexel.edu')
  console.log('  Password: Student123!')
  console.log(`  Will be assigned role: ${role}`)
  console.log(`  Has ${enrollments.length} course(s) enrolled`)
}

testLogin()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
