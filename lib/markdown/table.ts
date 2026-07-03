/**
 * Minimal, dependency-free GitHub-flavoured Markdown table parser shared by the
 * Markdown preview and the DOCX / PDF exporters, so tables render consistently
 * everywhere instead of leaking raw `| ... |` pipes.
 */

export type CellAlign = "left" | "center" | "right";

export interface MarkdownTable {
  header: string[];
  rows: string[][];
  aligns: CellAlign[];
}

/** Split a single table line into trimmed, unescaped cells. */
export function splitRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
  return trimmed
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, "|").trim());
}

/** True when a line is a valid table separator row (e.g. `|---|:--:|--:|`). */
export function isSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("-") || !trimmed.includes("|")) return false;
  const cells = splitRow(trimmed);
  if (!cells.length) return false;
  return cells.every((cell) => /^:?-{1,}:?$/.test(cell.replace(/\s+/g, "")));
}

function alignOf(cell: string): CellAlign {
  const c = cell.replace(/\s+/g, "");
  const left = c.startsWith(":");
  const right = c.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  return "left";
}

/**
 * Attempt to parse a Markdown table starting at `start`. Returns the parsed
 * table and the index of the first line after the table, or null if there is no
 * valid table (header row followed by a separator row) at that position.
 */
export function tryParseTable(
  lines: string[],
  start: number
): { table: MarkdownTable; next: number } | null {
  const headerLine = lines[start];
  const separatorLine = lines[start + 1];

  if (!headerLine || !separatorLine) return null;
  if (!headerLine.includes("|")) return null;
  if (!isSeparatorRow(separatorLine)) return null;

  const header = splitRow(headerLine);
  const aligns = splitRow(separatorLine).map(alignOf);

  const rows: string[][] = [];
  let i = start + 2;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || !line.includes("|")) break;
    const cells = splitRow(line);
    // Normalise cell count to the header width.
    while (cells.length < header.length) cells.push("");
    rows.push(cells.slice(0, header.length));
    i += 1;
  }

  return { table: { header, rows, aligns }, next: i };
}
