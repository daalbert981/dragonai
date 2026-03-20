import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding timestamp columns to user table...');

  try {
    // Add timestamp columns with default values
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('✓ Added timestamp columns');

    // Create trigger function
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    console.log('✓ Created trigger function');

    // Drop trigger if it exists and create new one
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS update_user_updated_at ON "user";
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user"
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✓ Created trigger');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
