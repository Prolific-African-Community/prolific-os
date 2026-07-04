import type {
  Document,
  DocumentSection,
  Project,
  ProjectKnowledge,
  Resource,
} from "@prisma/client";
import { generateTextWithOpenAI, getSectionModel } from "./openai";
import { matchResources, sourceText } from "./section-generation";
import { serializeSection } from "../documents/document-sections";

export type RewriteMode =
  | "rewrite"
  | "shorten"
  | "expand"
  | "professionalize"
  | "add_table"
  | "make_executive"
  | "make_legal"
  | "make_operational";

export const REWRITE_MODES: RewriteMode[] = [
  "rewrite",
  "shorten",
  "expand",
  "professionalize",
  "add_table",
  "make_executive",
  "make_legal",
  "make_operational",
];

const MODE_GUIDANCE: Record<RewriteMode, string> = {
  rewrite: "",
  shorten:
    "Reduce the length by roughly 30% while keeping the important information and every exact figure.",
  expand:
    "Develop the section further with concrete analysis and operational implications, without inventing facts.",
  professionalize:
    "Make it more professional and structured, suitable for a document delivered to external partners.",
  add_table:
    "Add a clear, valid Markdown table where it improves readability — using only figures that already appear; do not invent data.",
  make_executive:
    "Rephrase with a more synthetic, strategic tone suited to an executive committee or a financer.",
  make_legal: "Adopt a more precise, legal-style wording.",
  make_operational:
    "Add concrete operational implications, responsibilities and implementation points.",
};

export interface RewriteContext {
  project: Project;
  document: Document;
  section: DocumentSection;
  knowledgeItems: ProjectKnowledge[];
  resources: Resource[];
}

export interface RewriteOutcome {
  content: string;
  model: string;
  words: number;
}

const wordCount = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

function buildSystemPrompt(): string {
  return [
    "You are a senior consultant and professional technical writer improving ONE section of a larger professional document, based on the user's instruction. You rewrite only this section — never the whole document, and never other sections.",
    "",
    "Rules:",
    "- Start with the section's Markdown heading (`## …` or `### …`). Do NOT output an H1.",
    "- The CURRENT SECTION CONTENT is your base: improve and transform it according to the instruction rather than starting from scratch. Preserve manual edits that are already there unless the instruction changes them.",
    "- Keep the same heading unless the instruction explicitly asks to change it.",
    "- Preserve every exact figure, price, name and unit. Do not change figures unless the instruction asks and the sources support it. Never invent unsupported facts.",
    "- Apply the user's instruction faithfully. Improve clarity, structure and professional quality; remove filler and repetition.",
    "- Integrate assumptions, decisions and missing information into natural professional phrasing (e.g. « À ce stade… », « Les informations disponibles indiquent… », « Ce point devra être confirmé… », « La décision à prendre porte sur… »). Do NOT repeat mechanical labels like « Hypothèse à confirmer : », « Arbitrage requis : » or « Information à compléter : ».",
    "- Use a compact, valid Markdown table where the instruction asks or where it clearly helps. Keep cells short.",
    "- Match the document's language. Output clean Markdown for this section only — no commentary, no code fences, and never mention that this is an AI rewrite.",
  ].join("\n");
}

function buildUserPrompt(
  ctx: RewriteContext,
  instruction: string,
  mode: RewriteMode
): string {
  const s = serializeSection(ctx.section);
  const assigned = matchResources(s.sourceBriefs, ctx.resources);
  const sources = assigned.length
    ? sourceText(assigned, 1200)
    : sourceText(ctx.resources.slice(0, 3), 400);
  const modeLine = MODE_GUIDANCE[mode];
  const figures = s.keyFigures
    .map((f) => `${f.label} = ${f.value}`)
    .join("; ");
  const heading = s.level === 3 ? "###" : "##";

  return [
    `DOCUMENT: ${ctx.document.title} (type: ${ctx.document.type})`,
    `PROJECT: ${ctx.project.name} — ${ctx.project.description || "no description"}`,
    "",
    `SECTION: ${heading} ${s.title}`,
    s.purpose ? `Section purpose: ${s.purpose}` : "",
    s.targetWords ? `Target length: about ${s.targetWords} words.` : "",
    figures ? `Key figures to PRESERVE EXACTLY: ${figures}` : "",
    s.keyFacts.length ? `Key facts: ${s.keyFacts.join("; ")}` : "",
    s.openQuestions.length
      ? `Open questions to keep visible (elegantly): ${s.openQuestions.join("; ")}`
      : "",
    "",
    "==== USER INSTRUCTION ====",
    instruction,
    modeLine ? `Additional guidance: ${modeLine}` : "",
    "",
    "==== CURRENT SECTION CONTENT (your base — improve this) ====",
    s.content || "(empty)",
    "",
    "==== SOURCE BRIEFS FOR THIS SECTION ====",
    sources,
    "",
    `Now output the improved section « ${s.title} » only, starting with its ${heading} heading.`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function cleanOutput(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:markdown)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

export async function rewriteSection(
  ctx: RewriteContext,
  instruction: string,
  mode: RewriteMode
): Promise<RewriteOutcome> {
  const s = serializeSection(ctx.section);
  const baseWords = Math.max(s.targetWords || 0, s.wordCount, 250);
  const maxOutputTokens = Math.min(
    Math.max(Math.round(baseWords * 2.5), 600),
    3000
  );
  const model = getSectionModel();

  const result = await generateTextWithOpenAI(
    buildUserPrompt(ctx, instruction, mode),
    {
      instructions: buildSystemPrompt(),
      model,
      maxOutputTokens,
    }
  );

  const content = cleanOutput(result.text);
  if (!content) {
    throw new Error("The rewrite came back empty. Please try again.");
  }

  return { content, model: result.model, words: wordCount(content) };
}
