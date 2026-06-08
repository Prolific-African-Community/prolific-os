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
import { measureApi, measureStep } from '../../../../../lib/performance-log';

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
    const currentUser = await measureStep(
      'POST /api/accounting/journal-entries/[id]/post current user',
      () => getCurrentUserRecord(req.user.id)
    );

    const journalEntry = await measureStep(
      'POST /api/accounting/journal-entries/[id]/post entry lookup',
      () =>
        prisma.journalEntry.findUnique({
        where: { id: journalEntryId },
        select: {
          id: true,
          entityId: true,
          transactionId: true,
          date: true,
          status: true,
          lines: {
            select: {
              id: true,
              debit: true,
              credit: true,
              currency: true,
            },
          },
        },
      })
    );

    if (!journalEntry) {
      throw new AccountingValidationError('Journal entry not found');
    }

    if (!currentUser || !(await canPostJournalEntry(currentUser, journalEntry.entityId))) {
      throw new AccountingValidationError('Forbidden');
    }

    if (journalEntry.status !== JournalEntryStatus.DRAFT) {
      throw new AccountingValidationError('Only DRAFT journal entries can be posted');
    }

    await measureStep(
      'POST /api/accounting/journal-entries/[id]/post period check',
      () => assertOpenAccountingPeriod(journalEntry.entityId, journalEntry.date)
    );

    const validationError = validateBalancedJournalEntry(journalEntry.lines);

    if (validationError) {
      throw new AccountingValidationError(validationError);
    }

    const postedJournalEntry = await measureApi('POST /api/accounting/journal-entries/[id]/post write', () =>
      prisma.$transaction(async (tx) => {
        const postedAt = new Date();
        const updateResult = await measureStep(
          'POST /api/accounting/journal-entries/[id]/post update entry',
          () =>
            tx.journalEntry.updateMany({
              where: {
                id: journalEntry.id,
                status: JournalEntryStatus.DRAFT,
              },
              data: {
                status: JournalEntryStatus.POSTED,
                postedAt,
                postedById: req.user.id,
              },
            })
        );

        if (updateResult.count !== 1) {
          throw new AccountingValidationError('Journal entry has already been posted');
        }

        const transactionId = journalEntry.transactionId;

        if (transactionId) {
          await measureStep(
            'POST /api/accounting/journal-entries/[id]/post update transaction',
            () =>
              tx.businessTransaction.update({
                where: { id: transactionId },
                data: { status: TransactionStatus.POSTED },
              })
          );
        }

        await measureStep(
          'POST /api/accounting/journal-entries/[id]/post audit log',
          () =>
            createAuditLog(tx, {
              userId: req.user.id,
              entityId: journalEntry.entityId,
              action: 'JOURNAL_ENTRY_POSTED',
              resourceType: 'JournalEntry',
              resourceId: journalEntry.id,
              metadata: {
                before: { status: JournalEntryStatus.DRAFT },
                after: { status: JournalEntryStatus.POSTED },
                transactionId,
              },
            })
        );

        return {
          id: journalEntry.id,
          entityId: journalEntry.entityId,
          status: JournalEntryStatus.POSTED,
          postedAt,
          transactionId,
          lineCount: journalEntry.lines.length,
        };
      })
    );

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
