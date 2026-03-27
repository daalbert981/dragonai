import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('Checking database connection...\n');
  const dbUrl = new URL(process.env.DATABASE_URL);
  console.log('Database:', dbUrl.pathname.slice(1));
  console.log('Host:', dbUrl.hostname);

  try {
    const users = await prisma.user.count();
    console.log(`\n✓ Users table exists: ${users} users found`);

    const courses = await prisma.course.findMany();
    console.log(`✓ Courses table exists: ${courses.length} courses found`);

    courses.forEach(c => {
      console.log(`  - ${c.code}: ${c.name}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
