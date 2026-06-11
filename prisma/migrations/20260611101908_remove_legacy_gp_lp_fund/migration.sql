-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'USER');
ALTER TABLE "User"
ALTER COLUMN "role" TYPE "UserRole_new"
USING (
  CASE
    WHEN "role"::text = 'ADMIN' THEN 'ADMIN'::"UserRole_new"
    ELSE 'USER'::"UserRole_new"
  END
);
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "BusinessTransaction" DROP CONSTRAINT "BusinessTransaction_fundId_fkey";

-- DropForeignKey
ALTER TABLE "Fund" DROP CONSTRAINT "Fund_entityId_fkey";

-- DropForeignKey
ALTER TABLE "Fund" DROP CONSTRAINT "Fund_gpId_fkey";

-- DropForeignKey
ALTER TABLE "Fund" DROP CONSTRAINT "Fund_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_fundId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_fundId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_gpId_fkey";

-- DropIndex
DROP INDEX "Project_fundId_idx";

-- AlterTable
ALTER TABLE "BusinessTransaction" DROP COLUMN "fundId";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "fundId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "gpId";

-- DropTable
DROP TABLE "Fund";

-- DropTable
DROP TABLE "Gp";

-- DropTable
DROP TABLE "Transaction";
