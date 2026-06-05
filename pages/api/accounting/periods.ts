import { AccountingPeriodStatus } from "@prisma/client";
import type { NextApiResponse } from "next";
import {
  getOptionalString,
  getQueryString,
  jsonError,
  jsonSuccess,
} from "../../../lib/accounting-api";
import { AuthenticatedNextApiRequest, withAuth } from "../../../lib/auth";
import { getCurrentUserRecord } from "../../../lib/entity-access";
import { canAccessEntity, canManageEntity } from "../../../lib/permissions";
import { prisma } from "../../../lib/prisma";
import { createAuditLog } from "../../../lib/audit-log";

const parseStatus = (value: unknown) =>
  typeof value === "string" &&
  Object.values(AccountingPeriodStatus).includes(value as AccountingPeriodStatus)
    ? (value as AccountingPeriodStatus)
    : null;
const parseRequiredDate = (value: unknown, endOfDay = false) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return Number.isNaN(date.getTime()) ? null : date;
};

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  try {
    const currentUser = await getCurrentUserRecord(req.user.id);
    if (!currentUser) return jsonError(res, 403, "Forbidden");

    if (req.method === "GET") {
      const entityId = getQueryString(req.query.entityId);
      if (!entityId) return jsonError(res, 400, "entityId is required");
      if (!(await canAccessEntity(currentUser, entityId))) {
        return jsonError(res, 403, "Forbidden");
      }
      const periods = await prisma.accountingPeriod.findMany({
        where: { entityId },
        orderBy: { startDate: "desc" },
      });
      return jsonSuccess(res, periods);
    }

    if (req.method !== "POST") return jsonError(res, 405, "Method not allowed");
    const body = req.body || {};
    const entityId = getOptionalString(body.entityId);
    const name = getOptionalString(body.name);
    const startDate = parseRequiredDate(body.startDate);
    const endDate = parseRequiredDate(body.endDate, true);
    const status =
      body.status === undefined ? AccountingPeriodStatus.OPEN : parseStatus(body.status);
    if (!entityId) return jsonError(res, 400, "entityId is required");
    if (!(await canManageEntity(currentUser, entityId))) {
      return jsonError(res, 403, "Forbidden");
    }
    if (!name) return jsonError(res, 400, "name is required");
    if (!startDate) return jsonError(res, 400, "startDate is required");
    if (!endDate) return jsonError(res, 400, "endDate is required");
    if (startDate >= endDate) {
      return jsonError(res, 400, "startDate must be before endDate");
    }
    if (!status) return jsonError(res, 400, "A valid accounting period status is required");
    const overlap = await prisma.accountingPeriod.findFirst({
      where: {
        entityId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { id: true },
    });
    if (overlap) return jsonError(res, 400, "Accounting period dates overlap an existing period");
    const entity = await prisma.entity.findUnique({ where: { id: entityId } });
    if (!entity) return jsonError(res, 404, "Entity not found");
    const period = await prisma.$transaction(async (tx) => {
      const created = await tx.accountingPeriod.create({
        data: {
          entityId,
          name,
          startDate,
          endDate,
          status,
          closedAt: status === AccountingPeriodStatus.OPEN ? null : new Date(),
        },
      });
      await createAuditLog(tx, {
        userId: req.user.id,
        organizationId: entity.organizationId,
        entityId,
        action: "ACCOUNTING_PERIOD_CREATED",
        resourceType: "AccountingPeriod",
        resourceId: created.id,
        metadata: {
          name: created.name,
          startDate: created.startDate,
          endDate: created.endDate,
          status: created.status,
        },
      });
      return created;
    });
    return jsonSuccess(res, period, 201);
  } catch (error) {
    console.error("ACCOUNTING PERIODS ERROR:", error);
    return jsonError(res, 500, "Internal server error");
  }
});
