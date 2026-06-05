import type { NextApiResponse } from 'next';
import { getQueryString, jsonError, jsonSuccess } from '../../../lib/accounting-api';
import { AuthenticatedNextApiRequest, withAuth } from '../../../lib/auth';
import { getCurrentUserRecord } from '../../../lib/entity-access';
import { canAccessEntity } from '../../../lib/permissions';
import { prisma } from '../../../lib/prisma';

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    jsonError(res, 405, 'Method not allowed');
    return;
  }

  const entityId = getQueryString(req.query.entityId);

  if (!entityId) {
    jsonError(res, 400, 'entityId is required');
    return;
  }

  try {
    const currentUser = await getCurrentUserRecord(req.user.id);
    if (!currentUser || !(await canAccessEntity(currentUser, entityId))) {
      jsonError(res, 403, 'Forbidden');
      return;
    }

    const journalEntries = await prisma.journalEntry.findMany({
      where: { entityId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: {
        transaction: true,
        lines: {
          include: {
            account: true,
            counterparty: true,
            project: true,
          },
        },
      },
    });

    jsonSuccess(res, journalEntries);
  } catch (error) {
    console.error('ACCOUNTING JOURNAL ENTRIES ERROR:', error);
    jsonError(res, 500, 'Internal server error');
  }
});
