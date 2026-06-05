import { AccountingPeriodStatus, OrganizationRole } from "@prisma/client";
import type { NextApiResponse } from "next";
import { getOptionalString, jsonError, jsonSuccess } from "../../../../lib/accounting-api";
import { AuthenticatedNextApiRequest, withAuth } from "../../../../lib/auth";
import { getCurrentUserRecord, isSuperAdminUser } from "../../../../lib/entity-access";
import { canManageEntity } from "../../../../lib/permissions";
import { prisma } from "../../../../lib/prisma";
import { createAuditLog } from "../../../../lib/audit-log";

const parseStatus = (value: unknown) =>
  typeof value === "string" &&
  Object.values(AccountingPeriodStatus).includes(value as AccountingPeriodStatus)
    ? (value as AccountingPeriodStatus)
    : null;

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  if (req.method !== "PATCH") return jsonError(res, 405, "Method not allowed");
  try {
    const id = typeof req.query.id === "string" ? req.query.id : null;
    if (!id) return jsonError(res, 400, "Accounting period id is required");
    const currentUser = await getCurrentUserRecord(req.user.id);
    if (!currentUser) return jsonError(res, 403, "Forbidden");
    const period = await prisma.accountingPeriod.findUnique({
      where: { id },
      include: {
        entity: {
          select: { organizationId: true },
        },
      },
    });
    if (!period) return jsonError(res, 404, "Accounting period not found");
    if (!(await canManageEntity(currentUser, period.entityId))) {
      return jsonError(res, 403, "Forbidden");
    }
    const body = req.body || {};
    const name = body.name === undefined ? undefined : getOptionalString(body.name);
    const status = body.status === undefined ? undefined : parseStatus(body.status);
    if (body.name !== undefined && !name) return jsonError(res, 400, "name is required");
    if (body.status !== undefined && !status) {
      return jsonError(res, 400, "A valid accounting period status is required");
    }
    const canControlClosing =
      isSuperAdminUser(currentUser) ||
      currentUser.organizationUsers.some(
        (membership) =>
          membership.isActive &&
          membership.organizationId === period.entity.organizationId &&
          membership.role === OrganizationRole.ORG_ADMIN
      );
    if (
      status === AccountingPeriodStatus.LOCKED &&
      status !== period.status &&
      !canControlClosing
    ) {
      return jsonError(res, 403, "Only an organization admin can lock a period");
    }
    if (
      period.status === AccountingPeriodStatus.CLOSED &&
      status === AccountingPeriodStatus.OPEN &&
      !canControlClosing
    ) {
      return jsonError(res, 403, "Only an organization admin can reopen a closed period");
    }
    if (
      period.status === AccountingPeriodStatus.LOCKED &&
      status &&
      status !== AccountingPeriodStatus.LOCKED &&
      !isSuperAdminUser(currentUser)
    ) {
      return jsonError(res, 403, "Only SUPER_ADMIN can reopen a locked period");
    }
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.accountingPeriod.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          ...(status
            ? {
                status,
                closedAt: status === AccountingPeriodStatus.OPEN ? null : new Date(),
              }
            : {}),
        },
      });
      if (status && status !== period.status) {
        const action =
          status === AccountingPeriodStatus.OPEN
            ? "ACCOUNTING_PERIOD_OPENED"
            : status === AccountingPeriodStatus.CLOSED
            ? "ACCOUNTING_PERIOD_CLOSED"
            : "ACCOUNTING_PERIOD_LOCKED";
        await createAuditLog(tx, {
          userId: req.user.id,
          organizationId: period.entity.organizationId,
          entityId: period.entityId,
          action,
          resourceType: "AccountingPeriod",
          resourceId: period.id,
          metadata: {
            before: { name: period.name, status: period.status },
            after: { name: result.name, status: result.status },
          },
        });
      }
      return result;
    });
    return jsonSuccess(res, updated);
  } catch (error) {
    console.error("UPDATE ACCOUNTING PERIOD ERROR:", error);
    return jsonError(res, 500, "Internal server error");
  }
});
