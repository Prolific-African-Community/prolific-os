import PDFDocument from "pdfkit";

const cleanInlineMarkdown = (value: string) =>
  value
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();

const writeParagraph = (
  document: PDFKit.PDFDocument,
  text: string,
  options: { size?: number; continued?: boolean } = {}
) => {
  document
    .font("Helvetica")
    .fontSize(options.size || 11)
    .fillColor("#111111")
    .text(cleanInlineMarkdown(text), {
      align: "left",
      lineGap: 4,
      paragraphGap: 8,
    });
};

const writeHeading = (
  document: PDFKit.PDFDocument,
  text: string,
  level: 1 | 2 | 3
) => {
  const size = level === 1 ? 22 : level === 2 ? 17 : 14;
  const topGap = level === 1 ? 12 : 10;

  document.moveDown(topGap / 10);
  document
    .font("Helvetica-Bold")
    .fontSize(size)
    .fillColor("#111111")
    .text(cleanInlineMarkdown(text), {
      align: "left",
      lineGap: 2,
      paragraphGap: 8,
    });
  document.moveDown(0.2);
};

const writeBullet = (document: PDFKit.PDFDocument, text: string) => {
  const x = document.x;
  const y = document.y;

  document
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#111111")
    .text("-", x, y, { continued: true })
    .text(`  ${cleanInlineMarkdown(text)}`, {
      lineGap: 4,
      paragraphGap: 4,
      indent: 14,
    });
};

const writeNumbered = (
  document: PDFKit.PDFDocument,
  text: string,
  index: number
) => {
  document
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#111111")
    .text(`${index}. ${cleanInlineMarkdown(text)}`, {
      lineGap: 4,
      paragraphGap: 4,
      indent: 14,
    });
};

export async function markdownToPdfBuffer(markdown: string) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const document = new PDFDocument({
      size: "A4",
      margins: {
        top: 56,
        right: 56,
        bottom: 56,
        left: 56,
      },
      bufferPages: true,
    });
    let numberedIndex = 1;

    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
      const line = rawLine.trim();

      if (!line) {
        document.moveDown(0.5);
        numberedIndex = 1;
        continue;
      }

      const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);

      if (headingMatch) {
        const [, marks, text] = headingMatch;
        writeHeading(document, text, marks.length as 1 | 2 | 3);
        numberedIndex = 1;
        continue;
      }

      const bulletMatch = /^[-*]\s+(.+)$/.exec(line);

      if (bulletMatch) {
        writeBullet(document, bulletMatch[1]);
        numberedIndex = 1;
        continue;
      }

      const numberedMatch = /^\d+[.)]\s+(.+)$/.exec(line);

      if (numberedMatch) {
        writeNumbered(document, numberedMatch[1], numberedIndex);
        numberedIndex += 1;
        continue;
      }

      writeParagraph(document, line);
      numberedIndex = 1;
    }

    document.end();
  });
}
