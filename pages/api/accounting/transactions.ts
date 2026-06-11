import { JournalEntryStatus, TransactionStatus } from '@prisma/client';
import type { NextApiResponse } from 'next';
import {
  applyDescriptionTemplate,
  getOptionalString,
  getQueryString,
  jsonError,
  jsonSuccess,
  parseAmount,
  parseDate,
  parseTransactionType,
} from '../../../lib/accounting-api';
import { AuthenticatedNextApiRequest, withAuth } from '../../../lib/auth';
import { getCurrentUserRecord } from '../../../lib/entity-access';
import { canAccessEntity, getEntityPermissionSummaryForContext } from '../../../lib/permissions';
import { prisma } from '../../../lib/prisma';
import { createAuditLog } from '../../../lib/audit-log';
import { measureApi, measureStep } from '../../../lib/performance-log';

interface CreateTransactionBody {
  entityId?: unknown;
  projectId?: unknown;
  counterpartyId?: unknown;
  type?: unknown;
  amount?: unknown;
  currency?: unknown;
  date?: unknown;
  description?: unknown;
}

const listTransactions = async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  const entityId = getQueryString(req.query.entityId);
  const rawLimit = Number(getQueryString(req.query.limit) || 50);
  const rawOffset = Number(getQueryString(req.query.offset) || 0);
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
  const offset = Number.isInteger(rawOffset) && rawOffset > 0 ? rawOffset : 0;

  if (!entityId) {
    return jsonError(res, 400, 'entityId is required');
  }
  const currentUser = await measureStep('GET /api/accounting/transactions current user', () =>
    getCurrentUserRecord(req.user.id)
  );
  if (!currentUser || !(await canAccessEntity(currentUser, entityId))) {
    return jsonError(res, 403, 'Forbidden');
  }

  const transactions = await measureStep('GET /api/accounting/transactions list', () =>
    prisma.businessTransaction.findMany({
    where: { entityId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    skip: offset,
    select: {
      id: true,
      date: true,
      type: true,
      amount: true,
      currency: true,
      status: true,
      description: true,
      counterparty: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  })
  );

  return jsonSuccess(res, transactions);
};

const createTransaction = async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  const body = req.body as CreateTransactionBody;
  const entityId = getOptionalString(body.entityId);
  const projectId = getOptionalString(body.projectId);
  const counterpartyId = getOptionalString(body.counterpartyId);
  const description = getOptionalString(body.description);
  const transactionType = parseTransactionType(body.type);
  const amount = parseAmount(body.amount);
  const date = parseDate(body.date);

  if (!entityId) {
    return jsonError(res, 400, 'entityId is required');
  }
  const currentUser = await measureStep('POST /api/accounting/transactions current user', () =>
    getCurrentUserRecord(req.user.id)
  );
  if (!currentUser) {
    return jsonError(res, 403, 'Forbidden');
  }

  if (!transactionType) {
    return jsonError(res, 400, 'A valid transaction type is required');
  }

  if (!amount) {
    return jsonError(res, 400, 'amount must be greater than 0');
  }

  if (!date) {
    return jsonError(res, 400, 'date must be a valid ISO date string');
  }

  const entity = await measureStep('POST /api/accounting/transactions entity lookup', () =>
    prisma.entity.findUnique({
      where: { id: entityId },
      select: {
        id: true,
        organizationId: true,
        baseCurrency: true,
        organization: {
          select: {
            isActive: true,
            status: true,
          },
        },
      },
    })
  );

  if (!entity) {
    return jsonError(res, 404, 'Entity not found');
  }

  const permissions = getEntityPermissionSummaryForContext(currentUser, {
    entityId,
    organizationId: entity.organizationId,
    organizationIsActive: entity.organization.isActive,
    organizationStatus: entity.organization.status,
  });

  if (!permissions.canCreateAccountingTransaction) {
    return jsonError(res, 403, 'Forbidden');
  }

  const currency = getOptionalString(body.currency) || entity.baseCurrency || 'EUR';

  const [project, counterparty] = await measureApi(
    'POST /api/accounting/transactions related lookups',
    () =>
      Promise.all([
        projectId
          ? measureStep('POST /api/accounting/transactions project lookup', () =>
              prisma.project.findUnique({
                where: { id: projectId },
                select: { id: true, entityId: true, name: true },
              })
            )
          : Promise.resolve(null),
        counterpartyId
          ? measureStep('POST /api/accounting/transactions counterparty lookup', () =>
              prisma.counterparty.findUnique({
                where: { id: counterpartyId },
                select: { id: true, entityId: true, name: true, type: true },
              })
            )
          : Promise.resolve(null),
      ])
  );

  if (projectId && !project) {
    return jsonError(res, 404, 'Project not found');
  }

  if (project?.entityId && project.entityId !== entityId) {
    return jsonError(res, 400, 'Project does not belong to the selected entity');
  }

  if (counterpartyId && !counterparty) {
    return jsonError(res, 404, 'Counterparty not found');
  }

  if (counterparty?.entityId !== undefined && counterparty?.entityId !== entityId) {
    return jsonError(res, 400, 'Counterparty does not belong to the selected entity');
  }

  const rule =
    (await prisma.accountingRule.findFirst({
      where: {
        entityId,
        transactionType,
        isActive: true,
      },
      orderBy: { priority: 'asc' },
    })) ||
    (await prisma.accountingRule.findFirst({
      where: {
        entityId: null,
        transactionType,
        isActive: true,
      },
      orderBy: { priority: 'asc' },
    }));

  if (!rule) {
    return jsonError(res, 400, `No active accounting rule found for ${transactionType}`);
  }

  const journalDescription = applyDescriptionTemplate(
    rule.descriptionTemplate,
    description,
    transactionType
  );

  const data = await measureApi('POST /api/accounting/transactions write', () =>
    prisma.$transaction(async (tx) => {
    const transaction = await measureStep('POST /api/accounting/transactions create transaction', () =>
      tx.businessTransaction.create({
      data: {
        entityId,
        projectId,
        counterpartyId,
        type: transactionType,
        amount,
        currency,
        date,
        description,
        status: TransactionStatus.DRAFT,
        createdById: req.user.id,
      },
      })
    );

    const journalEntry = await measureStep('POST /api/accounting/transactions create journal', () =>
      tx.journalEntry.create({
      data: {
        entityId,
        transactionId: transaction.id,
        date,
        description: journalDescription,
        status: JournalEntryStatus.DRAFT,
        createdById: req.user.id,
        lines: {
          create: [
            {
              accountId: rule.debitAccountId,
            projectId,
            counterpartyId,
            debit: amount,
            credit: 0,
            currency,
          },
          {
            accountId: rule.creditAccountId,
            projectId,
            counterpartyId,
            debit: 0,
            credit: amount,
            currency,
          },
        ],
      },
      },
      select: {
        id: true,
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
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            counterparty: {
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

    await measureStep('POST /api/accounting/transactions audit log', () =>
      createAuditLog(tx, {
      userId: req.user.id,
      organizationId: entity.organizationId,
      entityId,
      action: 'BUSINESS_TRANSACTION_CREATED',
      resourceType: 'BusinessTransaction',
      resourceId: transaction.id,
      metadata: {
        type: transaction.type,
        amount: transaction.amount.toString(),
        currency: transaction.currency,
        journalEntryId: journalEntry.id,
      },
      })
    );

    return {
      transaction: {
        id: transaction.id,
        date: transaction.date,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        description: transaction.description,
        counterparty: counterparty
          ? {
              id: counterparty.id,
              name: counterparty.name,
              type: counterparty.type,
            }
          : null,
      },
      journalEntry,
    };
    })
  );

  return jsonSuccess(res, data, 201);
};

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method === 'GET') {
      await listTransactions(req, res);
      return;
    }

    if (req.method === 'POST') {
      await createTransaction(req, res);
      return;
    }

    jsonError(res, 405, 'Method not allowed');
  } catch (error) {
    console.error('ACCOUNTING TRANSACTIONS ERROR:', error);
    jsonError(res, 500, 'Internal server error');
  }
});
