import { JournalEntryStatus } from '@prisma/client';
import type { NextApiResponse } from 'next';
import {
  AccountingValidationError,
  getOptionalString,
  getQueryString,
  jsonError,
  jsonSuccess,
  parseDate,
} from '../../../../../lib/accounting-api';
import { AuthenticatedNextApiRequest, withAuth } from '../../../../../lib/auth';
import { getCurrentUserRecord } from '../../../../../lib/entity-access';
import { canReverseJournalEntry } from '../../../../../lib/permissions';
import { prisma } from '../../../../../lib/prisma';
import {
  AccountingPeriodValidationError,
  assertOpenAccountingPeriod,
} from '../../../../../lib/accounting-periods';
import { createAuditLog } from '../../../../../lib/audit-log';

interface ReverseJournalEntryBody {
  date?: unknown;
  description?: unknown;
}

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

  const body = (req.body || {}) as ReverseJournalEntryBody;
  const date = parseDate(body.date);
  const description =
    getOptionalString(body.description) || `Reversal of journal entry ${journalEntryId}`;

  if (!date) {
    jsonError(res, 400, 'date must be a valid ISO date string');
    return;
  }

  try {
    const reversalJournalEntry = await prisma.$transaction(async (tx) => {
      const originalJournalEntry = await tx.journalEntry.findUnique({
        where: { id: journalEntryId },
        include: { lines: true },
      });

      if (!originalJournalEntry) {
        throw new AccountingValidationError('Journal entry not found');
      }
      const currentUser = await getCurrentUserRecord(req.user.id);
      if (!currentUser || !(await canReverseJournalEntry(currentUser, originalJournalEntry.entityId))) {
        throw new AccountingValidationError('Forbidden');
      }

      if (originalJournalEntry.status !== JournalEntryStatus.POSTED) {
        throw new AccountingValidationError('Only POSTED journal entries can be reversed');
      }
      await assertOpenAccountingPeriod(originalJournalEntry.entityId, date, {
        client: tx,
        missingMessage: 'No open accounting period found for reversal date.',
      });

      if (!originalJournalEntry.lines.length) {
        throw new AccountingValidationError('Journal entry must have lines before it can be reversed');
      }

      const existingReversal = await tx.auditLog.findFirst({
        where: {
          entityType: 'JournalEntry',
          entityRecordId: originalJournalEntry.id,
          action: { in: ['REVERSE', 'JOURNAL_ENTRY_REVERSED'] },
        },
      });

      if (existingReversal) {
        throw new AccountingValidationError('Journal entry already reversed');
      }

      const postedAt = new Date();
      const reversal = await tx.journalEntry.create({
        data: {
          entityId: originalJournalEntry.entityId,
          transactionId: originalJournalEntry.transactionId,
          date,
          description,
          status: JournalEntryStatus.POSTED,
          postedAt,
          postedById: req.user.id,
          createdById: req.user.id,
          lines: {
            create: originalJournalEntry.lines.map((line) => ({
              accountId: line.accountId,
              projectId: line.projectId,
              counterpartyId: line.counterpartyId,
              debit: line.credit,
              credit: line.debit,
              currency: line.currency,
              description: `Reversal - ${line.description || originalJournalEntry.description}`,
            })),
          },
        },
        include: {
          transaction: true,
          lines: {
            include: { account: true },
          },
        },
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        entityId: originalJournalEntry.entityId,
        action: 'JOURNAL_ENTRY_REVERSED',
        resourceType: 'JournalEntry',
        resourceId: originalJournalEntry.id,
        metadata: {
          before: {
            journalEntryId: originalJournalEntry.id,
            status: originalJournalEntry.status,
          },
          after: {
            journalEntryId: reversal.id,
            status: reversal.status,
          },
        },
      });

      return reversal;
    });

    jsonSuccess(res, reversalJournalEntry, 201);
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

    console.error('REVERSE JOURNAL ENTRY ERROR:', error);
    jsonError(res, 500, 'Internal server error');
  }
});
