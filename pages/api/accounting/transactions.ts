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
import { canAccessEntity, canCreateAccountingTransaction } from '../../../lib/permissions';
import { prisma } from '../../../lib/prisma';
import { createAuditLog } from '../../../lib/audit-log';

interface CreateTransactionBody {
  entityId?: unknown;
  fundId?: unknown;
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

  if (!entityId) {
    return jsonError(res, 400, 'entityId is required');
  }
  const currentUser = await getCurrentUserRecord(req.user.id);
  if (!currentUser || !(await canAccessEntity(currentUser, entityId))) {
    return jsonError(res, 403, 'Forbidden');
  }

  const transactions = await prisma.businessTransaction.findMany({
    where: { entityId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: {
      counterparty: true,
      project: true,
      journalEntries: true,
    },
  });

  return jsonSuccess(res, transactions);
};

const createTransaction = async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  const body = req.body as CreateTransactionBody;
  const entityId = getOptionalString(body.entityId);
  const fundId = getOptionalString(body.fundId);
  const projectId = getOptionalString(body.projectId);
  const counterpartyId = getOptionalString(body.counterpartyId);
  const description = getOptionalString(body.description);
  const transactionType = parseTransactionType(body.type);
  const amount = parseAmount(body.amount);
  const date = parseDate(body.date);

  if (!entityId) {
    return jsonError(res, 400, 'entityId is required');
  }
  const currentUser = await getCurrentUserRecord(req.user.id);
  if (!currentUser || !(await canCreateAccountingTransaction(currentUser, entityId))) {
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

  const entity = await prisma.entity.findUnique({ where: { id: entityId } });

  if (!entity) {
    return jsonError(res, 404, 'Entity not found');
  }

  const currency = getOptionalString(body.currency) || entity.baseCurrency || 'EUR';

  if (fundId) {
    const fund = await prisma.fund.findUnique({ where: { id: fundId } });

    if (!fund) {
      return jsonError(res, 404, 'Fund not found');
    }

    if (fund.entityId && fund.entityId !== entityId) {
      return jsonError(res, 400, 'Fund does not belong to the selected entity');
    }
  }

  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project) {
      return jsonError(res, 404, 'Project not found');
    }

    if (project.entityId && project.entityId !== entityId) {
      return jsonError(res, 400, 'Project does not belong to the selected entity');
    }
  }

  if (counterpartyId) {
    const counterparty = await prisma.counterparty.findUnique({ where: { id: counterpartyId } });

    if (!counterparty) {
      return jsonError(res, 404, 'Counterparty not found');
    }

    if (counterparty.entityId !== entityId) {
      return jsonError(res, 400, 'Counterparty does not belong to the selected entity');
    }
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

  const data = await prisma.$transaction(async (tx) => {
    const transaction = await tx.businessTransaction.create({
      data: {
        entityId,
        fundId,
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
    });

    const journalEntry = await tx.journalEntry.create({
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
      include: { lines: true },
    });

    await createAuditLog(tx, {
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
    });

    return { transaction, journalEntry };
  });

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
