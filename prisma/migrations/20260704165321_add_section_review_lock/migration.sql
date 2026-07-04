-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "assembledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DocumentSection" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "reviewStatus" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "reviewedAt" TIMESTAMP(3);
