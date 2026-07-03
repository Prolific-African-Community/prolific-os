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

const listResources = (items: Resource[]) => {
  if (!items.length) return "- None";

  return items
    .map((item, index) => {
      const url = item.storageUrl ? `\nURL: ${item.storageUrl}` : "";
      const size =
        item.sizeBytes !== null && item.sizeBytes !== undefined
          ? `\nSize: ${item.sizeBytes} bytes`
          : "";
      const extractedText = item.extractedText
        ? `\nExtracted text / notes: ${clamp(item.extractedText, 2200)}`
        : "\nExtracted text: [none — treat as metadata only]";

      return `${index + 1}. ${item.filename} (${item.mimeType})${size}${url}${extractedText}`;
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
    ...context.resources.map((r) => r.extractedText || ""),
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
  const resourceSummary = resources.slice(0, 8).map((item) => {
    const extractedText = item.extractedText
      ? `\n  Extracted text: ${clamp(item.extractedText, 600)}`
      : "";

    return `${item.filename} (${item.mimeType})${extractedText}`;
  });

  const richness = estimateContextRichness({
    project,
    document,
    knowledgeItems,
    resources,
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
  const richness = estimateContextRichness(context);
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
    "PROJECT RESOURCES (source material)",
    "====================",
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
