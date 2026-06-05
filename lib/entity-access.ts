import { EntityRole, OrganizationRole, OrganizationStatus, PlatformRole, Prisma, UserRole } from '@prisma/client';
import { prisma } from './prisma';

export type CurrentUserRecord = Prisma.UserGetPayload<{
  include: {
    gp: true;
    entityUsers: true;
    organizationUsers: {
      include: {
        organization: true;
      };
    };
  };
}>;

export const getCurrentUserRecord = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      gp: true,
      entityUsers: true,
      organizationUsers: {
        include: {
          organization: true,
        },
      },
    },
  });
};

export const isSuperAdminUser = (
  user: Pick<CurrentUserRecord, 'platformRole' | 'role'>
) => {
  return user.platformRole === PlatformRole.SUPER_ADMIN || user.role === UserRole.ADMIN;
};

export const getAccessibleEntityIds = async (user: CurrentUserRecord) => {
  if (isSuperAdminUser(user)) {
    const entities = await prisma.entity.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    return entities.map((entity) => entity.id);
  }

  const entityIds = new Set(
    user.entityUsers
      .filter(
        (membership) =>
          membership.isActive && membership.role !== EntityRole.INVESTOR
      )
      .map((membership) => membership.entityId)
  );

  const organizationIds = user.organizationUsers
    .filter(
      (membership) =>
        membership.isActive &&
        membership.organization.isActive &&
        membership.organization.status === OrganizationStatus.ACTIVE
    )
    .map((membership) => membership.organizationId);

  if (organizationIds.length) {
    const organizationEntities = await prisma.entity.findMany({
      where: {
        organizationId: { in: organizationIds },
        isActive: true,
      },
      select: { id: true },
    });

    for (const entity of organizationEntities) {
      entityIds.add(entity.id);
    }
  }

  if (user.gpId) {
    const legacyFundEntities = await prisma.fund.findMany({
      where: {
        gpId: user.gpId,
        entityId: { not: null },
      },
      select: { entityId: true },
    });

    for (const fund of legacyFundEntities) {
      if (fund.entityId) {
        entityIds.add(fund.entityId);
      }
    }
  }

  const candidateEntityIds = Array.from(entityIds);

  if (!candidateEntityIds.length) {
    return [];
  }

  const activeOrganizationEntities = await prisma.entity.findMany({
    where: {
      id: { in: candidateEntityIds },
      organization: {
        isActive: true,
        status: OrganizationStatus.ACTIVE,
      },
    },
    select: { id: true },
  });

  return activeOrganizationEntities.map((entity) => entity.id);
};

export const userCanAccessEntity = async (user: CurrentUserRecord, entityId: string) => {
  if (isSuperAdminUser(user)) {
    return true;
  }

  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: {
      organizationId: true,
      organization: {
        select: {
          isActive: true,
          status: true,
        },
      },
    },
  });

  if (!entity) {
    return false;
  }

  if (
    !entity.organization.isActive ||
    entity.organization.status !== OrganizationStatus.ACTIVE
  ) {
    return false;
  }

  if (
    user.entityUsers.some(
      (membership) =>
        membership.isActive &&
        membership.entityId === entityId &&
        membership.role !== EntityRole.INVESTOR
    )
  ) {
    return true;
  }

  if (
    user.organizationUsers.some(
      (membership) =>
        membership.isActive &&
        membership.organizationId === entity.organizationId &&
        membership.organization.isActive &&
        membership.organization.status === OrganizationStatus.ACTIVE
    )
  ) {
    return true;
  }

  if (!user.gpId) {
    return false;
  }

  const legacyFund = await prisma.fund.findFirst({
    where: {
      gpId: user.gpId,
      entityId,
    },
    select: { id: true },
  });

  return Boolean(legacyFund);
};

export const ensureCompatibilityMemberships = async ({
  client = prisma,
  entityId,
  organizationId,
  userId,
}: {
  client?: Pick<typeof prisma, 'organizationUser' | 'entityUser'>;
  entityId: string;
  organizationId: string;
  userId: string;
}) => {
  await client.organizationUser.upsert({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    update: {
      isActive: true,
      role: OrganizationRole.ORG_ADMIN,
    },
    create: {
      organizationId,
      userId,
      role: OrganizationRole.ORG_ADMIN,
      isActive: true,
    },
  });

  await client.entityUser.upsert({
    where: {
      entityId_userId: {
        entityId,
        userId,
      },
    },
    update: {
      isActive: true,
      role: EntityRole.ENTITY_ADMIN,
    },
    create: {
      entityId,
      userId,
      role: EntityRole.ENTITY_ADMIN,
      isActive: true,
    },
  });
};
