import { OrganizationStatus, PlatformRole, UserRole } from "@prisma/client";
import type { NextApiResponse } from "next";
import { createAuditLog } from "../../../../../lib/audit-log";
import { AuthenticatedNextApiRequest, withAuth } from "../../../../../lib/auth";
import { getCurrentUserRecord, isSuperAdminUser } from "../../../../../lib/entity-access";
import { prisma } from "../../../../../lib/prisma";

const isOrganizationStatus = (value: unknown): value is OrganizationStatus =>
  typeof value === "string" &&
  Object.values(OrganizationStatus).includes(value as OrganizationStatus);

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "PATCH") {
      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    }

    const currentUser = await getCurrentUserRecord(req.user.id);

    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (
      currentUser.platformRole !== PlatformRole.SUPER_ADMIN &&
      !isSuperAdminUser(currentUser)
    ) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const organizationId =
      typeof req.query.id === "string" ? req.query.id.trim() : "";
    const status = (req.body as { status?: unknown }).status;

    if (!organizationId) {
      return res
        .status(400)
        .json({ success: false, message: "Organization id is required" });
    }

    if (!isOrganizationStatus(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Organization status is invalid" });
    }

    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        return res
          .status(404)
          .json({ success: false, message: "Organization not found" });
      }

      const updatedOrganization = await prisma.$transaction(async (tx) => {
        const updated = await tx.organization.update({
          where: { id: organizationId },
          data: {
            status,
            isActive: status === OrganizationStatus.ACTIVE,
          },
        });

        await createAuditLog(tx, {
          userId: currentUser.id,
          organizationId,
          action: "ORGANIZATION_STATUS_CHANGED",
          resourceType: "Organization",
          resourceId: organizationId,
          metadata: {
            previousStatus: organization.status,
            newStatus: status,
            previousIsActive: organization.isActive,
            newIsActive: updated.isActive,
          },
        });

        return updated;
      });

      return res.status(200).json({ success: true, data: updatedOrganization });
    } catch (error) {
      console.error("UPDATE ORGANIZATION STATUS ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },
  [UserRole.ADMIN]
);
