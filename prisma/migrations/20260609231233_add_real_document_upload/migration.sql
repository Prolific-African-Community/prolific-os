-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'SUPPLIER_INVOICE';
ALTER TYPE "DocumentType" ADD VALUE 'CUSTOMER_INVOICE';
ALTER TYPE "DocumentType" ADD VALUE 'TAX_DOCUMENT';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "storageKey" TEXT,
ADD COLUMN     "storageProvider" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "uploadedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "Document_entityId_type_idx" ON "Document"("entityId", "type");

-- CreateIndex
CREATE INDEX "Document_entityId_status_idx" ON "Document"("entityId", "status");

-- CreateIndex
CREATE INDEX "Document_uploadedByUserId_idx" ON "Document"("uploadedByUserId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
