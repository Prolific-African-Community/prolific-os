import type {
  Document,
  DocumentSection,
  Project,
  ProjectKnowledge,
  Resource,
} from "@prisma/client";
import { generateTextWithOpenAI, getSectionModel } from "./openai";
import { decodeExtraction } from "../resources/extraction-meta";
import { SourceBrief } from "../resources/source-brief";
import { serializeSection } from "../documents/document-sections";

export interface SectionContext {
  project: Project;
  document: Document;
  section: DocumentSection;
  allSections: DocumentSection[];
  knowledgeItems: ProjectKnowledge[];
  resources: Resource[];
}

export interface SectionOutcome {
  content: string;
  model: string;
  words: number;
}

const clamp = (v: string | null | undefined, n: number) =>
  !v ? "" : v.length > n ? `${v.slice(0, n)}…` : v;

const asBrief = (value: unknown): SourceBrief | null =>
  value && typeof value === "object" ? (value as SourceBrief) : null;

const wordCount = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

/* --------------------------------------------------------------- Prompts */

function buildSystemPrompt(): string {
  return [
    "You are a senior consultant and professional technical writer producing ONE section of a larger professional document. You write only this section — not the whole document, no global introduction or conclusion unless this specific section is the introduction or conclusion.",
    "",
    "Rules:",
    "- Start the section with its Markdown heading (`## Section title`, or `### ` if it is a subsection). Do NOT output an H1.",
    "- Write polished, professional prose in the document's language. Develop the section with real analysis and operational implications — not shallow bullet lists.",
    "- Use the section's assigned source briefs as primary evidence. Preserve every supplied figure, price, name and unit EXACTLY.",
    "- Never invent facts, figures or clauses not supported by the provided context.",
    "- Integrate assumptions, decisions and missing information into natural professional phrasing (e.g. « Les informations disponibles permettent de retenir… », « Ce point devra être confirmé lors de… », « La décision à prendre porte sur… »). Do NOT repeat mechanical labels like « Hypothèse à confirmer : », « Arbitrage requis : » or « Information à compléter : » throughout.",
    "- Include a compact, valid Markdown table only where the section plan calls for one or where tabular data clearly helps. Keep cells short.",
    "- Keep the length roughly proportional to the target word count. Do not pad.",
    "- Output clean Markdown for this section only. No commentary, no code fences around the section.",
  ].join("\n");
}

export function matchResources(
  sourceBriefs: string[],
  resources: Resource[]
): Resource[] {
  if (!sourceBriefs.length) return [];
  const wanted = sourceBriefs.map((s) => s.toLowerCase().trim());
  return resources.filter((r) => {
    const name = r.filename.toLowerCase();
    return wanted.some(
      (w) => w && (name.includes(w) || w.includes(name))
    );
  });
}

export function sourceText(resources: Resource[], excerptChars: number): string {
  if (!resources.length) return "None assigned.";
  return resources
    .map((r, i) => {
      const brief = asBrief((r as { sourceBrief?: unknown }).sourceBrief);
      const { text } = decodeExtraction(r.extractedText);
      if (brief) {
        const figures = brief.keyFigures
          .slice(0, 10)
          .map((f) => `${f.label}=${f.value}`)
          .join("; ");
        return [
          `${i + 1}. ${r.filename}`,
          brief.summary ? `   Summary: ${clamp(brief.summary, 500)}` : "",
          brief.keyFacts.length ? `   Facts: ${brief.keyFacts.slice(0, 8).join("; ")}` : "",
          figures ? `   Figures (EXACT): ${figures}` : "",
          text ? `   Excerpt: ${clamp(text, excerptChars)}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      }
      return `${i + 1}. ${r.filename}: ${text ? clamp(text, excerptChars) : "[no text]"}`;
    })
    .join("\n\n");
}

function knowledgeText(items: ProjectKnowledge[]): string {
  if (!items.length) return "None.";
  return items
    .slice(0, 8)
    .map((k) => `- ${k.title}: ${clamp(k.content, 400)}`)
    .join("\n");
}

function buildUserPrompt(ctx: SectionContext): string {
  const s = serializeSection(ctx.section);
  const ordered = [...ctx.allSections].sort((a, b) => a.orderIndex - b.orderIndex);
  const planSummary = ordered
    .map((x, i) => `${i + 1}. ${x.title}`)
    .join("\n");
  const previousTitles = ordered
    .filter((x) => x.orderIndex < ctx.section.orderIndex)
    .map((x) => x.title);

  const assigned = matchResources(s.sourceBriefs, ctx.resources);
  const usingAssigned = assigned.length > 0;
  // Assigned sources get more room; general fallback uses briefs only (cheaper).
  const sources = usingAssigned
    ? sourceText(assigned, 1400)
    : sourceText(ctx.resources.slice(0, 4), 500);

  const targetWords = s.targetWords || 350;
  const headingLevel = s.level === 3 ? "###" : "##";

  const figures = s.keyFigures
    .map((f) => `${f.label} = ${f.value}${f.source ? ` (source: ${f.source})` : ""}`)
    .join("; ");

  return [
    `DOCUMENT: ${ctx.document.title} (type: ${ctx.document.type})`,
    `PROJECT: ${ctx.project.name} — ${ctx.project.description || "no description"}`,
    "",
    "FULL DOCUMENT PLAN (section order, for context only — write ONLY the current section):",
    planSummary,
    "",
    previousTitles.length
      ? `SECTIONS ALREADY BEFORE THIS ONE: ${previousTitles.join(" · ")}`
      : "THIS IS THE FIRST SECTION.",
    "",
    "==== CURRENT SECTION TO WRITE ====",
    `Heading: ${headingLevel} ${s.title}`,
    s.purpose ? `Purpose: ${s.purpose}` : "",
    `Target length: about ${targetWords} words.`,
    s.keyFacts.length ? `Key facts to use: ${s.keyFacts.join("; ")}` : "",
    figures ? `Key figures to include EXACTLY: ${figures}` : "",
    s.tables.length
      ? `Planned tables: ${s.tables
          .map((t) => `${t.title} [${(t.columns || []).join(", ")}]`)
          .join("; ")}`
      : "",
    s.risks.length ? `Risks to address: ${s.risks.join("; ")}` : "",
    s.assumptions.length ? `Assumptions to weave in: ${s.assumptions.join("; ")}` : "",
    s.openQuestions.length
      ? `Open questions to surface naturally: ${s.openQuestions.join("; ")}`
      : "",
    "",
    usingAssigned
      ? "ASSIGNED SOURCE BRIEFS (primary evidence — preserve figures exactly):"
      : "GENERAL SOURCE BRIEFS (no source specifically assigned — use what is relevant):",
    sources,
    "",
    "PROJECT KNOWLEDGE:",
    knowledgeText(ctx.knowledgeItems),
    "",
    `Now write ONLY the section « ${s.title} », starting with its ${headingLevel} heading.`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/* --------------------------------------------------------------- Generate */

function cleanSectionOutput(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^```(?:markdown)?/i, "").replace(/```$/i, "").trim();
  return text;
}

export async function generateSection(
  ctx: SectionContext
): Promise<SectionOutcome> {
  const s = serializeSection(ctx.section);
  const targetWords = s.targetWords || 350;
  // Controlled token budget: ~1.6 tokens/word + headroom, capped.
  const maxOutputTokens = Math.min(
    Math.max(Math.round(targetWords * 2.2), 500),
    2200
  );
  const model = getSectionModel();

  const result = await generateTextWithOpenAI(buildUserPrompt(ctx), {
    instructions: buildSystemPrompt(),
    model,
    maxOutputTokens,
  });

  const content = cleanSectionOutput(result.text);
  if (!content) {
    throw new Error("The section came back empty. Please try again.");
  }

  return { content, model: result.model, words: wordCount(content) };
}
