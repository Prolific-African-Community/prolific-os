-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "accountingInitializedAt" TIMESTAMP(3),
ADD COLUMN     "accountingTemplateId" TEXT;

-- CreateTable
CREATE TABLE "AccountingTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "jurisdiction" TEXT NOT NULL DEFAULT 'LU',
    "standard" "AccountingStandard" NOT NULL DEFAULT 'LUX_GAAP',
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingTemplateAccount" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "accountClass" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingTemplateAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingTemplateRule" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "debitAccountCode" TEXT NOT NULL,
    "creditAccountCode" TEXT NOT NULL,
    "descriptionTemplate" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingTemplateRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountingTemplateAccount_templateId_code_key" ON "AccountingTemplateAccount"("templateId", "code");

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_accountingTemplateId_fkey" FOREIGN KEY ("accountingTemplateId") REFERENCES "AccountingTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingTemplateAccount" ADD CONSTRAINT "AccountingTemplateAccount_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AccountingTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingTemplateRule" ADD CONSTRAINT "AccountingTemplateRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AccountingTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
