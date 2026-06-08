import { AccountingStandard } from "@prisma/client";
import type { NextApiResponse } from "next";
import {
  AccountingAccountGovernanceError,
  deriveAccountClass,
  previewCustomAccountClassification,
} from "../../../lib/accounting-account-governance";
import {
  canManageEntityAccountingSetup,
  getOptionalString,
  getQueryString,
  jsonError,
  jsonSuccess,
  parseAccountType,
  parseAccountingStandard,
  parseOptionalBoolean,
} from "../../../lib/accounting-api";
import { getCurrentUserRecord, isSuperAdminUser } from "../../../lib/entity-access";
import { AuthenticatedNextApiRequest, withAuth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { createAuditLog } from "../../../lib/audit-log";
import { measureApi } from "../../../lib/performance-log";

interface CreateAccountBody {
  entityId?: unknown;
  code?: unknown;
  label?: unknown;
  accountClass?: unknown;
  type?: unknown;
  jurisdiction?: unknown;
  standard?: unknown;
  isSystem?: unknown;
  isActive?: unknown;
}

const parsePaginationInteger = (
  value: string | string[] | undefined,
  fallback: number
) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

const listAccounts = async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  const entityId = getQueryString(req.query.entityId);

  if (!entityId) {
    jsonError(res, 400, "entityId is required");
    return;
  }

  const includeInactive = getQueryString(req.query.includeInactive) === "true";
  const onlyActive = getQueryString(req.query.onlyActive) === "true";
  const search = getQueryString(req.query.search)?.trim();
  const limit = Math.min(parsePaginationInteger(req.query.limit, 1000), 1000);
  const offset = parsePaginationInteger(req.query.offset, 0);

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

    const accounts = await measureApi("GET /api/accounting/chart-of-accounts", () =>
      prisma.chartOfAccount.findMany({
      where: {
        entityId,
        ...(includeInactive && !onlyActive ? {} : { isActive: true }),
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: "insensitive" } },
                { label: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        code: true,
        label: true,
        accountClass: true,
        type: true,
        isSystem: true,
        isActive: true,
      },
      orderBy: { code: "asc" },
      take: limit,
      skip: offset,
    })
    );

    jsonSuccess(res, accounts);
  } catch (error) {
    console.error("ACCOUNTING CHART OF ACCOUNTS ERROR:", error);
    jsonError(res, 500, "Internal server error");
  }
};

const createAccount = async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  const currentUser = await getCurrentUserRecord(req.user.id);

  if (!currentUser) {
    jsonError(res, 404, "User not found");
    return;
  }

  const body = req.body as CreateAccountBody;
  const entityId = getOptionalString(body.entityId);
  const code = getOptionalString(body.code);
  const label = getOptionalString(body.label);
  const requestedClass = getOptionalString(body.accountClass);
  const providedType =
    body.type === undefined || body.type === "" ? undefined : parseAccountType(body.type);
  const jurisdiction = getOptionalString(body.jurisdiction) || "LU";
  const standard =
    parseAccountingStandard(body.standard) || AccountingStandard.LUX_GAAP;
  const isActive = parseOptionalBoolean(body.isActive) ?? true;

  if (!entityId) {
    jsonError(res, 400, "entityId is required");
    return;
  }

  if (!code) {
    jsonError(res, 400, "code is required");
    return;
  }

  if (!label) {
    jsonError(res, 400, "label is required");
    return;
  }

  if (body.type !== undefined && body.type !== "" && !providedType) {
    jsonError(res, 400, "A valid account type is required");
    return;
  }

  const normalizedCode = code.trim();
  const accountClass = deriveAccountClass(normalizedCode);

  if (requestedClass && requestedClass.trim() !== accountClass) {
    jsonError(res, 400, "accountClass must match the first digit of the account code");
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

  const governance = await previewCustomAccountClassification(prisma, {
    entityId,
    code: normalizedCode,
    label,
    providedType,
  });
  const type = providedType || governance.suggestedType;

  if (!type) {
    jsonError(
      res,
      400,
      "Account type could not be inferred safely. Please select a type explicitly."
    );
    return;
  }

  if (
    governance.parentAccount &&
    type !== governance.parentAccount.type &&
    !isSuperAdminUser(currentUser)
  ) {
    jsonError(
      res,
      400,
      `Account type must match parent account type ${governance.parentAccount.type}`
    );
    return;
  }

  const existingAccount = await prisma.chartOfAccount.findUnique({
    where: {
      entityId_code: {
        entityId,
        code: normalizedCode,
      },
    },
  });

  if (existingAccount) {
    jsonError(res, 400, "An account with this code already exists for the entity");
    return;
  }

  const account = await prisma.$transaction(async (tx) => {
    const created = await tx.chartOfAccount.create({
      data: {
        entityId,
        code: normalizedCode,
        label: label.trim(),
        accountClass,
        type,
        jurisdiction,
        standard,
        isSystem:
          isSuperAdminUser(currentUser) && parseOptionalBoolean(body.isSystem) === true,
        isActive,
      },
    });
    const metadata = {
      code: created.code,
      label: created.label,
      type: created.type,
      isSystem: created.isSystem,
      governance,
    };
    await createAuditLog(tx, {
      userId: req.user.id,
      organizationId,
      entityId,
      action: "ACCOUNT_CREATED",
      resourceType: "ChartOfAccount",
      resourceId: created.id,
      metadata,
    });
    if (!created.isSystem) {
      await createAuditLog(tx, {
        userId: req.user.id,
        organizationId,
        entityId,
        action: "CUSTOM_ACCOUNT_CREATED",
        resourceType: "ChartOfAccount",
        resourceId: created.id,
        metadata,
      });
    }
    return created;
  });

  jsonSuccess(res, account, 201);
};

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method === "GET") {
      await listAccounts(req, res);
      return;
    }

    if (req.method === "POST") {
      await createAccount(req, res);
      return;
    }

    jsonError(res, 405, "Method not allowed");
  } catch (error) {
    if (error instanceof AccountingAccountGovernanceError) {
      jsonError(res, 400, error.message);
      return;
    }

    console.error("ACCOUNTING CHART OF ACCOUNTS ERROR:", error);
    jsonError(res, 500, "Internal server error");
  }
});
