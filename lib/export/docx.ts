import {
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

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

function markdownToParagraphs(markdown: string) {
  const paragraphs: Paragraph[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      paragraphs.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);

    if (headingMatch) {
      const [, marks, text] = headingMatch;

      paragraphs.push(
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

    const bulletMatch = /^[-*]\s+(.+)$/.exec(line);

    if (bulletMatch) {
      paragraphs.push(bullet(bulletMatch[1]));
      continue;
    }

    const numberedMatch = /^\d+[.)]\s+(.+)$/.exec(line);

    if (numberedMatch) {
      paragraphs.push(numbered(numberedMatch[1]));
      continue;
    }

    paragraphs.push(paragraph(line));
  }

  return paragraphs.length ? paragraphs : [paragraph(markdown)];
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
        children: markdownToParagraphs(markdown),
      },
    ],
  });

  return Packer.toBuffer(document);
}
