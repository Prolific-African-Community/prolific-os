import path from "path";

export const RESOURCE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".txt": "text/plain",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const ALLOWED_MIME_TYPES = new Set(Object.values(MIME_BY_EXTENSION));

export function inferResourceMimeType(filename: string, mimeType?: string | null) {
  const normalizedMimeType = mimeType?.trim().toLowerCase() || "";
  const extension = path.extname(filename).toLowerCase();
  const inferredMimeType = MIME_BY_EXTENSION[extension];

  if (ALLOWED_MIME_TYPES.has(normalizedMimeType)) {
    return normalizedMimeType;
  }

  return inferredMimeType || null;
}

export function isSupportedResourceFile(
  filename: string,
  mimeType?: string | null
) {
  return Boolean(inferResourceMimeType(filename, mimeType));
}

export function sanitizeUploadedFilename(filename: string) {
  const basename = path.basename(filename).trim();
  const safeName = basename
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  return safeName || "uploaded-resource";
}

