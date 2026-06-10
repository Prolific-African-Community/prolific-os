import { DocumentType } from '@prisma/client';
import { put } from '@vercel/blob';
import formidable, { File } from 'formidable';
import { readFile } from 'fs/promises';
import type { NextApiResponse } from 'next';
import { jsonError, jsonSuccess } from '../../../../lib/accounting-api';
import { AuthenticatedNextApiRequest, withAuth } from '../../../../lib/auth';
import { createAuditLog } from '../../../../lib/audit-log';
import { getCurrentUserRecord } from '../../../../lib/entity-access';
import { canManageDocuments } from '../../../../lib/permissions';
import { prisma } from '../../../../lib/prisma';

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

type ParsedUploadForm = {
  fields: formidable.Fields;
  files: formidable.Files;
};

const parseUploadForm = async (req: AuthenticatedNextApiRequest): Promise<ParsedUploadForm> => {
  const form = formidable({
    multiples: false,
    maxFileSize: MAX_FILE_SIZE,
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ fields, files });
    });
  });
};

const getFieldValue = (fields: formidable.Fields, key: string) => {
  const value = fields[key];
  const firstValue = Array.isArray(value) ? value[0] : value;
  return typeof firstValue === 'string' && firstValue.trim() ? firstValue.trim() : undefined;
};

const getUploadedFile = (files: formidable.Files): File | null => {
  const value = files.file;
  const file = Array.isArray(value) ? value[0] : value;
  return file || null;
};

const isFileSizeError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as { code?: unknown; message?: unknown; httpCode?: unknown };
  const code = typeof maybeError.code === 'string' ? maybeError.code.toLowerCase() : '';
  const message =
    typeof maybeError.message === 'string' ? maybeError.message.toLowerCase() : '';

  return (
    maybeError.httpCode === 413 ||
    code.includes('max') ||
    message.includes('maxfilesize') ||
    message.includes('max file size') ||
    message.includes('maxtotalfilesize')
  );
};

const parseDocumentType = (value: string | undefined): DocumentType | null => {
  if (!value) {
    return DocumentType.OTHER;
  }

  return Object.values(DocumentType).includes(value as DocumentType)
    ? (value as DocumentType)
    : null;
};

const sanitizeFileName = (fileName: string) => {
  const fallback = 'document';
  const normalized = fileName
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();

  return normalized || fallback;
};

const withDocumentDownloadUrl = <T extends { id: string }>(document: T) => ({
  ...document,
  downloadUrl: `/api/accounting/documents/${document.id}/download`,
});

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return jsonError(res, 405, 'Method not allowed');
  }

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return jsonError(res, 500, 'Document storage is not configured');
    }

    let parsedForm: ParsedUploadForm;

    try {
      parsedForm = await parseUploadForm(req);
    } catch (parseError) {
      if (isFileSizeError(parseError)) {
        return jsonError(res, 400, 'File size must not exceed 10 MB');
      }

      throw parseError;
    }

    const { fields, files } = parsedForm;
    const entityId = getFieldValue(fields, 'entityId');
    const counterpartyId = getFieldValue(fields, 'counterpartyId');
    const transactionId =
      getFieldValue(fields, 'transactionId') || getFieldValue(fields, 'businessTransactionId');
    const title = getFieldValue(fields, 'title') || getFieldValue(fields, 'name');
    const type = parseDocumentType(getFieldValue(fields, 'type'));
    const file = getUploadedFile(files);

    if (!entityId) {
      return jsonError(res, 400, 'entityId is required');
    }

    const currentUser = await getCurrentUserRecord(req.user.id);
    if (!currentUser || !(await canManageDocuments(currentUser, entityId))) {
      return jsonError(res, 403, 'Forbidden');
    }

    if (!file) {
      return jsonError(res, 400, 'file is required');
    }

    if (!type) {
      return jsonError(res, 400, 'A valid document type is required');
    }

    const mimeType = file.mimetype || 'application/octet-stream';
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return jsonError(res, 400, 'Unsupported file type');
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonError(res, 400, 'File size must not exceed 10 MB');
    }

    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true, organizationId: true },
    });

    if (!entity) {
      return jsonError(res, 404, 'Entity not found');
    }

    if (counterpartyId) {
      const counterparty = await prisma.counterparty.findUnique({
        where: { id: counterpartyId },
        select: { id: true, entityId: true },
      });

      if (!counterparty) {
        return jsonError(res, 404, 'Counterparty not found');
      }

      if (counterparty.entityId !== entityId) {
        return jsonError(res, 400, 'Counterparty does not belong to the selected entity');
      }
    }

    if (transactionId) {
      const transaction = await prisma.businessTransaction.findUnique({
        where: { id: transactionId },
        select: { id: true, entityId: true },
      });

      if (!transaction) {
        return jsonError(res, 404, 'Transaction not found');
      }

      if (transaction.entityId !== entityId) {
        return jsonError(res, 400, 'Transaction does not belong to the selected entity');
      }
    }

    const originalFilename = file.originalFilename || 'document';
    const safeFileName = sanitizeFileName(originalFilename);
    const pathname = `entities/${entityId}/documents/${Date.now()}-${safeFileName}`;
    const fileBuffer = await readFile(file.filepath);
    const blob = await put(pathname, fileBuffer, {
      access: 'private',
      addRandomSuffix: true,
      contentType: mimeType,
    });

    const document = await prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          entityId,
          transactionId,
          counterpartyId,
          type,
          title: title || originalFilename,
          fileUrl: blob.url,
          originalFilename,
          mimeType,
          fileSize: file.size,
          storageProvider: 'VERCEL_BLOB',
          storageKey: blob.pathname || pathname,
          uploadedByUserId: req.user.id,
          status: 'UPLOADED',
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
        action: 'DOCUMENT_UPLOADED',
        resourceType: 'Document',
        resourceId: created.id,
        metadata: {
          documentId: created.id,
          fileName: originalFilename,
          mimeType,
          fileSize: file.size,
          documentType: created.type,
          counterpartyId,
          transactionId,
        },
      });

      return created;
    });

    return jsonSuccess(res, withDocumentDownloadUrl(document), 201);
  } catch (error) {
    console.error('ACCOUNTING DOCUMENT UPLOAD ERROR:', error);
    return jsonError(res, 500, 'Failed to upload document');
  }
});
