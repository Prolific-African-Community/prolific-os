import { JournalEntryStatus, Prisma } from '@prisma/client';
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

    const [accounts, postedLines] = await Promise.all([
      prisma.chartOfAccount.findMany({
        where: {
          entityId,
          isActive: true,
        },
        orderBy: { code: 'asc' },
      }),
      prisma.journalLine.findMany({
        where: {
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
        select: {
          accountId: true,
          debit: true,
          credit: true,
        },
      }),
    ]);

    const totalsByAccount = new Map<
      string,
      { debit: Prisma.Decimal; credit: Prisma.Decimal }
    >();

    for (const line of postedLines) {
      const current = totalsByAccount.get(line.accountId) || {
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(0),
      };

      totalsByAccount.set(line.accountId, {
        debit: current.debit.plus(line.debit),
        credit: current.credit.plus(line.credit),
      });
    }

    const zero = new Prisma.Decimal(0);
    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    const reportAccounts = accounts.map((account) => {
      const totals = totalsByAccount.get(account.id) || {
        debit: zero,
        credit: zero,
      };
      const balance = totals.debit.minus(totals.credit);

      totalDebit = totalDebit.plus(totals.debit);
      totalCredit = totalCredit.plus(totals.credit);

      return {
        accountId: account.id,
        accountCode: account.code,
        accountLabel: account.label,
        accountClass: account.accountClass,
        accountType: account.type,
        debit: decimalToString(totals.debit),
        credit: decimalToString(totals.credit),
        balance: decimalToString(balance),
      };
    });

    const difference = totalDebit.minus(totalCredit);

    jsonSuccess(res, {
      entityId,
      filters: {
        periodId,
        startDate: effectiveStartDate?.toISOString() || null,
        endDate: effectiveEndDate?.toISOString() || null,
      },
      totals: {
        debit: decimalToString(totalDebit),
        credit: decimalToString(totalCredit),
        difference: decimalToString(difference),
        balanced: difference.equals(0),
      },
      accounts: reportAccounts,
    });
  } catch (error) {
    console.error('ACCOUNTING TRIAL BALANCE REPORT ERROR:', error);
    jsonError(res, 500, 'Internal server error');
  }
});
