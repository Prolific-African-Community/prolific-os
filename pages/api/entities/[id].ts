import { JournalEntryStatus } from '@prisma/client';
import type { NextApiResponse } from 'next';
import { getCurrentUserRecord, userCanAccessEntity } from '../../../lib/entity-access';
import { getEntityPermissionSummary } from '../../../lib/permissions';
import { AuthenticatedNextApiRequest, withAuth } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const entityId = typeof req.query.id === 'string' ? req.query.id : null;

  if (!entityId) {
    return res.status(400).json({ success: false, message: 'Entity id is required' });
  }

  try {
    const currentUser = await getCurrentUserRecord(req.user.id);

    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const permissions = await getEntityPermissionSummary(currentUser, entityId);

    if (!permissions.canAccessWorkspace) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      include: {
        organization: true,
        accountingTemplate: {
          select: {
            id: true,
            name: true,
            version: true,
          },
        },
        projects: {
          orderBy: { createdAt: 'desc' },
        },
        funds: {
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' });
    }

    const [counterpartiesCount, transactionsCount, documentsCount, journalEntries] = await Promise.all([
      prisma.counterparty.count({ where: { entityId } }),
      prisma.businessTransaction.count({ where: { entityId } }),
      prisma.document.count({ where: { entityId } }),
      prisma.journalEntry.findMany({
        where: { entityId },
        select: { status: true },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        entity: {
          ...entity,
          linkedLegacyFund: entity.funds[0] || null,
        },
        summary: {
          counterpartiesCount,
          transactionsCount,
          documentsCount,
          journalEntries: {
            total: journalEntries.length,
            draft: journalEntries.filter((entry) => entry.status === JournalEntryStatus.DRAFT).length,
            posted: journalEntries.filter((entry) => entry.status === JournalEntryStatus.POSTED)
              .length,
            reversed: journalEntries.filter((entry) => entry.status === JournalEntryStatus.REVERSED)
              .length,
          },
        },
        permissions,
      },
    });
  } catch (error) {
    console.error('GET ENTITY DETAIL ERROR:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
