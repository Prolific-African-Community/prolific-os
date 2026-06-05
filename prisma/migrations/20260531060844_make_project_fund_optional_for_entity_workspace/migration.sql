-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_fundId_fkey";

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "fundId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE SET NULL ON UPDATE CASCADE;
