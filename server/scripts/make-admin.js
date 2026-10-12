require('dotenv').config();
const prisma = require('../src/db');

(async () => {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    console.log('Usage: node scripts/make-admin.js you@example.com');
    process.exit(1);
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('No user with that email. Sign up and verify the email first.');
    process.exit(1);
  }
  await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
  console.log(`${email} is now an admin.`);
  await prisma.$disconnect();
})();