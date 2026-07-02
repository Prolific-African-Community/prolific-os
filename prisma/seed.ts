import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@prolific.local";
const ADMIN_PASSWORD = "Admin123!";

const templates = [
  "Contract",
  "Annex",
  "PRD",
  "SOP",
  "Proposal",
  "Report",
  "Business Plan",
  "Technical Specification",
  "Custom Document",
];

async function main() {
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: UserRole.ADMIN,
      name: "Prolific Admin",
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: UserRole.ADMIN,
      name: "Prolific Admin",
    },
  });

  for (const name of templates) {
    await prisma.template.upsert({
      where: {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      },
      update: {
        name,
        type: name,
        structure: "Define the document structure before generation.",
        generationRules: "Use project knowledge and user instructions as source context.",
      },
      create: {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        name,
        type: name,
        description: `${name} starter template.`,
        structure: "Define the document structure before generation.",
        generationRules: "Use project knowledge and user instructions as source context.",
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
