-- CreateTable
CREATE TABLE "DocumentVisualPlacement" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "sectionId" TEXT,
    "target" TEXT NOT NULL DEFAULT 'section',
    "role" TEXT NOT NULL DEFAULT 'illustration',
    "position" TEXT NOT NULL DEFAULT 'after_heading',
    "size" TEXT NOT NULL DEFAULT 'medium',
    "caption" TEXT,
    "altText" TEXT,
    "confidence" TEXT,
    "reason" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isSuggested" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentVisualPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentVisualPlacement_documentId_idx" ON "DocumentVisualPlacement"("documentId");

-- CreateIndex
CREATE INDEX "DocumentVisualPlacement_resourceId_idx" ON "DocumentVisualPlacement"("resourceId");

-- CreateIndex
CREATE INDEX "DocumentVisualPlacement_sectionId_idx" ON "DocumentVisualPlacement"("sectionId");

-- AddForeignKey
ALTER TABLE "DocumentVisualPlacement" ADD CONSTRAINT "DocumentVisualPlacement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVisualPlacement" ADD CONSTRAINT "DocumentVisualPlacement_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVisualPlacement" ADD CONSTRAINT "DocumentVisualPlacement_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "DocumentSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
