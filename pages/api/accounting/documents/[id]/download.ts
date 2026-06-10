import { get } from '@vercel/blob';
import type { NextApiResponse } from 'next';
import { jsonError } from '../../../../../lib/accounting-api';
import { AuthenticatedNextApiRequest, withAuth } from '../../../../../lib/auth';
import { getCurrentUserRecord } from '../../../../../lib/entity-access';
import { canAccessEntity } from '../../../../../lib/permissions';
import { prisma } from '../../../../../lib/prisma';

const sanitizeDownloadFileName = (fileName: string) => {
  const sanitized = fileName
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-');

  return sanitized || 'document';
};

const getDocumentId = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return jsonError(res, 405, 'Method not allowed');
  }

  const documentId = getDocumentId(req.query.id);

  if (!documentId) {
    return jsonError(res, 400, 'Document id is required');
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        entityId: true,
        fileUrl: true,
        storageKey: true,
        originalFilename: true,
        mimeType: true,
        title: true,
      },
    });

    if (!document) {
      return jsonError(res, 404, 'Document not found');
    }

    const currentUser = await getCurrentUserRecord(req.user.id);
    if (!currentUser || !(await canAccessEntity(currentUser, document.entityId))) {
      return jsonError(res, 403, 'Forbidden');
    }

    const fileReference = document.storageKey || document.fileUrl;
    if (!fileReference) {
      return jsonError(res, 400, 'Document file reference is missing');
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return jsonError(res, 500, 'Missing BLOB_READ_WRITE_TOKEN');
    }

    const blob = await get(fileReference, {
      access: 'private',
      token: blobToken,
      useCache: false,
    });

    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return jsonError(res, 404, 'Document file not found');
    }

    const arrayBuffer = await new Response(blob.stream).arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const fileName = sanitizeDownloadFileName(
      document.originalFilename || document.title || document.id
    );
    const contentType =
      document.mimeType || blob.blob.contentType || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileBuffer.byteLength.toString());
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).send(fileBuffer);
  } catch (error) {
    console.error('DOCUMENT DOWNLOAD ERROR:', error);
    return jsonError(res, 500, 'Failed to access document file');
  }
});
