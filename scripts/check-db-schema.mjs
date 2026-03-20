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
  console.log('Checking database schema...\n');

  try {
    // Get all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log('📋 Tables in database:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));

    console.log('\n' + '='.repeat(80) + '\n');

    // Get columns for each table
    for (const table of tables) {
      const columns = await prisma.$queryRaw`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ${table.table_name}
        ORDER BY ordinal_position
      `;

      console.log(`\n📊 Table: ${table.table_name}`);
      console.log('-'.repeat(80));
      columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
        const defaultVal = col.column_default ? ` [default: ${col.column_default}]` : '';
        console.log(`  ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
