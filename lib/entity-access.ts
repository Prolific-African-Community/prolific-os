import { EntityRole, OrganizationRole, OrganizationStatus, PlatformRole, Prisma, UserRole } from '@prisma/client';
import { prisma } from './prisma';

export type CurrentUserRecord = Prisma.UserGetPayload<{
  select: {
    id: true;
    role: true;
    platformRole: true;
    entityUsers: {
      select: {
        entityId: true;
        role: true;
        isActive: true;
      };
    };
    organizationUsers: {
      select: {
        organizationId: true;
        role: true;
        isActive: true;
        organization: {
          select: {
            id: true;
            isActive: true;
            status: true;
            createdAt: true;
          };
        };
      };
    };
  };
}>;

export const getCurrentUserRecord = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      platformRole: true,
      entityUsers: {
        select: {
          entityId: true,
          role: true,
          isActive: true,
        },
      },
      organizationUsers: {
        select: {
          organizationId: true,
          role: true,
          isActive: true,
          organization: {
            select: {
              id: true,
              isActive: true,
              status: true,
              createdAt: true,
            },
          },
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

  const directEntityIds = user.entityUsers
    .filter(
      (membership) => membership.isActive && membership.role !== EntityRole.INVESTOR
    )
    .map((membership) => membership.entityId);

  const organizationIds = user.organizationUsers
    .filter(
      (membership) =>
        membership.isActive &&
        membership.organization.isActive &&
        membership.organization.status === OrganizationStatus.ACTIVE
    )
    .map((membership) => membership.organizationId);

  if (!directEntityIds.length && !organizationIds.length) {
    return [];
  }

  const activeOrganizationEntities = await prisma.entity.findMany({
    where: {
      isActive: true,
      organization: {
        isActive: true,
        status: OrganizationStatus.ACTIVE,
      },
      OR: [
        ...(directEntityIds.length ? [{ id: { in: directEntityIds } }] : []),
        ...(organizationIds.length
          ? [{ organizationId: { in: organizationIds } }]
          : []),
      ],
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

  return false;
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
