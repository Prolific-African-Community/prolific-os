import type { Resource } from "@prisma/client";
import {
  SourceBrief,
  SourceBriefStatus,
  keyFigureCount,
} from "./source-brief";

/**
 * Lightweight resource-extraction metadata layer.
 *
 * The database Resource model only has a single `extractedText` text column. To
 * avoid a schema migration while still persisting rich extraction state
 * (status, summary, page/sheet counts, warnings), we pack a compact JSON header
 * onto the front of `extractedText` and strip it back out at the API boundary.
 *
 * This module has NO heavy dependencies, so it is safe to import from the
 * client, the generation prompt builder, and the API serializers alike.
 */

export type ExtractionStatus =
  | "extracted" // full text extracted
  | "partial" // some text, but likely incomplete (e.g. scanned PDF)
  | "provided" // text supplied manually by the user
  | "visual" // image / visual asset, not text-extracted
  | "empty" // no text found
  | "unsupported" // file type we cannot extract
  | "too_large" // skipped: too large to process
  | "failed"; // extraction threw an error

export interface ExtractionMeta {
  status: ExtractionStatus;
  summary?: string | null;
  fileType?: string;
  pages?: number;
  sheets?: number;
  characters?: number;
  words?: number;
  tablesDetected?: number;
  warnings?: string[];
}

const PREFIX = "@@PROLIFIC_EXTRACTION@@";

/** Pack meta + clean text into a single string for the `extractedText` column. */
export function encodeExtraction(
  meta: ExtractionMeta,
  text: string | null
): string {
  const header = PREFIX + JSON.stringify(meta);
  return `${header}\n${text ?? ""}`;
}

/** Split a stored `extractedText` value back into clean text + parsed meta. */
export function decodeExtraction(stored: string | null | undefined): {
  text: string | null;
  meta: ExtractionMeta | null;
} {
  if (!stored) return { text: null, meta: null };
  if (!stored.startsWith(PREFIX)) return { text: stored, meta: null };

  const newlineIndex = stored.indexOf("\n");
  const headerEnd = newlineIndex === -1 ? stored.length : newlineIndex;
  const json = stored.slice(PREFIX.length, headerEnd);
  const text = newlineIndex === -1 ? "" : stored.slice(newlineIndex + 1);

  try {
    const meta = JSON.parse(json) as ExtractionMeta;
    return { text: text.trim() ? text : null, meta };
  } catch {
    return { text: stored, meta: null };
  }
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Derive a status/meta for legacy or manually-entered resources with no header. */
function fallbackMeta(mimeType: string, text: string | null): ExtractionMeta {
  if (mimeType.startsWith("image/")) {
    return { status: "visual", summary: "Visual asset — not text-extracted" };
  }
  if (text && text.trim()) {
    const words = countWords(text);
    return {
      status: "provided",
      characters: text.length,
      words,
      summary: `Provided text · ${words.toLocaleString("en-US")} words`,
    };
  }
  return { status: "empty", summary: "No text available" };
}

function parseSourceBrief(value: unknown): SourceBrief | null {
  return value && typeof value === "object" ? (value as SourceBrief) : null;
}

function briefStatus(resource: Resource): SourceBriefStatus | null {
  return (resource.sourceBriefStatus as SourceBriefStatus | null) ?? null;
}

/** Shared base DTO (no source-brief detail) with the extraction header decoded. */
function serializeBase(resource: Resource) {
  const { text, meta } = decodeExtraction(resource.extractedText);
  const brief = parseSourceBrief(resource.sourceBrief);
  return {
    base: {
      id: resource.id,
      projectId: resource.projectId,
      documentId: resource.documentId,
      filename: resource.filename,
      mimeType: resource.mimeType,
      sizeBytes: resource.sizeBytes,
      storageUrl: resource.storageUrl,
      extractedText: text,
      extraction: meta ?? fallbackMeta(resource.mimeType, text),
      sourceBriefStatus: briefStatus(resource),
      sourceBriefSummary: brief?.summary ?? null,
      keyFigureCount: keyFigureCount(brief),
      sourceBriefUpdatedAt: resource.sourceBriefUpdatedAt
        ? resource.sourceBriefUpdatedAt.toISOString()
        : null,
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
    },
    brief,
  };
}

/** Full DTO — includes the complete source brief. Use for detail/upload/distill. */
export function serializeResource(resource: Resource) {
  const { base, brief } = serializeBase(resource);
  return {
    ...base,
    sourceBrief: brief,
    sourceBriefText: resource.sourceBriefText ?? null,
    sourceBriefModel: resource.sourceBriefModel ?? null,
  };
}

/** Compact DTO for list views — omits the large brief JSON and Markdown. */
export function serializeResourceSummary(resource: Resource) {
  return serializeBase(resource).base;
}

/** UI presentation for each status (label + tone + short hint). */
export const EXTRACTION_STATUS_UI: Record<
  ExtractionStatus,
  { label: string; tone: "success" | "accent" | "warning" | "danger" | "neutral"; hint: string }
> = {
  extracted: {
    label: "Text extracted",
    tone: "success",
    hint: "Content is available to document generation.",
  },
  partial: {
    label: "Partially extracted",
    tone: "warning",
    hint: "Some text was read — the file may be scanned or image-based.",
  },
  provided: {
    label: "Text provided",
    tone: "accent",
    hint: "Text was added manually.",
  },
  visual: {
    label: "Visual asset",
    tone: "neutral",
    hint: "Stored as an image; text is not extracted yet.",
  },
  empty: {
    label: "No text found",
    tone: "neutral",
    hint: "No readable text could be extracted.",
  },
  unsupported: {
    label: "Unsupported type",
    tone: "neutral",
    hint: "This file type cannot be text-extracted.",
  },
  too_large: {
    label: "Too large to process",
    tone: "warning",
    hint: "The file exceeded the extraction size limit.",
  },
  failed: {
    label: "Extraction failed",
    tone: "danger",
    hint: "The file could not be read. It is still stored.",
  },
};
