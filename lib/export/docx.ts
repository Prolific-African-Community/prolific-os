import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { CellAlign, tryParseTable } from "../markdown/table";

const spacing = {
  after: 180,
};

const cleanInlineMarkdown = (value: string) =>
  value
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();

const paragraph = (text: string) =>
  new Paragraph({
    children: [new TextRun(cleanInlineMarkdown(text))],
    spacing,
  });

const heading = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) =>
  new Paragraph({
    text: cleanInlineMarkdown(text),
    heading: level,
    spacing: {
      before: 240,
      after: 120,
    },
  });

const bullet = (text: string) =>
  new Paragraph({
    children: [new TextRun(cleanInlineMarkdown(text))],
    bullet: {
      level: 0,
    },
    spacing,
  });

const numbered = (text: string) =>
  new Paragraph({
    children: [new TextRun(cleanInlineMarkdown(text))],
    numbering: {
      reference: "default-numbering",
      level: 0,
    },
    spacing,
  });

const docxAlign = (align: CellAlign) =>
  align === "right"
    ? AlignmentType.RIGHT
    : align === "center"
    ? AlignmentType.CENTER
    : AlignmentType.LEFT;

const tableCell = (
  text: string,
  align: CellAlign,
  header: boolean
) =>
  new TableCell({
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    shading: header
      ? { type: ShadingType.CLEAR, fill: "F1F2F4", color: "auto" }
      : undefined,
    children: [
      new Paragraph({
        alignment: docxAlign(align),
        children: [
          new TextRun({ text: cleanInlineMarkdown(text), bold: header }),
        ],
      }),
    ],
  });

const markdownTable = (
  header: string[],
  rows: string[][],
  aligns: CellAlign[]
) => {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "D0D3D9" };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: border,
      bottom: border,
      left: border,
      right: border,
      insideHorizontal: border,
      insideVertical: border,
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: header.map((cell, i) =>
          tableCell(cell, aligns[i] || "left", true)
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((cell, i) =>
              tableCell(cell, aligns[i] || "left", false)
            ),
          })
      ),
    ],
  });
};

function markdownToBlocks(markdown: string): (Paragraph | Table)[] {
  const blocks: (Paragraph | Table)[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const parsedTable = tryParseTable(lines, i);
    if (parsedTable) {
      const { table } = parsedTable;
      blocks.push(markdownTable(table.header, table.rows, table.aligns));
      blocks.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      i = parsedTable.next;
      continue;
    }

    const line = lines[i].trim();
    i += 1;

    if (!line) {
      blocks.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    if (headingMatch) {
      const [, marks, text] = headingMatch;
      blocks.push(
        heading(
          text,
          marks.length === 1
            ? HeadingLevel.HEADING_1
            : marks.length === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3
        )
      );
      continue;
    }

    const bulletMatch = /^[-*+]\s+(.+)$/.exec(line);
    if (bulletMatch) {
      blocks.push(bullet(bulletMatch[1]));
      continue;
    }

    const numberedMatch = /^\d+[.)]\s+(.+)$/.exec(line);
    if (numberedMatch) {
      blocks.push(numbered(numberedMatch[1]));
      continue;
    }

    blocks.push(paragraph(line));
  }

  return blocks.length ? blocks : [paragraph(markdown)];
}

export async function markdownToDocxBuffer(markdown: string) {
  const document = new Document({
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: "left",
              style: {
                paragraph: {
                  indent: {
                    left: 720,
                    hanging: 260,
                  },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: markdownToBlocks(markdown),
      },
    ],
  });

  return Packer.toBuffer(document);
}
