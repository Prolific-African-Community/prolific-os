import {
  AccountingStandard,
  EntityRole,
  EntityType,
  OrganizationRole,
} from '@prisma/client';
import type { NextApiResponse } from 'next';
import { getAccessibleEntityIds, getCurrentUserRecord, isSuperAdminUser } from '../../lib/entity-access';
import { AuthenticatedNextApiRequest, withAuth } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../lib/audit-log';
import { measureApi, measureStep } from '../../lib/performance-log';

const ENTITY_TYPES = new Set<string>(Object.values(EntityType));
const ACCOUNTING_STANDARDS = new Set<string>(Object.values(AccountingStandard));

const parseEntityType = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return ENTITY_TYPES.has(normalized) ? (normalized as EntityType) : null;
};

const parseAccountingStandard = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) {
    return AccountingStandard.LUX_GAAP;
  }

  const normalized = value.trim();
  return ACCOUNTING_STANDARDS.has(normalized)
    ? (normalized as AccountingStandard)
    : null;
};

const resolveOrganizationForEntityCreation = async ({
  currentUser,
  organizationId,
}: {
  currentUser: NonNullable<Awaited<ReturnType<typeof getCurrentUserRecord>>>;
  organizationId?: string | null;
}) => {
  if (isSuperAdminUser(currentUser)) {
    if (organizationId) {
      return prisma.organization.findUnique({
        where: { id: organizationId },
      });
    }

    const linkedOrganizationIds = currentUser.organizationUsers
      .filter((membership) => membership.isActive)
      .map((membership) => membership.organizationId);

    if (!linkedOrganizationIds.length) {
      return null;
    }

    return prisma.organization.findFirst({
      where: {
        id: { in: linkedOrganizationIds },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  const managedOrganizationIds = currentUser.organizationUsers
    .filter(
      (membership) =>
        membership.isActive && membership.role === OrganizationRole.ORG_ADMIN
    )
    .map((membership) => membership.organizationId);

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

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const currentUser = await measureStep('GET /api/entities current user', () =>
        getCurrentUserRecord(req.user.id)
      );

      if (!currentUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const accessibleEntityIds = await measureStep('GET /api/entities accessible ids', () =>
        getAccessibleEntityIds(currentUser)
      );

      if (!accessibleEntityIds.length && !isSuperAdminUser(currentUser)) {
        return res.status(200).json({ success: true, data: [] });
      }

      const where = {
          isActive: true,
          ...(isSuperAdminUser(currentUser) ? {} : { id: { in: accessibleEntityIds } }),
        };

      const entities = await measureStep('GET /api/entities summaries', () =>
        prisma.entity.findMany({
          where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          legalName: true,
          type: true,
          country: true,
          baseCurrency: true,
          accountingStandard: true,
          isActive: true,
          createdAt: true,
          organization: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              projects: true,
              transactions: true,
              counterparties: true,
              documents: true,
            },
          },
        },
      })
      );

      const journalEntryCounts = await measureStep('GET /api/entities journal counts', () =>
        prisma.journalEntry.groupBy({
          by: ['entityId', 'status'],
          where: {
            entityId: { in: entities.map((entity) => entity.id) },
          },
          _count: { _all: true },
        })
      );
      const journalCountMap = new Map<string, { draft: number; posted: number }>();
      journalEntryCounts.forEach((count) => {
        const current = journalCountMap.get(count.entityId) || { draft: 0, posted: 0 };
        if (count.status === 'DRAFT') current.draft = count._count._all;
        if (count.status === 'POSTED') current.posted = count._count._all;
        journalCountMap.set(count.entityId, current);
      });

      return res.status(200).json({
        success: true,
        data: entities.map((entity) => ({
          id: entity.id,
          name: entity.name,
          legalName: entity.legalName,
          type: entity.type,
          country: entity.country,
          baseCurrency: entity.baseCurrency,
          accountingStandard: entity.accountingStandard,
          isActive: entity.isActive,
          createdAt: entity.createdAt,
          organizationName: entity.organization?.name || null,
          projectsCount: entity._count.projects,
          transactionsCount: entity._count.transactions,
          draftJournalEntriesCount: journalCountMap.get(entity.id)?.draft || 0,
          postedJournalEntriesCount: journalCountMap.get(entity.id)?.posted || 0,
          counterpartiesCount: entity._count.counterparties,
          documentsCount: entity._count.documents,
        })),
      });
    } catch (error) {
      console.error('GET ENTITIES ERROR:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const currentUser = await getCurrentUserRecord(req.user.id);

      if (!currentUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const isSuperAdmin = isSuperAdminUser(currentUser);
      const isOrgAdmin = currentUser.organizationUsers.some(
        (membership) => membership.isActive && membership.role === OrganizationRole.ORG_ADMIN
      );

      if (!isSuperAdmin && !isOrgAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const body = req.body ?? {};
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const legalName = typeof body.legalName === 'string' ? body.legalName.trim() || null : null;
      const type = parseEntityType(body.type);
      const country = typeof body.country === 'string' && body.country.trim() ? body.country.trim() : 'LU';
      const baseCurrency =
        typeof body.baseCurrency === 'string' && body.baseCurrency.trim()
          ? body.baseCurrency.trim().toUpperCase()
          : 'EUR';
      const accountingStandard = parseAccountingStandard(body.accountingStandard);

      if (!name) {
        return res.status(400).json({ success: false, message: 'Entity name is required' });
      }

      if (!type) {
        return res.status(400).json({ success: false, message: 'A valid entity type is required' });
      }

      if (!accountingStandard) {
        return res.status(400).json({
          success: false,
          message: 'A valid accounting standard is required',
        });
      }

      const requestedOrganizationId =
        typeof body.organizationId === 'string' ? body.organizationId : null;
      const organization = await resolveOrganizationForEntityCreation({
        currentUser,
        organizationId: requestedOrganizationId,
      });

      if (!organization) {
        return res.status(400).json({
          success: false,
          message: isSuperAdmin && !requestedOrganizationId
            ? 'organizationId is required when no linked organization is available.'
            : 'No valid organization found for this entity creation request.',
        });
      }

      if (!organization.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Organization must be active to create an entity.',
        });
      }

      const existingEntity = await prisma.entity.findFirst({
        where: {
          organizationId: organization.id,
          name,
        },
        select: { id: true },
      });

      if (existingEntity) {
        return res.status(400).json({
          success: false,
          message: 'An entity with this name already exists in the organization.',
        });
      }

      const entity = await prisma.$transaction(async (tx) => {
        const createdEntity = await tx.entity.create({
          data: {
            organizationId: organization.id,
            name,
            legalName,
            type,
            country,
            baseCurrency,
            accountingStandard,
            fiscalYearStartMonth: 1,
            fiscalYearStartDay: 1,
            fiscalYearEndMonth: 12,
            fiscalYearEndDay: 31,
            isActive: true,
          },
        });

        await tx.entityUser.upsert({
          where: {
            entityId_userId: {
              entityId: createdEntity.id,
              userId: currentUser.id,
            },
          },
          update: {
            role: EntityRole.ENTITY_ADMIN,
            isActive: true,
          },
          create: {
            entityId: createdEntity.id,
            userId: currentUser.id,
            role: EntityRole.ENTITY_ADMIN,
            isActive: true,
          },
        });

        await createAuditLog(tx, {
          userId: currentUser.id,
          organizationId: organization.id,
          entityId: createdEntity.id,
          action: 'ENTITY_CREATED',
          resourceType: 'Entity',
          resourceId: createdEntity.id,
          metadata: {
            name: createdEntity.name,
            type: createdEntity.type,
            accountingStandard: createdEntity.accountingStandard,
          },
        });

        return createdEntity;
      });

      return res.status(201).json({
        success: true,
        data: {
          entity,
        },
      });
    } catch (error) {
      console.error('POST ENTITY ERROR:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
});
