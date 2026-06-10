import { DocumentType } from '@prisma/client';
import type { NextApiResponse } from 'next';
import {
  getOptionalString,
  getQueryString,
  jsonError,
  jsonSuccess,
  parseOptionalInteger,
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
  title?: unknown;
  fileUrl?: unknown;
  originalFilename?: unknown;
  mimeType?: unknown;
  fileSize?: unknown;
  storageProvider?: unknown;
  storageKey?: unknown;
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

const withDocumentDownloadUrl = <T extends { id: string }>(document: T) => ({
  ...document,
  downloadUrl: `/api/accounting/documents/${document.id}/download`,
});

const listDocuments = async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  const entityId = getQueryString(req.query.entityId);
  const type = parseDocumentType(getQueryString(req.query.type));
  const status = getQueryString(req.query.status);
  const counterpartyId = getQueryString(req.query.counterpartyId);
  const transactionId = getQueryString(req.query.transactionId);
  const rawLimit = Number(getQueryString(req.query.limit) || 50);
  const rawOffset = Number(getQueryString(req.query.offset) || 0);
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
  const offset = Number.isInteger(rawOffset) && rawOffset > 0 ? rawOffset : 0;

  if (!entityId) {
    return jsonError(res, 400, 'entityId is required');
  }
  const currentUser = await getCurrentUserRecord(req.user.id);
  if (!currentUser || !(await canAccessEntity(currentUser, entityId))) {
    return jsonError(res, 403, 'Forbidden');
  }

  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: { id: true },
  });

  if (!entity) {
    return jsonError(res, 404, 'Entity not found');
  }

  const documents = await prisma.document.findMany({
    where: {
      entityId,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(counterpartyId ? { counterpartyId } : {}),
      ...(transactionId ? { transactionId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      counterparty: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      transaction: {
        select: {
          id: true,
          date: true,
          type: true,
          amount: true,
          currency: true,
          status: true,
          description: true,
        },
      },
      uploadedBy: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return jsonSuccess(res, documents.map(withDocumentDownloadUrl));
};

const createDocument = async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  const body = req.body as CreateDocumentBody;
  const entityId = getOptionalString(body.entityId);
  const transactionId = getOptionalString(body.transactionId);
  const counterpartyId = getOptionalString(body.counterpartyId);
  const type = parseDocumentType(body.type);
  const fileUrl = getOptionalString(body.fileUrl);
  const fileSize = parseOptionalInteger(body.fileSize);

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

  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: { id: true, organizationId: true },
  });

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
        title: getOptionalString(body.title),
        fileUrl,
        originalFilename: getOptionalString(body.originalFilename),
        mimeType: getOptionalString(body.mimeType),
        fileSize: fileSize ?? undefined,
        storageProvider: getOptionalString(body.storageProvider),
        storageKey: getOptionalString(body.storageKey),
        uploadedByUserId: req.user.id,
        status: getOptionalString(body.status) || 'UPLOADED',
      },
      include: {
        counterparty: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        transaction: {
          select: {
            id: true,
            date: true,
            type: true,
            amount: true,
            currency: true,
            status: true,
            description: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            email: true,
          },
        },
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
        fileName: created.originalFilename,
        mimeType: created.mimeType,
        fileSize: created.fileSize,
        transactionId: created.transactionId,
        counterpartyId: created.counterpartyId,
      },
    });
    return created;
  });

  return jsonSuccess(res, withDocumentDownloadUrl(document), 201);
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
