-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "documentPlan" JSONB,
ADD COLUMN     "documentPlanModel" TEXT,
ADD COLUMN     "documentPlanStatus" TEXT,
ADD COLUMN     "documentPlanText" TEXT,
ADD COLUMN     "documentPlanUpdatedAt" TIMESTAMP(3);
