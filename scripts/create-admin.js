const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@test.com";
  const plainPassword = "Admin123!";

  const hashedPassword = await bcrypt.hash(plainPassword, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("ADMIN CREATED");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
