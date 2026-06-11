import { EntityRole, OrganizationRole, OrganizationStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "./prisma";
import { CurrentUserRecord, isSuperAdminUser } from "./entity-access";

export type OrganizationMembershipWithRole = Prisma.OrganizationUserGetPayload<{
  include: {
    organization: true;
  };
}>;

export const ORGANIZATION_MANAGER_ROLES: OrganizationRole[] = [
  OrganizationRole.ORG_ADMIN,
];
export const INTERNAL_ORGANIZATION_ROLES: OrganizationRole[] = [
  OrganizationRole.ORG_ADMIN,
  OrganizationRole.ORG_ACCOUNTANT,
  OrganizationRole.ORG_REVIEWER,
  OrganizationRole.ORG_VIEWER,
];
export const CLIENT_ENTITY_ROLES: EntityRole[] = [
  EntityRole.INVESTOR,
  EntityRole.ENTITY_VIEWER,
];

export const isOrganizationManager = (user: CurrentUserRecord) => {
  if (isSuperAdminUser(user)) {
    return true;
  }

  return user.organizationUsers.some(
    (membership) =>
      membership.isActive &&
      membership.organization.isActive &&
      membership.organization.status === OrganizationStatus.ACTIVE &&
      ORGANIZATION_MANAGER_ROLES.includes(membership.role)
  );
};

export const getManagedOrganizationIds = (user: CurrentUserRecord) => {
  if (isSuperAdminUser(user)) {
    return [];
  }

  return user.organizationUsers
    .filter(
      (membership) =>
        membership.isActive &&
        membership.organization.isActive &&
        membership.organization.status === OrganizationStatus.ACTIVE &&
        ORGANIZATION_MANAGER_ROLES.includes(membership.role)
    )
    .map((membership) => membership.organizationId);
};

export const resolveManagedOrganization = async ({
  currentUser,
  organizationId,
}: {
  currentUser: CurrentUserRecord;
  organizationId?: string | null;
}) => {
  if (isSuperAdminUser(currentUser)) {
    if (organizationId) {
      return prisma.organization.findUnique({
        where: { id: organizationId },
      });
    }

    return prisma.organization.findFirst({
      orderBy: { createdAt: "desc" },
    });
  }

  const managedOrganizationIds = getManagedOrganizationIds(currentUser);

  if (!managedOrganizationIds.length) {
    return null;
  }

  const resolvedOrganizationId =
    organizationId && managedOrganizationIds.includes(organizationId)
      ? organizationId
      : organizationId
      ? null
      : managedOrganizationIds[0];

  if (!resolvedOrganizationId) {
    return null;
  }

  return prisma.organization.findUnique({
    where: { id: resolvedOrganizationId },
  });
};

export const getOrganizationActiveInternalUsersCount = async (
  organizationId: string
) => {
  return prisma.organizationUser.count({
    where: {
      organizationId,
      isActive: true,
      role: {
        in: INTERNAL_ORGANIZATION_ROLES,
      },
    },
  });
};

export const getOrganizationActiveAdminsCount = async (organizationId: string) => {
  return prisma.organizationUser.count({
    where: {
      organizationId,
      isActive: true,
      role: OrganizationRole.ORG_ADMIN,
    },
  });
};

export const getCompatibleInternalUserRole = () => UserRole.USER;
export const getCompatibleClientUserRole = () => UserRole.USER;
