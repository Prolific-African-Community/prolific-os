import {
  OrganizationRole,
  OrganizationStatus,
  OrganizationType,
  PlatformRole,
  UserRole,
} from "@prisma/client";
import type { NextApiResponse } from "next";
import { getCurrentUserRecord, isSuperAdminUser } from "../../../lib/entity-access";
import { AuthenticatedNextApiRequest, hashPassword, withAuth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { createAuditLog } from "../../../lib/audit-log";

interface CreateOrganizationBody {
  name?: unknown;
  legalName?: unknown;
  type?: unknown;
  country?: unknown;
  baseCurrency?: unknown;
  maxUsers?: unknown;
  adminEmail?: unknown;
  temporaryPassword?: unknown;
}

const isOrganizationType = (value: string): value is OrganizationType => {
  return Object.values(OrganizationType).includes(value as OrganizationType);
};

const getString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const getOptionalString = (value: unknown) => {
  const parsed = getString(value);
  return parsed ? parsed : undefined;
};

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

const parseMaxUsers = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return 5;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};

const ensureAdminUser = async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  const currentUser = await getCurrentUserRecord(req.user.id);

  if (!currentUser) {
    res.status(404).json({ success: false, message: "User not found" });
    return null;
  }

  if (
    currentUser.platformRole !== PlatformRole.SUPER_ADMIN &&
    !isSuperAdminUser(currentUser)
  ) {
    res.status(403).json({ success: false, message: "Forbidden" });
    return null;
  }

  return currentUser;
};

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    const currentUser = await ensureAdminUser(req, res);

    if (!currentUser) {
      return;
    }

    if (req.method === "GET") {
      try {
        const organizations = await prisma.organization.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            users: {
              where: {
                isActive: true,
                role: OrganizationRole.ORG_ADMIN,
              },
              include: {
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
            _count: {
              select: {
                users: true,
                entities: true,
              },
            },
          },
        });

        return res.status(200).json({
          success: true,
          data: organizations.map((organization) => ({
            id: organization.id,
            name: organization.name,
            legalName: organization.legalName,
            type: organization.type,
            country: organization.country,
            baseCurrency: organization.baseCurrency,
            maxUsers: organization.maxUsers,
            status: organization.status,
            isActive: organization.isActive,
            createdAt: organization.createdAt,
            usersCount: organization._count.users,
            entitiesCount: organization._count.entities,
            adminEmails: organization.users.map((membership) => membership.user.email),
          })),
        });
      } catch (error) {
        console.error("GET ADMIN ORGANIZATIONS ERROR:", error);
        return res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    }

    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    }

    const body = req.body as CreateOrganizationBody;
    const name = getString(body.name);
    const legalName = getOptionalString(body.legalName);
    const typeValue = getString(body.type);
    const country = getOptionalString(body.country) || "LU";
    const baseCurrency = (getOptionalString(body.baseCurrency) || "EUR").toUpperCase();
    const adminEmail = getString(body.adminEmail).toLowerCase();
    const temporaryPassword = getString(body.temporaryPassword);
    const maxUsers = parseMaxUsers(body.maxUsers);

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Organization name is required" });
    }

    if (!typeValue || !isOrganizationType(typeValue)) {
      return res
        .status(400)
        .json({ success: false, message: "Organization type is invalid" });
    }

    if (!adminEmail || !isValidEmail(adminEmail)) {
      return res
        .status(400)
        .json({ success: false, message: "Admin email is invalid" });
    }

    if (!temporaryPassword || temporaryPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Temporary password must be at least 8 characters",
      });
    }

    if (maxUsers === null) {
      return res.status(400).json({
        success: false,
        message: "Max users must be an integer greater than or equal to 1",
      });
    }

    try {
      const [existingOrganization, existingUser] = await Promise.all([
        prisma.organization.findFirst({
          where: {
            name: {
              equals: name,
              mode: "insensitive",
            },
          },
          select: { id: true },
        }),
        prisma.user.findUnique({
          where: { email: adminEmail },
          select: { id: true },
        }),
      ]);

      if (existingOrganization) {
        return res.status(400).json({
          success: false,
          message: "An organization with this name already exists",
        });
      }

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      const password = await hashPassword(temporaryPassword);

      const result = await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name,
            legalName,
            type: typeValue,
            country,
            baseCurrency,
            maxUsers,
            status: OrganizationStatus.ACTIVE,
            isActive: true,
          },
        });

        const adminUser = await tx.user.create({
          data: {
            email: adminEmail,
            password,
            role: UserRole.GP,
            platformRole: PlatformRole.NONE,
            mustChangePassword: true,
          },
        });

        const organizationUser = await tx.organizationUser.create({
          data: {
            organizationId: organization.id,
            userId: adminUser.id,
            role: OrganizationRole.ORG_ADMIN,
            isActive: true,
          },
        });

        await createAuditLog(tx, {
          userId: currentUser.id,
          organizationId: organization.id,
          action: "ORGANIZATION_CREATED",
          resourceType: "Organization",
          resourceId: organization.id,
          metadata: {
            name: organization.name,
            type: organization.type,
            maxUsers: organization.maxUsers,
            adminUserId: adminUser.id,
          },
        });
        await createAuditLog(tx, {
          userId: currentUser.id,
          organizationId: organization.id,
          action: "ORGANIZATION_USER_CREATED",
          resourceType: "OrganizationUser",
          resourceId: organizationUser.id,
          metadata: {
            email: adminUser.email,
            role: OrganizationRole.ORG_ADMIN,
          },
        });

        return { organization, adminUser };
      });

      return res.status(201).json({
        success: true,
        data: {
          organization: result.organization,
          adminUser: {
            id: result.adminUser.id,
            email: result.adminUser.email,
            mustChangePassword: result.adminUser.mustChangePassword,
          },
        },
      });
    } catch (error) {
      console.error("CREATE ORGANIZATION ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },
  [UserRole.ADMIN]
);
