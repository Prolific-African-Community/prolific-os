import path from "path";
import { TextDecoder } from "util";

export const RESOURCE_EXTRACTED_TEXT_MAX_CHARS = 200000;

interface ExtractTextParams {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

const TEXT_EXTENSIONS = new Set([".md", ".markdown", ".txt"]);
const TEXT_MIME_TYPES = new Set(["text/markdown", "text/plain"]);

function supportsTextExtraction(filename: string, mimeType: string) {
  const extension = path.extname(filename).toLowerCase();

  return (
    TEXT_EXTENSIONS.has(extension) ||
    TEXT_MIME_TYPES.has(mimeType.trim().toLowerCase())
  );
}

function normalizeExtractedText(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, RESOURCE_EXTRACTED_TEXT_MAX_CHARS);
}

export function extractTextFromUploadedResource({
  filename,
  mimeType,
  buffer,
}: ExtractTextParams) {
  if (!supportsTextExtraction(filename, mimeType)) {
    return null;
  }

  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const text = normalizeExtractedText(decoder.decode(buffer));

    return text || null;
  } catch {
    return null;
  }
}

