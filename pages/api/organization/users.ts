import { OrganizationRole, PlatformRole } from "@prisma/client";
import type { NextApiResponse } from "next";
import { getCurrentUserRecord } from "../../../lib/entity-access";
import { AuthenticatedNextApiRequest, hashPassword, withAuth } from "../../../lib/auth";
import {
  getCompatibleInternalUserRole,
  getOrganizationActiveInternalUsersCount,
  isOrganizationManager,
  resolveManagedOrganization,
} from "../../../lib/organization-access";
import { prisma } from "../../../lib/prisma";
import { createAuditLog } from "../../../lib/audit-log";

interface CreateInternalUserBody {
  organizationId?: unknown;
  email?: unknown;
  temporaryPassword?: unknown;
  role?: unknown;
}

const getString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

const isOrganizationRole = (value: string): value is OrganizationRole => {
  return Object.values(OrganizationRole).includes(value as OrganizationRole);
};

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
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

      if (req.method === "GET") {
        const organization = await resolveManagedOrganization({
          currentUser,
          organizationId: requestedOrganizationId,
        });

        if (!organization) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }

        const [activeUsersCount, internalMemberships, clientUsers] = await Promise.all([
          getOrganizationActiveInternalUsersCount(organization.id),
          prisma.organizationUser.findMany({
            where: {
              organizationId: organization.id,
            },
            orderBy: { createdAt: "desc" },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  mustChangePassword: true,
                  createdAt: true,
                  entityUsers: {
                    where: {
                      entity: {
                        organizationId: organization.id,
                      },
                    },
                    include: {
                      entity: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          }),
          prisma.user.findMany({
            where: {
              organizationUsers: {
                none: {},
              },
              entityUsers: {
                some: {
                  entity: {
                    organizationId: organization.id,
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              email: true,
              mustChangePassword: true,
              createdAt: true,
              entityUsers: {
                where: {
                  entity: {
                    organizationId: organization.id,
                  },
                },
                include: {
                  entity: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          }),
        ]);

        return res.status(200).json({
          success: true,
          data: {
            organization: {
              id: organization.id,
              name: organization.name,
              maxUsers: organization.maxUsers,
              activeUsersCount,
              clientUsersCount: clientUsers.length,
            },
            users: internalMemberships.map((membership) => ({
              id: membership.user.id,
              organizationUserId: membership.id,
              email: membership.user.email,
              role: membership.role,
              isActive: membership.isActive,
              mustChangePassword: membership.user.mustChangePassword,
              createdAt: membership.user.createdAt,
              entityAccess: membership.user.entityUsers.map((entityUser) => ({
                entityId: entityUser.entityId,
                entityName: entityUser.entity.name,
                role: entityUser.role,
                isActive: entityUser.isActive,
              })),
            })),
            clientUsers: clientUsers.map((user) => ({
              id: user.id,
              email: user.email,
              mustChangePassword: user.mustChangePassword,
              createdAt: user.createdAt,
              entityAccess: user.entityUsers.map((entityUser) => ({
                entityId: entityUser.entityId,
                entityName: entityUser.entity.name,
                role: entityUser.role,
                isActive: entityUser.isActive,
              })),
            })),
          },
        });
      }

      if (req.method !== "POST") {
        return res.status(405).json({ success: false, message: "Method not allowed" });
      }

      const body = req.body as CreateInternalUserBody;
      const organizationId =
        typeof body.organizationId === "string" ? body.organizationId : requestedOrganizationId;
      const email = getString(body.email).toLowerCase();
      const temporaryPassword = getString(body.temporaryPassword);
      const role = getString(body.role);

      const organization = await resolveManagedOrganization({
        currentUser,
        organizationId,
      });

      if (!organization) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      if (!organization.isActive) {
        return res
          .status(400)
          .json({ success: false, message: "Organization is inactive" });
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

      if (!role || !isOrganizationRole(role)) {
        return res
          .status(400)
          .json({ success: false, message: "Organization role is invalid" });
      }

      const [existingUser, activeUsersCount] = await Promise.all([
        prisma.user.findUnique({
          where: { email },
          select: { id: true },
        }),
        getOrganizationActiveInternalUsersCount(organization.id),
      ]);

      if (existingUser) {
        return res.status(400).json({ success: false, message: "User already exists" });
      }

      if (activeUsersCount >= organization.maxUsers) {
        return res.status(400).json({
          success: false,
          message: "User limit reached for this organization.",
        });
      }

      const password = await hashPassword(temporaryPassword);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            password,
            role: getCompatibleInternalUserRole(),
            platformRole: PlatformRole.NONE,
            mustChangePassword: true,
            gpId: null,
          },
        });

        const organizationUser = await tx.organizationUser.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            role,
            isActive: true,
          },
        });

        await createAuditLog(tx, {
          userId: currentUser.id,
          organizationId: organization.id,
          action: "ORGANIZATION_USER_CREATED",
          resourceType: "OrganizationUser",
          resourceId: organizationUser.id,
          metadata: {
            createdUserId: user.id,
            email: user.email,
            role: organizationUser.role,
          },
        });

        return { user, organizationUser };
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
          organizationUser: result.organizationUser,
        },
      });
    } catch (error) {
      console.error("ORGANIZATION USERS API ERROR:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);
