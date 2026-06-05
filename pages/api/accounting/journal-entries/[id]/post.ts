import { JournalEntryStatus, TransactionStatus } from '@prisma/client';
import type { NextApiResponse } from 'next';
import {
  AccountingValidationError,
  getQueryString,
  jsonError,
  jsonSuccess,
  validateBalancedJournalEntry,
} from '../../../../../lib/accounting-api';
import { AuthenticatedNextApiRequest, withAuth } from '../../../../../lib/auth';
import { getCurrentUserRecord } from '../../../../../lib/entity-access';
import { canPostJournalEntry } from '../../../../../lib/permissions';
import { prisma } from '../../../../../lib/prisma';
import {
  AccountingPeriodValidationError,
  assertOpenAccountingPeriod,
} from '../../../../../lib/accounting-periods';
import { createAuditLog } from '../../../../../lib/audit-log';

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    jsonError(res, 405, 'Method not allowed');
    return;
  }

  const journalEntryId = getQueryString(req.query.id);

  if (!journalEntryId) {
    jsonError(res, 400, 'Journal entry id is required');
    return;
  }

  try {
    const postedJournalEntry = await prisma.$transaction(async (tx) => {
      const journalEntry = await tx.journalEntry.findUnique({
        where: { id: journalEntryId },
        include: { lines: true },
      });

      if (!journalEntry) {
        throw new AccountingValidationError('Journal entry not found');
      }
      const currentUser = await getCurrentUserRecord(req.user.id);
      if (!currentUser || !(await canPostJournalEntry(currentUser, journalEntry.entityId))) {
        throw new AccountingValidationError('Forbidden');
      }

      if (journalEntry.status !== JournalEntryStatus.DRAFT) {
        throw new AccountingValidationError('Only DRAFT journal entries can be posted');
      }
      await assertOpenAccountingPeriod(journalEntry.entityId, journalEntry.date, {
        client: tx,
      });

      const validationError = validateBalancedJournalEntry(journalEntry.lines);

      if (validationError) {
        throw new AccountingValidationError(validationError);
      }

      const postedAt = new Date();
      const updateResult = await tx.journalEntry.updateMany({
        where: {
          id: journalEntry.id,
          status: JournalEntryStatus.DRAFT,
        },
        data: {
          status: JournalEntryStatus.POSTED,
          postedAt,
          postedById: req.user.id,
        },
      });

      if (updateResult.count !== 1) {
        throw new AccountingValidationError('Journal entry has already been posted');
      }

      if (journalEntry.transactionId) {
        await tx.businessTransaction.update({
          where: { id: journalEntry.transactionId },
          data: { status: TransactionStatus.POSTED },
        });
      }

      await createAuditLog(tx, {
        userId: req.user.id,
        entityId: journalEntry.entityId,
        action: 'JOURNAL_ENTRY_POSTED',
        resourceType: 'JournalEntry',
        resourceId: journalEntry.id,
        metadata: {
          before: { status: JournalEntryStatus.DRAFT },
          after: { status: JournalEntryStatus.POSTED },
          transactionId: journalEntry.transactionId,
        },
      });

      return tx.journalEntry.findUniqueOrThrow({
        where: { id: journalEntry.id },
        include: {
          transaction: true,
          lines: {
            include: { account: true },
          },
        },
      });
    });

    jsonSuccess(res, postedJournalEntry);
  } catch (error) {
    if (error instanceof AccountingValidationError) {
      if (error.message === 'Forbidden') {
        jsonError(res, 403, 'Forbidden');
        return;
      }
      jsonError(res, error.message === 'Journal entry not found' ? 404 : 400, error.message);
      return;
    }
    if (error instanceof AccountingPeriodValidationError) {
      jsonError(res, 400, error.message);
      return;
    }

    console.error('POST JOURNAL ENTRY ERROR:', error);
    jsonError(res, 500, 'Internal server error');
  }
});
