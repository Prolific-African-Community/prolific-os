import { DocumentType } from '@prisma/client';
import type { NextApiResponse } from 'next';
import {
  getOptionalString,
  getQueryString,
  jsonError,
  jsonSuccess,
} from '../../../lib/accounting-api';
import { AuthenticatedNextApiRequest, withAuth } from '../../../lib/auth';
import { getCurrentUserRecord } from '../../../lib/entity-access';
import { canAccessEntity, canManageDocuments } from '../../../lib/permissions';
import { prisma } from '../../../lib/prisma';
import { createAuditLog } from '../../../lib/audit-log';

interface CreateDocumentBody {
  entityId?: unknown;
  transactionId?: unknown;
  counterpartyId?: unknown;
  type?: unknown;
  fileUrl?: unknown;
  originalFilename?: unknown;
  mimeType?: unknown;
  status?: unknown;
}

const parseDocumentType = (value: unknown): DocumentType | null => {
  if (typeof value !== 'string') {
    return null;
  }

  return Object.values(DocumentType).includes(value as DocumentType)
    ? (value as DocumentType)
    : null;
};

const listDocuments = async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  const entityId = getQueryString(req.query.entityId);

  if (!entityId) {
    return jsonError(res, 400, 'entityId is required');
  }
  const currentUser = await getCurrentUserRecord(req.user.id);
  if (!currentUser || !(await canAccessEntity(currentUser, entityId))) {
    return jsonError(res, 403, 'Forbidden');
  }

  const entity = await prisma.entity.findUnique({ where: { id: entityId } });

  if (!entity) {
    return jsonError(res, 404, 'Entity not found');
  }

  const documents = await prisma.document.findMany({
    where: { entityId },
    orderBy: { createdAt: 'desc' },
    include: {
      counterparty: true,
      transaction: true,
    },
  });

  return jsonSuccess(res, documents);
};

const createDocument = async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  const body = req.body as CreateDocumentBody;
  const entityId = getOptionalString(body.entityId);
  const transactionId = getOptionalString(body.transactionId);
  const counterpartyId = getOptionalString(body.counterpartyId);
  const type = parseDocumentType(body.type);
  const fileUrl = getOptionalString(body.fileUrl);

  if (!entityId) {
    return jsonError(res, 400, 'entityId is required');
  }
  const currentUser = await getCurrentUserRecord(req.user.id);
  if (!currentUser || !(await canManageDocuments(currentUser, entityId))) {
    return jsonError(res, 403, 'Forbidden');
  }

  if (!type) {
    return jsonError(res, 400, 'A valid document type is required');
  }

  if (!fileUrl) {
    return jsonError(res, 400, 'fileUrl is required');
  }

  const entity = await prisma.entity.findUnique({ where: { id: entityId } });

  if (!entity) {
    return jsonError(res, 404, 'Entity not found');
  }

  if (transactionId) {
    const transaction = await prisma.businessTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return jsonError(res, 404, 'Transaction not found');
    }

    if (transaction.entityId !== entityId) {
      return jsonError(res, 400, 'Transaction does not belong to the selected entity');
    }
  }

  if (counterpartyId) {
    const counterparty = await prisma.counterparty.findUnique({
      where: { id: counterpartyId },
    });

    if (!counterparty) {
      return jsonError(res, 404, 'Counterparty not found');
    }

    if (counterparty.entityId !== entityId) {
      return jsonError(res, 400, 'Counterparty does not belong to the selected entity');
    }
  }

  const document = await prisma.$transaction(async (tx) => {
    const created = await tx.document.create({
      data: {
        entityId,
        transactionId,
        counterpartyId,
        type,
        fileUrl,
        originalFilename: getOptionalString(body.originalFilename),
        mimeType: getOptionalString(body.mimeType),
        status: getOptionalString(body.status) || 'UPLOADED',
      },
      include: {
        counterparty: true,
        transaction: true,
      },
    });
    await createAuditLog(tx, {
      userId: req.user.id,
      organizationId: entity.organizationId,
      entityId,
      action: 'DOCUMENT_CREATED',
      resourceType: 'Document',
      resourceId: created.id,
      metadata: {
        type: created.type,
        status: created.status,
        transactionId: created.transactionId,
        counterpartyId: created.counterpartyId,
      },
    });
    return created;
  });

  return jsonSuccess(res, document, 201);
};

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method === 'GET') {
      await listDocuments(req, res);
      return;
    }

    if (req.method === 'POST') {
      await createDocument(req, res);
      return;
    }

    jsonError(res, 405, 'Method not allowed');
  } catch (error) {
    console.error('ACCOUNTING DOCUMENTS ERROR:', error);
    jsonError(res, 500, 'Internal server error');
  }
});
