import { OrganizationRole } from "@prisma/client";
import type { NextApiResponse } from "next";
import { getCurrentUserRecord, isSuperAdminUser } from "../../../../lib/entity-access";
import { AuthenticatedNextApiRequest, withAuth } from "../../../../lib/auth";
import {
  getOrganizationActiveAdminsCount,
  isOrganizationManager,
} from "../../../../lib/organization-access";
import { prisma } from "../../../../lib/prisma";
import { createAuditLog } from "../../../../lib/audit-log";

interface UpdateOrganizationUserBody {
  role?: unknown;
  isActive?: unknown;
}

const getString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const isOrganizationRole = (value: string): value is OrganizationRole => {
  return Object.values(OrganizationRole).includes(value as OrganizationRole);
};

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "PATCH") {
      return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    try {
      const currentUser = await getCurrentUserRecord(req.user.id);

      if (!currentUser) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (!isOrganizationManager(currentUser)) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const organizationUserId =
        typeof req.query.id === "string" ? req.query.id : undefined;

      if (!organizationUserId) {
        return res
          .status(400)
          .json({ success: false, message: "Organization user id is required" });
      }

      const organizationUser = await prisma.organizationUser.findUnique({
        where: { id: organizationUserId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              mustChangePassword: true,
              createdAt: true,
            },
          },
        },
      });

      if (!organizationUser) {
        return res
          .status(404)
          .json({ success: false, message: "Organization user not found" });
      }

      const canManage =
        isSuperAdminUser(currentUser) ||
        currentUser.organizationUsers.some(
          (membership) =>
            membership.isActive &&
            membership.role === OrganizationRole.ORG_ADMIN &&
            membership.organizationId === organizationUser.organizationId
        );

      if (!canManage) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const body = req.body as UpdateOrganizationUserBody;
      const role = getString(body.role);
      const hasRole = body.role !== undefined;
      const hasIsActive = body.isActive !== undefined;
      const isActive =
        typeof body.isActive === "boolean" ? body.isActive : undefined;

      if (!hasRole && !hasIsActive) {
        return res.status(400).json({
          success: false,
          message: "At least one update field is required",
        });
      }

      if (hasRole && (!role || !isOrganizationRole(role))) {
        return res
          .status(400)
          .json({ success: false, message: "Organization role is invalid" });
      }

      if (hasIsActive && typeof isActive !== "boolean") {
        return res
          .status(400)
          .json({ success: false, message: "isActive must be a boolean" });
      }

      const nextRole: OrganizationRole = hasRole
        ? (role as OrganizationRole)
        : organizationUser.role;
      const nextIsActive = hasIsActive ? isActive! : organizationUser.isActive;
      const affectsAdminCoverage =
        organizationUser.role === OrganizationRole.ORG_ADMIN &&
        (!nextIsActive || nextRole !== OrganizationRole.ORG_ADMIN);

      if (affectsAdminCoverage) {
        const activeAdminsCount = await getOrganizationActiveAdminsCount(
          organizationUser.organizationId
        );

        if (activeAdminsCount <= 1) {
          return res.status(400).json({
            success: false,
            message: "You cannot remove or deactivate the last active ORG_ADMIN.",
          });
        }
      }

      const updatedOrganizationUser = await prisma.$transaction(async (tx) => {
        const updated = await tx.organizationUser.update({
          where: { id: organizationUser.id },
          data: {
            ...(hasRole ? { role: nextRole } : {}),
            ...(hasIsActive ? { isActive: nextIsActive } : {}),
          },
        });
        const metadata = {
          targetUserId: organizationUser.userId,
          email: organizationUser.user.email,
          before: {
            role: organizationUser.role,
            isActive: organizationUser.isActive,
          },
          after: {
            role: updated.role,
            isActive: updated.isActive,
          },
        };
        if (hasRole && nextRole !== organizationUser.role) {
          await createAuditLog(tx, {
            userId: currentUser.id,
            organizationId: organizationUser.organizationId,
            action: "USER_ROLE_CHANGED",
            resourceType: "OrganizationUser",
            resourceId: organizationUser.id,
            metadata,
          });
        }
        if (hasIsActive && !nextIsActive && organizationUser.isActive) {
          await createAuditLog(tx, {
            userId: currentUser.id,
            organizationId: organizationUser.organizationId,
            action: "USER_DEACTIVATED",
            resourceType: "OrganizationUser",
            resourceId: organizationUser.id,
            metadata,
          });
        }
        return updated;
      });

      return res.status(200).json({
        success: true,
        data: {
          ...updatedOrganizationUser,
          user: organizationUser.user,
        },
      });
    } catch (error) {
      console.error("UPDATE ORGANIZATION USER ERROR:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);
