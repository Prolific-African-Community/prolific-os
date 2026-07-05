import PDFDocument from "pdfkit";
import { CellAlign } from "../markdown/table";
import {
  DocumentBlock,
  extractHeadings,
  headingHasOwnNumber,
  normalizeHeading,
  parseInlineSegments,
  parseMarkdownBlocks,
  plainText,
  stripLeadingTitle,
} from "./document-structure";
import {
  CalloutKind,
  DocumentRenderMetadata,
  DocumentRenderPreset,
  PageOrientationOption,
  RenderVisual,
  VISUAL_SIZE_RATIO,
  calloutLabel,
  formatRenderDate,
  guessLanguage,
  humanStatus,
  pageLabel,
  preparedByLabel,
  resolveRenderPreset,
  tocTitle,
  visualAnnexTitle,
} from "./rendering-presets";

export interface PdfRenderOptions {
  metadata?: DocumentRenderMetadata;
  presetId?: string;
  orientation?: PageOrientationOption;
}

const mmToPt = (mm: number) => (mm * 72) / 25.4;

type Doc = PDFKit.PDFDocument;

/* --------------------------------------------------------------- Helpers */

function contentWidth(doc: Doc): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function bottomLimit(doc: Doc): number {
  return doc.page.height - doc.page.margins.bottom;
}

function atTopOfPage(doc: Doc): boolean {
  return doc.y <= doc.page.margins.top + 2;
}

function producedBy(metadata: DocumentRenderMetadata): string {
  return metadata.companyName || "Prolific OS";
}

/** Write a line of inline-styled text (bold/italic via font switching). */
function writeInline(
  doc: Doc,
  preset: DocumentRenderPreset,
  text: string,
  opts: { size?: number; color?: string; indent?: number; gapAfter?: number } = {}
) {
  const t = preset.typography;
  const size = opts.size ?? t.bodySize;
  const segments = parseInlineSegments(text);
  const lineGap = size * (t.lineHeight - 1);
  const x = doc.page.margins.left + (opts.indent ?? 0);
  const width = contentWidth(doc) - (opts.indent ?? 0);

  segments.forEach((seg, i) => {
    doc
      .font(seg.bold ? t.fontFamilyBold : seg.italic ? t.fontFamilyItalic : t.fontFamily)
      .fontSize(size)
      .fillColor(opts.color ?? preset.colors.text)
      .text(seg.text, i === 0 ? x : undefined, undefined, {
        width,
        align: "left",
        lineGap,
        continued: i < segments.length - 1,
      });
  });
  if (opts.gapAfter) doc.moveDown(opts.gapAfter);
}

/* ----------------------------------------------------------------- Tables */

function writeTable(
  doc: Doc,
  preset: DocumentRenderPreset,
  header: string[],
  rows: string[][],
  aligns: CellAlign[]
) {
  const startX = doc.page.margins.left;
  const usableWidth = contentWidth(doc);
  const colCount = header.length || 1;
  const colWidth = usableWidth / colCount;
  const padX = 6;
  const padY = preset.tables.style === "compact" ? 4 : 5;
  const fontSize = Math.max(preset.typography.bodySize - 1.5, 8);
  const t = preset.typography;

  const rowHeight = (cells: string[], bold: boolean) => {
    doc.font(bold ? t.fontFamilyBold : t.fontFamily).fontSize(fontSize);
    const heights = cells.map((cell) =>
      doc.heightOfString(plainText(cell) || " ", { width: colWidth - padX * 2 })
    );
    return Math.max(...heights, fontSize) + padY * 2;
  };

  const drawRow = (cells: string[], isHeader: boolean, zebra: boolean) => {
    const height = rowHeight(cells, isHeader);
    if (doc.y + height > bottomLimit(doc)) {
      doc.addPage();
      if (preset.tables.repeatHeader && !isHeader) {
        drawRow(header, true, false);
      }
    }
    const y = doc.y;
    if (isHeader) {
      doc.rect(startX, y, usableWidth, height).fill(preset.colors.tableHeaderFill);
    } else if (zebra && preset.tables.zebra) {
      doc.rect(startX, y, usableWidth, height).fill(preset.colors.tableZebra);
    }
    cells.forEach((cell, index) => {
      const x = startX + index * colWidth;
      doc.lineWidth(0.5).strokeColor(preset.colors.tableBorder);
      doc.rect(x, y, colWidth, height).stroke();
      doc
        .font(isHeader ? t.fontFamilyBold : t.fontFamily)
        .fontSize(fontSize)
        .fillColor(isHeader ? preset.colors.accent : preset.colors.text)
        .text(plainText(cell), x + padX, y + padY, {
          width: colWidth - padX * 2,
          align: aligns[index] || "left",
        });
    });
    doc.x = startX;
    doc.y = y + height;
  };

  if (preset.tables.avoidPageBreakInside) {
    const estimate =
      rowHeight(header, true) +
      rows.slice(0, 6).reduce((sum, r) => sum + rowHeight(r, false), 0);
    if (doc.y + Math.min(estimate, 300) > bottomLimit(doc) && rows.length <= 8) {
      doc.addPage();
    }
  }

  doc.moveDown(0.3);
  drawRow(header, true, false);
  rows.forEach((row, i) => {
    const padded = [...row];
    while (padded.length < colCount) padded.push("");
    drawRow(padded.slice(0, colCount), false, i % 2 === 1);
  });
  doc.x = startX;
  doc.moveDown(0.7);
}

/* --------------------------------------------------------------- Callouts */

function writeCallout(
  doc: Doc,
  preset: DocumentRenderPreset,
  kind: CalloutKind,
  text: string,
  language: "fr" | "en"
) {
  const t = preset.typography;
  const body = plainText(text.replace(/\n/g, " "));
  const label = calloutLabel(kind, language);
  const x = doc.page.margins.left;
  const width = contentWidth(doc);
  const padX = 12;
  const padY = 9;

  doc.font(t.fontFamily).fontSize(t.bodySize - 0.5);
  const bodyHeight = doc.heightOfString(body, {
    width: width - padX * 2 - 4,
    lineGap: 2,
  });
  const boxHeight = bodyHeight + padY * 2 + 13;

  if (doc.y + boxHeight > bottomLimit(doc)) {
    if (boxHeight < bottomLimit(doc) - doc.page.margins.top) {
      doc.addPage();
    }
  }

  const y = doc.y + 4;
  doc.rect(x, y, width, boxHeight).fill(preset.colors.calloutFill);
  doc.rect(x, y, 2.5, boxHeight).fill(preset.colors.accent);

  doc
    .font(t.fontFamilyBold)
    .fontSize(7.5)
    .fillColor(preset.colors.accent)
    .text(label, x + padX, y + padY, { characterSpacing: 1, lineBreak: false });

  doc
    .font(t.fontFamily)
    .fontSize(t.bodySize - 0.5)
    .fillColor(preset.colors.text)
    .text(body, x + padX, y + padY + 13, {
      width: width - padX * 2 - 4,
      lineGap: 2,
    });

  doc.x = doc.page.margins.left;
  doc.y = y + boxHeight + 10;
}

/* ---------------------------------------------------------------- Visuals */

function writeVisual(doc: Doc, preset: DocumentRenderPreset, visual: RenderVisual) {
  const t = preset.typography;
  const usable = contentWidth(doc);
  const ratio = VISUAL_SIZE_RATIO[visual.size] ?? 0.62;
  let w = usable * ratio;
  let h = w * (visual.height / visual.width);

  // Cap image height at ~55% of the content area; scale down keeping ratio.
  const maxH = (doc.page.height - doc.page.margins.top - doc.page.margins.bottom) * 0.55;
  if (h > maxH) {
    h = maxH;
    w = h * (visual.width / visual.height);
  }

  const captionRoom = visual.caption ? 18 : 6;
  if (doc.y + h + captionRoom > bottomLimit(doc)) doc.addPage();

  const x = doc.page.margins.left + (usable - w) / 2;
  const y = doc.y + 4;
  try {
    doc.image(visual.buffer, x, y, { width: w, height: h });
  } catch {
    return; // Invalid bytes — skip gracefully.
  }
  doc.y = y + h + 6;

  if (visual.caption) {
    doc
      .font(t.fontFamilyItalic)
      .fontSize(8.5)
      .fillColor(preset.colors.muted)
      .text(visual.caption, doc.page.margins.left, doc.y, {
        width: usable,
        align: "center",
      });
    doc.y += 4;
  }
  doc.x = doc.page.margins.left;
  doc.moveDown(0.5);
}

/** Map normalized section title → visuals assigned to it. */
function groupSectionVisuals(
  visuals: RenderVisual[]
): Map<string, RenderVisual[]> {
  const map = new Map<string, RenderVisual[]>();
  for (const visual of visuals) {
    if (visual.target !== "section" || !visual.sectionTitle) continue;
    const key = normalizeHeading(visual.sectionTitle);
    const list = map.get(key) || [];
    list.push(visual);
    map.set(key, list);
  }
  return map;
}

/* ------------------------------------------------------------------ Body */

function writeBlock(
  doc: Doc,
  preset: DocumentRenderPreset,
  block: DocumentBlock,
  language: "fr" | "en"
) {
  const t = preset.typography;
  const ensureRoom = (needed: number) => {
    if (doc.y + needed > bottomLimit(doc)) doc.addPage();
  };

  switch (block.type) {
    case "heading": {
      const size =
        block.level === 1 ? t.h1Size : block.level === 2 ? t.h2Size : t.h3Size;
      if (
        block.level === 2 &&
        preset.layout.pageBreakBeforeH2 &&
        !atTopOfPage(doc)
      ) {
        doc.addPage();
      }
      // Reserve room for the heading plus a couple of body lines (no orphans).
      ensureRoom(size * 2 + t.bodySize * 3);
      if (!atTopOfPage(doc)) doc.moveDown(block.level === 2 ? 1.0 : 0.7);
      doc
        .font(t.fontFamilyBold)
        .fontSize(size)
        .fillColor(
          block.level === 2
            ? preset.colors.accent
            : block.level === 3
            ? preset.colors.muted
            : preset.colors.text
        )
        .text(plainText(block.text), doc.page.margins.left, undefined, {
          width: contentWidth(doc),
          lineGap: 2,
        });
      if (block.level === 2) {
        const y = doc.y + 3;
        doc
          .moveTo(doc.page.margins.left, y)
          .lineTo(doc.page.margins.left + contentWidth(doc), y)
          .lineWidth(0.7)
          .strokeColor(preset.colors.rule)
          .stroke();
        doc.y = y + 8;
      } else {
        doc.moveDown(0.35);
      }
      doc.x = doc.page.margins.left;
      break;
    }
    case "paragraph":
      ensureRoom(t.bodySize * 3);
      writeInline(doc, preset, block.text, { gapAfter: 0.6 });
      break;
    case "list": {
      block.items.forEach((item, i) => {
        ensureRoom(t.bodySize * 2.5);
        const marker = block.ordered ? `${i + 1}.` : "–";
        const x = doc.page.margins.left;
        doc
          .font(t.fontFamily)
          .fontSize(t.bodySize)
          .fillColor(preset.colors.muted)
          .text(marker, x + 4, doc.y, { continued: false, lineBreak: false });
        const markerY = doc.y;
        doc.y = markerY;
        const segments = parseInlineSegments(item);
        segments.forEach((seg, j) => {
          doc
            .font(seg.bold ? t.fontFamilyBold : seg.italic ? t.fontFamilyItalic : t.fontFamily)
            .fontSize(t.bodySize)
            .fillColor(preset.colors.text)
            .text(seg.text, j === 0 ? x + 22 : undefined, j === 0 ? markerY : undefined, {
              width: contentWidth(doc) - 22,
              lineGap: t.bodySize * (t.lineHeight - 1),
              continued: j < segments.length - 1,
            });
        });
        doc.moveDown(0.25);
        doc.x = doc.page.margins.left;
      });
      doc.moveDown(0.4);
      break;
    }
    case "callout":
      if (preset.callouts.enabled) {
        writeCallout(doc, preset, block.kind, block.text, language);
      } else {
        writeInline(doc, preset, block.text.replace(/\n/g, " "), {
          color: preset.colors.muted,
          indent: 16,
          gapAfter: 0.6,
        });
      }
      break;
    case "blockquote": {
      ensureRoom(t.bodySize * 3.5);
      const startY = doc.y;
      writeInline(doc, preset, block.text.replace(/\n/g, " "), {
        color: preset.colors.muted,
        indent: 16,
        gapAfter: 0.6,
      });
      doc
        .moveTo(doc.page.margins.left + 4, startY)
        .lineTo(doc.page.margins.left + 4, doc.y - 6)
        .lineWidth(2)
        .strokeColor(preset.colors.rule)
        .stroke();
      break;
    }
    case "divider": {
      ensureRoom(20);
      const y = doc.y + 6;
      doc
        .moveTo(doc.page.margins.left, y)
        .lineTo(doc.page.margins.left + contentWidth(doc), y)
        .lineWidth(0.5)
        .strokeColor(preset.colors.rule)
        .stroke();
      doc.y = y + 12;
      break;
    }
    case "table":
      writeTable(doc, preset, block.header, block.rows, block.aligns);
      break;
  }
}

/* -------------------------------------------------------- Key figure strip */

function writeKeyFigureStrip(
  doc: Doc,
  preset: DocumentRenderPreset,
  metadata: DocumentRenderMetadata,
  y: number
): number {
  const figures = (metadata.keyFigures || []).slice(0, preset.keyFigures.max);
  if (!figures.length) return y;
  const t = preset.typography;
  const x = doc.page.margins.left;
  const width = contentWidth(doc);
  const colWidth = width / figures.length;

  doc
    .moveTo(x, y)
    .lineTo(x + width, y)
    .lineWidth(0.5)
    .strokeColor(preset.colors.rule)
    .stroke();

  const topY = y + 14;
  figures.forEach((figure, i) => {
    const cx = x + i * colWidth;
    doc
      .font(t.fontFamilyBold)
      .fontSize(15)
      .fillColor(preset.colors.accent)
      .text(figure.value, cx, topY, { width: colWidth - 10, lineBreak: false });
    doc
      .font(t.fontFamily)
      .fontSize(7.5)
      .fillColor(preset.colors.muted)
      .text(figure.label.toUpperCase(), cx, topY + 20, {
        width: colWidth - 10,
        characterSpacing: 0.6,
      });
  });

  return topY + 40;
}

/* ------------------------------------------------------------- Cover page */

function drawLogo(
  doc: Doc,
  metadata: DocumentRenderMetadata,
  x: number,
  y: number,
  maxHeight: number
): number {
  const logo = metadata.logo;
  if (!logo) return 0;
  try {
    const scale = maxHeight / logo.height;
    const w = logo.width * scale;
    doc.image(logo.buffer, x, y, { height: maxHeight });
    return w;
  } catch {
    return 0;
  }
}

function writeCover(
  doc: Doc,
  preset: DocumentRenderPreset,
  metadata: DocumentRenderMetadata,
  language: "fr" | "en"
) {
  const t = preset.typography;
  const x = doc.page.margins.left;
  const width = contentWidth(doc);
  const date = formatRenderDate(metadata.date || new Date(), language);
  const status = humanStatus(metadata.status, language);
  const versionLine = [status, metadata.version].filter(Boolean).join(" · ");
  const style = preset.coverPage.style;
  const preparedLine = `${
    metadata.preparedByOverride || preparedByLabel(language)
  } ${producedBy(metadata)}`;

  const bottomY = doc.page.height - doc.page.margins.bottom;

  if (style === "legal") {
    /* Formal centered cover with rule-framed title block. */
    let y = doc.page.margins.top + 8;
    if (metadata.logo) {
      const h = 26;
      const scale = h / metadata.logo.height;
      const w = metadata.logo.width * scale;
      drawLogo(doc, metadata, x + (width - w) / 2, y, h);
      y += h + 26;
    } else if (metadata.companyName) {
      doc
        .font(t.fontFamilyBold)
        .fontSize(10)
        .fillColor(preset.colors.muted)
        .text(metadata.companyName.toUpperCase(), x, y, {
          width,
          align: "center",
          characterSpacing: 1.4,
        });
      y = doc.y + 26;
    }

    y = Math.max(y, doc.page.height * 0.3);
    doc
      .moveTo(x + width * 0.2, y)
      .lineTo(x + width * 0.8, y)
      .lineWidth(0.7)
      .strokeColor(preset.colors.rule)
      .stroke();
    y += 26;

    doc
      .font(t.fontFamilyBold)
      .fontSize(t.h1Size + 2)
      .fillColor(preset.colors.text)
      .text(metadata.documentTitle, x, y, { width, align: "center", lineGap: 4 });
    y = doc.y + 12;

    if (metadata.documentType) {
      doc
        .font(t.fontFamily)
        .fontSize(12)
        .fillColor(preset.colors.muted)
        .text(metadata.documentType, x, y, { width, align: "center" });
      y = doc.y + 22;
    }

    doc
      .moveTo(x + width * 0.2, y)
      .lineTo(x + width * 0.8, y)
      .lineWidth(0.7)
      .strokeColor(preset.colors.rule)
      .stroke();
    y += 30;

    const lines = [
      metadata.projectName,
      versionLine || null,
      date,
    ].filter(Boolean) as string[];
    for (const line of lines) {
      doc
        .font(t.fontFamily)
        .fontSize(10.5)
        .fillColor(preset.colors.muted)
        .text(line, x, y, { width, align: "center" });
      y = doc.y + 5;
    }

    doc
      .font(t.fontFamily)
      .fontSize(9)
      .fillColor(preset.colors.faint)
      .text(preparedLine, x, bottomY - 30, { width, align: "center", lineBreak: false });
    if (metadata.confidentiality) {
      doc
        .font(t.fontFamilyBold)
        .fontSize(8.5)
        .fillColor(preset.colors.faint)
        .text(metadata.confidentiality.toUpperCase(), x, bottomY - 16, {
          width,
          align: "center",
          characterSpacing: 1,
          lineBreak: false,
        });
    }
  } else if (style === "bank") {
    /* Conservative cover with a metadata grid and key figures. */
    let y = doc.page.margins.top + 8;
    doc.rect(x, y, 40, 3).fill(preset.colors.accent);
    if (metadata.logo) {
      const h = 30;
      const scale = h / metadata.logo.height;
      const w = metadata.logo.width * scale;
      drawLogo(doc, metadata, x + width - w, y - 4, h);
    } else if (metadata.companyName) {
      doc
        .font(t.fontFamilyBold)
        .fontSize(9.5)
        .fillColor(preset.colors.muted)
        .text(metadata.companyName.toUpperCase(), x, y + 10, {
          width,
          align: "right",
          characterSpacing: 1.2,
          lineBreak: false,
        });
    }

    y = doc.page.height * 0.26;
    if (metadata.projectName) {
      doc
        .font(t.fontFamilyBold)
        .fontSize(10.5)
        .fillColor(preset.colors.accent)
        .text(metadata.projectName.toUpperCase(), x, y, {
          width,
          characterSpacing: 1.2,
        });
      y = doc.y + 14;
    }
    doc
      .font(t.fontFamilyBold)
      .fontSize(t.h1Size + 4)
      .fillColor(preset.colors.text)
      .text(metadata.documentTitle, x, y, { width: width * 0.9, lineGap: 4 });
    y = doc.y + 26;

    // Metadata grid (two columns of label/value).
    const entries: Array<[string, string]> = [];
    if (metadata.documentType)
      entries.push([language === "fr" ? "Type de document" : "Document type", metadata.documentType]);
    if (versionLine) entries.push([language === "fr" ? "Statut" : "Status", versionLine]);
    entries.push([language === "fr" ? "Date" : "Date", date]);
    entries.push([
      language === "fr" ? "Préparé par" : "Prepared by",
      producedBy(metadata),
    ]);

    const colW = width / 2;
    entries.forEach(([label, value], i) => {
      const cx = x + (i % 2) * colW;
      const cy = y + Math.floor(i / 2) * 34;
      doc
        .font(t.fontFamily)
        .fontSize(7.5)
        .fillColor(preset.colors.faint)
        .text(label.toUpperCase(), cx, cy, { characterSpacing: 0.8, lineBreak: false });
      doc
        .font(t.fontFamilyBold)
        .fontSize(10.5)
        .fillColor(preset.colors.text)
        .text(value, cx, cy + 11, { width: colW - 16, lineBreak: false });
    });

    // Key figures near the bottom.
    if (preset.keyFigures.enabled && (metadata.keyFigures || []).length) {
      writeKeyFigureStrip(doc, preset, metadata, bottomY - 92);
    }
    if (metadata.confidentiality) {
      doc
        .font(t.fontFamilyBold)
        .fontSize(8.5)
        .fillColor(preset.colors.faint)
        .text(metadata.confidentiality.toUpperCase(), x, bottomY - 14, {
          width,
          characterSpacing: 1,
          lineBreak: false,
        });
    }
  } else if (style === "executive") {
    /* Minimal cover: compact block in the upper third. */
    let y = doc.page.margins.top + 8;
    doc.rect(x, y, 30, 2.5).fill(preset.colors.accent);
    if (metadata.logo) {
      const h = 24;
      const scale = h / metadata.logo.height;
      const w = metadata.logo.width * scale;
      drawLogo(doc, metadata, x + width - w, y - 4, h);
    }
    y = doc.page.height * 0.22;

    if (metadata.projectName) {
      doc
        .font(t.fontFamily)
        .fontSize(10)
        .fillColor(preset.colors.muted)
        .text(metadata.projectName, x, y, { width });
      y = doc.y + 10;
    }
    doc
      .font(t.fontFamilyBold)
      .fontSize(t.h1Size + 2)
      .fillColor(preset.colors.text)
      .text(metadata.documentTitle, x, y, { width: width * 0.85, lineGap: 3 });
    y = doc.y + 14;
    const line = [metadata.documentType, versionLine || null, date]
      .filter(Boolean)
      .join("  ·  ");
    doc
      .font(t.fontFamily)
      .fontSize(10)
      .fillColor(preset.colors.muted)
      .text(line, x, y, { width });

    if (preset.keyFigures.enabled && (metadata.keyFigures || []).length) {
      writeKeyFigureStrip(doc, preset, metadata, bottomY - 96);
    }
    doc
      .font(t.fontFamily)
      .fontSize(9)
      .fillColor(preset.colors.faint)
      .text(preparedLine, x, bottomY - 28, { width, lineBreak: false });
    if (metadata.confidentiality) {
      doc
        .font(t.fontFamilyBold)
        .fontSize(8.5)
        .fillColor(preset.colors.faint)
        .text(metadata.confidentiality.toUpperCase(), x, bottomY - 14, {
          width,
          characterSpacing: 1,
          lineBreak: false,
        });
    }
  } else {
    /* Consulting cover (default): sharp, spacious, left-aligned. */
    let y = doc.page.margins.top + 8;
    doc.rect(x, y, 46, 3).fill(preset.colors.accent);
    if (metadata.logo) {
      const h = 30;
      const scale = h / metadata.logo.height;
      const w = metadata.logo.width * scale;
      drawLogo(doc, metadata, x + width - w, y - 4, h);
    } else if (metadata.companyName) {
      doc
        .font(t.fontFamilyBold)
        .fontSize(9.5)
        .fillColor(preset.colors.faint)
        .text(metadata.companyName.toUpperCase(), x, y + 10, {
          width,
          align: "right",
          characterSpacing: 1.2,
          lineBreak: false,
        });
    }

    y = doc.page.height * 0.3;
    if (metadata.projectName) {
      doc
        .font(t.fontFamilyBold)
        .fontSize(10.5)
        .fillColor(preset.colors.muted)
        .text(metadata.projectName.toUpperCase(), x, y, {
          width,
          characterSpacing: 1.2,
        });
      y = doc.y + 16;
    }
    doc
      .font(t.fontFamilyBold)
      .fontSize(t.h1Size + 6)
      .fillColor(preset.colors.text)
      .text(metadata.documentTitle, x, y, { width: width * 0.92, lineGap: 4 });
    y = doc.y + 14;

    if (metadata.documentType) {
      doc
        .font(t.fontFamily)
        .fontSize(13)
        .fillColor(preset.colors.muted)
        .text(metadata.documentType, x, y, { width });
      y = doc.y + 28;
    }
    if (versionLine) {
      doc
        .font(t.fontFamily)
        .fontSize(10.5)
        .fillColor(preset.colors.muted)
        .text(versionLine, x, y, { width });
      y = doc.y + 6;
    }
    doc
      .font(t.fontFamily)
      .fontSize(10.5)
      .fillColor(preset.colors.muted)
      .text(date, x, y, { width });

    if (metadata.description) {
      doc
        .font(t.fontFamilyItalic)
        .fontSize(10)
        .fillColor(preset.colors.muted)
        .text(metadata.description.slice(0, 260), x, doc.y + 24, {
          width: width * 0.8,
        });
    }

    let stripTop = bottomY - 92;
    if (preset.keyFigures.enabled && (metadata.keyFigures || []).length) {
      writeKeyFigureStrip(doc, preset, metadata, stripTop);
    }
    doc
      .font(t.fontFamily)
      .fontSize(9)
      .fillColor(preset.colors.faint)
      .text(preparedLine, x, bottomY - 28, { width, lineBreak: false });
    if (metadata.confidentiality) {
      doc
        .font(t.fontFamilyBold)
        .fontSize(8.5)
        .fillColor(preset.colors.faint)
        .text(metadata.confidentiality.toUpperCase(), x, bottomY - 14, {
          width,
          characterSpacing: 1,
          lineBreak: false,
        });
    }
  }

  doc.addPage();
}

/* -------------------------------------------------------------------- TOC */

function writeToc(
  doc: Doc,
  preset: DocumentRenderPreset,
  blocks: DocumentBlock[],
  language: "fr" | "en"
) {
  const headings = extractHeadings(blocks, preset.tableOfContents.maxDepth);
  if (!headings.length) return;
  const t = preset.typography;
  const x = doc.page.margins.left;
  const width = contentWidth(doc);

  doc
    .font(t.fontFamilyBold)
    .fontSize(t.h2Size + 2)
    .fillColor(preset.colors.accent)
    .text(tocTitle(language), x, undefined, { width });
  doc
    .moveTo(x, doc.y + 4)
    .lineTo(x + width, doc.y + 4)
    .lineWidth(0.7)
    .strokeColor(preset.colors.rule)
    .stroke();
  doc.y += 16;

  let sectionIndex = 0;
  for (const heading of headings) {
    if (doc.y + 20 > bottomLimit(doc)) doc.addPage();
    if (heading.level === 2) {
      sectionIndex += 1;
      const label = headingHasOwnNumber(heading.text)
        ? heading.text
        : `${sectionIndex}.  ${heading.text}`;
      doc
        .font(t.fontFamilyBold)
        .fontSize(10.5)
        .fillColor(preset.colors.text)
        .text(label, x, undefined, { width });
      doc.moveDown(0.35);
    } else {
      doc
        .font(t.fontFamily)
        .fontSize(9.5)
        .fillColor(preset.colors.muted)
        .text(heading.text, x + 20, undefined, { width: width - 20 });
      doc.moveDown(0.25);
    }
  }

  doc.addPage();
}

/* ---------------------------------------------------------- Header/Footer */

function decoratePages(
  doc: Doc,
  preset: DocumentRenderPreset,
  metadata: DocumentRenderMetadata,
  language: "fr" | "en",
  skipFirst: boolean
) {
  const range = doc.bufferedPageRange();
  const total = range.count;
  const contentPages = skipFirst ? total - 1 : total;

  for (let i = range.start; i < range.start + range.count; i += 1) {
    if (skipFirst && i === 0) continue;
    doc.switchToPage(i);

    const saved = { ...doc.page.margins };
    doc.page.margins = { top: 0, right: 0, bottom: 0, left: 0 };

    const x = saved.left;
    const width = doc.page.width - saved.left - saved.right;
    const t = preset.typography;

    const headerBits: string[] = [];
    if (preset.headerFooter.showProjectName && metadata.projectName) {
      headerBits.push(metadata.projectName);
    }
    if (preset.headerFooter.showDocumentTitle) {
      headerBits.push(metadata.documentTitle);
    }
    const headerY = saved.top - 26;
    doc
      .font(t.fontFamily)
      .fontSize(7.5)
      .fillColor(preset.colors.faint)
      .text(headerBits.join(" — ").slice(0, 120), x, headerY, {
        width,
        lineBreak: false,
      });
    doc
      .moveTo(x, headerY + 12)
      .lineTo(x + width, headerY + 12)
      .lineWidth(0.5)
      .strokeColor(preset.colors.rule)
      .stroke();

    const footerY = doc.page.height - saved.bottom + 12;
    doc
      .moveTo(x, footerY - 5)
      .lineTo(x + width, footerY - 5)
      .lineWidth(0.5)
      .strokeColor(preset.colors.rule)
      .stroke();

    const left: string[] = [];
    if (preset.headerFooter.showDate) {
      left.push(formatRenderDate(metadata.date || new Date(), language));
    }
    left.push(producedBy(metadata));
    if (metadata.confidentiality) left.push(metadata.confidentiality);

    doc
      .font(t.fontFamily)
      .fontSize(7.5)
      .fillColor(preset.colors.faint)
      .text(left.join(" · "), x, footerY, { width, lineBreak: false });

    if (preset.headerFooter.showPageNumbers) {
      const pageNumber = skipFirst ? i : i + 1;
      doc
        .font(t.fontFamily)
        .fontSize(7.5)
        .fillColor(preset.colors.faint)
        .text(
          `${pageLabel(language)} ${pageNumber} / ${contentPages}`,
          x,
          footerY,
          { width, align: "right", lineBreak: false }
        );
    }

    doc.page.margins = saved;
  }
}

/* ----------------------------------------------------------------- Render */

export async function markdownToPdfBuffer(
  markdown: string,
  options: PdfRenderOptions = {}
) {
  const preset = resolveRenderPreset(options.presetId, options.orientation);
  const metadata = options.metadata;
  const language: "fr" | "en" = metadata?.language || guessLanguage(markdown);
  const mm = preset.page.marginsMm;

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: preset.page.format,
      layout: preset.page.orientation,
      margins: {
        top: mmToPt(mm.top),
        right: mmToPt(mm.right),
        bottom: mmToPt(mm.bottom),
        left: mmToPt(mm.left),
      },
      bufferPages: true,
      info: metadata
        ? {
            Title: metadata.documentTitle,
            Author: producedBy(metadata),
            Subject: metadata.documentType || undefined,
          }
        : undefined,
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let blocks = parseMarkdownBlocks(markdown);
    if (metadata) blocks = stripLeadingTitle(blocks, metadata.documentTitle);

    const hasCover = Boolean(metadata && preset.coverPage.enabled);
    if (metadata && hasCover) {
      writeCover(doc, preset, metadata, language);
    }
    if (metadata && preset.tableOfContents.enabled) {
      writeToc(doc, preset, blocks, language);
    }

    const visuals = metadata?.visuals || [];
    const sectionVisuals = groupSectionVisuals(visuals);
    const usedKeys = new Set<string>();

    doc.x = doc.page.margins.left;
    for (const block of blocks) {
      writeBlock(doc, preset, block, language);
      if (block.type === "heading" && block.level >= 2) {
        const key = normalizeHeading(plainText(block.text));
        const matches = sectionVisuals.get(key);
        if (matches && !usedKeys.has(key)) {
          usedKeys.add(key);
          for (const visual of matches) writeVisual(doc, preset, visual);
        }
      }
    }

    // Section visuals whose heading was never matched fall back to the annex,
    // together with explicit appendix placements.
    const annexVisuals = [
      ...visuals.filter((v) => v.target === "appendix"),
      ...visuals.filter(
        (v) =>
          v.target === "section" &&
          v.sectionTitle &&
          !usedKeys.has(normalizeHeading(v.sectionTitle))
      ),
    ];
    if (annexVisuals.length) {
      writeBlock(
        doc,
        preset,
        { type: "heading", level: 2, text: visualAnnexTitle(language) },
        language
      );
      for (const visual of annexVisuals) writeVisual(doc, preset, visual);
    }

    if (metadata && preset.headerFooter.enabled) {
      decoratePages(doc, preset, metadata, language, hasCover);
    }

    doc.end();
  });
}
