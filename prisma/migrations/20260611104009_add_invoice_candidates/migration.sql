-- CreateTable
CREATE TABLE "InvoiceCandidate" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "counterpartyId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "subtotal" DECIMAL(18,2),
    "vatAmount" DECIMAL(18,2),
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceCandidate_documentId_key" ON "InvoiceCandidate"("documentId");

-- CreateIndex
CREATE INDEX "InvoiceCandidate_entityId_idx" ON "InvoiceCandidate"("entityId");

-- CreateIndex
CREATE INDEX "InvoiceCandidate_entityId_status_idx" ON "InvoiceCandidate"("entityId", "status");

-- CreateIndex
CREATE INDEX "InvoiceCandidate_counterpartyId_idx" ON "InvoiceCandidate"("counterpartyId");

-- CreateIndex
CREATE INDEX "InvoiceCandidate_invoiceDate_idx" ON "InvoiceCandidate"("invoiceDate");

-- AddForeignKey
ALTER TABLE "InvoiceCandidate" ADD CONSTRAINT "InvoiceCandidate_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceCandidate" ADD CONSTRAINT "InvoiceCandidate_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceCandidate" ADD CONSTRAINT "InvoiceCandidate_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
