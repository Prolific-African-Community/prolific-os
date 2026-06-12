import type { NextApiResponse } from 'next';
import { getQueryString, jsonError, jsonSuccess } from '../../../lib/accounting-api';
import { AuthenticatedNextApiRequest, withAuth } from '../../../lib/auth';
import { getCurrentUserRecord } from '../../../lib/entity-access';
import { canAccessEntity } from '../../../lib/permissions';
import { prisma } from '../../../lib/prisma';
import { measureStep } from '../../../lib/performance-log';

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    jsonError(res, 405, 'Method not allowed');
    return;
  }

  const entityId = getQueryString(req.query.entityId);
  const transactionId = getQueryString(req.query.transactionId);
  const rawLimit = Number(getQueryString(req.query.limit) || 50);
  const rawOffset = Number(getQueryString(req.query.offset) || 0);
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
  const offset = Number.isInteger(rawOffset) && rawOffset > 0 ? rawOffset : 0;

  if (!entityId) {
    jsonError(res, 400, 'entityId is required');
    return;
  }

  try {
    const currentUser = await measureStep('GET /api/accounting/journal-entries current user', () =>
      getCurrentUserRecord(req.user.id)
    );
    if (!currentUser || !(await canAccessEntity(currentUser, entityId))) {
      jsonError(res, 403, 'Forbidden');
      return;
    }

    const journalEntries = await measureStep('GET /api/accounting/journal-entries list', () =>
      prisma.journalEntry.findMany({
      where: {
        entityId,
        ...(transactionId ? { transactionId } : {}),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
      select: {
        id: true,
        transactionId: true,
        date: true,
        description: true,
        status: true,
        lines: {
          select: {
            id: true,
            debit: true,
            credit: true,
            currency: true,
            description: true,
            account: {
              select: {
                id: true,
                code: true,
                label: true,
              },
            },
            counterparty: {
              select: {
                id: true,
                name: true,
              },
            },
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })
    );

    jsonSuccess(res, journalEntries);
  } catch (error) {
    console.error('ACCOUNTING JOURNAL ENTRIES ERROR:', error);
    jsonError(res, 500, 'Internal server error');
  }
});
