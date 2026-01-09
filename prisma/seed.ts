import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. Create Default Organization
  const org = await prisma.organization.upsert({
    where: { email: 'admin@enterprise.com' },
    update: {},
    create: {
      name: 'My Enterprise',
      email: 'admin@enterprise.com',
      address: 'Main HQ',
      
      // --- FIX IS HERE ---
      phone: '03001234567', // Schema mein field ka naam 'phone' hai
      // contactNumber: '...' <--- Ye Ghalat tha
      
      currency: 'PKR',
      timezone: 'UTC',
    },
  });

  // 2. Create Super Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10); // Password: admin123

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@enterprise.com' },
    update: {},
    create: {
      email: 'admin@enterprise.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: Role.SUPERADMIN,
      organizationId: org.id,
      // SuperAdmin ko Branch ki zaroorat nahi hoti
    },
  });

  console.log({ org, superAdmin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });