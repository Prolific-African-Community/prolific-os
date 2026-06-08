import { JournalEntryStatus } from '@prisma/client';
import type { NextApiResponse } from 'next';
import { getCurrentUserRecord } from '../../../lib/entity-access';
import { getEntityPermissionSummaryForContext } from '../../../lib/permissions';
import { AuthenticatedNextApiRequest, withAuth } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { measureApi, measureStep } from '../../../lib/performance-log';

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const entityId = typeof req.query.id === 'string' ? req.query.id : null;

  if (!entityId) {
    return res.status(400).json({ success: false, message: 'Entity id is required' });
  }

  try {
    const [currentUser, entity] = await measureApi(
      'GET /api/entities/[id] auth + detail',
      () =>
        Promise.all([
          measureStep('GET /api/entities/[id] current user', () =>
            getCurrentUserRecord(req.user.id)
          ),
          measureStep('GET /api/entities/[id] detail', () =>
            prisma.entity.findUnique({
              where: { id: entityId },
              select: {
                id: true,
                organizationId: true,
                name: true,
                legalName: true,
                type: true,
                country: true,
                baseCurrency: true,
                accountingStandard: true,
                accountingInitializedAt: true,
                isActive: true,
                createdAt: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                    legalName: true,
                    type: true,
                    country: true,
                    baseCurrency: true,
                    isActive: true,
                    status: true,
                  },
                },
                accountingTemplate: {
                  select: {
                    id: true,
                    name: true,
                    version: true,
                  },
                },
                funds: {
                  select: {
                    id: true,
                    name: true,
                    currency: true,
                  },
                  orderBy: { createdAt: 'asc' },
                  take: 1,
                },
              },
            })
          ),
        ])
    );

    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' });
    }

    const permissions = getEntityPermissionSummaryForContext(currentUser, {
      entityId,
      organizationId: entity.organizationId,
      organizationIsActive: entity.organization.isActive,
      organizationStatus: entity.organization.status,
    });

    if (!permissions.canAccessWorkspace) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const [
      projectsCount,
      counterpartiesCount,
      transactionsCount,
      documentsCount,
      journalEntryCounts,
    ] = await measureApi('GET /api/entities/[id] counts', () => Promise.all([
      prisma.project.count({ where: { entityId } }),
      prisma.counterparty.count({ where: { entityId } }),
      prisma.businessTransaction.count({ where: { entityId } }),
      prisma.document.count({ where: { entityId } }),
      prisma.journalEntry.groupBy({
        by: ['status'],
        where: { entityId },
        _count: { _all: true },
      }),
    ]));
    const journalCounts = journalEntryCounts.reduce(
      (totals, count) => {
        totals.total += count._count._all;
        if (count.status === JournalEntryStatus.DRAFT) totals.draft = count._count._all;
        if (count.status === JournalEntryStatus.POSTED) totals.posted = count._count._all;
        if (count.status === JournalEntryStatus.REVERSED) totals.reversed = count._count._all;
        return totals;
      },
      { total: 0, draft: 0, posted: 0, reversed: 0 }
    );

    return res.status(200).json({
      success: true,
      data: {
        entity: {
          ...entity,
          linkedLegacyFund: entity.funds[0] || null,
        },
        summary: {
          projectsCount,
          counterpartiesCount,
          transactionsCount,
          documentsCount,
          journalEntries: journalCounts,
        },
        permissions,
      },
    });
  } catch (error) {
    console.error('GET ENTITY DETAIL ERROR:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
