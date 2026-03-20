import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAllUsers() {
  console.log('📋 Listing all users in database\n');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      classId: true,
      createdAt: true,
      _count: {
        select: {
          enrollments: true,
          instructorCourses: true,
        }
      }
    },
    orderBy: {
      id: 'desc'
    }
  });

  // Map classId to role
  const usersWithRoles = users.map(user => ({
    ...user,
    role: user.classId === 'admin' || user.classId === 'superadmin' ? 'SUPERADMIN' :
          user.classId === 'instructor' ? 'INSTRUCTOR' : 'STUDENT',
  }));

  console.log(`Found ${users.length} users:\n`);

  usersWithRoles.forEach((user) => {
    console.log(`ID: ${user.id}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Created: ${user.createdAt.toLocaleString()}`);
    console.log(`  Enrollments: ${user._count.enrollments}`);
    console.log(`  Courses Teaching: ${user._count.instructorCourses}`);
    console.log('');
  });

  // Count by role
  const studentCount = usersWithRoles.filter(u => u.role === 'STUDENT').length;
  const instructorCount = usersWithRoles.filter(u => u.role === 'INSTRUCTOR').length;
  const superadminCount = usersWithRoles.filter(u => u.role === 'SUPERADMIN').length;

  console.log('Summary:');
  console.log(`  Students: ${studentCount}`);
  console.log(`  Instructors: ${instructorCount}`);
  console.log(`  Superadmins: ${superadminCount}`);
  console.log(`  Total: ${users.length}`);
}

listAllUsers()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error listing users:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
