import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testEnrollment() {
  console.log('🧪 Testing Student Enrollment Functionality\n');

  try {
    // 1. Get an instructor and their course
    const instructor = await prisma.user.findUnique({
      where: { email: 'instructor@drexel.edu' },
      include: {
        instructorCourses: {
          include: {
            course: true,
          },
          take: 1,
        },
      },
    });

    if (!instructor || instructor.instructorCourses.length === 0) {
      console.log('❌ No instructor or courses found');
      return;
    }

    const course = instructor.instructorCourses[0].course;
    console.log('✓ Found instructor:', instructor.username);
    console.log('✓ Found course:', course.code, '-', course.name);

    // 2. Test enrolling an existing student
    console.log('\n1. Testing enrollment of existing student...');
    const existingStudent = await prisma.user.findUnique({
      where: { email: 'student2@drexel.edu' },
    });

    if (existingStudent) {
      // Check if already enrolled
      const existingEnrollment = await prisma.courseEnrollment.findUnique({
        where: {
          courseId_userId: {
            courseId: course.id,
            userId: existingStudent.id,
          },
        },
      });

      if (!existingEnrollment) {
        const enrollment = await prisma.courseEnrollment.create({
          data: {
            courseId: course.id,
            userId: existingStudent.id,
          },
        });

        console.log('✓ Enrolled existing student:', existingStudent.username);
        console.log('  Enrollment ID:', enrollment.id);
      } else {
        console.log('ℹ️ Student already enrolled');
      }
    }

    // 3. Test creating new student and enrolling
    console.log('\n2. Creating and enrolling new student...');
    const newPassword = await bcrypt.hash('NewStudent123!', 10);

    const newStudent = await prisma.user.create({
      data: {
        username: 'enrolltest1',
        email: 'enrolltest1@drexel.edu',
        password: newPassword,
        classId: 'student',
      },
    });

    console.log('✓ Created new student:', newStudent.username);

    const newEnrollment = await prisma.courseEnrollment.create({
      data: {
        courseId: course.id,
        userId: newStudent.id,
      },
      include: {
        user: {
          select: {
            username: true,
            email: true,
          },
        },
      },
    });

    console.log('✓ Enrolled new student');
    console.log('  Enrollment ID:', newEnrollment.id);

    // 4. Verify enrollments
    console.log('\n3. Verifying course enrollments...');
    const allEnrollments = await prisma.courseEnrollment.findMany({
      where: {
        courseId: course.id,
      },
      include: {
        user: {
          select: {
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });

    console.log(`✓ Course "${course.code}" has ${allEnrollments.length} enrolled students:`);
    allEnrollments.forEach((enrollment) => {
      console.log(`  - ${enrollment.user.username} (${enrollment.user.email})`);
      console.log(`    Enrolled: ${enrollment.enrolledAt.toLocaleDateString()}`);
    });

    // 5. Test removing a student
    console.log('\n4. Testing student removal...');
    await prisma.courseEnrollment.delete({
      where: {
        courseId_userId: {
          courseId: course.id,
          userId: newStudent.id,
        },
      },
    });

    console.log('✓ Removed student from course');

    // Verify removal
    const remainingEnrollments = await prisma.courseEnrollment.count({
      where: {
        courseId: course.id,
      },
    });

    console.log(`✓ Course now has ${remainingEnrollments} enrolled students`);

    console.log('\n✅ Enrollment functionality tests completed!');
    console.log('\n📝 Summary:');
    console.log('  - Existing student enrollment: Working');
    console.log('  - New student creation & enrollment: Working');
    console.log('  - Student removal: Working');
    console.log('\n🌐 Test the UI at: http://localhost:3000');
    console.log('  1. Login as instructor: instructor@drexel.edu / Instructor123!');
    console.log('  2. Go to your course');
    console.log('  3. Click "Manage Students"');
    console.log('  4. Click "Add Student" to enroll existing or create new students');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    throw error;
  }
}

testEnrollment()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    process.exit(1);
  });
