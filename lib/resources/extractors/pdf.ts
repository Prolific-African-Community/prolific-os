// Import the internal lib path directly to avoid pdf-parse's index.js debug
// block, which tries to read a bundled sample PDF when required as an entry.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export interface RawPdfExtraction {
  text: string;
  pages: number;
}

export async function extractPdf(buffer: Buffer): Promise<RawPdfExtraction> {
  const data = await pdfParse(buffer);
  return {
    text: (data.text || "").trim(),
    pages: data.numpages || 0,
  };
}
