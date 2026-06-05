-- CreateEnum
CREATE TYPE "AccountingPeriodStatus" AS ENUM ('OPEN', 'CLOSED', 'LOCKED');

-- AlterTable
ALTER TABLE "AccountingPeriod"
ADD COLUMN "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'OPEN';

-- Preserve legacy period state before removing the boolean field.
UPDATE "AccountingPeriod"
SET "status" = 'CLOSED'
WHERE "isClosed" = true;

ALTER TABLE "AccountingPeriod"
DROP COLUMN "isClosed";

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_entityId_startDate_endDate_key"
ON "AccountingPeriod"("entityId", "startDate", "endDate");
