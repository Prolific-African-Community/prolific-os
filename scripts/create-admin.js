const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@test.com";
  const plainPassword = "Admin123!";

  const hashedPassword = await bcrypt.hash(plainPassword, 12);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: "ADMIN",
      mustChangePassword: false,
    },
  });

  console.log("ADMIN CREATED");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });