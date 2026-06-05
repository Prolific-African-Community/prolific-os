import { EntityRole, PlatformRole } from "@prisma/client";
import type { NextApiResponse } from "next";
import { getCurrentUserRecord } from "../../../lib/entity-access";
import { AuthenticatedNextApiRequest, hashPassword, withAuth } from "../../../lib/auth";
import {
  getCompatibleClientUserRole,
  isOrganizationManager,
  resolveManagedOrganization,
} from "../../../lib/organization-access";
import { prisma } from "../../../lib/prisma";
import { createAuditLog } from "../../../lib/audit-log";

interface CreateClientUserBody {
  organizationId?: unknown;
  email?: unknown;
  temporaryPassword?: unknown;
  entityIds?: unknown;
  entityRole?: unknown;
}

const getString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

const isClientEntityRole = (value: string): value is EntityRole => {
  return value === EntityRole.INVESTOR || value === EntityRole.ENTITY_VIEWER;
};

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
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

      const body = req.body as CreateClientUserBody;
      const organizationId =
        typeof body.organizationId === "string" ? body.organizationId : undefined;
      const email = getString(body.email).toLowerCase();
      const temporaryPassword = getString(body.temporaryPassword);
      const entityRole = getString(body.entityRole);
      const entityIds = Array.isArray(body.entityIds)
        ? body.entityIds.filter((value): value is string => typeof value === "string")
        : [];

      const organization = await resolveManagedOrganization({
        currentUser,
        organizationId,
      });

      if (!organization) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ success: false, message: "Email is invalid" });
      }

      if (!temporaryPassword || temporaryPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Temporary password must be at least 8 characters",
        });
      }

      if (!entityIds.length) {
        return res.status(400).json({
          success: false,
          message: "At least one entity must be selected",
        });
      }

      if (!entityRole || !isClientEntityRole(entityRole)) {
        return res.status(400).json({
          success: false,
          message: "Entity role must be INVESTOR or ENTITY_VIEWER",
        });
      }

      const [existingUser, entities] = await Promise.all([
        prisma.user.findUnique({
          where: { email },
          select: { id: true },
        }),
        prisma.entity.findMany({
          where: {
            organizationId: organization.id,
            id: { in: entityIds },
          },
          select: {
            id: true,
            name: true,
          },
        }),
      ]);

      if (existingUser) {
        return res.status(400).json({ success: false, message: "User already exists" });
      }

      if (entities.length !== entityIds.length) {
        return res.status(400).json({
          success: false,
          message: "All selected entities must belong to the organization",
        });
      }

      const password = await hashPassword(temporaryPassword);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            password,
            role: getCompatibleClientUserRole(),
            platformRole: PlatformRole.NONE,
            mustChangePassword: true,
            gpId: null,
          },
        });

        // Client/investor users are entity-scoped and do not consume internal organization seats in V1.
        const entityUsers = await Promise.all(
          entityIds.map((entityId) =>
            tx.entityUser.create({
              data: {
                entityId,
                userId: user.id,
                role: entityRole,
                isActive: true,
              },
            })
          )
        );

        await createAuditLog(tx, {
          userId: currentUser.id,
          organizationId: organization.id,
          action: "CLIENT_USER_CREATED",
          resourceType: "User",
          resourceId: user.id,
          metadata: {
            email: user.email,
            entityIds,
            entityRole,
          },
        });

        return { user, entityUsers };
      });

      return res.status(201).json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            mustChangePassword: result.user.mustChangePassword,
            createdAt: result.user.createdAt,
          },
          entityUsers: result.entityUsers,
        },
      });
    } catch (error) {
      console.error("CREATE CLIENT USER ERROR:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);
