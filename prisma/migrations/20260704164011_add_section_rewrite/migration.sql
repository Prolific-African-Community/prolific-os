-- AlterTable
ALTER TABLE "DocumentSection" ADD COLUMN     "lastRewriteInstruction" TEXT,
ADD COLUMN     "rewriteCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rewrittenAt" TIMESTAMP(3);
