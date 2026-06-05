import type { NextApiResponse } from "next";
import {
  canManageEntityAccountingSetup,
  getOptionalString,
  getQueryString,
  jsonError,
  jsonSuccess,
  parseOptionalBoolean,
  parseOptionalInteger,
  parseTransactionType,
} from "../../../lib/accounting-api";
import { getCurrentUserRecord } from "../../../lib/entity-access";
import { AuthenticatedNextApiRequest, withAuth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { createAuditLog } from "../../../lib/audit-log";

interface CreateRuleBody {
  entityId?: unknown;
  transactionType?: unknown;
  debitAccountId?: unknown;
  creditAccountId?: unknown;
  descriptionTemplate?: unknown;
  priority?: unknown;
  isActive?: unknown;
}

const listRules = async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  const entityId = getQueryString(req.query.entityId);

  if (!entityId) {
    jsonError(res, 400, "entityId is required");
    return;
  }

  const includeInactive = getQueryString(req.query.includeInactive) === "true";

  try {
    const currentUser = await getCurrentUserRecord(req.user.id);
    if (!currentUser) {
      jsonError(res, 403, "Forbidden");
      return;
    }
    const access = await canManageEntityAccountingSetup(currentUser, entityId);
    if (!access.allowed) {
      jsonError(res, 403, "Forbidden");
      return;
    }

    const rules = await prisma.accountingRule.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        OR: [{ entityId }, { entityId: null }],
      },
      orderBy: [{ priority: "asc" }, { transactionType: "asc" }],
      include: {
        debitAccount: true,
        creditAccount: true,
      },
    });

    jsonSuccess(res, rules);
  } catch (error) {
    console.error("ACCOUNTING RULES ERROR:", error);
    jsonError(res, 500, "Internal server error");
  }
};

const createRule = async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  const currentUser = await getCurrentUserRecord(req.user.id);

  if (!currentUser) {
    jsonError(res, 404, "User not found");
    return;
  }

  const body = req.body as CreateRuleBody;
  const entityId = getOptionalString(body.entityId);
  const transactionType = parseTransactionType(body.transactionType);
  const debitAccountId = getOptionalString(body.debitAccountId);
  const creditAccountId = getOptionalString(body.creditAccountId);
  const descriptionTemplate = getOptionalString(body.descriptionTemplate);
  const priority = parseOptionalInteger(body.priority) ?? 100;
  const isActive = parseOptionalBoolean(body.isActive) ?? true;

  if (!entityId) {
    jsonError(res, 400, "entityId is required");
    return;
  }

  if (!transactionType) {
    jsonError(res, 400, "A valid transaction type is required");
    return;
  }

  if (!debitAccountId || !creditAccountId) {
    jsonError(res, 400, "debitAccountId and creditAccountId are required");
    return;
  }

  if (debitAccountId === creditAccountId) {
    jsonError(res, 400, "debitAccountId and creditAccountId must be different");
    return;
  }

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

  const [debitAccount, creditAccount] = await Promise.all([
    prisma.chartOfAccount.findUnique({ where: { id: debitAccountId } }),
    prisma.chartOfAccount.findUnique({ where: { id: creditAccountId } }),
  ]);

  if (!debitAccount || !creditAccount) {
    jsonError(res, 400, "Debit and credit accounts must exist");
    return;
  }

  if (debitAccount.entityId !== entityId || creditAccount.entityId !== entityId) {
    jsonError(res, 400, "Accounts must belong to the selected entity");
    return;
  }

  const duplicateRule = await prisma.accountingRule.findFirst({
    where: {
      entityId,
      transactionType,
      debitAccountId,
      creditAccountId,
      isActive: true,
    },
  });

  if (duplicateRule) {
    jsonError(res, 400, "An active matching rule already exists");
    return;
  }

  const rule = await prisma.$transaction(async (tx) => {
    const created = await tx.accountingRule.create({
      data: {
        entityId,
        transactionType,
        debitAccountId,
        creditAccountId,
        descriptionTemplate,
        priority,
        isActive,
      },
      include: {
        debitAccount: true,
        creditAccount: true,
      },
    });
    await createAuditLog(tx, {
      userId: req.user.id,
      organizationId,
      entityId,
      action: "ACCOUNTING_RULE_CREATED",
      resourceType: "AccountingRule",
      resourceId: created.id,
      metadata: {
        transactionType: created.transactionType,
        debitAccountId: created.debitAccountId,
        creditAccountId: created.creditAccountId,
        priority: created.priority,
      },
    });
    return created;
  });

  jsonSuccess(res, rule, 201);
};

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method === "GET") {
      await listRules(req, res);
      return;
    }

    if (req.method === "POST") {
      await createRule(req, res);
      return;
    }

    jsonError(res, 405, "Method not allowed");
  } catch (error) {
    console.error("ACCOUNTING RULES ERROR:", error);
    jsonError(res, 500, "Internal server error");
  }
});
