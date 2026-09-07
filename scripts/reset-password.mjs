// Usage: DATABASE_URL="<prod url>" node scripts/reset-password.mjs <email-or-username> <new-password>
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const [identifier, newPassword] = process.argv.slice(2);
if (!identifier || !newPassword || newPassword.length < 8) {
  console.error('Usage: node scripts/reset-password.mjs <email-or-username> <new-password (min 8 chars)>');
  process.exit(1);
}

const prisma = new PrismaClient();
const where = identifier.includes('@') ? { email: identifier } : { username: identifier };
const user = await prisma.user.findUnique({ where });
if (!user) {
  console.error(`No user found for ${identifier}`);
  process.exit(1);
}
await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, 10) } });
console.log(`✓ Password updated for ${user.email || user.username} (id ${user.id})`);
await prisma.$disconnect();
