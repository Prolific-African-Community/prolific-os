import type { OpportunityKind } from "../composition";

export const LAYOUT_VERSION = "1.0" as const;

export type LayoutMode = "paginated-document" | "presentation" | "continuous";
export type LayoutPageRole =
  | "cover"
  | "toc"
  | "section-opener"
  | "content"
  | "data"
  | "diagram"
  | "timeline"
  | "appendix"
  | "closing";

/** Normalized canvas coordinates. (0,0) is top-left; 1x1 is the full canvas. */
export interface Bounds { x: number; y: number; width: number; height: number }
export interface Insets { top: number; right: number; bottom: number; left: number }

export interface LayoutCanvas {
  width: number;
  height: number;
  aspectRatio: number;
  unit: "normalized";
  physicalHint: "A4" | "Letter" | "16:9" | "responsive";
  safeMargins: Insets;
  bleed: Insets;
}

export type LayoutElementType =
  | "text-frame"
  | "image-frame"
  | "table-frame"
  | "diagram-frame"
  | "callout-frame"
  | "metric-frame"
  | "caption"
  | "separator"
  | "source-note"
  | "background"
  | "overlay";

export interface LayoutElement {
  id: string;
  type: LayoutElementType;
  bounds: Bounds;
  sourceNodeIds: string[];
  typographyRole?: "display" | "title" | "heading" | "body" | "caption" | "source" | "metric";
  text?: string;
  image?: {
    assetId: string;
    role: string;
    crop: "contain" | "cover" | "focal-crop" | "fit-width" | "fit-height";
    focalPoint?: { x: number; y: number };
  };
  diagram?: { kind: OpportunityKind; itemCount: number };
  table?: { columns: number; rows: number; split: boolean; landscapeRecommended: boolean };
  padding: Insets;
  alignment: "left" | "center" | "right";
  verticalAlignment: "top" | "middle" | "bottom";
  zIndex: number;
  allowOverlap: boolean;
  overflow: "visible" | "clip" | "flow" | "split" | "notes";
  minSize?: { width?: number; height?: number };
  maxSize?: { width?: number; height?: number };
  aspectRatio?: number;
  anchor?: "inline" | "page" | "region" | "previous";
}

export interface LayoutRegion {
  id: string;
  role: "hero" | "title" | "body" | "sidebar" | "visual" | "data" | "footer" | "header" | "notes";
  bounds: Bounds;
  direction: "stack" | "row" | "grid" | "overlay";
  columns: number;
  gap: number;
  padding: Insets;
  elements: LayoutElement[];
}

export interface PageLayoutQuality {
  /** Deterministic layout heuristics, not objective design measurements. */
  balance: number;
  whitespace: number;
  hierarchy: number;
  readability: number;
  density: number;
  visualDominance: number;
  alignmentConsistency: number;
  collisionSafety: number;
  confidence: number;
}

export interface LayoutPage {
  id: string;
  index: number;
  role: LayoutPageRole;
  template: string;
  orientation: "portrait" | "landscape";
  regions: LayoutRegion[];
  background?: LayoutElement;
  header?: LayoutRegion;
  footer?: LayoutRegion;
  speakerNotes?: string[];
  sourceNodeIds: string[];
  quality: PageLayoutQuality;
}

export type LayoutWarningCode =
  | "TEXT_OVERFLOW_RISK"
  | "REGION_COLLISION"
  | "OUT_OF_BOUNDS"
  | "LOW_WHITESPACE"
  | "WEAK_HIERARCHY"
  | "SLIDE_TOO_DENSE"
  | "ORPHAN_HEADING"
  | "DETACHED_CAPTION"
  | "TABLE_TOO_WIDE"
  | "IMAGE_TOO_SMALL"
  | "IMAGE_LOW_RESOLUTION"
  | "MISSING_DOMINANT_VISUAL"
  | "UNRESOLVED_LAYOUT"
  | "TOO_MANY_SLIDES"
  | "TOO_FEW_SLIDES";

export interface LayoutWarning {
  code: LayoutWarningCode;
  severity: "info" | "warning" | "blocking";
  pageIndex: number;
  involvedNodeIds: string[];
  message: string;
  suggestedResolution: string;
  automaticallyResolved: boolean;
}

export interface LayoutDecision {
  id: string;
  pageIndex: number;
  sourceNodeIds: string[];
  action: "template-selected" | "page-break" | "split" | "move" | "demote-to-notes" | "deduplicate" | "landscape" | "crop" | "fallback";
  reason: string;
  precedence: "semantic" | "approved-placement" | "composition" | "template" | "density" | "default";
}

export interface LayoutMetrics {
  pageCount: number;
  regionCount: number;
  elementCount: number;
  automaticallyResolvedIssues: number;
  unresolvedBlockingIssues: number;
  aggregateQuality: PageLayoutQuality;
}

export interface LayoutMetadata {
  title: string;
  language: "fr" | "en";
  archetype: string;
  generatedAtPolicy: "deterministic-no-timestamp";
  policyId: string;
}

export interface LayoutDocument {
  version: typeof LAYOUT_VERSION;
  sourceCompositionId: string;
  mode: LayoutMode;
  canvas: LayoutCanvas;
  themeRef?: string;
  pages: LayoutPage[];
  warnings: LayoutWarning[];
  decisions: LayoutDecision[];
  metrics: LayoutMetrics;
  metadata: LayoutMetadata;
}

export interface LayoutPolicy {
  id: string;
  maxVisibleWordsPerSlide: number;
  maxBulletsPerSlide: number;
  maxSlides: number;
  minSlides: number;
  documentBodyCharactersPerLine: number;
  presentationBodyCharactersPerLine: number;
  minWhitespace: number;
  diagramConfidenceThreshold: number;
  lowResolutionPixelsPerNormalizedUnit: number;
}

export interface LayoutContext {
  mode: LayoutMode;
  canvas?: Partial<LayoutCanvas>;
  policy?: Partial<LayoutPolicy>;
  themeRef?: string;
  measurementProvider?: TextMeasurementProvider;
}

export interface TextMeasureRequest {
  text: string;
  typographyRole: NonNullable<LayoutElement["typographyRole"]>;
  maxWidth: number;
  locale?: string;
}

export interface TextMeasureResult {
  estimatedLines: number;
  estimatedHeight: number;
  overflowRisk: number;
}

export interface TextMeasurementProvider {
  measure(request: TextMeasureRequest): TextMeasureResult;
}
