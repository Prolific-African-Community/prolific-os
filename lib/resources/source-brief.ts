/**
 * Resource Distillation (Ticket 021) — normalized "source brief" produced from
 * a resource's extracted text. This module is pure (no heavy deps, no AI, no
 * DB), so it can be imported by the client, the API and the generation layer.
 */

export type SourceBriefStatus =
  | "ready" // full brief produced
  | "partial" // brief produced from limited text / low confidence
  | "empty" // no meaningful content to distill
  | "failed" // distillation errored (e.g. OpenAI issue)
  | "not_applicable" // visual asset / unsupported — nothing to distill
  | "pending"; // eligible, but not yet distilled (e.g. no API key)

export type SourceResourceType =
  | "pdf"
  | "docx"
  | "xlsx"
  | "text"
  | "markdown"
  | "image"
  | "other";

export type Confidence = "high" | "medium" | "low";

export interface KeyFigure {
  label: string;
  value: string;
  context?: string;
  confidence?: Confidence;
}

export interface BriefEntity {
  name: string;
  type: "company" | "person" | "location" | "institution" | "project" | "other";
  role?: string;
}

export interface BriefDate {
  date: string;
  context: string;
}

export interface DocumentUse {
  documentType: string;
  relevance: string;
}

export interface SourceBrief {
  resourceTitle: string;
  resourceType: SourceResourceType;
  language: "fr" | "en" | "unknown";
  summary: string;
  keyFacts: string[];
  keyFigures: KeyFigure[];
  entities: BriefEntity[];
  dates: BriefDate[];
  risks: string[];
  assumptions: string[];
  constraints: string[];
  opportunities: string[];
  decisionsNeeded: string[];
  openQuestions: string[];
  documentUses: DocumentUse[];
  usefulForSections: string[];
  confidence: Confidence;
  warnings: string[];
}

/* -------------------------------------------------------- Sanitization */

const MAX_ITEMS = 14;
const MAX_STR = 600;
const MAX_SUMMARY = 1600;

const str = (v: unknown, max = MAX_STR): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const strList = (v: unknown, max = MAX_ITEMS): string[] => {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => str(item))
    .filter((s) => s.length > 0)
    .slice(0, max);
};

const confidence = (v: unknown): Confidence =>
  v === "high" || v === "medium" || v === "low" ? v : "medium";

export function resourceTypeFrom(
  fileType: string | undefined,
  mimeType: string
): SourceResourceType {
  const ft = (fileType || "").toLowerCase();
  if (ft === "pdf" || mimeType === "application/pdf") return "pdf";
  if (ft === "docx" || mimeType.includes("wordprocessingml")) return "docx";
  if (ft === "xlsx" || mimeType.includes("spreadsheetml")) return "xlsx";
  if (mimeType === "text/markdown") return "markdown";
  if (ft === "text" || mimeType === "text/plain") return "text";
  if (mimeType.startsWith("image/")) return "image";
  return "other";
}

/** Coerce arbitrary parsed model JSON into a valid, bounded SourceBrief. */
export function sanitizeSourceBrief(
  raw: unknown,
  fallback: { resourceTitle: string; resourceType: SourceResourceType }
): SourceBrief {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;

  const keyFigures: KeyFigure[] = Array.isArray(obj.keyFigures)
    ? obj.keyFigures
        .map((f) => {
          const o = (f && typeof f === "object" ? f : {}) as Record<
            string,
            unknown
          >;
          const label = str(o.label, 160);
          const value = str(o.value, 200);
          if (!label && !value) return null;
          const fig: KeyFigure = { label: label || "Figure", value };
          const ctx = str(o.context, 300);
          if (ctx) fig.context = ctx;
          if (o.confidence) fig.confidence = confidence(o.confidence);
          return fig;
        })
        .filter((f): f is KeyFigure => f !== null)
        .slice(0, MAX_ITEMS)
    : [];

  const entities: BriefEntity[] = Array.isArray(obj.entities)
    ? obj.entities
        .map((e) => {
          const o = (e && typeof e === "object" ? e : {}) as Record<
            string,
            unknown
          >;
          const name = str(o.name, 160);
          if (!name) return null;
          const allowed = [
            "company",
            "person",
            "location",
            "institution",
            "project",
            "other",
          ];
          const type = (
            allowed.includes(o.type as string) ? o.type : "other"
          ) as BriefEntity["type"];
          const ent: BriefEntity = { name, type };
          const role = str(o.role, 160);
          if (role) ent.role = role;
          return ent;
        })
        .filter((e): e is BriefEntity => e !== null)
        .slice(0, MAX_ITEMS)
    : [];

  const dates: BriefDate[] = Array.isArray(obj.dates)
    ? obj.dates
        .map((d) => {
          const o = (d && typeof d === "object" ? d : {}) as Record<
            string,
            unknown
          >;
          const date = str(o.date, 80);
          if (!date) return null;
          return { date, context: str(o.context, 240) };
        })
        .filter((d): d is BriefDate => d !== null)
        .slice(0, MAX_ITEMS)
    : [];

  const documentUses: DocumentUse[] = Array.isArray(obj.documentUses)
    ? obj.documentUses
        .map((u) => {
          const o = (u && typeof u === "object" ? u : {}) as Record<
            string,
            unknown
          >;
          const documentType = str(o.documentType, 120);
          if (!documentType) return null;
          return { documentType, relevance: str(o.relevance, 300) };
        })
        .filter((u): u is DocumentUse => u !== null)
        .slice(0, MAX_ITEMS)
    : [];

  const language =
    obj.language === "fr" || obj.language === "en" ? obj.language : "unknown";

  return {
    resourceTitle: str(obj.resourceTitle, 200) || fallback.resourceTitle,
    resourceType: fallback.resourceType,
    language,
    summary: str(obj.summary, MAX_SUMMARY),
    keyFacts: strList(obj.keyFacts),
    keyFigures,
    entities,
    dates,
    risks: strList(obj.risks),
    assumptions: strList(obj.assumptions),
    constraints: strList(obj.constraints),
    opportunities: strList(obj.opportunities),
    decisionsNeeded: strList(obj.decisionsNeeded),
    openQuestions: strList(obj.openQuestions),
    documentUses,
    usefulForSections: strList(obj.usefulForSections),
    confidence: confidence(obj.confidence),
    warnings: strList(obj.warnings, 6),
  };
}

/** Deterministic minimal brief when AI is unavailable or text is too short. */
export function minimalBrief(
  fallback: { resourceTitle: string; resourceType: SourceResourceType },
  opts: { summary?: string; warnings?: string[] } = {}
): SourceBrief {
  return {
    resourceTitle: fallback.resourceTitle,
    resourceType: fallback.resourceType,
    language: "unknown",
    summary: opts.summary || "",
    keyFacts: [],
    keyFigures: [],
    entities: [],
    dates: [],
    risks: [],
    assumptions: [],
    constraints: [],
    opportunities: [],
    decisionsNeeded: [],
    openQuestions: [],
    documentUses: [],
    usefulForSections: [],
    confidence: "low",
    warnings: opts.warnings || [],
  };
}

export function keyFigureCount(brief: SourceBrief | null | undefined): number {
  return brief?.keyFigures?.length ?? 0;
}

/* --------------------------------------------------- Markdown rendering */

export function sourceBriefToMarkdown(brief: SourceBrief): string {
  const lines: string[] = [];
  const section = (title: string, items: string[]) => {
    if (!items.length) return;
    lines.push(`### ${title}`);
    for (const item of items) lines.push(`- ${item}`);
    lines.push("");
  };

  lines.push(`## Source brief — ${brief.resourceTitle}`);
  if (brief.summary) {
    lines.push("");
    lines.push(brief.summary);
    lines.push("");
  }

  section("Key facts", brief.keyFacts);

  if (brief.keyFigures.length) {
    lines.push("### Key figures");
    for (const f of brief.keyFigures) {
      const ctx = f.context ? ` — ${f.context}` : "";
      lines.push(`- **${f.label}:** ${f.value}${ctx}`);
    }
    lines.push("");
  }

  if (brief.entities.length) {
    lines.push("### Entities");
    for (const e of brief.entities) {
      const role = e.role ? ` (${e.role})` : "";
      lines.push(`- ${e.name} — ${e.type}${role}`);
    }
    lines.push("");
  }

  if (brief.dates.length) {
    lines.push("### Dates");
    for (const d of brief.dates) lines.push(`- ${d.date} — ${d.context}`);
    lines.push("");
  }

  section("Risks", brief.risks);
  section("Assumptions", brief.assumptions);
  section("Constraints", brief.constraints);
  section("Opportunities", brief.opportunities);
  section("Decisions needed", brief.decisionsNeeded);
  section("Open questions", brief.openQuestions);
  section("Useful for sections", brief.usefulForSections);

  if (brief.documentUses.length) {
    lines.push("### Useful for documents");
    for (const u of brief.documentUses) {
      lines.push(`- ${u.documentType}: ${u.relevance}`);
    }
    lines.push("");
  }

  lines.push(`_Confidence: ${brief.confidence}_`);
  return lines.join("\n").trim();
}

/* ------------------------------------------------------- UI presentation */

export const SOURCE_BRIEF_STATUS_UI: Record<
  SourceBriefStatus,
  {
    label: string;
    tone: "success" | "accent" | "warning" | "danger" | "neutral";
    hint: string;
  }
> = {
  ready: {
    label: "Source brief ready",
    tone: "success",
    hint: "A structured source brief is available to generation.",
  },
  partial: {
    label: "Partial brief",
    tone: "warning",
    hint: "Distilled from limited content — review before relying on it.",
  },
  pending: {
    label: "Needs source brief",
    tone: "neutral",
    hint: "Eligible for distillation. Generate a source brief.",
  },
  empty: {
    label: "No text to analyze",
    tone: "neutral",
    hint: "There is no extracted text to distill.",
  },
  not_applicable: {
    label: "Not applicable",
    tone: "neutral",
    hint: "Visual or unsupported asset — nothing to distill.",
  },
  failed: {
    label: "Distillation failed",
    tone: "danger",
    hint: "The source brief could not be generated.",
  },
};
