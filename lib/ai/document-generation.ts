import type {
  Document,
  Project,
  ProjectKnowledge,
  Resource,
  Template,
} from "@prisma/client";

export type DocumentGenerationContext = {
  project: Project;
  document: Document & { template?: Template | null };
  knowledgeItems: ProjectKnowledge[];
  resources: Resource[];
};

const empty = "None";

const clamp = (value: string | null | undefined, limit = 3000) => {
  if (!value) return empty;
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
};

const listKnowledge = (items: ProjectKnowledge[]) => {
  if (!items.length) return "- None";

  return items
    .map((item, index) => {
      const category = item.category ? ` (${item.category})` : "";
      return [
        `${index + 1}. ${item.title}${category}`,
        clamp(item.content, 1200),
      ].join("\n");
    })
    .join("\n\n");
};

const listResources = (items: Resource[]) => {
  if (!items.length) return "- None";

  return items
    .map((item, index) => {
      const url = item.storageUrl ? `\nURL: ${item.storageUrl}` : "";
      const extractedText = item.extractedText
        ? `\nExtracted text / notes: ${clamp(item.extractedText, 1200)}`
        : "";

      return `${index + 1}. ${item.filename} (${item.mimeType})${url}${extractedText}`;
    })
    .join("\n\n");
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

  return [
    "Generation Context",
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

export function buildDocumentGenerationPrompt(context: DocumentGenerationContext) {
  const { project, document, knowledgeItems, resources } = context;
  const template = document.template;

  return [
    "You are generating a professional document for Prolific OS.",
    "",
    "Return Markdown only.",
    "Do not include commentary, explanations, code fences, or metadata outside the document.",
    "Produce a complete professional document with clear headings and sections.",
    "Follow the selected template when available.",
    "Use project knowledge as source context.",
    "Use resource metadata and extracted text only when available.",
    "Do not invent unsupported facts.",
    "When information is missing, use the placeholder [Information à compléter].",
    "Write in the same language as the document objective or instructions when clear.",
    "Maintain a structured, polished, professional style.",
    "",
    "PROJECT",
    `Name: ${project.name}`,
    `Description: ${project.description || empty}`,
    "",
    "DOCUMENT REQUEST",
    `Title: ${document.title}`,
    `Type: ${document.type}`,
    `Objective: ${document.objective}`,
    `Instructions: ${document.instructions || empty}`,
    "",
    "TEMPLATE",
    template
      ? [
          `Name: ${template.name}`,
          `Type: ${template.type}`,
          `Description: ${template.description || empty}`,
          `Structure: ${clamp(template.structure, 4000)}`,
          `Generation rules: ${clamp(template.generationRules, 4000)}`,
        ].join("\n")
      : "No template selected.",
    "",
    "PROJECT KNOWLEDGE",
    listKnowledge(knowledgeItems),
    "",
    "PROJECT RESOURCES",
    listResources(resources),
    "",
    "EXISTING OUTLINE",
    clamp(document.outline, 3000),
    "",
    "EXISTING CONTENT",
    clamp(document.content, 5000),
    "",
    "Generate the complete Markdown document now.",
  ].join("\n");
}
