import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUsers() {
  console.log('🧪 Creating test users directly in database\n');

  try {
    // Create a test student
    console.log('1. Creating test student...');
    const studentPassword = await bcrypt.hash('Student456!', 10);
    const student = await prisma.user.create({
      data: {
        username: 'teststudent',
        email: 'test.student@drexel.edu',
        password: studentPassword,
        classId: 'student',
      },
    });
    console.log('✓ Student created:', {
      id: student.id,
      username: student.username,
      email: student.email,
      classId: student.classId,
    });

    // Create a test instructor
    console.log('\n2. Creating test instructor...');
    const instructorPassword = await bcrypt.hash('Instructor456!', 10);
    const instructor = await prisma.user.create({
      data: {
        username: 'testinstructor',
        email: 'test.instructor@drexel.edu',
        password: instructorPassword,
        classId: 'instructor',
      },
    });
    console.log('✓ Instructor created:', {
      id: instructor.id,
      username: instructor.username,
      email: instructor.email,
      classId: instructor.classId,
    });

    // Create a test superadmin
    console.log('\n3. Creating test superadmin...');
    const superadminPassword = await bcrypt.hash('Superadmin456!', 10);
    const superadmin = await prisma.user.create({
      data: {
        username: 'testsuperadmin',
        email: 'test.superadmin@drexel.edu',
        password: superadminPassword,
        classId: 'superadmin',
      },
    });
    console.log('✓ Superadmin created:', {
      id: superadmin.id,
      username: superadmin.username,
      email: superadmin.email,
      classId: superadmin.classId,
    });

    // Verify the users were created with timestamps
    console.log('\n4. Verifying users with timestamps...');
    const users = await prisma.user.findMany({
      where: {
        username: {
          in: ['teststudent', 'testinstructor', 'testsuperadmin'],
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        classId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log('\n✓ All users verified:');
    users.forEach((user) => {
      console.log(`  - ${user.username} (${user.classId})`);
      console.log(`    Created: ${user.createdAt.toISOString()}`);
      console.log(`    Updated: ${user.updatedAt.toISOString()}`);
    });

    console.log('\n✅ Test users created successfully!');
    console.log('\nTest Credentials:');
    console.log('  Student:     test.student@drexel.edu / Student456!');
    console.log('  Instructor:  test.instructor@drexel.edu / Instructor456!');
    console.log('  Superadmin:  test.superadmin@drexel.edu / Superadmin456!');
  } catch (error) {
    console.error('Error creating test users:', error.message);
    if (error.code === 'P2002') {
      console.log('\nℹ️ Users already exist. Try different usernames or delete existing test users.');
    }
    throw error;
  }
}

createTestUsers()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    process.exit(1);
  });
