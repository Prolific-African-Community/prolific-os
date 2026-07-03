import mammoth from "mammoth";

export interface RawDocxExtraction {
  text: string;
  warnings: string[];
}

export async function extractDocx(buffer: Buffer): Promise<RawDocxExtraction> {
  const result = await mammoth.extractRawText({ buffer });
  const warnings = (result.messages || [])
    .filter((m) => m.type === "warning" || m.type === "error")
    .map((m) => m.message)
    .slice(0, 10);

  return {
    text: (result.value || "").trim(),
    warnings,
  };
}
