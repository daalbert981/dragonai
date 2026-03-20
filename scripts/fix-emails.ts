import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Fixing empty email values...')

  // Update empty strings to NULL
  const result = await prisma.$executeRaw`
    UPDATE "user"
    SET email = NULL
    WHERE email = '' OR email IS NULL
  `

  console.log(`Updated ${result} rows`)

  // List users
  const users = await prisma.$queryRaw<any[]>`SELECT id, username, email FROM "user"`
  console.log('Current users:', users)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
