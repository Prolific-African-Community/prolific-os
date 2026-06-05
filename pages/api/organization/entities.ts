import type { NextApiResponse } from "next";
import { getCurrentUserRecord } from "../../../lib/entity-access";
import { AuthenticatedNextApiRequest, withAuth } from "../../../lib/auth";
import {
  isOrganizationManager,
  resolveManagedOrganization,
} from "../../../lib/organization-access";
import { prisma } from "../../../lib/prisma";

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
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

      const requestedOrganizationId =
        typeof req.query.organizationId === "string"
          ? req.query.organizationId
          : undefined;

      const organization = await resolveManagedOrganization({
        currentUser,
        organizationId: requestedOrganizationId,
      });

      if (!organization) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const entities = await prisma.entity.findMany({
        where: {
          organizationId: organization.id,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          type: true,
          baseCurrency: true,
          isActive: true,
        },
      });

      return res.status(200).json({ success: true, data: entities });
    } catch (error) {
      console.error("GET ORGANIZATION ENTITIES ERROR:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);
