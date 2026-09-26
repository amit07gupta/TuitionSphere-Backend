require("dotenv").config();

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const admin = {
  name: "TuitionSphere Admin",
  email: "admin@tuitionsphere.com",
  password: "Admin@123",
  role: "SUPER_ADMIN",
};

async function main() {
  const passwordHash = await bcrypt.hash(admin.password, 12);

  await prisma.user.upsert({
    where: { email: admin.email },
    update: {
      name: admin.name,
      passwordHash,
      role: admin.role,
      status: "ACTIVE",
    },
    create: {
      name: admin.name,
      email: admin.email,
      passwordHash,
      role: admin.role,
      status: "ACTIVE",
    },
  });

  console.log("Admin account is ready:");
  console.log(`Email: ${admin.email}`);
  console.log(`Temporary password: ${admin.password}`);
  console.log("Change this password before production use.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
