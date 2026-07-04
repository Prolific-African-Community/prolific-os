/**
 * Document Planning (Ticket 022) — normalized, section-by-section plan produced
 * before final generation. Pure module (no AI, no DB, no heavy deps), safe to
 * import from the client, the API and the generation layer.
 */

export type DocumentPlanStatus = "ready" | "partial" | "failed" | "pending";

export type Confidence = "high" | "medium" | "low";

export interface PlanKeyFigure {
  label: string;
  value: string;
  source?: string;
}

export interface PlanTable {
  title: string;
  purpose: string;
  columns: string[];
}

export interface PlanVisual {
  type: "timeline" | "process" | "chart" | "diagram" | "map" | "none";
  description: string;
}

export interface PlanSection {
  id: string;
  title: string;
  level: 2 | 3;
  purpose: string;
  targetWords?: number;
  sourceBriefs: string[];
  keyFacts: string[];
  keyFigures: PlanKeyFigure[];
  tables: PlanTable[];
  visualIdeas: PlanVisual[];
  risks: string[];
  assumptions: string[];
  openQuestions: string[];
  acceptanceCriteria: string[];
}

export interface PlanAnnex {
  title: string;
  source?: string;
  purpose: string;
}

export interface SourceCoverage {
  resourcesUsed: string[];
  resourcesNotUsed: Array<{ resourceTitle: string; reason: string }>;
  confidence: Confidence;
  warnings: string[];
}

export interface DocumentPlan {
  documentTitle: string;
  documentType: string;
  language: "fr" | "en" | "unknown";
  targetLength: { minWords: number; idealWords: number; maxWords?: number };
  format: {
    pageFormat?: "A4" | "Letter" | "Slide" | "Unknown";
    orientation?: "portrait" | "landscape" | "unknown";
    outputMode?: "markdown" | "docx" | "pdf" | "presentation" | "unknown";
  };
  executiveIntent: string;
  sourceCoverage: SourceCoverage;
  sections: PlanSection[];
  annexes: PlanAnnex[];
  missingInformation: string[];
  qualityChecklist: string[];
  generationStrategy: string;
}

/* --------------------------------------------------------- Sanitization */

const MAX_SECTIONS = 40;
const MAX_ITEMS = 16;
const MAX_STR = 800;

const str = (v: unknown, max = MAX_STR): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const strList = (v: unknown, max = MAX_ITEMS): string[] =>
  Array.isArray(v)
    ? v.map((i) => str(i, 400)).filter((s) => s.length > 0).slice(0, max)
    : [];

const confidence = (v: unknown): Confidence =>
  v === "high" || v === "medium" || v === "low" ? v : "medium";

const num = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
};

function figures(v: unknown): PlanKeyFigure[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((f) => {
      const o = (f && typeof f === "object" ? f : {}) as Record<string, unknown>;
      const label = str(o.label, 160);
      const value = str(o.value, 200);
      if (!label && !value) return null;
      const fig: PlanKeyFigure = { label: label || "Figure", value };
      const source = str(o.source, 160);
      if (source) fig.source = source;
      return fig;
    })
    .filter((f): f is PlanKeyFigure => f !== null)
    .slice(0, MAX_ITEMS);
}

function tables(v: unknown): PlanTable[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((t) => {
      const o = (t && typeof t === "object" ? t : {}) as Record<string, unknown>;
      const title = str(o.title, 160);
      if (!title) return null;
      return {
        title,
        purpose: str(o.purpose, 300),
        columns: strList(o.columns, 12),
      };
    })
    .filter((t): t is PlanTable => t !== null)
    .slice(0, 8);
}

function visuals(v: unknown): PlanVisual[] {
  if (!Array.isArray(v)) return [];
  const allowed = ["timeline", "process", "chart", "diagram", "map", "none"];
  return v
    .map((x) => {
      const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
      const type = (allowed.includes(o.type as string) ? o.type : "none") as
        PlanVisual["type"];
      const description = str(o.description, 300);
      if (!description) return null;
      return { type, description };
    })
    .filter((x): x is PlanVisual => x !== null)
    .slice(0, 6);
}

function sections(v: unknown): PlanSection[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((s, index): PlanSection | null => {
      const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      const title = str(o.title, 200);
      if (!title) return null;
      const level = o.level === 3 ? 3 : 2;
      return {
        id: str(o.id, 60) || `s${index + 1}`,
        title,
        level: level as 2 | 3,
        purpose: str(o.purpose, 600),
        targetWords: num(o.targetWords),
        sourceBriefs: strList(o.sourceBriefs, 12),
        keyFacts: strList(o.keyFacts),
        keyFigures: figures(o.keyFigures),
        tables: tables(o.tables),
        visualIdeas: visuals(o.visualIdeas),
        risks: strList(o.risks),
        assumptions: strList(o.assumptions),
        openQuestions: strList(o.openQuestions),
        acceptanceCriteria: strList(o.acceptanceCriteria),
      };
    })
    .filter((s): s is PlanSection => s !== null)
    .slice(0, MAX_SECTIONS);
}

export function sanitizeDocumentPlan(
  raw: unknown,
  fallback: { documentTitle: string; documentType: string }
): DocumentPlan {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const tl = (o.targetLength && typeof o.targetLength === "object"
    ? o.targetLength
    : {}) as Record<string, unknown>;
  const fmt = (o.format && typeof o.format === "object" ? o.format : {}) as Record<
    string,
    unknown
  >;
  const sc = (o.sourceCoverage && typeof o.sourceCoverage === "object"
    ? o.sourceCoverage
    : {}) as Record<string, unknown>;

  const notUsed = Array.isArray(sc.resourcesNotUsed)
    ? sc.resourcesNotUsed
        .map((r) => {
          const ro = (r && typeof r === "object" ? r : {}) as Record<
            string,
            unknown
          >;
          const resourceTitle = str(ro.resourceTitle, 160);
          if (!resourceTitle) return null;
          return { resourceTitle, reason: str(ro.reason, 240) };
        })
        .filter((r): r is { resourceTitle: string; reason: string } => r !== null)
        .slice(0, MAX_ITEMS)
    : [];

  const annexes: PlanAnnex[] = Array.isArray(o.annexes)
    ? o.annexes
        .map((a) => {
          const ao = (a && typeof a === "object" ? a : {}) as Record<
            string,
            unknown
          >;
          const title = str(ao.title, 160);
          if (!title) return null;
          const annex: PlanAnnex = { title, purpose: str(ao.purpose, 300) };
          const source = str(ao.source, 160);
          if (source) annex.source = source;
          return annex;
        })
        .filter((a): a is PlanAnnex => a !== null)
        .slice(0, MAX_ITEMS)
    : [];

  const language =
    o.language === "fr" || o.language === "en" ? o.language : "unknown";

  return {
    documentTitle: str(o.documentTitle, 200) || fallback.documentTitle,
    documentType: str(o.documentType, 120) || fallback.documentType,
    language,
    targetLength: {
      minWords: num(tl.minWords) ?? 2500,
      idealWords: num(tl.idealWords) ?? 3500,
      maxWords: num(tl.maxWords),
    },
    format: {
      pageFormat: (["A4", "Letter", "Slide", "Unknown"].includes(
        fmt.pageFormat as string
      )
        ? fmt.pageFormat
        : "A4") as DocumentPlan["format"]["pageFormat"],
      orientation: (["portrait", "landscape", "unknown"].includes(
        fmt.orientation as string
      )
        ? fmt.orientation
        : "portrait") as DocumentPlan["format"]["orientation"],
      outputMode: (["markdown", "docx", "pdf", "presentation", "unknown"].includes(
        fmt.outputMode as string
      )
        ? fmt.outputMode
        : "markdown") as DocumentPlan["format"]["outputMode"],
    },
    executiveIntent: str(o.executiveIntent, 1000),
    sourceCoverage: {
      resourcesUsed: strList(sc.resourcesUsed, MAX_ITEMS),
      resourcesNotUsed: notUsed,
      confidence: confidence(sc.confidence),
      warnings: strList(sc.warnings, 8),
    },
    sections: sections(o.sections),
    annexes,
    missingInformation: strList(o.missingInformation),
    qualityChecklist: strList(o.qualityChecklist),
    generationStrategy: str(o.generationStrategy, 1200),
  };
}

/* ------------------------------------------------------- Quality gate lite */

export function assessPlan(
  plan: DocumentPlan,
  ctx: { isLargeDocument: boolean; hasResources: boolean; hasWeakSources: boolean }
): { status: DocumentPlanStatus; warnings: string[] } {
  const warnings: string[] = [];

  if (!plan.sections.length) {
    return { status: "failed", warnings: ["The plan has no sections."] };
  }
  if (plan.sections.some((s) => !s.title.trim())) {
    warnings.push("Some planned sections have empty titles.");
  }
  if (ctx.isLargeDocument && plan.sections.length < 8) {
    warnings.push(
      `Only ${plan.sections.length} sections planned for a large document (expected 8+).`
    );
  }
  const hasFigures = plan.sections.some((s) => s.keyFigures.length > 0);
  if (ctx.hasResources && !hasFigures) {
    warnings.push("No key figures were allocated to any section.");
  }
  if (
    ctx.hasWeakSources &&
    !plan.sourceCoverage.warnings.length &&
    !plan.missingInformation.length
  ) {
    warnings.push("Sources look weak but no coverage warnings were raised.");
  }

  const status: DocumentPlanStatus =
    warnings.length || plan.sections.length < 5 ? "partial" : "ready";
  return { status, warnings };
}

/* ------------------------------------------------------------ Rendering */

export function documentPlanToMarkdown(plan: DocumentPlan): string {
  const lines: string[] = [];
  lines.push(`# Document plan — ${plan.documentTitle}`);
  lines.push("");
  lines.push(
    `**Type:** ${plan.documentType} · **Language:** ${plan.language} · **Target:** ${plan.targetLength.minWords}–${plan.targetLength.idealWords} words`
  );
  if (plan.executiveIntent) {
    lines.push("");
    lines.push(`> ${plan.executiveIntent}`);
  }
  lines.push("");

  lines.push("## Source coverage");
  if (plan.sourceCoverage.resourcesUsed.length) {
    lines.push(`- **Used:** ${plan.sourceCoverage.resourcesUsed.join(", ")}`);
  }
  for (const r of plan.sourceCoverage.resourcesNotUsed) {
    lines.push(`- **Not used:** ${r.resourceTitle} — ${r.reason}`);
  }
  for (const w of plan.sourceCoverage.warnings) lines.push(`- ⚠ ${w}`);
  lines.push(`- Confidence: ${plan.sourceCoverage.confidence}`);
  lines.push("");

  lines.push("## Sections");
  plan.sections.forEach((s, i) => {
    lines.push(`### ${i + 1}. ${s.title}`);
    if (s.purpose) lines.push(s.purpose);
    if (s.sourceBriefs.length)
      lines.push(`- Sources: ${s.sourceBriefs.join(", ")}`);
    if (s.keyFigures.length)
      lines.push(
        `- Key figures: ${s.keyFigures
          .map((f) => `${f.label} = ${f.value}${f.source ? ` (${f.source})` : ""}`)
          .join("; ")}`
      );
    if (s.tables.length)
      lines.push(`- Tables: ${s.tables.map((t) => t.title).join(", ")}`);
    if (s.openQuestions.length)
      lines.push(`- Open questions: ${s.openQuestions.join("; ")}`);
    lines.push("");
  });

  if (plan.annexes.length) {
    lines.push("## Annexes");
    for (const a of plan.annexes) lines.push(`- ${a.title}: ${a.purpose}`);
    lines.push("");
  }

  if (plan.missingInformation.length) {
    lines.push("## Missing information");
    for (const m of plan.missingInformation) lines.push(`- ${m}`);
    lines.push("");
  }

  if (plan.generationStrategy) {
    lines.push("## Generation strategy");
    lines.push(plan.generationStrategy);
  }

  return lines.join("\n").trim();
}

/** Compact plan rendering for the final generation prompt. */
export function documentPlanForPrompt(plan: DocumentPlan): string {
  const lines: string[] = [];
  lines.push(
    `Target length: ${plan.targetLength.minWords}–${plan.targetLength.idealWords} words. Language: ${plan.language}.`
  );
  if (plan.executiveIntent) lines.push(`Executive intent: ${plan.executiveIntent}`);
  lines.push("");
  lines.push("Planned sections (follow this structure and order):");
  plan.sections.forEach((s, i) => {
    const prefix = s.level === 3 ? "   -" : `${i + 1}.`;
    lines.push(`${prefix} ${s.title}`);
    if (s.purpose) lines.push(`     Purpose: ${s.purpose}`);
    if (s.sourceBriefs.length)
      lines.push(`     Use sources: ${s.sourceBriefs.join(", ")}`);
    if (s.keyFigures.length)
      lines.push(
        `     Include figures (EXACT): ${s.keyFigures
          .map((f) => `${f.label}=${f.value}`)
          .join("; ")}`
      );
    if (s.tables.length)
      lines.push(
        `     Tables: ${s.tables
          .map((t) => `${t.title} [${t.columns.join(", ")}]`)
          .join("; ")}`
      );
    if (s.openQuestions.length)
      lines.push(`     Open questions to surface: ${s.openQuestions.join("; ")}`);
  });
  if (plan.annexes.length) {
    lines.push("");
    lines.push(`Annexes: ${plan.annexes.map((a) => a.title).join(", ")}`);
  }
  if (plan.missingInformation.length) {
    lines.push("");
    lines.push(
      `Missing information to surface (do not invent): ${plan.missingInformation.join(
        "; "
      )}`
    );
  }
  return lines.join("\n");
}

export function planSectionCount(plan: DocumentPlan | null | undefined): number {
  return plan?.sections?.length ?? 0;
}

export function planTotalTargetWords(
  plan: DocumentPlan | null | undefined
): number {
  return (
    plan?.sections?.reduce((sum, s) => sum + (s.targetWords || 0), 0) ?? 0
  );
}

/** A blank section for manual "add section" in the plan editor. */
export function emptyPlanSection(index: number): PlanSection {
  return {
    id: `manual-${Date.now()}-${index}`,
    title: "New section",
    level: 2,
    purpose: "",
    targetWords: 300,
    sourceBriefs: [],
    keyFacts: [],
    keyFigures: [],
    tables: [],
    visualIdeas: [],
    risks: [],
    assumptions: [],
    openQuestions: [],
    acceptanceCriteria: [],
  };
}

/**
 * Out-of-sync when sections exist and the plan was changed after it was last
 * applied to those sections (or was never applied).
 */
export function isPlanOutOfSync(args: {
  sectionsExist: boolean;
  planUpdatedAt: string | null;
  planAppliedAt: string | null;
}): boolean {
  if (!args.sectionsExist) return false;
  if (!args.planAppliedAt) return true;
  if (!args.planUpdatedAt) return false;
  return new Date(args.planUpdatedAt).getTime() > new Date(args.planAppliedAt).getTime();
}

export function planKeyFigureCount(plan: DocumentPlan | null | undefined): number {
  return (
    plan?.sections?.reduce((sum, s) => sum + (s.keyFigures?.length || 0), 0) ?? 0
  );
}

/* ------------------------------------------------------- UI presentation */

export const DOCUMENT_PLAN_STATUS_UI: Record<
  DocumentPlanStatus,
  { label: string; tone: "success" | "warning" | "danger" | "neutral"; hint: string }
> = {
  ready: {
    label: "Plan ready",
    tone: "success",
    hint: "Generation will follow this plan.",
  },
  partial: {
    label: "Plan drafted",
    tone: "warning",
    hint: "Usable, but review the coverage warnings.",
  },
  failed: {
    label: "Planning failed",
    tone: "danger",
    hint: "The plan could not be generated. Try again.",
  },
  pending: {
    label: "No plan yet",
    tone: "neutral",
    hint: "Generate a plan for a more controlled document.",
  },
};
