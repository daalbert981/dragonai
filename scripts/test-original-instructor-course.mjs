import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testOriginalInstructor() {
  console.log('🧪 Testing Original Instructor Course Creation\n');

  try {
    // Get the original instructor
    const instructor = await prisma.user.findUnique({
      where: { email: 'instructor@drexel.edu' }
    });

    if (!instructor) {
      console.log('❌ Original instructor not found');
      return;
    }

    console.log('✓ Found original instructor:', instructor.username);
    console.log('  ID:', instructor.id);
    console.log('  Email:', instructor.email);

    // Check their current courses
    const existingCourses = await prisma.course.findMany({
      where: {
        instructors: {
          some: {
            userId: instructor.id,
          },
        },
      },
    });

    console.log(`\n✓ Original instructor already has ${existingCourses.length} course(s):`);
    existingCourses.forEach((c) => {
      console.log(`  - ${c.code}: ${c.name}`);
    });

    // Create a new test course
    console.log('\n1. Creating new test course for original instructor...');

    const course = await prisma.course.create({
      data: {
        name: 'Advanced Machine Learning',
        code: 'ML501',
        description: 'Deep dive into machine learning algorithms and applications',
        instructors: {
          create: {
            userId: instructor.id,
          },
        },
      },
    });

    console.log('✓ Course created successfully!');
    console.log('  Code:', course.code);
    console.log('  Name:', course.name);

    // Verify total courses now
    const allCourses = await prisma.course.findMany({
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

    console.log(`\n✓ Original instructor now has ${allCourses.length} course(s):`);
    allCourses.forEach((c) => {
      console.log(`  - ${c.code}: ${c.name}`);
      console.log(`    Students: ${c._count.enrollments}, Materials: ${c._count.materials}`);
    });

    console.log('\n✅ Original instructor can create courses successfully!');
    console.log('\nYou can also test the UI at: http://localhost:3000');
    console.log('Login with: instructor@drexel.edu / Instructor123!');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    if (error.code === 'P2002') {
      console.log('\nℹ️ Course code already exists.');
    }
    throw error;
  }
}

testOriginalInstructor()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    process.exit(1);
  });
