import { CounterpartyType } from '@prisma/client';
import type { NextApiResponse } from 'next';
import {
  getOptionalString,
  getQueryString,
  jsonError,
  jsonSuccess,
} from '../../../lib/accounting-api';
import { AuthenticatedNextApiRequest, withAuth } from '../../../lib/auth';
import { getCurrentUserRecord } from '../../../lib/entity-access';
import { canAccessEntity, canManageCounterparties } from '../../../lib/permissions';
import { prisma } from '../../../lib/prisma';
import { createAuditLog } from '../../../lib/audit-log';

interface CreateCounterpartyBody {
  entityId?: unknown;
  name?: unknown;
  type?: unknown;
  email?: unknown;
  vatNumber?: unknown;
  country?: unknown;
}

const parseCounterpartyType = (value: unknown): CounterpartyType | null => {
  if (typeof value !== 'string') {
    return null;
  }

  return Object.values(CounterpartyType).includes(value as CounterpartyType)
    ? (value as CounterpartyType)
    : null;
};

const listCounterparties = async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  const entityId = getQueryString(req.query.entityId);

  if (!entityId) {
    return jsonError(res, 400, 'entityId is required');
  }
  const currentUser = await getCurrentUserRecord(req.user.id);
  if (!currentUser || !(await canAccessEntity(currentUser, entityId))) {
    return jsonError(res, 403, 'Forbidden');
  }

  const counterparties = await prisma.counterparty.findMany({
    where: { entityId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      type: true,
      email: true,
      vatNumber: true,
      country: true,
      createdAt: true,
    },
  });

  return jsonSuccess(res, counterparties);
};

const createCounterparty = async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  const body = req.body as CreateCounterpartyBody;
  const entityId = getOptionalString(body.entityId);
  const name = getOptionalString(body.name);
  const type = parseCounterpartyType(body.type);

  if (!entityId) {
    return jsonError(res, 400, 'entityId is required');
  }
  const currentUser = await getCurrentUserRecord(req.user.id);
  if (!currentUser || !(await canManageCounterparties(currentUser, entityId))) {
    return jsonError(res, 403, 'Forbidden');
  }

  if (!name) {
    return jsonError(res, 400, 'name is required');
  }

  if (!type) {
    return jsonError(res, 400, 'A valid counterparty type is required');
  }

  const entity = await prisma.entity.findUnique({ where: { id: entityId } });

  if (!entity) {
    return jsonError(res, 404, 'Entity not found');
  }

  const counterparty = await prisma.$transaction(async (tx) => {
    const created = await tx.counterparty.create({
      data: {
        entityId,
        name,
        type,
        email: getOptionalString(body.email),
        vatNumber: getOptionalString(body.vatNumber),
        country: getOptionalString(body.country),
      },
    });
    await createAuditLog(tx, {
      userId: req.user.id,
      organizationId: entity.organizationId,
      entityId,
      action: 'COUNTERPARTY_CREATED',
      resourceType: 'Counterparty',
      resourceId: created.id,
      metadata: { name: created.name, type: created.type },
    });
    return created;
  });

  return jsonSuccess(res, counterparty, 201);
};

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method === 'GET') {
      await listCounterparties(req, res);
      return;
    }

    if (req.method === 'POST') {
      await createCounterparty(req, res);
      return;
    }

    jsonError(res, 405, 'Method not allowed');
  } catch (error) {
    console.error('ACCOUNTING COUNTERPARTIES ERROR:', error);
    jsonError(res, 500, 'Internal server error');
  }
});
