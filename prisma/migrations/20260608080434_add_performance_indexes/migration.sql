-- CreateIndex
CREATE INDEX "AccountingPeriod_entityId_idx" ON "AccountingPeriod"("entityId");

-- CreateIndex
CREATE INDEX "AccountingPeriod_entityId_status_idx" ON "AccountingPeriod"("entityId", "status");

-- CreateIndex
CREATE INDEX "AccountingPeriod_entityId_startDate_endDate_idx" ON "AccountingPeriod"("entityId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "AccountingRule_entityId_idx" ON "AccountingRule"("entityId");

-- CreateIndex
CREATE INDEX "AccountingRule_entityId_isActive_idx" ON "AccountingRule"("entityId", "isActive");

-- CreateIndex
CREATE INDEX "AccountingRule_entityId_transactionType_idx" ON "AccountingRule"("entityId", "transactionType");

-- CreateIndex
CREATE INDEX "AccountingRule_entityId_transactionType_isActive_idx" ON "AccountingRule"("entityId", "transactionType", "isActive");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_createdAt_idx" ON "AuditLog"("entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_idx" ON "AuditLog"("resourceType");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityRecordId_action_idx" ON "AuditLog"("entityType", "entityRecordId", "action");

-- CreateIndex
CREATE INDEX "BusinessTransaction_entityId_idx" ON "BusinessTransaction"("entityId");

-- CreateIndex
CREATE INDEX "BusinessTransaction_entityId_createdAt_idx" ON "BusinessTransaction"("entityId", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessTransaction_entityId_date_idx" ON "BusinessTransaction"("entityId", "date");

-- CreateIndex
CREATE INDEX "BusinessTransaction_entityId_type_idx" ON "BusinessTransaction"("entityId", "type");

-- CreateIndex
CREATE INDEX "BusinessTransaction_entityId_status_idx" ON "BusinessTransaction"("entityId", "status");

-- CreateIndex
CREATE INDEX "ChartOfAccount_entityId_idx" ON "ChartOfAccount"("entityId");

-- CreateIndex
CREATE INDEX "ChartOfAccount_entityId_isActive_idx" ON "ChartOfAccount"("entityId", "isActive");

-- CreateIndex
CREATE INDEX "Counterparty_entityId_idx" ON "Counterparty"("entityId");

-- CreateIndex
CREATE INDEX "Counterparty_entityId_name_idx" ON "Counterparty"("entityId", "name");

-- CreateIndex
CREATE INDEX "Document_entityId_idx" ON "Document"("entityId");

-- CreateIndex
CREATE INDEX "Document_entityId_createdAt_idx" ON "Document"("entityId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_counterpartyId_idx" ON "Document"("counterpartyId");

-- CreateIndex
CREATE INDEX "Document_transactionId_idx" ON "Document"("transactionId");

-- CreateIndex
CREATE INDEX "Entity_organizationId_idx" ON "Entity"("organizationId");

-- CreateIndex
CREATE INDEX "Entity_organizationId_isActive_idx" ON "Entity"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "Entity_createdAt_idx" ON "Entity"("createdAt");

-- CreateIndex
CREATE INDEX "EntityUser_userId_idx" ON "EntityUser"("userId");

-- CreateIndex
CREATE INDEX "EntityUser_entityId_idx" ON "EntityUser"("entityId");

-- CreateIndex
CREATE INDEX "EntityUser_userId_isActive_idx" ON "EntityUser"("userId", "isActive");

-- CreateIndex
CREATE INDEX "EntityUser_entityId_isActive_idx" ON "EntityUser"("entityId", "isActive");

-- CreateIndex
CREATE INDEX "Fund_gpId_idx" ON "Fund"("gpId");

-- CreateIndex
CREATE INDEX "Fund_entityId_idx" ON "Fund"("entityId");

-- CreateIndex
CREATE INDEX "Fund_organizationId_idx" ON "Fund"("organizationId");

-- CreateIndex
CREATE INDEX "Fund_gpId_entityId_idx" ON "Fund"("gpId", "entityId");

-- CreateIndex
CREATE INDEX "JournalEntry_entityId_idx" ON "JournalEntry"("entityId");

-- CreateIndex
CREATE INDEX "JournalEntry_entityId_status_idx" ON "JournalEntry"("entityId", "status");

-- CreateIndex
CREATE INDEX "JournalEntry_entityId_date_idx" ON "JournalEntry"("entityId", "date");

-- CreateIndex
CREATE INDEX "JournalEntry_entityId_createdAt_idx" ON "JournalEntry"("entityId", "createdAt");

-- CreateIndex
CREATE INDEX "JournalEntry_transactionId_idx" ON "JournalEntry"("transactionId");

-- CreateIndex
CREATE INDEX "JournalLine_journalEntryId_idx" ON "JournalLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalLine_accountId_idx" ON "JournalLine"("accountId");

-- CreateIndex
CREATE INDEX "JournalLine_projectId_idx" ON "JournalLine"("projectId");

-- CreateIndex
CREATE INDEX "JournalLine_counterpartyId_idx" ON "JournalLine"("counterpartyId");

-- CreateIndex
CREATE INDEX "OrganizationUser_userId_idx" ON "OrganizationUser"("userId");

-- CreateIndex
CREATE INDEX "OrganizationUser_organizationId_idx" ON "OrganizationUser"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationUser_userId_isActive_idx" ON "OrganizationUser"("userId", "isActive");

-- CreateIndex
CREATE INDEX "OrganizationUser_organizationId_isActive_idx" ON "OrganizationUser"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "Project_entityId_idx" ON "Project"("entityId");

-- CreateIndex
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- CreateIndex
CREATE INDEX "Project_entityId_createdAt_idx" ON "Project"("entityId", "createdAt");
