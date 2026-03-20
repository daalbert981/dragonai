import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testInstructorCourseCreation() {
  console.log('🧪 Testing Instructor Course Creation\n');

  try {
    // Get the test instructor we created earlier
    const instructor = await prisma.user.findUnique({
      where: { email: 'test.instructor@drexel.edu' }
    });

    if (!instructor) {
      console.log('❌ Test instructor not found');
      console.log('Please run: node scripts/create-test-users.mjs first');
      return;
    }

    console.log('✓ Found test instructor:', instructor.username);
    console.log('  ID:', instructor.id);
    console.log('  Email:', instructor.email);
    console.log('  Role:', instructor.classId);

    // Create a test course directly in database (simulating what the API does)
    console.log('\n1. Creating test course...');

    const course = await prisma.course.create({
      data: {
        name: 'Introduction to AI',
        code: 'AI101',
        description: 'Learn the fundamentals of Artificial Intelligence',
        instructors: {
          create: {
            userId: instructor.id,
          },
        },
      },
      include: {
        instructors: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            materials: true,
          },
        },
      },
    });

    console.log('✓ Course created successfully!');
    console.log('  ID:', course.id);
    console.log('  Name:', course.name);
    console.log('  Code:', course.code);
    console.log('  Description:', course.description);
    console.log('  Assigned Instructors:', course.instructors.length);

    // Verify the course-instructor relationship
    console.log('\n2. Verifying course-instructor relationship...');
    const courseWithInstructors = await prisma.course.findUnique({
      where: { id: course.id },
      include: {
        instructors: {
          include: {
            user: {
              select: {
                username: true,
                email: true,
                classId: true,
              },
            },
          },
        },
      },
    });

    console.log('✓ Course instructor verified:');
    courseWithInstructors.instructors.forEach((ci) => {
      console.log(`  - ${ci.user.username} (${ci.user.email})`);
    });

    // Check if instructor can see this course in their list
    console.log('\n3. Checking instructor\'s course list...');
    const instructorCourses = await prisma.course.findMany({
      where: {
        instructors: {
          some: {
            userId: instructor.id,
          },
        },
      },
      include: {
        _count: {
          select: {
            enrollments: true,
            materials: true,
          },
        },
      },
    });

    console.log(`✓ Instructor has ${instructorCourses.length} course(s):`);
    instructorCourses.forEach((c) => {
      console.log(`  - ${c.code}: ${c.name}`);
      console.log(`    Students: ${c._count.enrollments}, Materials: ${c._count.materials}`);
    });

    console.log('\n✅ Instructor course creation test completed successfully!');
    console.log('\nYou can now test the UI at: http://localhost:3000');
    console.log('Login with: test.instructor@drexel.edu / Instructor456!');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    if (error.code === 'P2002') {
      console.log('\nℹ️ Course code already exists. Try a different course code.');
    }
    throw error;
  }
}

testInstructorCourseCreation()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    process.exit(1);
  });
