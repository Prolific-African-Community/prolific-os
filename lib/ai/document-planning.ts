import type {
  Document,
  Project,
  ProjectKnowledge,
  Resource,
  Template,
} from "@prisma/client";
import {
  generateTextWithOpenAI,
  getPlannerModel,
  hasOpenAIKey,
} from "./openai";
import { extractJsonObject } from "./json-extract";
import { getTypePlaybook } from "./document-standards";
import { decodeExtraction } from "../resources/extraction-meta";
import { SourceBrief } from "../resources/source-brief";
import {
  DocumentPlan,
  DocumentPlanStatus,
  assessPlan,
  documentPlanToMarkdown,
  sanitizeDocumentPlan,
} from "../documents/document-plan";

export interface PlanContext {
  project: Project;
  document: Document & { template?: Template | null };
  knowledgeItems: ProjectKnowledge[];
  resources: Resource[];
}

export interface PlanOutcome {
  status: DocumentPlanStatus;
  plan: DocumentPlan | null;
  markdown: string | null;
  model: string | null;
  warning?: string;
  /** Truncated raw model output — surfaced by the endpoint in development only. */
  rawPreview?: string;
}

const clamp = (v: string | null | undefined, n: number) =>
  !v ? "" : v.length > n ? `${v.slice(0, n)}…` : v;

const asBrief = (value: unknown): SourceBrief | null =>
  value && typeof value === "object" ? (value as SourceBrief) : null;

/* --------------------------------------------------------------- Prompts */

function buildSystemPrompt(): string {
  return [
    "You are a senior management consultant, project director, business analyst and technical writer. Your task is to PLAN a professional document before it is written — you do NOT write the document itself.",
    "",
    "You produce a structured, section-by-section plan that maps what each section must contain, which sources feed it, which exact figures it must include, and what remains uncertain.",
    "",
    "Hard rules:",
    "- Output a single, strictly valid JSON object ONLY. No prose, no Markdown, no code fences, no comments, no trailing commas. The first character MUST be `{` and the last character MUST be `}`. Use straight double quotes for all keys and string values.",
    "- Use project knowledge and resource SOURCE BRIEFS as the primary evidence. Use raw excerpts only to confirm specifics.",
    "- Never invent facts, figures, names or dates. Preserve every supplied number/currency/unit EXACTLY. Attribute each figure to its source.",
    "- Assign concrete sources (by filename) and specific key figures to the sections that should use them.",
    "- Make source coverage explicit: which resources are used, which are not (and why), and warnings about weak/low-quality sources.",
    "- Identify missing information rather than filling it in.",
    "- Suggest a table ONLY where tabular data genuinely helps; suggest a visual ONLY where it clarifies. Otherwise leave those arrays empty.",
    "- Match the document's language (detect fr/en). Adapt section titles to the actual project; do not output a generic skeleton if a specific type/template applies.",
    "",
    "Return JSON with exactly these keys:",
    "{",
    '  "documentTitle": string, "documentType": string, "language": "fr"|"en"|"unknown",',
    '  "targetLength": { "minWords": number, "idealWords": number, "maxWords"?: number },',
    '  "format": { "pageFormat": "A4"|"Letter"|"Slide"|"Unknown", "orientation": "portrait"|"landscape"|"unknown", "outputMode": "markdown"|"docx"|"pdf"|"presentation"|"unknown" },',
    '  "executiveIntent": string,',
    '  "sourceCoverage": { "resourcesUsed": string[], "resourcesNotUsed": [{ "resourceTitle": string, "reason": string }], "confidence": "high"|"medium"|"low", "warnings": string[] },',
    '  "sections": [{ "id": string, "title": string, "level": 2|3, "purpose": string, "targetWords"?: number, "sourceBriefs": string[], "keyFacts": string[], "keyFigures": [{ "label": string, "value": string, "source"?: string }], "tables": [{ "title": string, "purpose": string, "columns": string[] }], "visualIdeas": [{ "type": "timeline"|"process"|"chart"|"diagram"|"map"|"none", "description": string }], "risks": string[], "assumptions": string[], "openQuestions": string[], "acceptanceCriteria": string[] }],',
    '  "annexes": [{ "title": string, "source"?: string, "purpose": string }],',
    '  "missingInformation": string[], "qualityChecklist": string[], "generationStrategy": string',
    "}",
    "For a substantial professional document, plan at least 8 well-scoped sections. Empty arrays are fine where a category does not apply.",
  ].join("\n");
}

function knowledgeBlock(items: ProjectKnowledge[]): string {
  if (!items.length) return "None.";
  return items
    .slice(0, 12)
    .map((k, i) => `${i + 1}. ${k.title}${k.category ? ` (${k.category})` : ""}: ${clamp(k.content, 700)}`)
    .join("\n");
}

function sourceBlock(resources: Resource[]): {
  text: string;
  hasResources: boolean;
  hasWeakSources: boolean;
} {
  if (!resources.length) return { text: "None.", hasResources: false, hasWeakSources: false };

  let readyBriefs = 0;
  const parts = resources.map((r, i) => {
    const { text } = decodeExtraction(r.extractedText);
    const brief = asBrief((r as { sourceBrief?: unknown }).sourceBrief);
    const briefStatus = (r as { sourceBriefStatus?: string | null })
      .sourceBriefStatus;
    if (brief && (briefStatus === "ready" || briefStatus === "partial")) {
      readyBriefs += 1;
      const figures = brief.keyFigures
        .slice(0, 10)
        .map((f) => `${f.label}=${f.value}`)
        .join("; ");
      return [
        `${i + 1}. ${r.filename} — SOURCE BRIEF (${briefStatus})`,
        brief.summary ? `   Summary: ${clamp(brief.summary, 500)}` : "",
        brief.keyFacts.length ? `   Facts: ${brief.keyFacts.slice(0, 8).join("; ")}` : "",
        figures ? `   Figures (EXACT): ${figures}` : "",
        brief.openQuestions.length
          ? `   Open questions: ${brief.openQuestions.slice(0, 6).join("; ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    return `${i + 1}. ${r.filename} — excerpt: ${text ? clamp(text, 700) : "[no extracted text]"}`;
  });

  return {
    text: parts.join("\n\n"),
    hasResources: true,
    hasWeakSources: readyBriefs === 0,
  };
}

function buildUserPrompt(ctx: PlanContext): string {
  const { project, document, knowledgeItems, resources } = ctx;
  const template = document.template;
  const playbook = getTypePlaybook(
    document.type,
    template?.name,
    template?.type,
    document.title
  );
  const sources = sourceBlock(resources);

  return [
    "Produce the JSON document plan for the deliverable below.",
    "",
    `DOCUMENT-TYPE PLAYBOOK — ${playbook.label}:`,
    playbook.guidance,
    "",
    "PROJECT:",
    `Name: ${project.name}`,
    `Description: ${project.description || "None"}`,
    "",
    "DOCUMENT REQUEST:",
    `Title: ${document.title}`,
    `Type: ${document.type}`,
    `Objective: ${document.objective}`,
    `Instructions: ${document.instructions || "None"}`,
    template
      ? `Template: ${template.name} — structure: ${clamp(
          (template as { structure?: string }).structure ?? "",
          1500
        )}`
      : "Template: none",
    "",
    "PROJECT KNOWLEDGE:",
    knowledgeBlock(knowledgeItems),
    "",
    "PROJECT RESOURCES (source briefs first):",
    sources.text,
    "",
    "Now output the JSON document plan. Assign sources and exact figures to the sections that need them, and surface missing information and source-coverage warnings.",
  ].join("\n");
}

/* --------------------------------------------------------------- Repair */

function logParseFailure(model: string, raw: string, error: string) {
  // Safe debug info only — never secrets or full source documents.
  console.error("[document-plan] parse failed", {
    model,
    outputLength: raw.length,
    preview: raw.slice(0, 1000),
    error,
  });
}

const REPAIR_SCHEMA_SUMMARY =
  "Schema keys: documentTitle, documentType, language('fr'|'en'|'unknown'), targetLength{minWords,idealWords,maxWords?}, format{pageFormat,orientation,outputMode}, executiveIntent, sourceCoverage{resourcesUsed[],resourcesNotUsed[{resourceTitle,reason}],confidence,warnings[]}, sections[{id,title,level(2|3),purpose,targetWords?,sourceBriefs[],keyFacts[],keyFigures[{label,value,source?}],tables[{title,purpose,columns[]}],visualIdeas[{type,description}],risks[],assumptions[],openQuestions[],acceptanceCriteria[]}], annexes[{title,source?,purpose}], missingInformation[], qualityChecklist[], generationStrategy.";

/** One cheap repair pass: ask the model to convert bad output into strict JSON. */
async function repairPlanJson(
  rawText: string,
  model: string
): Promise<Record<string, unknown> | null> {
  const repairPrompt = [
    "The text below was meant to be a JSON document plan but is malformed. Convert it into a SINGLE valid JSON object.",
    "Return JSON ONLY — no markdown, no code fences, no comments, no trailing commas. The first character must be { and the last must be }.",
    REPAIR_SCHEMA_SUMMARY,
    "",
    "MALFORMED OUTPUT:",
    rawText.slice(0, 8000),
  ].join("\n");

  try {
    const result = await generateTextWithOpenAI(repairPrompt, {
      instructions:
        "You convert malformed text into strict, valid JSON. Output JSON only.",
      model,
      maxOutputTokens: 8000,
      jsonObject: true,
    });
    return extractJsonObject(result.text);
  } catch (error) {
    logParseFailure(
      model,
      "",
      `repair call failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

/* ------------------------------------------------------------- Planning */

export async function planDocument(ctx: PlanContext): Promise<PlanOutcome> {
  const fallback = {
    documentTitle: ctx.document.title,
    documentType: ctx.document.type,
  };

  if (!hasOpenAIKey()) {
    return {
      status: "failed",
      plan: null,
      markdown: null,
      model: null,
      warning: "Document plan could not be generated. Check OpenAI configuration.",
    };
  }

  const sources = sourceBlock(ctx.resources);
  const model = getPlannerModel();

  try {
    const result = await generateTextWithOpenAI(buildUserPrompt(ctx), {
      instructions: buildSystemPrompt(),
      model,
      // A full plan (20+ sections with source/figure allocation) is large JSON;
      // too low a ceiling truncates it mid-object and breaks parsing.
      maxOutputTokens: 8000,
      jsonObject: true,
    });

    let parsed = extractJsonObject(result.text);
    let repaired = false;

    if (!parsed) {
      logParseFailure(result.model, result.text, "extraction returned null");
      parsed = await repairPlanJson(result.text, model);
      repaired = Boolean(parsed);

      if (!parsed) {
        return {
          status: "failed",
          plan: null,
          markdown: null,
          model: result.model,
          warning:
            "The planner returned malformed JSON that could not be repaired. Retry, or reduce the context size.",
          rawPreview: result.text.slice(0, 1000),
        };
      }
    }

    const plan = sanitizeDocumentPlan(parsed, fallback);
    const { status, warnings } = assessPlan(plan, {
      isLargeDocument: true,
      hasResources: sources.hasResources,
      hasWeakSources: sources.hasWeakSources,
    });
    const allWarnings = repaired
      ? ["Plan was repaired after malformed model output.", ...warnings]
      : warnings;
    if (allWarnings.length) {
      plan.sourceCoverage.warnings = [
        ...plan.sourceCoverage.warnings,
        ...allWarnings,
      ].slice(0, 10);
    }

    return {
      status,
      plan,
      markdown: documentPlanToMarkdown(plan),
      model: result.model,
      warning: repaired
        ? "Plan was repaired after malformed model output."
        : undefined,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Document plan could not be generated.";
    return { status: "failed", plan: null, markdown: null, model, warning: message };
  }
}
