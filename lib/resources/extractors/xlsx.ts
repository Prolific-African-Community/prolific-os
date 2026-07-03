import * as XLSX from "xlsx";

export interface RawXlsxExtraction {
  text: string;
  sheets: number;
  tablesDetected: number;
  warnings: string[];
}

const MAX_ROWS_PER_SHEET = 200;
const MAX_COLS = 30;

const cell = (value: unknown) =>
  String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .trim();

/** Render a sheet's rows as a compact, valid Markdown table. */
function sheetToMarkdown(name: string, rows: unknown[][]): string | null {
  // Drop fully empty rows.
  const filtered = rows.filter((row) =>
    row.some((c) => String(c ?? "").trim() !== "")
  );
  if (!filtered.length) return null;

  const width = Math.min(
    Math.max(...filtered.map((r) => r.length), 1),
    MAX_COLS
  );
  const truncatedRows = filtered.length > MAX_ROWS_PER_SHEET;
  const body = filtered.slice(0, MAX_ROWS_PER_SHEET);

  const norm = (row: unknown[]) => {
    const out: string[] = [];
    for (let i = 0; i < width; i += 1) out.push(cell(row[i]));
    return out;
  };

  const [headerRow, ...dataRows] = body;
  const header = norm(headerRow);
  const separator = header.map(() => "---");

  const lines = [
    `### ${name}`,
    `| ${header.join(" | ")} |`,
    `| ${separator.join(" | ")} |`,
    ...dataRows.map((r) => `| ${norm(r).join(" | ")} |`),
  ];

  if (truncatedRows) {
    lines.push(
      `_(${filtered.length - MAX_ROWS_PER_SHEET} additional rows not shown)_`
    );
  }

  return lines.join("\n");
}

export function extractXlsx(buffer: Buffer): RawXlsxExtraction {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const warnings: string[] = [];
  const sections: string[] = [];
  let tablesDetected = 0;

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });
    const markdown = sheetToMarkdown(name, rows);
    if (markdown) {
      sections.push(markdown);
      tablesDetected += 1;
    }
  }

  if (workbook.SheetNames.length > 0 && tablesDetected === 0) {
    warnings.push("The workbook contains no readable cell data.");
  }

  return {
    text: sections.join("\n\n").trim(),
    sheets: workbook.SheetNames.length,
    tablesDetected,
    warnings,
  };
}
