-- CreateTable
CREATE TABLE "DocumentSection" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "planSectionId" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 2,
    "purpose" TEXT,
    "targetWords" INTEGER,
    "sourceBriefs" JSONB,
    "keyFacts" JSONB,
    "keyFigures" JSONB,
    "tables" JSONB,
    "risks" JSONB,
    "assumptions" JSONB,
    "openQuestions" JSONB,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "model" TEXT,
    "generatedAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentSection_documentId_idx" ON "DocumentSection"("documentId");

-- CreateIndex
CREATE INDEX "DocumentSection_documentId_orderIndex_idx" ON "DocumentSection"("documentId", "orderIndex");

-- AddForeignKey
ALTER TABLE "DocumentSection" ADD CONSTRAINT "DocumentSection_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
