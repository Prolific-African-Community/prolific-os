import {
  generateTextWithOpenAI,
  getDistillationModel,
  hasOpenAIKey,
} from "./openai";
import {
  SourceBrief,
  SourceBriefStatus,
  SourceResourceType,
  minimalBrief,
  sanitizeSourceBrief,
  sourceBriefToMarkdown,
} from "../resources/source-brief";

const MIN_DISTILL_CHARS = 120;
const MAX_DISTILL_INPUT_CHARS = 14000;

export interface DistillInput {
  filename: string;
  resourceType: SourceResourceType;
  extractionStatus: string;
  extractedText: string | null;
}

export interface DistillOutcome {
  status: SourceBriefStatus;
  brief: SourceBrief;
  markdown: string | null;
  model: string | null;
  warning?: string;
}

/* --------------------------------------------------------------- Prompts */

function buildSystemPrompt(): string {
  return [
    "You are a senior analyst, document reviewer and operations/finance/legal-aware consultant. You read one source document and produce a structured, factual source brief that will feed professional document generation.",
    "",
    "Your job is to EXTRACT and STRUCTURE what is actually in the source — not to rewrite it, summarize the world, or add generic business filler.",
    "",
    "Hard rules:",
    "- Output a single JSON object ONLY. No prose, no Markdown, no code fences.",
    "- Never invent facts, figures, names, dates or clauses that are not present in the source. If something is implied but not stated, put it under `assumptions` (not `keyFacts`).",
    "- Preserve every number, currency, unit, name and proper noun EXACTLY as written in the source.",
    "- Do not draw legal conclusions or overstate confidence. Use `low`/`medium`/`high` honestly.",
    "- Detect the source language and set `language` to \"fr\", \"en\", or \"unknown\". Write brief fields in the SAME language as the source.",
    "- Keep each list item short and specific. Prefer concrete facts over vague statements.",
    "",
    "Return JSON with exactly these keys:",
    "{",
    '  "resourceTitle": string,',
    '  "language": "fr" | "en" | "unknown",',
    '  "summary": string,                       // 3-6 sentences: what this source is and what it contains',
    '  "keyFacts": string[],                    // confirmed facts stated in the source',
    '  "keyFigures": [{ "label": string, "value": string, "context"?: string, "confidence"?: "high"|"medium"|"low" }],',
    '  "entities": [{ "name": string, "type": "company"|"person"|"location"|"institution"|"project"|"other", "role"?: string }],',
    '  "dates": [{ "date": string, "context": string }],',
    '  "risks": string[],',
    '  "assumptions": string[],                 // implied, not confirmed',
    '  "constraints": string[],',
    '  "opportunities": string[],',
    '  "decisionsNeeded": string[],',
    '  "openQuestions": string[],               // what is missing or unclear in the source',
    '  "documentUses": [{ "documentType": string, "relevance": string }],',
    '  "usefulForSections": string[],           // e.g. "Besoins techniques", "Budget", "Risques"',
    '  "confidence": "high" | "medium" | "low",',
    '  "warnings": string[]                     // e.g. truncation, ambiguity, low text quality',
    "}",
    "Empty arrays are fine when a category is not present. Do not fabricate content to fill them.",
  ].join("\n");
}

function typeGuidance(resourceType: SourceResourceType): string {
  switch (resourceType) {
    case "xlsx":
      return [
        "This source is a spreadsheet rendered as Markdown tables.",
        "Focus on: sheet names, financial assumptions, tariffs, quantities, capacities, totals, and important rows/columns. Put concrete numbers in `keyFigures` with their label and unit, preserving values exactly. Flag anomalies or unclear cells in `warnings` or `openQuestions`.",
      ].join("\n");
    case "pdf":
    case "docx":
      return [
        "This source is a document (PDF/Word).",
        "Focus on: document purpose, parties/entities, obligations or commitments, key facts and figures, operational implications, risks, and missing information. If it is a contract/convention, capture parties, scope, obligations and key clauses factually (no legal conclusions).",
      ].join("\n");
    case "text":
    case "markdown":
      return [
        "This source is plain text / Markdown notes.",
        "Focus on: key project facts, useful instructions, assumptions, decisions, and source-specific guidance.",
      ].join("\n");
    default:
      return "Extract whatever concrete, factual information is present.";
  }
}

function buildUserPrompt(input: DistillInput, text: string): string {
  return [
    `SOURCE FILE: ${input.filename}`,
    `RESOURCE TYPE: ${input.resourceType}`,
    "",
    typeGuidance(input.resourceType),
    "",
    "Produce the JSON source brief for the following source content.",
    "",
    "----- SOURCE CONTENT START -----",
    text,
    "----- SOURCE CONTENT END -----",
  ].join("\n");
}

/* ------------------------------------------------------- JSON extraction */

function extractJsonObject(raw: string): unknown | null {
  let text = raw.trim();
  // Strip Markdown code fences if the model added them.
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    return JSON.parse(text.slice(first, last + 1));
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------- Distillation */

export async function distillResource(
  input: DistillInput
): Promise<DistillOutcome> {
  const fallback = {
    resourceTitle: input.filename,
    resourceType: input.resourceType,
  };

  // Visual / unsupported / oversized → nothing to distill.
  if (
    input.resourceType === "image" ||
    ["visual", "unsupported", "too_large"].includes(input.extractionStatus)
  ) {
    return {
      status: "not_applicable",
      brief: minimalBrief(fallback, {
        summary:
          input.resourceType === "image"
            ? "Visual asset — no text to distill. Potential uses: logo, illustration, photo, plan or scan."
            : "No extractable text available for distillation.",
      }),
      markdown: null,
      model: null,
    };
  }

  const text = (input.extractedText || "").trim();

  if (!text || ["empty", "failed"].includes(input.extractionStatus)) {
    return {
      status: "empty",
      brief: minimalBrief(fallback, {
        summary: "No extracted text available for this resource.",
      }),
      markdown: null,
      model: null,
    };
  }

  // Very short text → deterministic minimal brief, no AI call.
  if (text.length < MIN_DISTILL_CHARS) {
    const brief = minimalBrief(fallback, {
      summary: text.slice(0, 400),
      warnings: ["Very little text — full analysis was not performed."],
    });
    brief.keyFacts = [text.slice(0, 300)];
    return {
      status: "partial",
      brief,
      markdown: sourceBriefToMarkdown(brief),
      model: null,
    };
  }

  // No API key → leave pending (upload/extraction still succeed).
  if (!hasOpenAIKey()) {
    return {
      status: "pending",
      brief: minimalBrief(fallback, {
        warnings: ["Source brief pending — OpenAI is not configured."],
      }),
      markdown: null,
      model: null,
      warning: "Source brief could not be generated. Check OpenAI configuration.",
    };
  }

  const truncated = text.length > MAX_DISTILL_INPUT_CHARS;
  const clamped = truncated ? text.slice(0, MAX_DISTILL_INPUT_CHARS) : text;
  const model = getDistillationModel();

  try {
    const result = await generateTextWithOpenAI(buildUserPrompt(input, clamped), {
      instructions: buildSystemPrompt(),
      model,
      maxOutputTokens: 2400,
    });

    const parsed = extractJsonObject(result.text);
    if (!parsed) {
      return {
        status: "failed",
        brief: minimalBrief(fallback, {
          warnings: ["The source brief output could not be parsed."],
        }),
        markdown: null,
        model: result.model,
        warning: "Source brief could not be generated. Please try again.",
      };
    }

    const brief = sanitizeSourceBrief(parsed, fallback);
    if (truncated) {
      brief.warnings = [
        "Source was truncated for analysis; some later content may be missing.",
        ...brief.warnings,
      ].slice(0, 6);
    }

    const status: SourceBriefStatus = brief.summary ? "ready" : "partial";
    return {
      status,
      brief,
      markdown: sourceBriefToMarkdown(brief),
      model: result.model,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Source brief could not be generated.";
    return {
      status: "failed",
      brief: minimalBrief(fallback, { warnings: [message] }),
      markdown: null,
      model,
      warning: message,
    };
  }
}
