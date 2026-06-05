import type { NextApiResponse } from "next";
import {
  canManageEntityAccountingSetup,
  getOptionalString,
  jsonError,
  jsonSuccess,
  parseOptionalBoolean,
  parseOptionalInteger,
} from "../../../../lib/accounting-api";
import { getCurrentUserRecord } from "../../../../lib/entity-access";
import { AuthenticatedNextApiRequest, withAuth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { createAuditLog } from "../../../../lib/audit-log";

interface UpdateRuleBody {
  debitAccountId?: unknown;
  creditAccountId?: unknown;
  descriptionTemplate?: unknown;
  priority?: unknown;
  isActive?: unknown;
}

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  if (req.method !== "PATCH") {
    jsonError(res, 405, "Method not allowed");
    return;
  }

  try {
    const currentUser = await getCurrentUserRecord(req.user.id);

    if (!currentUser) {
      jsonError(res, 404, "User not found");
      return;
    }

    const ruleId = typeof req.query.id === "string" ? req.query.id : null;

    if (!ruleId) {
      jsonError(res, 400, "Rule id is required");
      return;
    }

    const rule = await prisma.accountingRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      jsonError(res, 404, "Rule not found");
      return;
    }

    if (!rule.entityId) {
      jsonError(res, 400, "Global rules cannot be updated in this version");
      return;
    }

    const access = await canManageEntityAccountingSetup(currentUser, rule.entityId);

    if (!access.allowed) {
      jsonError(res, 403, "Forbidden");
      return;
    }

    const body = req.body as UpdateRuleBody;
    const debitAccountId = getOptionalString(body.debitAccountId) || rule.debitAccountId;
    const creditAccountId = getOptionalString(body.creditAccountId) || rule.creditAccountId;
    const descriptionTemplate =
      body.descriptionTemplate === undefined
        ? undefined
        : getOptionalString(body.descriptionTemplate) || null;
    const priority = body.priority === undefined ? undefined : parseOptionalInteger(body.priority);
    const isActive = parseOptionalBoolean(body.isActive);

    if (debitAccountId === creditAccountId) {
      jsonError(res, 400, "debitAccountId and creditAccountId must be different");
      return;
    }

    if (body.priority !== undefined && priority === null) {
      jsonError(res, 400, "priority must be a valid integer");
      return;
    }

    const [debitAccount, creditAccount] = await Promise.all([
      prisma.chartOfAccount.findUnique({ where: { id: debitAccountId } }),
      prisma.chartOfAccount.findUnique({ where: { id: creditAccountId } }),
    ]);

    if (!debitAccount || !creditAccount) {
      jsonError(res, 400, "Debit and credit accounts must exist");
      return;
    }

    if (
      debitAccount.entityId !== rule.entityId ||
      creditAccount.entityId !== rule.entityId
    ) {
      jsonError(res, 400, "Accounts must belong to the same entity as the rule");
      return;
    }

    const updatedRule = await prisma.$transaction(async (tx) => {
      const updated = await tx.accountingRule.update({
        where: { id: rule.id },
        data: {
          debitAccountId,
          creditAccountId,
          ...(descriptionTemplate === undefined ? {} : { descriptionTemplate }),
          ...(priority === null || priority === undefined ? {} : { priority }),
          ...(isActive === null ? {} : { isActive }),
        },
        include: {
          debitAccount: true,
          creditAccount: true,
        },
      });
      const metadata = { before: rule, after: updated };
      await createAuditLog(tx, {
        userId: req.user.id,
        organizationId: access.entity?.organizationId,
        entityId: rule.entityId,
        action: "ACCOUNTING_RULE_UPDATED",
        resourceType: "AccountingRule",
        resourceId: rule.id,
        metadata,
      });
      if (isActive !== null && isActive !== rule.isActive) {
        await createAuditLog(tx, {
          userId: req.user.id,
          organizationId: access.entity?.organizationId,
          entityId: rule.entityId,
          action: isActive
            ? "ACCOUNTING_RULE_ACTIVATED"
            : "ACCOUNTING_RULE_DEACTIVATED",
          resourceType: "AccountingRule",
          resourceId: rule.id,
          metadata,
        });
      }
      return updated;
    });

    jsonSuccess(res, updatedRule);
  } catch (error) {
    console.error("UPDATE ACCOUNTING RULE ERROR:", error);
    jsonError(res, 500, "Internal server error");
  }
});
