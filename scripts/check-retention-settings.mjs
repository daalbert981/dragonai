import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('Checking course retention settings and sessions...\n');

  try {
    // Get all courses with retention settings
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        sessionRetentionPolicy: true,
        sessionRetentionDays: true,
        sessionRetentionHours: true
      }
    });

    console.log('='.repeat(80));
    console.log('COURSE RETENTION SETTINGS');
    console.log('='.repeat(80) + '\n');

    for (const course of courses) {
      console.log(`Course: ${course.name} (${course.code})`);
      console.log(`  ID: ${course.id}`);
      console.log(`  Retention Policy: ${course.sessionRetentionPolicy}`);
      console.log(`  Retention Days: ${course.sessionRetentionDays ?? 'null'}`);
      console.log(`  Retention Hours: ${course.sessionRetentionHours ?? 'null'}`);

      // Calculate what the cutoff would be
      if (course.sessionRetentionPolicy === 'custom') {
        const totalHours = (course.sessionRetentionDays || 0) * 24 + (course.sessionRetentionHours || 0);
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - totalHours);
        console.log(`  Total Retention: ${totalHours} hours`);
        console.log(`  Cutoff Date: ${cutoff.toISOString()}`);
        console.log(`  (Sessions older than this should be deleted)`);
      }

      // Get sessions for this course
      const sessions = await prisma.chatSession.findMany({
        where: { courseId: course.id },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { messages: true }
          }
        }
      });

      console.log(`  \n  Sessions: ${sessions.length} total`);

      if (sessions.length > 0) {
        console.log('  Recent sessions:');
        sessions.slice(0, 5).forEach((session, idx) => {
          const age = Math.round((new Date() - new Date(session.updatedAt)) / (1000 * 60 * 60));
          console.log(`    ${idx + 1}. ${session.id.substring(0, 12)}... - ${session._count.messages} messages`);
          console.log(`       Created: ${session.createdAt.toISOString()}`);
          console.log(`       Updated: ${session.updatedAt.toISOString()} (${age} hours ago)`);
        });
        if (sessions.length > 5) {
          console.log(`    ... and ${sessions.length - 5} more sessions`);
        }
      }

      console.log('');
    }

    console.log('='.repeat(80));
    console.log('ANALYSIS');
    console.log('='.repeat(80) + '\n');

    const now = new Date();
    for (const course of courses) {
      if (course.sessionRetentionPolicy === 'custom') {
        const totalHours = (course.sessionRetentionDays || 0) * 24 + (course.sessionRetentionHours || 0);
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - totalHours);

        const oldSessions = await prisma.chatSession.count({
          where: {
            courseId: course.id,
            updatedAt: { lt: cutoff }
          }
        });

        console.log(`${course.code}:`);
        console.log(`  Retention: ${totalHours} hours (${course.sessionRetentionDays || 0} days, ${course.sessionRetentionHours || 0} hours)`);
        console.log(`  Sessions older than cutoff: ${oldSessions}`);
        console.log(`  Should be deleted: ${oldSessions > 0 ? 'YES' : 'NO'}`);
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
