import type { NextApiResponse } from "next";
import { getQueryString, jsonError, jsonSuccess } from "../../lib/accounting-api";
import { AuthenticatedNextApiRequest, withAuth } from "../../lib/auth";
import { getCurrentUserRecord, isSuperAdminUser } from "../../lib/entity-access";
import { canAccessEntity } from "../../lib/permissions";
import { prisma } from "../../lib/prisma";

const parseLimit = (value: string | string[] | undefined) => {
  const parsed = Number(getQueryString(value) || "100");
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 250) : 100;
};

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") return jsonError(res, 405, "Method not allowed");

  try {
    const currentUser = await getCurrentUserRecord(req.user.id);
    if (!currentUser) return jsonError(res, 403, "Forbidden");

    const entityId = getQueryString(req.query.entityId);
    const organizationId = getQueryString(req.query.organizationId);
    const action = getQueryString(req.query.action);
    const resourceType = getQueryString(req.query.resourceType);
    const superAdmin = isSuperAdminUser(currentUser);

    if (!superAdmin) {
      if (!entityId || organizationId || !(await canAccessEntity(currentUser, entityId))) {
        return jsonError(res, 403, "Forbidden");
      }
    } else if (entityId && !(await canAccessEntity(currentUser, entityId))) {
      return jsonError(res, 403, "Forbidden");
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        ...(entityId ? { entityId } : {}),
        ...(organizationId ? { organizationId } : {}),
        ...(action ? { action } : {}),
        ...(resourceType ? { resourceType } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: parseLimit(req.query.limit),
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return jsonSuccess(res, auditLogs);
  } catch (error) {
    console.error("AUDIT LOGS ERROR:", error);
    return jsonError(res, 500, "Internal server error");
  }
});
