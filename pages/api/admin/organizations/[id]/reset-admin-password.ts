import { PlatformRole, UserRole } from "@prisma/client";
import type { NextApiResponse } from "next";
import { createAuditLog } from "../../../../../lib/audit-log";
import {
  AuthenticatedNextApiRequest,
  hashPassword,
  withAuth,
} from "../../../../../lib/auth";
import { getCurrentUserRecord, isSuperAdminUser } from "../../../../../lib/entity-access";
import { prisma } from "../../../../../lib/prisma";

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
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
    const { userId, temporaryPassword } = req.body as {
      userId?: unknown;
      temporaryPassword?: unknown;
    };
    const targetUserId = typeof userId === "string" ? userId.trim() : "";
    const password =
      typeof temporaryPassword === "string" ? temporaryPassword.trim() : "";

    if (!organizationId) {
      return res
        .status(400)
        .json({ success: false, message: "Organization id is required" });
    }

    if (!targetUserId) {
      return res
        .status(400)
        .json({ success: false, message: "User id is required" });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Temporary password must be at least 8 characters",
      });
    }

    try {
      const membership = await prisma.organizationUser.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: targetUserId,
          },
        },
        include: {
          organization: {
            select: { id: true },
          },
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: "User does not belong to this organization",
        });
      }

      const hashedPassword = await hashPassword(password);

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: targetUserId },
          data: {
            password: hashedPassword,
            mustChangePassword: true,
          },
        });

        await createAuditLog(tx, {
          userId: currentUser.id,
          organizationId,
          action: "ORGANIZATION_USER_PASSWORD_RESET",
          resourceType: "User",
          resourceId: targetUserId,
          metadata: {
            targetUserId,
            targetEmail: membership.user.email,
            organizationUserId: membership.id,
          },
        });
      });

      return res.status(200).json({
        success: true,
        message:
          "Password reset successfully. User must change password on next login.",
      });
    } catch (error) {
      console.error("RESET ORGANIZATION USER PASSWORD ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },
  [UserRole.ADMIN]
);
