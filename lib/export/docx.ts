import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  PageBreak,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
  convertMillimetersToTwip,
} from "docx";
import { CellAlign } from "../markdown/table";
import { CompositionDocument } from "../composition";
import {
  CalloutKind as StructureCalloutKind,
  DocumentBlock,
  extractHeadings,
  parseInlineSegments,
  plainText,
} from "./document-structure";
import { composeForExport, imageNodeToRenderVisual, layoutNodeFlow, nodeToRenderBlock, resolveExportLayout } from "./composition-context";
import {
  DocumentRenderMetadata,
  DocumentRenderPreset,
  PageOrientationOption,
  RenderKeyFigure,
  RenderVisual,
  VISUAL_SIZE_RATIO,
  calloutLabel,
  formatRenderDate,
  guessLanguage,
  humanStatus,
  preparedByLabel,
  resolveRenderPreset,
  tocTitle,
} from "./rendering-presets";

export interface DocxRenderOptions {
  metadata?: DocumentRenderMetadata;
  presetId?: string;
  orientation?: PageOrientationOption;
}

/* ------------------------------------------------------------ Inline runs */

const pt = (points: number) => Math.round(points * 2); // docx uses half-points
const hex = (color: string) => color.replace("#", "");

function producedBy(metadata: DocumentRenderMetadata): string {
  return metadata.companyName || "Prolific OS";
}

function inlineRuns(
  text: string,
  overrides: { size?: number; color?: string; bold?: boolean } = {}
): TextRun[] {
  return parseInlineSegments(text).map(
    (seg) =>
      new TextRun({
        text: seg.text,
        bold: overrides.bold || seg.bold,
        italics: seg.italic,
        size: overrides.size !== undefined ? pt(overrides.size) : undefined,
        color: overrides.color,
      })
  );
}

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "ffffff" } as const;
const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
};

/* ----------------------------------------------------------------- Tables */

const docxAlign = (align: CellAlign) =>
  align === "right"
    ? AlignmentType.RIGHT
    : align === "center"
    ? AlignmentType.CENTER
    : AlignmentType.LEFT;

function buildTable(
  header: string[],
  rows: string[][],
  aligns: CellAlign[],
  preset: DocumentRenderPreset
): Table {
  const pageWidthMm = preset.page.orientation === "landscape" ? 297 : 210;
  const usableTwips = convertMillimetersToTwip(
    pageWidthMm - preset.page.marginsMm.left - preset.page.marginsMm.right
  );
  const columns = Math.max(header.length, 1);
  const weights = Array.from({ length: columns }, (_, index) => {
    const values = [header[index] || "", ...rows.map((row) => row[index] || "")];
    return Math.min(34, Math.max(8, ...values.map((value) => plainText(value).length)));
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const widths = weights.map((weight) => Math.floor((usableTwips * weight) / totalWeight));
  widths[widths.length - 1] += usableTwips - widths.reduce((sum, width) => sum + width, 0);
  const border = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: hex(preset.colors.tableBorder),
  };
  const pad = preset.tables.style === "compact" ? 60 : 80;
  const cell = (text: string, align: CellAlign, isHeader: boolean, zebra: boolean, width: number) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      margins: { top: pad, bottom: pad, left: 110, right: 110 },
      shading: isHeader
        ? {
            type: ShadingType.CLEAR,
            fill: hex(preset.colors.tableHeaderFill),
            color: "auto",
          }
        : zebra && preset.tables.zebra
        ? {
            type: ShadingType.CLEAR,
            fill: hex(preset.colors.tableZebra),
            color: "auto",
          }
        : undefined,
      children: [
        new Paragraph({
          alignment: docxAlign(align),
          children: inlineRuns(text, {
            size: preset.typography.bodySize - 1,
            bold: isHeader,
            color: isHeader ? hex(preset.colors.accent) : undefined,
          }),
        }),
      ],
    });

  return new Table({
    width: { size: usableTwips, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
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
        tableHeader: preset.tables.repeatHeader,
        cantSplit: preset.tables.avoidPageBreakInside,
        children: header.map((h, i) => cell(h, aligns[i] || "left", true, false, widths[i])),
      }),
      ...rows.map(
        (row, rowIndex) =>
          new TableRow({
            cantSplit: preset.tables.avoidPageBreakInside,
            children: row.map((c, i) =>
              cell(c, aligns[i] || "left", false, rowIndex % 2 === 1, widths[i])
            ),
          })
      ),
    ],
  });
}

/* --------------------------------------------------------------- Callouts */

function buildCallout(
  kind: StructureCalloutKind,
  text: string,
  preset: DocumentRenderPreset,
  language: "fr" | "en"
): (Table | Paragraph)[] {
  const accent = { style: BorderStyle.SINGLE, size: 18, color: hex(preset.colors.accent) };
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { ...NO_BORDERS, left: accent },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              margins: { top: 110, bottom: 110, left: 160, right: 160 },
              shading: {
                type: ShadingType.CLEAR,
                fill: hex(preset.colors.calloutFill),
                color: "auto",
              },
              children: [
                new Paragraph({
                  spacing: { after: 60 },
                  children: [
                    new TextRun({
                      text: calloutLabel(kind, language),
                      bold: true,
                      size: pt(7.5),
                      color: hex(preset.colors.accent),
                    }),
                  ],
                }),
                new Paragraph({
                  children: inlineRuns(text.replace(/\n/g, " "), {
                    size: preset.typography.bodySize - 0.5,
                  }),
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 160 } }),
  ];
}

/* ------------------------------------------------------------------ Body */

function blockToChildren(
  block: DocumentBlock,
  preset: DocumentRenderPreset,
  language: "fr" | "en"
): (Paragraph | Table)[] {
  const t = preset.typography;
  switch (block.type) {
    case "heading": {
      const level =
        block.level === 1
          ? HeadingLevel.HEADING_1
          : block.level === 2
          ? HeadingLevel.HEADING_2
          : HeadingLevel.HEADING_3;
      return [
        new Paragraph({
          heading: level,
          pageBreakBefore:
            block.level === 2 && preset.layout.pageBreakBeforeH2,
          spacing: {
            before: block.level === 2 ? 360 : 240,
            after: block.level === 2 ? 160 : 120,
          },
          border:
            block.level === 2
              ? {
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 6,
                    color: hex(preset.colors.rule),
                  },
                }
              : undefined,
          children: inlineRuns(plainText(block.text), { bold: true }),
        }),
      ];
    }
    case "paragraph":
      return [
        new Paragraph({
          spacing: { after: 160, line: Math.round(t.lineHeight * 240) },
          children: inlineRuns(block.text),
        }),
      ];
    case "list":
      return block.items.map(
        (item) =>
          new Paragraph({
            children: inlineRuns(item),
            spacing: { after: 80, line: Math.round(t.lineHeight * 240) },
            ...(block.ordered
              ? { numbering: { reference: "premium-numbering", level: 0 } }
              : { bullet: { level: 0 } }),
          })
      );
    case "callout":
      if (preset.callouts.enabled) {
        return buildCallout(block.kind, block.text, preset, language);
      }
      return [
        new Paragraph({
          indent: { left: 420 },
          spacing: { after: 120 },
          children: inlineRuns(block.text.replace(/\n/g, " "), {
            color: hex(preset.colors.muted),
          }),
        }),
      ];
    case "blockquote":
      return block.text.split("\n").map(
        (line) =>
          new Paragraph({
            indent: { left: 420 },
            spacing: { after: 120, line: Math.round(t.lineHeight * 240) },
            border: {
              left: {
                style: BorderStyle.SINGLE,
                size: 12,
                color: hex(preset.colors.rule),
              },
            },
            children: inlineRuns(line, { color: hex(preset.colors.muted) }),
          })
      );
    case "divider":
      return [
        new Paragraph({
          spacing: { before: 160, after: 160 },
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 4,
              color: hex(preset.colors.rule),
            },
          },
        }),
      ];
    case "table":
      return [
        buildTable(block.header, block.rows, block.aligns, preset),
        new Paragraph({ spacing: { after: 160 } }),
      ];
  }
}

/* -------------------------------------------------------- Key figure strip */

function keyFigureStrip(
  metadata: DocumentRenderMetadata,
  preset: DocumentRenderPreset
): (Table | Paragraph)[] {
  const figures = (metadata.keyFigures || []).slice(0, preset.keyFigures.max);
  if (!figures.length) return [];
  const topRule = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: hex(preset.colors.rule),
  };
  const columns = Math.min(figures.length, 3);
  const rows: RenderKeyFigure[][] = [];
  for (let index = 0; index < figures.length; index += columns) {
    rows.push(figures.slice(index, index + columns));
  }
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { ...NO_BORDERS, top: topRule },
      rows: rows.map((row) =>
        new TableRow({
          cantSplit: true,
          children: row.map(
            (figure) =>
              new TableCell({
                margins: { top: 160, bottom: 120, left: 110, right: 110 },
                children: [
                  new Paragraph({
                    spacing: { after: 40 },
                    children: [
                      new TextRun({
                        text: figure.value,
                        bold: true,
                        size: pt(15),
                        color: hex(preset.colors.accent),
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: figure.label.toUpperCase(),
                      size: pt(8),
                        color: hex(preset.colors.muted),
                      }),
                    ],
                  }),
                ],
              })
          ),
        })
      ),
    }),
  ];
}

/* ---------------------------------------------------------------- Visuals */

function visualParagraphs(
  visual: RenderVisual,
  preset: DocumentRenderPreset
): Paragraph[] {
  // Content width in px (docx transformations are 96dpi pixels).
  const contentWidthMm =
    (preset.page.orientation === "landscape" ? 297 : 210) -
    preset.page.marginsMm.left -
    preset.page.marginsMm.right;
  const contentWidthPx = (contentWidthMm / 25.4) * 96;
  const ratio = VISUAL_SIZE_RATIO[visual.size] ?? 0.62;
  let w = contentWidthPx * ratio;
  let h = w * (visual.height / visual.width);
  const maxH = contentWidthPx * 1.1; // conservative cap
  if (h > maxH) {
    h = maxH;
    w = h * (visual.width / visual.height);
  }

  try {
    const out: Paragraph[] = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: visual.caption ? 60 : 160 },
        children: [
          new ImageRun({
            type: visual.mime === "image/png" ? "png" : "jpg",
            data: visual.buffer,
            transformation: {
              width: Math.round(w),
              height: Math.round(h),
            },
          }),
        ],
      }),
    ];
    if (visual.caption) {
      out.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
          children: [
            new TextRun({
              text: visual.caption,
              italics: true,
              size: pt(8.5),
              color: hex(preset.colors.muted),
            }),
          ],
        })
      );
    }
    return out;
  } catch {
    return []; // Invalid bytes — skip gracefully.
  }
}

/* ------------------------------------------------------------- Cover page */

function logoParagraph(
  metadata: DocumentRenderMetadata,
  maxHeightPt: number,
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType]
): Paragraph | null {
  const logo = metadata.logo;
  if (!logo) return null;
  try {
    const scale = maxHeightPt / logo.height;
    return new Paragraph({
      alignment,
      spacing: { after: 240 },
      children: [
        new ImageRun({
          type: logo.mime === "image/png" ? "png" : "jpg",
          data: logo.buffer,
          transformation: {
            width: Math.round(logo.width * scale),
            height: maxHeightPt,
          },
        }),
      ],
    });
  } catch {
    return null;
  }
}

function coverChildren(
  metadata: DocumentRenderMetadata,
  preset: DocumentRenderPreset,
  language: "fr" | "en"
): (Paragraph | Table)[] {
  const muted = hex(preset.colors.muted);
  const faint = hex(preset.colors.faint);
  const accent = hex(preset.colors.accent);
  const date = formatRenderDate(metadata.date || new Date(), language);
  const status = humanStatus(metadata.status, language);
  const versionLine = [status, metadata.version].filter(Boolean).join(" · ");
  const isLegal = preset.coverPage.style === "legal";
  const align = isLegal ? AlignmentType.CENTER : AlignmentType.LEFT;
  const preparedLine = `${
    metadata.preparedByOverride || preparedByLabel(language)
  } ${producedBy(metadata)}`;

  const out: (Paragraph | Table)[] = [];
  const coverVisual = (metadata.visuals || []).find((visual) => visual.target === "cover");

  const logo = logoParagraph(metadata, 34, align);
  if (logo) {
    out.push(logo);
  } else if (metadata.companyName) {
    out.push(
      new Paragraph({
        alignment: align,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: metadata.companyName.toUpperCase(),
            size: pt(9.5),
            color: faint,
            bold: true,
          }),
        ],
      })
    );
  }

  if (coverVisual && !isLegal) {
    const maxWidth = 520;
    const maxHeight = 175;
    const scale = Math.min(maxWidth / coverVisual.width, maxHeight / coverVisual.height);
    try {
      out.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 160, after: 180 },
          children: [
            new ImageRun({
              type: coverVisual.mime === "image/png" ? "png" : "jpg",
              data: coverVisual.buffer,
              transformation: {
                width: Math.round(coverVisual.width * scale),
                height: Math.round(coverVisual.height * scale),
              },
            }),
          ],
        })
      );
    } catch {
      // Invalid cover artwork never blocks the export.
    }
  }

  // Push the title block down the page.
  out.push(
    new Paragraph({
      spacing: { before: isLegal ? 2400 : coverVisual ? 520 : 2200 },
    })
  );

  if (metadata.projectName) {
    out.push(
      new Paragraph({
        alignment: align,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: metadata.projectName.toUpperCase(),
            size: pt(11),
            color: isLegal ? muted : accent,
            bold: true,
          }),
        ],
      })
    );
  }

  out.push(
    new Paragraph({
      alignment: align,
      spacing: { after: 280 },
      children: [
        new TextRun({
          text: metadata.documentTitle,
          size: pt(preset.typography.h1Size + 4),
          bold: true,
        }),
      ],
    })
  );

  if (metadata.documentType) {
    out.push(
      new Paragraph({
        alignment: align,
        spacing: { after: 480 },
        children: [
          new TextRun({ text: metadata.documentType, size: pt(13), color: muted }),
        ],
      })
    );
  }

  if (versionLine) {
    out.push(
      new Paragraph({
        alignment: align,
        spacing: { after: 100 },
        children: [new TextRun({ text: versionLine, size: pt(10.5), color: muted })],
      })
    );
  }

  out.push(
    new Paragraph({
      alignment: align,
      spacing: { after: 420 },
      children: [new TextRun({ text: date, size: pt(10.5), color: muted })],
    })
  );

  if (metadata.description) {
    out.push(
      new Paragraph({
        alignment: align,
        spacing: { after: 320 },
        children: [
          new TextRun({
            text: metadata.description.slice(0, 260),
            size: pt(10.5),
            color: muted,
            italics: true,
          }),
        ],
      })
    );
  }

  if (preset.keyFigures.enabled) {
    out.push(...keyFigureStrip(metadata, preset));
    out.push(new Paragraph({ spacing: { after: 200 } }));
  }

  out.push(
    new Paragraph({
      alignment: align,
      children: [
        new TextRun({ text: preparedLine, size: pt(9.5), color: faint }),
      ],
    })
  );

  if (metadata.confidentiality) {
    out.push(
      new Paragraph({
        alignment: align,
        spacing: { before: 120 },
        children: [
          new TextRun({
            text: metadata.confidentiality.toUpperCase(),
            size: pt(9),
            color: faint,
            bold: true,
          }),
        ],
      })
    );
  }

  out.push(new Paragraph({ children: [new PageBreak()] }));
  return out;
}

/* -------------------------------------------------------------------- TOC */

function tocChildren(
  blocks: DocumentBlock[],
  preset: DocumentRenderPreset,
  language: "fr" | "en"
): (Paragraph | TableOfContents)[] {
  const headings = extractHeadings(blocks, preset.tableOfContents.maxDepth);
  if (!headings.length) return [];

  const out: (Paragraph | TableOfContents)[] = [
    new Paragraph({
      spacing: { after: 280 },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6,
          color: hex(preset.colors.rule),
        },
      },
      children: [
        new TextRun({
          text: tocTitle(language),
          size: pt(preset.typography.h2Size + 2),
          bold: true,
          color: hex(preset.colors.accent),
        }),
      ],
    }),
  ];
  out.push(
    new TableOfContents(tocTitle(language), {
      hyperlink: true,
      headingStyleRange: `2-${preset.tableOfContents.maxDepth}`,
      pageNumbersEntryLevelsRange: `2-${preset.tableOfContents.maxDepth}`,
      entryAndPageNumberSeparator: "tab",
    })
  );

  out.push(
    new Paragraph({
      spacing: { before: 180, after: 80 },
      children: [
        new TextRun({
          text:
            language === "fr"
              ? "Dans Word, cliquez avec le bouton droit puis choisissez Mettre à jour le champ pour afficher les numéros de page."
              : "In Word, right-click and choose Update Field to refresh page numbers.",
          size: pt(7.5),
          italics: true,
          color: hex(preset.colors.faint),
        }),
      ],
    })
  );

  out.push(new Paragraph({ children: [new PageBreak()] }));
  return out;
}

/* ---------------------------------------------------------- Header/Footer */

function buildHeader(
  metadata: DocumentRenderMetadata,
  preset: DocumentRenderPreset
): Header {
  const bits: string[] = [];
  if (preset.headerFooter.showProjectName && metadata.projectName) {
    bits.push(metadata.projectName);
  }
  if (preset.headerFooter.showDocumentTitle) bits.push(metadata.documentTitle);

  return new Header({
    children: [
      new Paragraph({
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 4,
            color: hex(preset.colors.rule),
          },
        },
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: bits.join(" — ").slice(0, 110),
            size: pt(8),
            color: hex(preset.colors.faint),
          }),
        ],
      }),
    ],
  });
}

function buildFooter(
  metadata: DocumentRenderMetadata,
  preset: DocumentRenderPreset,
  language: "fr" | "en"
): Footer {
  const faint = hex(preset.colors.faint);
  const left: string[] = [];
  if (preset.headerFooter.showDate) {
    left.push(formatRenderDate(metadata.date || new Date(), language));
  }
  left.push(producedBy(metadata));
  if (metadata.confidentiality) left.push(metadata.confidentiality);

  const children: TextRun[] = [
    new TextRun({ text: left.join(" · "), size: pt(8), color: faint }),
  ];
  if (preset.headerFooter.showPageNumbers) {
    children.push(
      new TextRun({ text: "\t", size: pt(8) }),
      new TextRun({
        size: pt(8),
        color: faint,
        children: [PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES],
      })
    );
  }

  return new Footer({
    children: [
      new Paragraph({
        border: {
          top: {
            style: BorderStyle.SINGLE,
            size: 4,
            color: hex(preset.colors.rule),
          },
        },
        spacing: { before: 60 },
        tabStops: [
          {
            type: "right" as const,
            position: convertMillimetersToTwip(
              (preset.page.orientation === "landscape" ? 297 : 210) -
                preset.page.marginsMm.left -
                preset.page.marginsMm.right
            ),
          },
        ],
        children,
      }),
    ],
  });
}

/* ----------------------------------------------------------------- Render */

export async function markdownToDocxBuffer(
  markdown: string,
  options: DocxRenderOptions = {}
) {
  const preset = resolveRenderPreset(options.presetId, options.orientation);
  const language: "fr" | "en" = options.metadata?.language || guessLanguage(markdown);
  return compositionToDocxBuffer(
    composeForExport(markdown, preset, options.metadata, language),
    options
  );
}

export async function compositionToDocxBuffer(
  composition: CompositionDocument,
  options: DocxRenderOptions = {}
) {
  const preset = resolveRenderPreset(options.presetId, options.orientation);
  const language = composition.language;
  const t = preset.typography;
  const metadata = options.metadata
    ? {
        ...options.metadata,
        keyFigures: composition.cover.metrics?.type === "metric_grid" ? composition.cover.metrics.metrics : [],
        visuals: composition.cover.hero?.type === "image" ? [imageNodeToRenderVisual(composition.cover.hero, "cover")] : [],
      }
    : undefined;
  const layoutDocument = resolveExportLayout(composition);
  const flow = layoutNodeFlow(layoutDocument, composition);
  const blocks = flow.map((item) => nodeToRenderBlock(item.node)).filter((block): block is DocumentBlock => block !== null);

  const children: (Paragraph | Table)[] = [];
  if (metadata && preset.coverPage.enabled) {
    children.push(...coverChildren(metadata, preset, language));
  }
  if (metadata && preset.tableOfContents.enabled) {
    children.push(...tocChildren(blocks, preset, language));
  }
  for (const item of flow) {
    const node = item.node;
    if (item.breakBefore) children.push(new Paragraph({ children: [new PageBreak()] }));
    if (node.type === "image") {
      children.push(...visualParagraphs(imageNodeToRenderVisual(node), preset));
      continue;
    }
    const block = nodeToRenderBlock(node);
    if (block) children.push(...blockToChildren(block, preset, language));
  }

  // Unmatched section visuals + explicit appendix placements → visual annex.
  if (!children.length) {
    children.push(new Paragraph({ children: inlineRuns(composition.title) }));
  }

  const mm = preset.page.marginsMm;
  const isLandscape = preset.page.orientation === "landscape";

  const document = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: t.docxFontFamily,
            size: pt(t.bodySize),
            color: hex(preset.colors.text),
          },
        },
        heading1: {
          run: {
            font: t.docxFontFamily,
            size: pt(t.h1Size),
            bold: true,
            color: hex(preset.colors.text),
          },
        },
        heading2: {
          run: {
            font: t.docxFontFamily,
            size: pt(t.h2Size),
            bold: true,
            color: hex(preset.colors.accent),
          },
        },
        heading3: {
          run: {
            font: t.docxFontFamily,
            size: pt(t.h3Size),
            bold: true,
            color: hex(preset.colors.muted),
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "premium-numbering",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: "left",
              style: {
                paragraph: { indent: { left: 720, hanging: 260 } },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: isLandscape
                ? PageOrientation.LANDSCAPE
                : PageOrientation.PORTRAIT,
              width: convertMillimetersToTwip(isLandscape ? 297 : 210),
              height: convertMillimetersToTwip(isLandscape ? 210 : 297),
            },
            margin: {
              top: convertMillimetersToTwip(mm.top),
              right: convertMillimetersToTwip(mm.right),
              bottom: convertMillimetersToTwip(mm.bottom),
              left: convertMillimetersToTwip(mm.left),
            },
          },
          titlePage: Boolean(metadata && preset.coverPage.enabled),
        },
        headers:
          metadata && preset.headerFooter.enabled
            ? {
                default: buildHeader(metadata, preset),
                first: new Header({ children: [] }),
              }
            : undefined,
        footers:
          metadata && preset.headerFooter.enabled
            ? {
                default: buildFooter(metadata, preset, language),
                first: new Footer({ children: [] }),
              }
            : undefined,
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}
