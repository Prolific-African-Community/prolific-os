import { JournalEntryStatus } from '@prisma/client';
import type { NextApiResponse } from 'next';
import {
  decimalToString,
  getQueryString,
  jsonError,
  jsonSuccess,
  parseOptionalDateFilter,
} from '../../../../lib/accounting-api';
import { AuthenticatedNextApiRequest, withAuth } from '../../../../lib/auth';
import { getCurrentUserRecord } from '../../../../lib/entity-access';
import { canViewReports } from '../../../../lib/permissions';
import { prisma } from '../../../../lib/prisma';

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    jsonError(res, 405, 'Method not allowed');
    return;
  }

  const entityId = getQueryString(req.query.entityId);
  const periodId = getQueryString(req.query.periodId);
  const accountId = getQueryString(req.query.accountId);
  const startDate = parseOptionalDateFilter(req.query.startDate);
  const endDate = parseOptionalDateFilter(req.query.endDate);

  if (!entityId) {
    jsonError(res, 400, 'entityId is required');
    return;
  }

  if (req.query.startDate && !startDate) {
    jsonError(res, 400, 'startDate must be a valid date');
    return;
  }

  if (req.query.endDate && !endDate) {
    jsonError(res, 400, 'endDate must be a valid date');
    return;
  }

  if (startDate && endDate && startDate > endDate) {
    jsonError(res, 400, 'startDate must be before or equal to endDate');
    return;
  }

  try {
    const currentUser = await getCurrentUserRecord(req.user.id);
    if (!currentUser || !(await canViewReports(currentUser, entityId))) {
      jsonError(res, 403, 'Forbidden');
      return;
    }

    const entity = await prisma.entity.findUnique({ where: { id: entityId } });

    if (!entity) {
      jsonError(res, 404, 'Entity not found');
      return;
    }
    const period = periodId
      ? await prisma.accountingPeriod.findFirst({ where: { id: periodId, entityId } })
      : null;
    if (periodId && !period) {
      jsonError(res, 404, 'Accounting period not found for the selected entity');
      return;
    }
    const effectiveStartDate = period?.startDate || startDate;
    const effectiveEndDate = period?.endDate || endDate;

    if (accountId) {
      const account = await prisma.chartOfAccount.findFirst({
        where: {
          id: accountId,
          entityId,
        },
      });

      if (!account) {
        jsonError(res, 404, 'Account not found for the selected entity');
        return;
      }
    }

    const lines = await prisma.journalLine.findMany({
      where: {
        ...(accountId ? { accountId } : {}),
        journalEntry: {
          entityId,
          status: JournalEntryStatus.POSTED,
          ...(effectiveStartDate || effectiveEndDate
            ? {
                date: {
                  ...(effectiveStartDate ? { gte: effectiveStartDate } : {}),
                  ...(effectiveEndDate ? { lte: effectiveEndDate } : {}),
                },
              }
            : {}),
        },
      },
      orderBy: [
        { journalEntry: { date: 'asc' } },
        { journalEntry: { createdAt: 'asc' } },
      ],
      include: {
        account: true,
        counterparty: true,
        project: true,
        journalEntry: true,
      },
    });

    jsonSuccess(res, {
      entityId,
      filters: {
        periodId,
        accountId,
        startDate: effectiveStartDate?.toISOString() || null,
        endDate: effectiveEndDate?.toISOString() || null,
      },
      lines: lines.map((line) => ({
        journalEntryId: line.journalEntryId,
        journalEntryDate: line.journalEntry.date.toISOString(),
        journalEntryDescription: line.journalEntry.description,
        accountId: line.accountId,
        accountCode: line.account.code,
        accountLabel: line.account.label,
        debit: decimalToString(line.debit),
        credit: decimalToString(line.credit),
        currency: line.currency,
        counterpartyName: line.counterparty?.name || null,
        projectName: line.project?.name || null,
        lineDescription: line.description || null,
      })),
    });
  } catch (error) {
    console.error('ACCOUNTING GENERAL LEDGER REPORT ERROR:', error);
    jsonError(res, 500, 'Internal server error');
  }
});
