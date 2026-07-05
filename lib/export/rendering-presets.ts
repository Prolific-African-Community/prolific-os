/**
 * Ultra-premium rendering system (Master ticket, extends Ticket 029).
 *
 * Pure config layer driving the DOCX and PDF renderers: four export styles
 * (consulting / legal / bank / executive), page geometry, typography scales,
 * cover variants, key-figure blocks, callouts, header/footer, TOC and table
 * styling. Brand kits and template variants extend this — not the renderers.
 */

export type CoverStyle = "consulting" | "legal" | "bank" | "executive";
export type PageOrientationOption = "portrait" | "landscape";

export interface DocumentRenderPreset {
  id: string;
  label: string;
  description: string;
  page: {
    format: "A4" | "Letter";
    orientation: PageOrientationOption;
    /** Margins in millimetres. */
    marginsMm: { top: number; right: number; bottom: number; left: number };
  };
  typography: {
    /** PDF font families (PDFKit built-ins). */
    fontFamily: string;
    fontFamilyBold: string;
    fontFamilyItalic: string;
    /** DOCX font name. */
    docxFontFamily: string;
    /** Sizes in points. */
    bodySize: number;
    h1Size: number;
    h2Size: number;
    h3Size: number;
    lineHeight: number;
  };
  headerFooter: {
    enabled: boolean;
    showProjectName: boolean;
    showDocumentTitle: boolean;
    showPageNumbers: boolean;
    showDate: boolean;
  };
  coverPage: {
    enabled: boolean;
    style: CoverStyle;
  };
  tableOfContents: {
    enabled: boolean;
    maxDepth: 2 | 3;
  };
  keyFigures: {
    enabled: boolean;
    max: number;
  };
  callouts: {
    enabled: boolean;
  };
  layout: {
    /** Start every H2 section on a new page (legal/clause style). */
    pageBreakBeforeH2: boolean;
  };
  tables: {
    style: "clean" | "formal" | "compact";
    repeatHeader: boolean;
    avoidPageBreakInside: boolean;
    zebra: boolean;
  };
  colors: {
    accent: string;
    text: string;
    muted: string;
    faint: string;
    rule: string;
    tableHeaderFill: string;
    tableBorder: string;
    tableZebra: string;
    calloutFill: string;
  };
}

const NEUTRALS = {
  text: "#1a1c22",
  muted: "#5b5e6a",
  faint: "#9094a1",
  rule: "#d8dade",
  tableHeaderFill: "#f1f2f4",
  tableBorder: "#d0d3d9",
  tableZebra: "#fafafb",
  calloutFill: "#f6f6f8",
};

const HELVETICA = {
  fontFamily: "Helvetica",
  fontFamilyBold: "Helvetica-Bold",
  fontFamilyItalic: "Helvetica-Oblique",
};

const TIMES = {
  fontFamily: "Times-Roman",
  fontFamilyBold: "Times-Bold",
  fontFamilyItalic: "Times-Italic",
};

const PREMIUM_CONSULTING: DocumentRenderPreset = {
  id: "premium_consulting",
  label: "Premium Consulting",
  description: "Business plans, strategy reports, cahiers des charges.",
  page: {
    format: "A4",
    orientation: "portrait",
    marginsMm: { top: 26, right: 22, bottom: 24, left: 22 },
  },
  typography: {
    ...HELVETICA,
    docxFontFamily: "Calibri",
    bodySize: 10.5,
    h1Size: 24,
    h2Size: 15,
    h3Size: 12,
    lineHeight: 1.45,
  },
  headerFooter: {
    enabled: true,
    showProjectName: true,
    showDocumentTitle: true,
    showPageNumbers: true,
    showDate: true,
  },
  coverPage: { enabled: true, style: "consulting" },
  tableOfContents: { enabled: true, maxDepth: 3 },
  keyFigures: { enabled: true, max: 4 },
  callouts: { enabled: true },
  layout: { pageBreakBeforeH2: false },
  tables: { style: "clean", repeatHeader: true, avoidPageBreakInside: true, zebra: true },
  colors: { ...NEUTRALS, accent: "#17324d" },
};

const FORMAL_LEGAL: DocumentRenderPreset = {
  id: "formal_legal",
  label: "Formal Legal",
  description: "Contracts, legal notes, regulatory memos.",
  page: {
    format: "A4",
    orientation: "portrait",
    marginsMm: { top: 28, right: 25, bottom: 26, left: 25 },
  },
  typography: {
    ...TIMES,
    docxFontFamily: "Georgia",
    bodySize: 11,
    h1Size: 21,
    h2Size: 13.5,
    h3Size: 11.5,
    lineHeight: 1.5,
  },
  headerFooter: {
    enabled: true,
    showProjectName: false,
    showDocumentTitle: true,
    showPageNumbers: true,
    showDate: true,
  },
  coverPage: { enabled: true, style: "legal" },
  tableOfContents: { enabled: true, maxDepth: 2 },
  keyFigures: { enabled: false, max: 0 },
  callouts: { enabled: true },
  layout: { pageBreakBeforeH2: true },
  tables: { style: "formal", repeatHeader: true, avoidPageBreakInside: true, zebra: false },
  colors: { ...NEUTRALS, accent: "#3a3d45" },
};

const BANK_FINANCING: DocumentRenderPreset = {
  id: "bank_financing",
  label: "Bank Financing",
  description: "Financing requests, investment files, project dossiers.",
  page: {
    format: "A4",
    orientation: "portrait",
    marginsMm: { top: 26, right: 23, bottom: 24, left: 23 },
  },
  typography: {
    ...HELVETICA,
    docxFontFamily: "Calibri",
    bodySize: 10.5,
    h1Size: 22,
    h2Size: 14,
    h3Size: 11.5,
    lineHeight: 1.45,
  },
  headerFooter: {
    enabled: true,
    showProjectName: true,
    showDocumentTitle: true,
    showPageNumbers: true,
    showDate: true,
  },
  coverPage: { enabled: true, style: "bank" },
  tableOfContents: { enabled: true, maxDepth: 2 },
  keyFigures: { enabled: true, max: 6 },
  callouts: { enabled: true },
  layout: { pageBreakBeforeH2: false },
  tables: { style: "formal", repeatHeader: true, avoidPageBreakInside: true, zebra: true },
  colors: { ...NEUTRALS, accent: "#1f3d33" },
};

const MINIMAL_EXECUTIVE: DocumentRenderPreset = {
  id: "minimal_executive",
  label: "Minimal Executive",
  description: "Internal memos, board notes, concise executive documents.",
  page: {
    format: "A4",
    orientation: "portrait",
    marginsMm: { top: 24, right: 24, bottom: 22, left: 24 },
  },
  typography: {
    ...HELVETICA,
    docxFontFamily: "Calibri",
    bodySize: 10.5,
    h1Size: 20,
    h2Size: 13.5,
    h3Size: 11.5,
    lineHeight: 1.5,
  },
  headerFooter: {
    enabled: true,
    showProjectName: false,
    showDocumentTitle: true,
    showPageNumbers: true,
    showDate: false,
  },
  coverPage: { enabled: true, style: "executive" },
  tableOfContents: { enabled: false, maxDepth: 2 },
  keyFigures: { enabled: true, max: 3 },
  callouts: { enabled: true },
  layout: { pageBreakBeforeH2: false },
  tables: { style: "compact", repeatHeader: true, avoidPageBreakInside: true, zebra: false },
  colors: { ...NEUTRALS, accent: "#111318" },
};

export const RENDER_PRESETS: Record<string, DocumentRenderPreset> = {
  premium_consulting: PREMIUM_CONSULTING,
  formal_legal: FORMAL_LEGAL,
  bank_financing: BANK_FINANCING,
  minimal_executive: MINIMAL_EXECUTIVE,
};

export const RENDER_PRESET_LIST = Object.values(RENDER_PRESETS);

export const DEFAULT_RENDER_PRESET_ID = "premium_consulting";

/** Ticket 029 preset ids keep resolving (consulting style + orientation). */
const LEGACY_PRESET_MAP: Record<string, { id: string; orientation: PageOrientationOption }> = {
  premium_a4_portrait: { id: "premium_consulting", orientation: "portrait" },
  premium_a4_landscape: { id: "premium_consulting", orientation: "landscape" },
};

export function resolveRenderPreset(
  id: string | null | undefined,
  orientation?: PageOrientationOption | null
): DocumentRenderPreset {
  let baseId = id && RENDER_PRESETS[id] ? id : null;
  let legacyOrientation: PageOrientationOption | null = null;

  if (!baseId && id && LEGACY_PRESET_MAP[id]) {
    baseId = LEGACY_PRESET_MAP[id].id;
    legacyOrientation = LEGACY_PRESET_MAP[id].orientation;
  }

  const base = RENDER_PRESETS[baseId || DEFAULT_RENDER_PRESET_ID];
  const finalOrientation = orientation || legacyOrientation || base.page.orientation;

  if (finalOrientation === base.page.orientation) return base;
  return {
    ...base,
    page: { ...base.page, orientation: finalOrientation },
  };
}

/* --------------------------------------------------------------- Metadata */

export interface RenderKeyFigure {
  label: string;
  value: string;
}

export interface RenderLogo {
  buffer: Buffer;
  mime: "image/png" | "image/jpeg";
  width: number;
  height: number;
}

export type VisualSize = "small" | "medium" | "large" | "full_width";

/** Fraction of the content width each visual size occupies. */
export const VISUAL_SIZE_RATIO: Record<VisualSize, number> = {
  small: 0.4,
  medium: 0.62,
  large: 0.82,
  full_width: 1,
};

export interface RenderVisual {
  buffer: Buffer;
  mime: "image/png" | "image/jpeg";
  width: number;
  height: number;
  target: "section" | "appendix";
  sectionTitle: string | null;
  size: VisualSize;
  caption: string | null;
}

export function visualAnnexTitle(language: "fr" | "en"): string {
  return language === "fr" ? "Annexes visuelles" : "Visual annexes";
}

export interface DocumentRenderMetadata {
  documentTitle: string;
  projectName?: string | null;
  documentType?: string | null;
  status?: string | null;
  version?: string | null;
  date?: Date | null;
  description?: string | null;
  confidentiality?: string | null;
  companyName?: string | null;
  preparedByOverride?: string | null;
  logo?: RenderLogo | null;
  keyFigures?: RenderKeyFigure[];
  visuals?: RenderVisual[];
  /** "fr" | "en" — drives fixed labels like the TOC title. */
  language?: "fr" | "en";
}

const STATUS_LABELS: Record<string, { fr: string; en: string }> = {
  DRAFT: { fr: "Version de travail", en: "Working draft" },
  GENERATING: { fr: "En cours de génération", en: "Generating" },
  READY_FOR_REVIEW: { fr: "Version de travail", en: "Ready for review" },
  APPROVED: { fr: "Version approuvée", en: "Approved" },
  ARCHIVED: { fr: "Archivé", en: "Archived" },
};

export function humanStatus(
  status: string | null | undefined,
  language: "fr" | "en"
): string | null {
  if (!status) return null;
  const entry = STATUS_LABELS[status];
  return entry ? entry[language] : status;
}

export function tocTitle(language: "fr" | "en"): string {
  return language === "fr" ? "Sommaire" : "Contents";
}

export function keyFiguresTitle(language: "fr" | "en"): string {
  return language === "fr" ? "Chiffres clés" : "Key figures";
}

export function preparedByLabel(language: "fr" | "en"): string {
  return language === "fr" ? "Préparé par" : "Prepared by";
}

export function pageLabel(language: "fr" | "en"): string {
  return "Page";
}

export type CalloutKind = "note" | "risk" | "decision" | "warning" | "missing";

export function calloutLabel(kind: CalloutKind, language: "fr" | "en"): string {
  const labels: Record<CalloutKind, { fr: string; en: string }> = {
    note: { fr: "NOTE", en: "NOTE" },
    risk: { fr: "RISQUE", en: "RISK" },
    decision: { fr: "DÉCISION", en: "DECISION" },
    warning: { fr: "VIGILANCE", en: "WARNING" },
    missing: { fr: "À COMPLÉTER", en: "MISSING" },
  };
  return labels[kind][language];
}

/** Cheap language sniff so fixed labels (Sommaire/Contents) match the body. */
export function guessLanguage(markdown: string): "fr" | "en" {
  const sample = markdown.slice(0, 4000).toLowerCase();
  const frenchSignals = (sample.match(
    /\b(le|la|les|des|une|et|pour|avec|dans|sur|est|sont|être|projet|charges|besoins|risques|données|sécurité)\b|[àâçéèêëîïôùûœ]/g
  ) || []).length;
  return frenchSignals >= 12 ? "fr" : "en";
}

export function formatRenderDate(date: Date, language: "fr" | "en"): string {
  return new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}
