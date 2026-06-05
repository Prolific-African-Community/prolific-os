-- AlterTable
ALTER TABLE "AuditLog"
ADD COLUMN "organizationId" TEXT,
ADD COLUMN "resourceType" TEXT,
ADD COLUMN "resourceId" TEXT,
ADD COLUMN "metadata" JSONB;

-- Preserve historical audit records in the generic resource columns.
UPDATE "AuditLog"
SET
  "resourceType" = "entityType",
  "resourceId" = "entityRecordId",
  "metadata" = COALESCE("after", "before");

ALTER TABLE "AuditLog"
ALTER COLUMN "resourceType" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
