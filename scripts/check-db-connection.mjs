import { PrismaClient } from '@prisma/client';

const DATABASE_URL = "postgres://ub4k0m1t3kp0jf:***REDACTED***@c57oa7dm3pc281.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/de5ohdk3foejht";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function main() {
  console.log('Checking database connection...\n');
  console.log('Database:', DATABASE_URL.split('@')[1].split('/')[1]);
  console.log('Host:', DATABASE_URL.split('@')[1].split(':')[0]);

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
