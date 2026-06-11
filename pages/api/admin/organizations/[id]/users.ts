import { PlatformRole, UserRole } from "@prisma/client";
import type { NextApiResponse } from "next";
import { AuthenticatedNextApiRequest, withAuth } from "../../../../../lib/auth";
import { getCurrentUserRecord, isSuperAdminUser } from "../../../../../lib/entity-access";
import { prisma } from "../../../../../lib/prisma";

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
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

    if (!organizationId) {
      return res
        .status(400)
        .json({ success: false, message: "Organization id is required" });
    }

    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true },
      });

      if (!organization) {
        return res
          .status(404)
          .json({ success: false, message: "Organization not found" });
      }

      const memberships = await prisma.organizationUser.findMany({
        where: { organizationId },
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              platformRole: true,
              mustChangePassword: true,
              createdAt: true,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        data: memberships.map((membership) => ({
          id: membership.user.id,
          email: membership.user.email,
          userRole: membership.user.role,
          platformRole: membership.user.platformRole,
          organizationUserId: membership.id,
          organizationRole: membership.role,
          isActive: membership.isActive,
          mustChangePassword: membership.user.mustChangePassword,
          createdAt: membership.user.createdAt,
        })),
      });
    } catch (error) {
      console.error("GET ADMIN ORGANIZATION USERS ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },
  [UserRole.ADMIN]
);
