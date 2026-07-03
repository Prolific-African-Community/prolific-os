-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "sourceBrief" JSONB,
ADD COLUMN     "sourceBriefModel" TEXT,
ADD COLUMN     "sourceBriefStatus" TEXT,
ADD COLUMN     "sourceBriefText" TEXT,
ADD COLUMN     "sourceBriefUpdatedAt" TIMESTAMP(3);
