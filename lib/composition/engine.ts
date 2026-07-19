import {
  DocumentBlock,
  normalizeHeading,
  parseMarkdownBlocks,
  plainText,
  stripLeadingTitle,
} from "../export/document-structure";
import { analyzeDensity, detectOpportunities } from "./analysis";
import {
  COMPOSITION_VERSION,
  CompositionChapter,
  CompositionDocument,
  CompositionImageInput,
  CompositionInput,
  CompositionNode,
  CompositionOpportunity,
  CompositionSection,
  DEFAULT_LAYOUT,
  ImageRole,
  LayoutDirective,
} from "./model";
import { validateComposition } from "./quality";

const idFactory = () => {
  let value = 0;
  return (prefix: string) => `${prefix}-${++value}`;
};

const layout = (overrides: Partial<LayoutDirective> = {}): LayoutDirective => ({
  ...DEFAULT_LAYOUT,
  ...overrides,
});

function archetype(input: CompositionInput): CompositionDocument["archetype"] {
  const text = `${input.documentType || ""} ${input.presetStyle || ""}`.toLowerCase();
  if (/legal|contract|jurid|law/.test(text)) return "legal";
  if (/bank|financ|invest/.test(text)) return "finance";
  if (/executive|board|memo/.test(text)) return "executive";
  if (/proposal|proposition|research|recherche/.test(text)) return "proposal";
  return "report";
}

function classifyImageRole(image: CompositionImageInput): ImageRole {
  if (image.target === "cover") return "cover";
  const role = (image.role || "").toLowerCase();
  if (role === "logo" || role === "icon" || role === "diagram" || role === "illustration") return role;
  if (role === "chart" || role === "map" || role === "plan" || role === "screenshot") return "evidence";
  if (role === "comparison") return "comparison";
  if (role === "background" || role === "concept") return role;
  if (image.size === "full_width" && image.width / image.height >= 1.5) return "hero";
  return role === "site_photo" ? "evidence" : "illustration";
}

function imageNode(image: CompositionImageInput, nextId: (prefix: string) => string): CompositionNode {
  const role = classifyImageRole(image);
  return {
    id: nextId("image"),
    type: "image",
    assetId: image.assetId || image.filename || `${image.width}x${image.height}`,
    role,
    bytes: image.buffer,
    mime: image.mime,
    width: image.width,
    height: image.height,
    caption: image.caption,
    altText: image.caption || image.filename || role,
    source: { kind: "visual-placement" },
    layout: layout({
      width: image.size === "full_width" ? "full" : image.size === "large" ? "wide" : image.size === "small" ? "narrow" : "standard",
      priority: role === "cover" || role === "hero" ? "hero" : role === "diagram" || role === "evidence" ? "primary" : "supporting",
      breakBefore: role === "hero" ? "avoid" : "auto",
      keepTogether: true,
      whitespaceBefore: "generous",
      whitespaceAfter: "standard",
    }),
  };
}

function blockNode(block: DocumentBlock, index: number, nextId: (prefix: string) => string): CompositionNode {
  const source = { kind: "markdown" as const, index };
  switch (block.type) {
    case "heading":
      return { id: nextId("heading"), type: "heading", level: block.level, text: plainText(block.text), source, layout: layout({ priority: block.level === 1 ? "hero" : "primary", breakBefore: "keep_with_next", keepTogether: true, whitespaceBefore: block.level === 2 ? "generous" : "standard" }) };
    case "paragraph":
      return { id: nextId("paragraph"), type: "paragraph", text: block.text, lead: false, source, layout: layout({ width: "standard" }) };
    case "list":
      return { id: nextId("list"), type: "list", ordered: block.ordered, items: block.items, source, layout: layout({ keepTogether: block.items.length <= 6 }) };
    case "blockquote":
      return { id: nextId("quote"), type: "quote", text: block.text, source, layout: layout({ width: "narrow", priority: "primary", keepTogether: true, whitespaceBefore: "generous", whitespaceAfter: "generous" }) };
    case "callout":
      return { id: nextId("callout"), type: "callout", kind: block.kind === "decision" ? "decision" : block.kind === "warning" ? "warning" : block.kind, text: block.text, source, layout: layout({ priority: "primary", keepTogether: true, whitespaceBefore: "standard", whitespaceAfter: "standard" }) };
    case "table":
      return { id: nextId("table"), type: "table", header: block.header, rows: block.rows, aligns: block.aligns, source, layout: layout({ width: "wide", priority: "primary", keepTogether: block.rows.length <= 8, whitespaceBefore: "generous", whitespaceAfter: "generous" }) };
    case "divider":
      return { id: nextId("divider"), type: "divider", source, layout: layout({ whitespaceBefore: "compact", whitespaceAfter: "compact" }) };
  }
}

function inferIntent(title: string, nodes: CompositionNode[]): CompositionSection["intent"] {
  const value = `${title} ${nodes.map((node) => ("text" in node ? node.text : "")).join(" ")}`.toLowerCase();
  if (/executive|summary|synth[eè]se|recommendation|decision/.test(value)) return "executive";
  if (/appendix|annex/.test(value)) return "appendix";
  if (/method|process|workflow|governance|implementation/.test(value)) return "process";
  if (/evidence|source|research|finding|analysis/.test(value)) return "evidence";
  if (/compar|option|scenario|versus/.test(value)) return "comparison";
  return "narrative";
}

function finalizeSection(section: Omit<CompositionSection, "density" | "opportunities">): CompositionSection {
  section.intent = inferIntent(section.title, section.nodes);
  const density = analyzeDensity(section.nodes);
  const opportunities = detectOpportunities(section);
  const firstParagraph = section.nodes.find((node) => node.type === "paragraph");
  if (firstParagraph && firstParagraph.type === "paragraph" && firstParagraph.text.split(/\s+/).length <= 80) firstParagraph.lead = true;
  return { ...section, density, opportunities };
}

function planOpportunities(plan: unknown): CompositionOpportunity[] {
  if (!plan || typeof plan !== "object") return [];
  const sections = (plan as { sections?: unknown[] }).sections;
  if (!Array.isArray(sections)) return [];
  const out: CompositionOpportunity[] = [];
  for (const section of sections) {
    if (!section || typeof section !== "object") continue;
    const visuals = (section as { visualIdeas?: unknown[] }).visualIdeas;
    if (!Array.isArray(visuals)) continue;
    for (const visual of visuals) {
      if (!visual || typeof visual !== "object") continue;
      const type = String((visual as { type?: unknown }).type || "");
      const kind = type === "process" ? "process" : type === "timeline" ? "timeline" : type === "diagram" ? "architecture" : null;
      if (kind) out.push({ kind, confidence: 0.88, reason: String((visual as { description?: unknown }).description || "Planned visual opportunity."), sourceNodeIds: [] });
    }
  }
  return out;
}

export function composeDocument(input: CompositionInput): CompositionDocument {
  const nextId = idFactory();
  const blocks = stripLeadingTitle(parseMarkdownBlocks(input.markdown), input.title);
  const images = input.images || [];
  const sectionImages = new Map<string, CompositionImageInput[]>();
  for (const image of images.filter((item) => item.target === "section" && item.sectionTitle)) {
    const key = normalizeHeading(image.sectionTitle!);
    sectionImages.set(key, [...(sectionImages.get(key) || []), image]);
  }

  const chapters: CompositionChapter[] = [];
  const appendices: CompositionSection[] = [];
  let currentChapter: CompositionChapter | null = null;
  let currentSection: Omit<CompositionSection, "density" | "opportunities"> | null = null;

  const closeSection = () => {
    if (!currentSection) return;
    const finished = finalizeSection(currentSection);
    if (finished.intent === "appendix") appendices.push(finished);
    else currentChapter?.sections.push(finished);
    currentSection = null;
  };

  blocks.forEach((block, index) => {
    if (block.type === "heading" && block.level === 2) {
      closeSection();
      currentChapter = { id: nextId("chapter"), title: plainText(block.text), hero: null, sections: [], layout: layout({ breakBefore: chapters.length ? "before" : "auto", priority: "primary", whitespaceBefore: "generous" }) };
      chapters.push(currentChapter);
      currentSection = { id: nextId("section"), title: currentChapter.title, level: 2, intent: "narrative", nodes: [blockNode(block, index, nextId)], layout: layout({ breakBefore: currentChapter.layout.breakBefore, whitespaceBefore: "generous" }) };
      const matching = sectionImages.get(normalizeHeading(currentChapter.title)) || [];
      const before = matching.filter((image) => image.position === "before_section" || image.position === "after_heading");
      currentSection.nodes.push(...before.map((image) => imageNode(image, nextId)));
      return;
    }
    if (block.type === "heading" && block.level === 3) {
      closeSection();
      if (!currentChapter) {
        currentChapter = { id: nextId("chapter"), title: input.title, hero: null, sections: [], layout: layout() };
        chapters.push(currentChapter);
      }
      currentSection = { id: nextId("section"), title: plainText(block.text), level: 3, intent: "narrative", nodes: [blockNode(block, index, nextId)], layout: layout({ breakBefore: "keep_with_next" }) };
      return;
    }
    if (!currentChapter) {
      currentChapter = { id: nextId("chapter"), title: input.title, hero: null, sections: [], layout: layout() };
      chapters.push(currentChapter);
    }
    if (!currentSection) currentSection = { id: nextId("section"), title: currentChapter.title, level: 2, intent: "narrative", nodes: [], layout: layout() };
    currentSection.nodes.push(blockNode(block, index, nextId));
  });
  closeSection();

  for (const chapter of chapters) {
    for (const section of chapter.sections) {
      section.intent = inferIntent(section.title, section.nodes);
      const matches = sectionImages.get(normalizeHeading(section.title)) || [];
      const trailing = matches.filter((image) => image.position !== "before_section" && image.position !== "after_heading");
      section.nodes.push(...trailing.map((image) => imageNode(image, nextId)));
      section.density = analyzeDensity(section.nodes);
      section.opportunities = detectOpportunities(section);
      const hero = section.nodes.find((node) => node.type === "image" && node.role === "hero") || null;
      if (!chapter.hero && hero) chapter.hero = hero;
    }
  }

  const appendixImages = images.filter((image) => image.target === "appendix");
  if (appendixImages.length) appendices.push(finalizeSection({ id: nextId("appendix"), title: input.language === "fr" ? "Annexes visuelles" : "Visual appendices", level: 2, intent: "appendix", nodes: appendixImages.map((image) => imageNode(image, nextId)), layout: layout({ breakBefore: "before" }) }));

  const coverHeroInput = images.find((image) => image.target === "cover");
  const coverHero = coverHeroInput ? imageNode(coverHeroInput, nextId) : null;
  const coverMetrics: CompositionNode | null = input.keyFigures?.length
    ? { id: nextId("metrics"), type: "metric_grid", metrics: input.keyFigures.slice(0, 6), columns: input.keyFigures.length <= 2 ? 2 : 3, source: { kind: "plan" }, layout: layout({ width: "wide", priority: "primary", keepTogether: true, columns: input.keyFigures.length <= 2 ? 2 : 3, whitespaceBefore: "generous" }) }
    : null;

  const allSections = [...chapters.flatMap((chapter) => chapter.sections), ...appendices];
  const allNodes = allSections.flatMap((section) => section.nodes);
  const opportunities = [...planOpportunities(input.plan), ...allSections.flatMap((section) => section.opportunities)];
  if (coverHero) opportunities.unshift({ kind: "hero", confidence: 1, reason: "An approved cover visual is available.", sourceNodeIds: [coverHero.id] });
  if (!allSections.some((section) => section.intent === "executive") && allNodes.length > 8) opportunities.push({ kind: "executive_summary", confidence: 0.76, reason: "A substantial document has no explicit executive summary.", sourceNodeIds: [] });

  const density = analyzeDensity(allNodes);
  const draft: CompositionDocument = {
    version: COMPOSITION_VERSION,
    id: nextId("document"),
    title: input.title,
    language: input.language,
    archetype: archetype(input),
    cover: { enabled: input.coverEnabled !== false, hero: coverHero, metrics: coverMetrics },
    toc: input.toc || { enabled: true, maxDepth: 2 },
    chapters,
    appendices,
    opportunities,
    density,
    warnings: [],
  };
  draft.warnings = validateComposition(allSections, chapters.length ? [] : [{ code: "missing_heading", severity: "error", message: "The document has no chapter hierarchy." }]);
  return draft;
}

/** Stable reading order for linear renderers. No editorial decisions occur here. */
export function compositionFlow(document: CompositionDocument): CompositionNode[] {
  return [
    ...document.chapters.flatMap((chapter) => chapter.sections.flatMap((section) => section.nodes)),
    ...document.appendices.flatMap((section) => section.nodes),
  ];
}
