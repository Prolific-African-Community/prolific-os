import type { NextApiResponse } from "next";
import {
  canManageEntityAccountingSetup,
  getOptionalString,
  jsonError,
  jsonSuccess,
  parseAccountType,
  parseOptionalBoolean,
} from "../../../../lib/accounting-api";
import { getCurrentUserRecord } from "../../../../lib/entity-access";
import { AuthenticatedNextApiRequest, withAuth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { createAuditLog } from "../../../../lib/audit-log";

interface UpdateAccountBody {
  label?: unknown;
  accountClass?: unknown;
  type?: unknown;
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

    const accountId = typeof req.query.id === "string" ? req.query.id : null;

    if (!accountId) {
      jsonError(res, 400, "Account id is required");
      return;
    }

    const account = await prisma.chartOfAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      jsonError(res, 404, "Account not found");
      return;
    }

    if (!account.entityId) {
      jsonError(res, 400, "Global accounts cannot be updated in this version");
      return;
    }

    const access = await canManageEntityAccountingSetup(currentUser, account.entityId);

    if (!access.allowed) {
      jsonError(res, 403, "Forbidden");
      return;
    }

    const body = req.body as UpdateAccountBody;
    const label = getOptionalString(body.label);
    const accountClass = getOptionalString(body.accountClass);
    const type = body.type === undefined ? undefined : parseAccountType(body.type);
    const isActive = parseOptionalBoolean(body.isActive);

    if (body.type !== undefined && !type) {
      jsonError(res, 400, "A valid account type is required");
      return;
    }

    const updatedAccount = await prisma.$transaction(async (tx) => {
      const updated = await tx.chartOfAccount.update({
        where: { id: account.id },
        data: {
          ...(label ? { label: label.trim() } : {}),
          ...(accountClass ? { accountClass: accountClass.trim() } : {}),
          ...(type ? { type } : {}),
          ...(isActive === null ? {} : { isActive }),
        },
      });
      const metadata = {
        before: account,
        after: updated,
      };
      await createAuditLog(tx, {
        userId: req.user.id,
        organizationId: access.entity?.organizationId,
        entityId: account.entityId,
        action: "ACCOUNT_UPDATED",
        resourceType: "ChartOfAccount",
        resourceId: account.id,
        metadata,
      });
      if (isActive !== null && isActive !== account.isActive) {
        await createAuditLog(tx, {
          userId: req.user.id,
          organizationId: access.entity?.organizationId,
          entityId: account.entityId,
          action: isActive ? "ACCOUNT_ACTIVATED" : "ACCOUNT_DEACTIVATED",
          resourceType: "ChartOfAccount",
          resourceId: account.id,
          metadata,
        });
      }
      return updated;
    });

    jsonSuccess(res, updatedAccount);
  } catch (error) {
    console.error("UPDATE ACCOUNTING ACCOUNT ERROR:", error);
    jsonError(res, 500, "Internal server error");
  }
});
