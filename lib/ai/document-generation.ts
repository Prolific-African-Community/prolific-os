import type {
  Document,
  Project,
  ProjectKnowledge,
  Resource,
  Template,
} from "@prisma/client";
import {
  buildSystemInstructions,
  estimateContextRichness,
  getLengthDirective,
  getTypePlaybook,
} from "./document-standards";
import {
  ExtractionMeta,
  decodeExtraction,
} from "../resources/extraction-meta";
import { SourceBrief } from "../resources/source-brief";

export type DocumentGenerationContext = {
  project: Project;
  document: Document & { template?: Template | null };
  knowledgeItems: ProjectKnowledge[];
  resources: Resource[];
};

const empty = "None";

const clamp = (value: string | null | undefined, limit = 3000) => {
  if (!value) return empty;
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
};

const listKnowledge = (items: ProjectKnowledge[]) => {
  if (!items.length) return "- None";

  return items
    .map((item, index) => {
      const category = item.category ? ` (${item.category})` : "";
      return [
        `${index + 1}. ${item.title}${category}`,
        clamp(item.content, 2000),
      ].join("\n");
    })
    .join("\n\n");
};

type DecodedResource = {
  resource: Resource;
  text: string | null;
  meta: ExtractionMeta | null;
  brief: SourceBrief | null;
  briefStatus: string | null;
};

const asBrief = (value: unknown): SourceBrief | null =>
  value && typeof value === "object" ? (value as SourceBrief) : null;

const decodeResources = (items: Resource[]): DecodedResource[] =>
  items.map((resource) => {
    const { text, meta } = decodeExtraction(resource.extractedText);
    return {
      resource,
      text,
      meta,
      brief: asBrief((resource as { sourceBrief?: unknown }).sourceBrief),
      briefStatus:
        (resource as { sourceBriefStatus?: string | null }).sourceBriefStatus ??
        null,
    };
  });

/** Resource list with the extraction header decoded, so richness reflects the
 * clean text rather than the packed metadata. */
const resourcesWithCleanText = (items: Resource[]): Resource[] =>
  decodeResources(items).map(({ resource, text }) => ({
    ...resource,
    extractedText: text,
  }));

const list = (title: string, items: string[], cap = 8) =>
  items.length ? `${title}:\n${items.slice(0, cap).map((i) => `- ${i}`).join("\n")}` : "";

/** Compact, prompt-friendly rendering of a source brief (distilled facts). */
const briefBlock = (brief: SourceBrief): string => {
  const parts: string[] = [];
  if (brief.summary) parts.push(`Summary: ${brief.summary}`);
  parts.push(list("Key facts", brief.keyFacts));
  if (brief.keyFigures.length) {
    parts.push(
      "Key figures (PRESERVE EXACTLY):\n" +
        brief.keyFigures
          .slice(0, 12)
          .map(
            (f) =>
              `- ${f.label}: ${f.value}${f.context ? ` (${f.context})` : ""}`
          )
          .join("\n")
    );
  }
  if (brief.entities.length) {
    parts.push(
      list(
        "Entities",
        brief.entities.map(
          (e) => `${e.name} — ${e.type}${e.role ? ` (${e.role})` : ""}`
        )
      )
    );
  }
  parts.push(list("Risks", brief.risks));
  parts.push(list("Assumptions (not confirmed)", brief.assumptions));
  parts.push(list("Constraints", brief.constraints));
  parts.push(list("Open questions", brief.openQuestions));
  if (brief.usefulForSections.length) {
    parts.push(`Useful for sections: ${brief.usefulForSections.join(", ")}`);
  }
  return parts.filter(Boolean).join("\n");
};

const listResources = (items: Resource[]) => {
  if (!items.length) return "- None";

  const decoded = decodeResources(items);
  const rank = (d: DecodedResource) =>
    d.brief && (d.briefStatus === "ready" || d.briefStatus === "partial")
      ? 2
      : d.text
      ? 1
      : 0;
  // Distilled sources first, then raw-text sources, then metadata-only.
  decoded.sort((a, b) => rank(b) - rank(a));

  return decoded
    .map(({ resource, text, meta, brief, briefStatus }, index) => {
      const url = resource.storageUrl ? `\nURL: ${resource.storageUrl}` : "";
      const size =
        resource.sizeBytes !== null && resource.sizeBytes !== undefined
          ? `\nSize: ${resource.sizeBytes} bytes`
          : "";
      const statusLine = meta
        ? `\nExtraction: ${meta.status}${meta.summary ? ` — ${meta.summary}` : ""}`
        : "";

      const useBrief =
        brief && (briefStatus === "ready" || briefStatus === "partial") &&
        (brief.summary || brief.keyFacts.length || brief.keyFigures.length);

      let body: string;
      if (useBrief && brief) {
        const excerpt = text ? `\nRaw excerpt:\n${clamp(text, 900)}` : "";
        body = `\nSource brief (${briefStatus}):\n${briefBlock(brief)}${excerpt}`;
      } else if (text) {
        body = `\nExtracted content:\n${clamp(text, 3000)}`;
      } else {
        body =
          "\nExtracted content: [none available — treat as a known gap; do NOT fabricate its contents]";
      }

      return `${index + 1}. ${resource.filename} (${resource.mimeType})${size}${url}${statusLine}${body}`;
    })
    .join("\n\n");
};

/** Pull out the concrete figures we must preserve verbatim, to reinforce them. */
const extractFigures = (context: DocumentGenerationContext) => {
  const haystack = [
    context.project.description || "",
    context.document.objective || "",
    context.document.instructions || "",
    ...context.knowledgeItems.map((k) => k.content),
    ...context.resources.map((r) => decodeExtraction(r.extractedText).text || ""),
  ].join("\n");

  const matches = haystack.match(
    /(?:[€$£]\s?\d[\d\s.,]*|\d[\d\s.,]*\s?(?:€|\$|£|%|m²|m2|m³|m3|km|kg|t|m|€\/[a-z²³]+|\/\s?(?:nuit|mois|an|jour|night|month|year|day)))/gi
  );

  if (!matches) return null;

  const unique = Array.from(new Set(matches.map((m) => m.trim()))).slice(0, 30);
  return unique.length ? unique.join(" · ") : null;
};

export function buildGenerationInputSummary({
  project,
  document,
  knowledgeItems,
  resources,
}: DocumentGenerationContext) {
  const template = document.template;
  const knowledgeSummary = knowledgeItems.slice(0, 8).map((item) => {
    const category = item.category ? ` (${item.category})` : "";
    return `${item.title}${category}`;
  });
  const resourceSummary = decodeResources(resources)
    .slice(0, 8)
    .map(({ resource, text, meta }) => {
      const status = meta ? ` [${meta.status}]` : "";
      const preview = text ? `\n  Preview: ${clamp(text, 600)}` : "";
      return `${resource.filename} (${resource.mimeType})${status}${preview}`;
    });

  const richness = estimateContextRichness({
    project,
    document,
    knowledgeItems,
    resources: resourcesWithCleanText(resources),
  });
  const playbook = getTypePlaybook(
    document.type,
    template?.name,
    template?.type,
    document.title
  );

  return [
    "Generation Context",
    "",
    `Document-type playbook: ${playbook.label}`,
    `Context richness: ${richness}`,
    "",
    "Project",
    `Name: ${project.name}`,
    `Description: ${project.description || empty}`,
    "",
    "Document",
    `Title: ${document.title}`,
    `Type: ${document.type}`,
    `Objective: ${document.objective}`,
    `Instructions: ${document.instructions || empty}`,
    "",
    "Template",
    template ? `Name: ${template.name}\nType: ${template.type}` : "No template selected",
    "",
    "Knowledge",
    `Count: ${knowledgeItems.length}`,
    knowledgeSummary.length
      ? knowledgeSummary.map((item) => `- ${item}`).join("\n")
      : "- None",
    "",
    "Resources",
    `Count: ${resources.length}`,
    resourceSummary.length
      ? resourceSummary.map((item) => `- ${item}`).join("\n")
      : "- None",
  ].join("\n");
}

/** System-level instructions (persona + house style) for the Responses API. */
export function buildDocumentSystemInstructions() {
  return buildSystemInstructions();
}

/** The user prompt: the concrete brief + all assembled project context. */
export function buildDocumentGenerationPrompt(context: DocumentGenerationContext) {
  const { project, document, knowledgeItems, resources } = context;
  const template = document.template;
  const richness = estimateContextRichness({
    ...context,
    resources: resourcesWithCleanText(resources),
  });
  const playbook = getTypePlaybook(
    document.type,
    template?.name,
    template?.type,
    document.title
  );
  const figures = extractFigures(context);

  return [
    "Produce the final professional document described below, following the Prolific OS house standards you were given.",
    "",
    "====================",
    `DOCUMENT-TYPE PLAYBOOK — ${playbook.label}`,
    "====================",
    playbook.guidance,
    "",
    "====================",
    "DEPTH & LENGTH",
    "====================",
    getLengthDirective(richness),
    "",
    "====================",
    "PROJECT",
    "====================",
    `Name: ${project.name}`,
    `Description: ${project.description || empty}`,
    "",
    "====================",
    "DOCUMENT REQUEST",
    "====================",
    `Title: ${document.title}`,
    `Type: ${document.type}`,
    `Objective: ${document.objective}`,
    `Instructions: ${document.instructions || empty}`,
    "",
    "====================",
    "SELECTED TEMPLATE",
    "====================",
    template
      ? [
          `Name: ${template.name}`,
          `Type: ${template.type}`,
          `Description: ${template.description || empty}`,
          `Structure to follow: ${clamp(template.structure, 4000)}`,
          `Template generation rules: ${clamp(template.generationRules, 4000)}`,
        ].join("\n")
      : "No template selected — use the document-type playbook structure above.",
    "",
    "====================",
    "PROJECT KNOWLEDGE (primary source material — use it extensively)",
    "====================",
    listKnowledge(knowledgeItems),
    "",
    "====================",
    "PROJECT RESOURCES (source material — distilled source briefs first, then raw excerpts)",
    "====================",
    "Use the distilled facts, figures and risks from each source brief as primary evidence. Preserve every figure exactly. Raw excerpts are provided for specificity; do not fabricate beyond what a source contains.",
    "",
    listResources(resources),
    "",
    "====================",
    "EXISTING OUTLINE (author intent — respect it if present)",
    "====================",
    clamp(document.outline, 3000),
    "",
    "====================",
    "EXISTING DRAFT CONTENT (improve/extend rather than discard, if present)",
    "====================",
    clamp(document.content, 5000),
    "",
    figures
      ? `NUMBERS TO PRESERVE EXACTLY (do not alter, round, or invent around these): ${figures}`
      : "No explicit figures detected in the context — do not invent any.",
    "",
    "Now write the complete, standardized Markdown document. Begin directly with the H1 title.",
  ].join("\n");
}
