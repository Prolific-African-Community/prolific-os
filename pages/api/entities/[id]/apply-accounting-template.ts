import { Prisma } from "@prisma/client";
import type { NextApiResponse } from "next";
import {
  canManageEntityAccountingSetup,
  getOptionalString,
  jsonError,
  jsonSuccess,
} from "../../../../lib/accounting-api";
import { getCurrentUserRecord } from "../../../../lib/entity-access";
import { AuthenticatedNextApiRequest, withAuth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { createAuditLog } from "../../../../lib/audit-log";

interface ApplyTemplateBody {
  templateId?: unknown;
  mode?: unknown;
}

interface SkippedRule {
  transactionType: string;
  reason: string;
}

const ACCOUNTS_BATCH_SIZE = 100;
const RULES_BATCH_SIZE = 50;

const getSafeErrorMessage = (error: unknown) => {
  if (process.env.NODE_ENV !== "development" || !(error instanceof Error)) {
    return undefined;
  }

  return error.message;
};

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      jsonError(res, 405, "Method not allowed");
      return;
    }

    const entityId = typeof req.query.id === "string" ? req.query.id : null;
    const body = req.body as ApplyTemplateBody;
    const templateId = getOptionalString(body.templateId);
    let currentStep = "validate request";
    let templateAccountsCount: number | null = null;
    let templateRulesCount: number | null = null;

    try {
      if (!entityId) {
        jsonError(res, 400, "Entity id is required");
        return;
      }

      const mode = getOptionalString(body.mode);

      if (!templateId) {
        jsonError(res, 400, "templateId is required");
        return;
      }

      if (mode !== "SKIP_EXISTING") {
        jsonError(res, 400, "Only SKIP_EXISTING mode is supported");
        return;
      }

      currentStep = "load current user";
      const currentUser = await getCurrentUserRecord(req.user.id);

      if (!currentUser) {
        jsonError(res, 404, "User not found");
        return;
      }

      currentStep = "authorize entity setup";
      const access = await canManageEntityAccountingSetup(currentUser, entityId);

      if (!access.entity) {
        jsonError(res, 404, "Entity not found");
        return;
      }

      if (!access.allowed) {
        jsonError(res, 403, "Forbidden");
        return;
      }
      const organizationId = access.entity.organizationId;

      currentStep = "load template";
      const template = await prisma.accountingTemplate.findFirst({
        where: {
          id: templateId,
          isActive: true,
        },
        include: {
          accounts: {
            where: { isActive: true },
            orderBy: { code: "asc" },
          },
          rules: {
            where: { isActive: true },
            orderBy: [{ priority: "asc" }, { transactionType: "asc" }],
          },
        },
      });

      if (!template) {
        jsonError(res, 404, "Active accounting template not found");
        return;
      }

      templateAccountsCount = template.accounts.length;
      templateRulesCount = template.rules.length;

      if (!templateAccountsCount) {
        jsonError(res, 400, "Accounting template must contain active accounts");
        return;
      }

      currentStep = "load existing entity accounts";
      const existingAccounts = await prisma.chartOfAccount.findMany({
        where: { entityId },
        select: { code: true },
      });
      const existingCodes = new Set(existingAccounts.map((account) => account.code));
      const accountsToCreate = template.accounts.filter(
        (account) => !existingCodes.has(account.code)
      );
      let accountsCreated = 0;

      currentStep = "create account batches";
      for (let index = 0; index < accountsToCreate.length; index += ACCOUNTS_BATCH_SIZE) {
        const batch = accountsToCreate.slice(index, index + ACCOUNTS_BATCH_SIZE);

        const createdBatch = await prisma.chartOfAccount.createMany({
          data: batch.map((account) => ({
            entityId,
            jurisdiction: template.jurisdiction,
            standard: template.standard,
            code: account.code,
            label: account.label,
            accountClass: account.accountClass,
            type: account.type,
            isSystem: template.isSystem,
            isActive: true,
          })),
          skipDuplicates: true,
        });

        accountsCreated += createdBatch.count;
      }

      currentStep = "reload entity accounts";
      const reloadedAccounts = await prisma.chartOfAccount.findMany({
        where: { entityId },
        select: {
          id: true,
          code: true,
        },
      });
      const accountByCode = new Map(
        reloadedAccounts.map((account) => [account.code, account])
      );

      currentStep = "load existing entity rules";
      const existingRules = await prisma.accountingRule.findMany({
        where: { entityId },
        select: {
          transactionType: true,
          debitAccountId: true,
          creditAccountId: true,
        },
      });
      const getRuleKey = (
        transactionType: string,
        debitAccountId: string,
        creditAccountId: string
      ) => `${transactionType}:${debitAccountId}:${creditAccountId}`;
      const existingRuleKeys = new Set(
        existingRules.map((rule) =>
          getRuleKey(rule.transactionType, rule.debitAccountId, rule.creditAccountId)
        )
      );
      const skippedRules: SkippedRule[] = [];
      const rulesToCreate: Prisma.AccountingRuleCreateManyInput[] = [];

      for (const rule of template.rules) {
        const debitAccount = accountByCode.get(rule.debitAccountCode);
        const creditAccount = accountByCode.get(rule.creditAccountCode);

        if (!debitAccount || !creditAccount) {
          skippedRules.push({
            transactionType: rule.transactionType,
            reason: `Missing ${!debitAccount ? "debit" : "credit"} account code ${
              !debitAccount ? rule.debitAccountCode : rule.creditAccountCode
            } in entity chart of accounts`,
          });
          continue;
        }

        const ruleKey = getRuleKey(
          rule.transactionType,
          debitAccount.id,
          creditAccount.id
        );

        if (existingRuleKeys.has(ruleKey)) {
          continue;
        }

        existingRuleKeys.add(ruleKey);
        rulesToCreate.push({
          entityId,
          transactionType: rule.transactionType,
          debitAccountId: debitAccount.id,
          creditAccountId: creditAccount.id,
          descriptionTemplate: rule.descriptionTemplate,
          priority: rule.priority,
          isActive: true,
        });
      }

      currentStep = "create rule batches";
      let rulesCreated = 0;

      for (let index = 0; index < rulesToCreate.length; index += RULES_BATCH_SIZE) {
        const batch = rulesToCreate.slice(index, index + RULES_BATCH_SIZE);

        const createdBatch = await prisma.accountingRule.createMany({
          data: batch,
        });

        rulesCreated += createdBatch.count;
      }

      currentStep = "update entity initialization";
      const accountsSkipped = template.accounts.length - accountsCreated;
      const rulesSkipped = template.rules.length - rulesCreated;
      await prisma.$transaction(async (tx) => {
        await tx.entity.update({
          where: { id: entityId },
          data: {
            accountingTemplateId: template.id,
            accountingInitializedAt: new Date(),
          },
        });
        await createAuditLog(tx, {
          userId: req.user.id,
          organizationId,
          entityId,
          action: "ACCOUNTING_TEMPLATE_APPLIED",
          resourceType: "AccountingTemplate",
          resourceId: template.id,
          metadata: {
            templateName: template.name,
            accountsCreated,
            accountsSkipped,
            rulesCreated,
            rulesSkipped,
            skippedRules,
          },
        });
      });

      jsonSuccess(res, {
        entityId,
        templateId: template.id,
        templateName: template.name,
        accountsCreated,
        accountsSkipped,
        rulesCreated,
        rulesSkipped,
        ...(skippedRules.length ? { skippedRules } : {}),
      });
    } catch (error) {
      console.error("APPLY ACCOUNTING TEMPLATE ERROR:", {
        entityId,
        templateId,
        templateAccountsCount,
        templateRulesCount,
        currentStep,
        error,
      });

      res.status(500).json({
        success: false,
        message: "Failed to apply accounting template",
        ...(getSafeErrorMessage(error)
          ? { details: getSafeErrorMessage(error) }
          : {}),
      });
    }
  }
);
