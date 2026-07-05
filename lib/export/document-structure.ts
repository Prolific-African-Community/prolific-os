import { CellAlign, tryParseTable } from "../markdown/table";

/**
 * Shared Markdown → block parser for the DOCX and PDF renderers, so both
 * outputs are driven by the same document structure instead of two ad-hoc
 * line loops.
 */

export type CalloutKind = "note" | "risk" | "decision" | "warning" | "missing";

export type DocumentBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; header: string[]; rows: string[][]; aligns: CellAlign[] }
  | { type: "blockquote"; text: string }
  | { type: "callout"; kind: CalloutKind; text: string }
  | { type: "divider" };

const CALLOUT_MARKERS: Record<string, CalloutKind> = {
  NOTE: "note",
  RISK: "risk",
  RISQUE: "risk",
  DECISION: "decision",
  DÉCISION: "decision",
  WARNING: "warning",
  VIGILANCE: "warning",
  MISSING: "missing",
  INFO: "note",
};

/** Light label detection inside blockquotes ("Risque : …" → risk callout). */
const CALLOUT_LABEL_PATTERNS: Array<{ kind: CalloutKind; pattern: RegExp }> = [
  { kind: "risk", pattern: /^risques?\s*:/i },
  { kind: "warning", pattern: /^points? de vigilance\s*:/i },
  { kind: "decision", pattern: /^d[ée]cisions?( [àa] prendre)?\s*:/i },
  { kind: "decision", pattern: /^arbitrages?( requis)?\s*:/i },
  { kind: "missing", pattern: /^[àa] confirmer\s*:/i },
  { kind: "missing", pattern: /^[àa] compl[ée]ter\s*:/i },
];

function detectCallout(
  quote: string
): { kind: CalloutKind; text: string } | null {
  // Explicit marker: [!RISK] on the first line.
  const marker = /^\[!([A-ZÉÈ]+)\]\s*/.exec(quote.trim());
  if (marker) {
    const kind = CALLOUT_MARKERS[marker[1].toUpperCase()];
    if (kind) {
      return { kind, text: quote.trim().slice(marker[0].length).trim() };
    }
  }
  // Light label prefix detection.
  for (const { kind, pattern } of CALLOUT_LABEL_PATTERNS) {
    if (pattern.test(quote.trim())) {
      return { kind, text: quote.trim() };
    }
  }
  return null;
}

export function parseMarkdownBlocks(markdown: string): DocumentBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: DocumentBlock[] = [];
  let i = 0;

  const flushParagraph = (buffer: string[]) => {
    const text = buffer.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    buffer.length = 0;
  };

  const paragraphBuffer: string[] = [];

  while (i < lines.length) {
    const table = tryParseTable(lines, i);
    if (table) {
      flushParagraph(paragraphBuffer);
      blocks.push({
        type: "table",
        header: table.table.header,
        rows: table.table.rows,
        aligns: table.table.aligns,
      });
      i = table.next;
      continue;
    }

    const line = lines[i];
    const trimmed = line.trim();
    i += 1;

    if (!trimmed) {
      flushParagraph(paragraphBuffer);
      continue;
    }

    // Skip code fences entirely (rare in business documents).
    if (trimmed.startsWith("```")) {
      flushParagraph(paragraphBuffer);
      while (i < lines.length && !lines[i].trim().startsWith("```")) i += 1;
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph(paragraphBuffer);
      blocks.push({ type: "divider" });
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph(paragraphBuffer);
      const level = Math.min(heading[1].length, 3) as 1 | 2 | 3;
      blocks.push({ type: "heading", level, text: heading[2].trim() });
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph(paragraphBuffer);
      const quote: string[] = [trimmed.replace(/^>\s?/, "")];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      const quoteText = quote.join("\n");
      const callout = detectCallout(quoteText);
      if (callout) {
        blocks.push({ type: "callout", kind: callout.kind, text: callout.text });
      } else {
        blocks.push({ type: "blockquote", text: quoteText });
      }
      continue;
    }

    const bullet = /^[-*+]\s+(.+)$/.exec(trimmed);
    const numbered = /^\d+[.)]\s+(.+)$/.exec(trimmed);
    if (bullet || numbered) {
      flushParagraph(paragraphBuffer);
      const ordered = Boolean(numbered);
      const items: string[] = [(bullet || numbered)![1]];
      while (i < lines.length) {
        const nb = /^[-*+]\s+(.+)$/.exec(lines[i].trim());
        const nn = /^\d+[.)]\s+(.+)$/.exec(lines[i].trim());
        const next = ordered ? nn : nb;
        if (!next) break;
        items.push(next[1]);
        i += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushParagraph(paragraphBuffer);
  return blocks;
}

/* ------------------------------------------------------- Inline segments */

export interface InlineSegment {
  text: string;
  bold: boolean;
  italic: boolean;
}

/** Minimal inline Markdown → styled segments (**bold**, *italic*; links and
 * inline code are flattened to plain text). */
export function parseInlineSegments(text: string): InlineSegment[] {
  let source = text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  const segments: InlineSegment[] = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > last) {
      segments.push({ text: source.slice(last, match.index), bold: false, italic: false });
    }
    if (match[2] !== undefined) {
      segments.push({ text: match[2], bold: true, italic: false });
    } else {
      segments.push({ text: match[3], bold: false, italic: true });
    }
    last = match.index + match[0].length;
  }
  if (last < source.length) {
    segments.push({ text: source.slice(last), bold: false, italic: false });
  }
  return segments.filter((s) => s.text.length > 0);
}

export function plainText(text: string): string {
  return parseInlineSegments(text)
    .map((s) => s.text)
    .join("");
}

/* --------------------------------------------------------------- Headings */

export interface HeadingEntry {
  level: 2 | 3;
  text: string;
}

/** Normalize a heading/section title for matching (case, accents, numbering). */
export function normalizeHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^\d+(\.\d+)*[.)]?\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when a heading already carries its own number ("1. Contexte"). */
export function headingHasOwnNumber(text: string): boolean {
  return /^\d+(\.\d+)*[.)]?\s/.test(text.trim());
}

/** H2/H3 outline for the table of contents (H1 is the document title). */
export function extractHeadings(
  blocks: DocumentBlock[],
  maxDepth: 2 | 3
): HeadingEntry[] {
  const out: HeadingEntry[] = [];
  for (const block of blocks) {
    if (block.type !== "heading") continue;
    if (block.level === 2 || (block.level === 3 && maxDepth >= 3)) {
      out.push({ level: block.level as 2 | 3, text: plainText(block.text) });
    }
  }
  return out;
}

/** Drop a leading H1 that duplicates the document title (it lives on the cover). */
export function stripLeadingTitle(
  blocks: DocumentBlock[],
  documentTitle: string
): DocumentBlock[] {
  const first = blocks[0];
  if (
    first &&
    first.type === "heading" &&
    first.level === 1 &&
    plainText(first.text).trim().toLowerCase() ===
      documentTitle.trim().toLowerCase()
  ) {
    return blocks.slice(1);
  }
  return blocks;
}
