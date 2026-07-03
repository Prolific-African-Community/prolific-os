import PDFDocument from "pdfkit";
import { CellAlign, MarkdownTable, tryParseTable } from "../markdown/table";

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

const pdfAlign = (align: CellAlign): "left" | "center" | "right" => align;

const writeTable = (document: PDFKit.PDFDocument, table: MarkdownTable) => {
  const startX = document.page.margins.left;
  const usableWidth =
    document.page.width -
    document.page.margins.left -
    document.page.margins.right;
  const colCount = table.header.length || 1;
  const colWidth = usableWidth / colCount;
  const padX = 6;
  const padY = 5;
  const fontSize = 9.5;
  const bottomLimit = document.page.height - document.page.margins.bottom;

  const drawRow = (cells: string[], header: boolean) => {
    document.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);

    const heights = cells.map((cell) =>
      document.heightOfString(cleanInlineMarkdown(cell) || " ", {
        width: colWidth - padX * 2,
      })
    );
    const rowHeight = Math.max(...heights, fontSize) + padY * 2;

    if (document.y + rowHeight > bottomLimit) {
      document.addPage();
    }

    const y = document.y;

    if (header) {
      document
        .rect(startX, y, usableWidth, rowHeight)
        .fill("#f1f2f4");
    }

    cells.forEach((cell, index) => {
      const x = startX + index * colWidth;
      document.lineWidth(0.5).strokeColor("#d0d3d9");
      document.rect(x, y, colWidth, rowHeight).stroke();
      document
        .font(header ? "Helvetica-Bold" : "Helvetica")
        .fontSize(fontSize)
        .fillColor("#111111")
        .text(cleanInlineMarkdown(cell), x + padX, y + padY, {
          width: colWidth - padX * 2,
          align: pdfAlign(table.aligns[index] || "left"),
        });
    });

    document.x = startX;
    document.y = y + rowHeight;
  };

  document.moveDown(0.3);
  drawRow(table.header, true);
  for (const row of table.rows) {
    const padded = [...row];
    while (padded.length < colCount) padded.push("");
    drawRow(padded.slice(0, colCount), false);
  }
  document.x = startX;
  document.moveDown(0.6);
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

    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    let li = 0;

    while (li < lines.length) {
      const parsedTable = tryParseTable(lines, li);
      if (parsedTable) {
        writeTable(document, parsedTable.table);
        numberedIndex = 1;
        li = parsedTable.next;
        continue;
      }

      const line = lines[li].trim();
      li += 1;

      if (!line) {
        document.moveDown(0.5);
        numberedIndex = 1;
        continue;
      }

      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
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
