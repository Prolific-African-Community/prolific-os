import type { CellAlign } from "../markdown/table";

export const COMPOSITION_VERSION = "1.0" as const;

export type CompositionIntent =
  | "narrative"
  | "executive"
  | "evidence"
  | "comparison"
  | "process"
  | "reference"
  | "appendix";

export type VisualPriority = "hero" | "primary" | "supporting" | "ambient";
export type BreakPolicy = "auto" | "before" | "avoid" | "keep_with_next";
export type FlowWidth = "narrow" | "standard" | "wide" | "full";
export type ImageRole =
  | "cover"
  | "hero"
  | "background"
  | "concept"
  | "diagram"
  | "illustration"
  | "evidence"
  | "comparison"
  | "logo"
  | "icon";

export type OpportunityKind =
  | "timeline"
  | "flowchart"
  | "cycle"
  | "comparison"
  | "hub"
  | "architecture"
  | "four_pillars"
  | "process"
  | "journey"
  | "matrix"
  | "metric_grid"
  | "executive_summary"
  | "hero";

export interface LayoutDirective {
  width: FlowWidth;
  priority: VisualPriority;
  breakBefore: BreakPolicy;
  keepTogether: boolean;
  columns: 1 | 2 | 3;
  whitespaceBefore: "none" | "compact" | "standard" | "generous";
  whitespaceAfter: "none" | "compact" | "standard" | "generous";
}

export interface CompositionOpportunity {
  kind: OpportunityKind;
  confidence: number;
  reason: string;
  sourceNodeIds: string[];
}

export interface DensityAnalysis {
  wordCount: number;
  paragraphCount: number;
  bulletCount: number;
  tableCount: number;
  imageCount: number;
  citationCount: number;
  informationDensity: number;
  visualDensity: number;
  readingComplexity: number;
  estimatedReadingMinutes: number;
  estimatedSpeakingMinutes: number;
  visualBalance: number;
  whitespaceScore: number;
  layoutConfidence: number;
}

export interface CompositionWarning {
  code:
    | "empty_section"
    | "paragraph_overload"
    | "bullet_overload"
    | "table_overload"
    | "duplicate_visual"
    | "weak_hierarchy"
    | "missing_heading"
    | "unbalanced_layout"
    | "oversized_image"
    | "long_caption"
    | "citation_overload"
    | "poor_visual_rhythm"
    | "low_whitespace";
  severity: "info" | "warning" | "error";
  message: string;
  nodeId?: string;
  sectionId?: string;
}

interface NodeBase {
  id: string;
  layout: LayoutDirective;
  source: { kind: "markdown" | "plan" | "visual-placement"; index?: number };
}

export type CompositionNode =
  | (NodeBase & { type: "heading"; level: 1 | 2 | 3; text: string })
  | (NodeBase & { type: "paragraph"; text: string; lead: boolean })
  | (NodeBase & { type: "list"; ordered: boolean; items: string[] })
  | (NodeBase & { type: "quote"; text: string })
  | (NodeBase & {
      type: "callout";
      kind: "insight" | "decision" | "warning" | "risk" | "note" | "missing";
      text: string;
    })
  | (NodeBase & {
      type: "metric_grid";
      metrics: Array<{ label: string; value: string; source?: string }>;
      columns: 2 | 3 | 4;
    })
  | (NodeBase & {
      type: "table";
      header: string[];
      rows: string[][];
      aligns: CellAlign[];
    })
  | (NodeBase & {
      type: "image";
      assetId: string;
      role: ImageRole;
      bytes: Buffer;
      mime: "image/png" | "image/jpeg";
      width: number;
      height: number;
      caption: string | null;
      altText: string;
    })
  | (NodeBase & { type: "divider" })
  | (NodeBase & { type: "sources"; entries: string[] });

export interface CompositionSection {
  id: string;
  title: string;
  level: 2 | 3;
  intent: CompositionIntent;
  nodes: CompositionNode[];
  opportunities: CompositionOpportunity[];
  density: DensityAnalysis;
  layout: LayoutDirective;
}

export interface CompositionChapter {
  id: string;
  title: string;
  hero: CompositionNode | null;
  sections: CompositionSection[];
  layout: LayoutDirective;
}

export interface CompositionDocument {
  version: typeof COMPOSITION_VERSION;
  id: string;
  title: string;
  language: "fr" | "en";
  archetype: "proposal" | "legal" | "finance" | "executive" | "report";
  cover: {
    enabled: boolean;
    hero: CompositionNode | null;
    metrics: CompositionNode | null;
  };
  toc: { enabled: boolean; maxDepth: 2 | 3 };
  chapters: CompositionChapter[];
  appendices: CompositionSection[];
  opportunities: CompositionOpportunity[];
  density: DensityAnalysis;
  warnings: CompositionWarning[];
}

export interface CompositionImageInput {
  assetId?: string;
  filename?: string;
  role?: string;
  target: "cover" | "section" | "appendix";
  sectionTitle: string | null;
  position?: string;
  size: "small" | "medium" | "large" | "full_width";
  caption: string | null;
  buffer: Buffer;
  mime: "image/png" | "image/jpeg";
  width: number;
  height: number;
}

export interface CompositionInput {
  markdown: string;
  title: string;
  language: "fr" | "en";
  documentType?: string | null;
  presetStyle?: "consulting" | "legal" | "bank" | "executive";
  toc?: { enabled: boolean; maxDepth: 2 | 3 };
  coverEnabled?: boolean;
  keyFigures?: Array<{ label: string; value: string; source?: string }>;
  images?: CompositionImageInput[];
  plan?: unknown;
}

export const DEFAULT_LAYOUT: LayoutDirective = {
  width: "standard",
  priority: "supporting",
  breakBefore: "auto",
  keepTogether: false,
  columns: 1,
  whitespaceBefore: "standard",
  whitespaceAfter: "standard",
};
