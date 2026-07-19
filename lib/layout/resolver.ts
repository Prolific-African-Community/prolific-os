import type { CompositionDocument, CompositionNode, CompositionOpportunity, CompositionSection } from "../composition";
import { compositionFlow } from "../composition";
import { inspectPageGeometry, scorePage } from "./geometry";
import { ApproximateTextMeasurer } from "./measurement";
import {
  Bounds,
  Insets,
  LAYOUT_VERSION,
  LayoutContext,
  LayoutDecision,
  LayoutDocument,
  LayoutElement,
  LayoutMetrics,
  LayoutPage,
  LayoutPageRole,
  LayoutPolicy,
  LayoutRegion,
  LayoutWarning,
  PageLayoutQuality,
  TextMeasurementProvider,
} from "./model";
import { getLayoutPattern, LAYOUT_PATTERNS } from "./patterns";

export const DEFAULT_LAYOUT_POLICY: LayoutPolicy = {
  id: "prolific-layout-v1",
  maxVisibleWordsPerSlide: 72,
  maxBulletsPerSlide: 5,
  maxSlides: 40,
  minSlides: 3,
  documentBodyCharactersPerLine: 78,
  presentationBodyCharactersPerLine: 42,
  minWhitespace: 28,
  diagramConfidenceThreshold: 0.72,
  lowResolutionPixelsPerNormalizedUnit: 900,
};

const zeroInsets = (): Insets => ({ top: 0, right: 0, bottom: 0, left: 0 });
const canvasFor = (context: LayoutContext) => {
  const base = context.mode === "presentation"
    ? { width: 1, height: 1, aspectRatio: 16 / 9, unit: "normalized" as const, physicalHint: "16:9" as const, safeMargins: { top: .06, right: .06, bottom: .07, left: .06 }, bleed: zeroInsets() }
    : context.mode === "continuous"
    ? { width: 1, height: 1, aspectRatio: .72, unit: "normalized" as const, physicalHint: "responsive" as const, safeMargins: { top: .04, right: .08, bottom: .04, left: .08 }, bleed: zeroInsets() }
    : { width: 1, height: 1, aspectRatio: 210 / 297, unit: "normalized" as const, physicalHint: "A4" as const, safeMargins: { top: .075, right: .075, bottom: .08, left: .075 }, bleed: zeroInsets() };
  return { ...base, ...context.canvas, safeMargins: { ...base.safeMargins, ...context.canvas?.safeMargins }, bleed: { ...base.bleed, ...context.canvas?.bleed } };
};
const safeBounds = (m: Insets): Bounds => ({ x: m.left, y: m.top, width: 1 - m.left - m.right, height: 1 - m.top - m.bottom });
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
const nodeText = (node: CompositionNode) => {
  if (node.type === "heading" || node.type === "paragraph" || node.type === "quote" || node.type === "callout") return node.text;
  if (node.type === "list") return node.items.join("\n");
  if (node.type === "metric_grid") return node.metrics.map((m) => `${m.value} ${m.label}`).join("\n");
  if (node.type === "table") return [...node.header, ...node.rows.flat()].join(" ");
  if (node.type === "sources") return node.entries.join("\n");
  return "";
};
const nodeRole = (node: CompositionNode): NonNullable<LayoutElement["typographyRole"]> => node.type === "heading" ? (node.level === 1 ? "display" : "title") : node.type === "metric_grid" ? "metric" : node.type === "sources" ? "source" : node.type === "image" ? "caption" : "body";

function estimateNodeHeight(node: CompositionNode, width: number, measure: TextMeasurementProvider): number {
  if (node.type === "image") return Math.min(.52, Math.max(.18, width / Math.max(node.width / node.height, .35)));
  if (node.type === "table") return Math.min(.72, .065 + node.rows.length * .055);
  if (node.type === "metric_grid") return node.metrics.length > 3 ? .28 : .19;
  if (node.type === "divider") return .025;
  const measured = measure.measure({ text: nodeText(node), typographyRole: nodeRole(node), maxWidth: width });
  const padding = node.type === "callout" || node.type === "quote" ? .07 : .025;
  return Math.max(node.type === "heading" ? .075 : .045, measured.estimatedHeight + padding);
}

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${++idCounter}`;
const elementFor = (node: CompositionNode, bounds: Bounds, overflow: LayoutElement["overflow"] = "flow"): LayoutElement => {
  const base: LayoutElement = { id: nextId("element"), type: "text-frame", bounds, sourceNodeIds: [node.id], typographyRole: nodeRole(node), text: nodeText(node), padding: { top: .01, right: .012, bottom: .01, left: .012 }, alignment: "left", verticalAlignment: "top", zIndex: 1, allowOverlap: false, overflow, anchor: "inline" };
  if (node.type === "image") return { ...base, type: "image-frame", text: undefined, image: { assetId: node.assetId, role: node.role, crop: node.role === "cover" || node.role === "background" ? "cover" : node.layout.width === "full" ? "fit-width" : "contain" }, aspectRatio: node.width / node.height };
  if (node.type === "table") return { ...base, type: "table-frame", table: { columns: node.header.length, rows: node.rows.length, split: node.rows.length > 8, landscapeRecommended: node.header.length > 6 }, overflow: node.rows.length > 8 ? "split" : "flow" };
  if (node.type === "callout" || node.type === "quote") return { ...base, type: "callout-frame" };
  if (node.type === "metric_grid") return { ...base, type: "metric-frame" };
  if (node.type === "divider") return { ...base, type: "separator", text: undefined };
  if (node.type === "sources") return { ...base, type: "source-note", typographyRole: "source" };
  return base;
};

function emptyQuality(): PageLayoutQuality { return { balance: 0, whitespace: 0, hierarchy: 0, readability: 0, density: 0, visualDominance: 0, alignmentConsistency: 0, collisionSafety: 0, confidence: 0 }; }
const makeRegion = (role: LayoutRegion["role"], bounds: Bounds, elements: LayoutElement[], direction: LayoutRegion["direction"] = "stack"): LayoutRegion => ({ id: nextId("region"), role, bounds, direction, columns: 1, gap: .018, padding: zeroInsets(), elements });
const makePage = (index: number, role: LayoutPageRole, template: string, regions: LayoutRegion[], sourceNodeIds: string[], orientation: LayoutPage["orientation"] = "portrait"): LayoutPage => ({ id: nextId("page"), index, role, template, orientation, regions, sourceNodeIds, quality: emptyQuality() });

function selectPresentationTemplate(section: CompositionSection, nodes: CompositionNode[]): string {
  const title = section.title.toLowerCase();
  const opportunityKinds = new Set(section.opportunities.map((o) => o.kind));
  const metrics = nodes.find((n) => n.type === "metric_grid");
  const images = nodes.filter((n) => n.type === "image");
  if (/\?$|question|fragilit|trust|confiance/.test(title) && words(nodeText(nodes[0] || ({ type: "divider" } as CompositionNode))) < 18) return "big-question";
  if (/fragment|broken|chaîne|chaine/.test(title)) return "horizontal-process";
  if (/case study|cas d|s.n.gal|transaction/.test(title)) return "case-study-journey";
  if (/method|méthod|contribution/.test(title)) return "methodology-loop";
  if (/roadmap|feuille de route|three.year|trois ans/.test(title)) return "three-year-roadmap";
  if (/candidate|candidat|supervision|closing|fit|encadrement/.test(title)) return images.length ? "image-led-closing" : "candidate-closing";
  if ((metrics && metrics.type === "metric_grid" && metrics.metrics.length === 3) || (opportunityKinds.has("metric_grid") && nodes.some((n) => n.type === "list" && n.items.length === 3))) return "three-metrics";
  if (opportunityKinds.has("four_pillars")) return "four-pillars";
  if (opportunityKinds.has("cycle")) return /method/.test(title) ? "methodology-loop" : "lifecycle";
  if (opportunityKinds.has("timeline")) return /three|3|trois|year|année|roadmap/.test(`${title} ${nodes.map(nodeText).join(" ")}`) ? "three-year-roadmap" : "horizontal-process";
  if (opportunityKinds.has("journey")) return "case-study-journey";
  if (opportunityKinds.has("architecture")) return "architectural-stack";
  if (opportunityKinds.has("comparison")) return "comparison";
  if (nodes.some((n) => n.type === "table")) return "data-insight";
  if (images.some((n) => n.type === "image" && (n.role === "hero" || n.role === "evidence"))) return "split-hero";
  return section.intent === "executive" ? "statement-slide" : "two-column-argument";
}

function diagramOpportunity(section: CompositionSection, policy: LayoutPolicy): CompositionOpportunity | undefined {
  return section.opportunities.find((o) => o.confidence >= policy.diagramConfidenceThreshold && ["timeline", "flowchart", "cycle", "comparison", "hub", "architecture", "four_pillars", "process", "journey", "matrix"].includes(o.kind));
}

function resolvePresentation(composition: CompositionDocument, policy: LayoutPolicy, measure: TextMeasurementProvider, decisions: LayoutDecision[], warnings: LayoutWarning[]): LayoutPage[] {
  const pages: LayoutPage[] = [];
  const coverNodes = [composition.cover.hero, composition.cover.metrics].filter((n): n is CompositionNode => Boolean(n));
  const coverTemplate = composition.cover.hero ? "full-bleed-cover" : "statement-slide";
  const coverPattern = getLayoutPattern(coverTemplate);
  const coverRegions = coverPattern.regions.map((slot) => makeRegion(slot.role as LayoutRegion["role"], slot.bounds, []));
  const titleSlot = coverRegions.find((r) => r.role === "title") || coverRegions[0];
  titleSlot.elements.push({ ...elementFor({ id: "document-title", type: "heading", level: 1, text: composition.title, source: { kind: "plan" }, layout: composition.chapters[0]?.layout || ({ width: "standard", priority: "hero", breakBefore: "auto", keepTogether: true, columns: 1, whitespaceBefore: "standard", whitespaceAfter: "standard" }) }, titleSlot.bounds, "notes"), typographyRole: "display" });
  if (composition.cover.hero?.type === "image") {
    const heroRegion = coverRegions.find((r) => r.role === "hero" || r.role === "visual");
    if (heroRegion) heroRegion.elements.push({ ...elementFor(composition.cover.hero, heroRegion.bounds), zIndex: 0, allowOverlap: coverTemplate === "full-bleed-cover" });
  }
  pages.push(makePage(0, "cover", coverTemplate, coverRegions, coverNodes.map((n) => n.id)));

  for (const chapter of composition.chapters) {
    for (const section of chapter.sections) {
      const visibleNodes = section.nodes.filter((n) => n.type !== "divider");
      const titleNode = visibleNodes.find((n) => n.type === "heading");
      const contentNodes = visibleNodes.filter((n) => n !== titleNode).flatMap((node) => {
        if (node.type !== "list" || node.items.length <= policy.maxBulletsPerSlide) return [node];
        const parts: CompositionNode[] = [];
        for (let index = 0; index < node.items.length; index += policy.maxBulletsPerSlide) {
          parts.push({ ...node, items: node.items.slice(index, index + policy.maxBulletsPerSlide) });
        }
        return parts;
      });
      const chunks: CompositionNode[][] = [];
      let current: CompositionNode[] = [];
      let currentWords = 0;
      for (const node of contentNodes) {
        const count = words(nodeText(node));
        if (current.length && (currentWords + count > policy.maxVisibleWordsPerSlide || (node.type === "list" && node.items.length > policy.maxBulletsPerSlide))) {
          chunks.push(current); current = []; currentWords = 0;
        }
        current.push(node); currentWords += count;
      }
      if (current.length || !chunks.length) chunks.push(current);
      chunks.forEach((chunk, chunkIndex) => {
        const pageNodes = titleNode ? [titleNode, ...chunk] : chunk;
        const template = selectPresentationTemplate(section, pageNodes);
        const pattern = getLayoutPattern(template);
        const regions = pattern.regions.map((slot) => makeRegion(slot.role as LayoutRegion["role"], slot.bounds, [], slot.role === "data" ? "grid" : "stack"));
        const titleRegion = regions.find((r) => r.role === "title") || regions[0];
        if (titleNode) {
          const titleText = chunkIndex ? `${nodeText(titleNode)} — ${chunkIndex + 1}` : nodeText(titleNode);
          const synthetic = { ...titleNode, text: titleText } as CompositionNode;
          titleRegion.elements.push(elementFor(synthetic, titleRegion.bounds, "notes"));
        }
        const opportunity = diagramOpportunity(section, policy);
        const visualRegion = regions.find((r) => r.role === "visual" || r.role === "data");
        if (opportunity && visualRegion) {
          visualRegion.elements.push({ id: nextId("diagram"), type: "diagram-frame", bounds: visualRegion.bounds, sourceNodeIds: opportunity.sourceNodeIds.length ? opportunity.sourceNodeIds : chunk.map((n) => n.id), diagram: { kind: opportunity.kind, itemCount: chunk.find((n) => n.type === "list")?.type === "list" ? (chunk.find((n) => n.type === "list") as Extract<CompositionNode, { type: "list" }>).items.length : chunk.length }, padding: { top: .02, right: .02, bottom: .02, left: .02 }, alignment: "center", verticalAlignment: "middle", zIndex: 1, allowOverlap: false, overflow: "clip" });
        }
        const available = regions.filter((r) => r.role === "body" || r.role === "sidebar" || r.role === "data" || r.role === "visual");
        const textual = chunk.filter((n) => !(opportunity && opportunity.sourceNodeIds.includes(n.id)));
        textual.forEach((node, i) => {
          const target = available[i % Math.max(available.length, 1)] || titleRegion;
          if (!target.elements.length && node.type === "image" && node.caption) {
            const imageBounds = { ...target.bounds, height: target.bounds.height * .86 };
            target.elements.push(
              elementFor(node, imageBounds, "notes"),
              { id: nextId("caption"), type: "caption", bounds: { x: target.bounds.x, y: target.bounds.y + imageBounds.height, width: target.bounds.width, height: target.bounds.height - imageBounds.height }, sourceNodeIds: [node.id], text: node.caption, typographyRole: "caption", padding: zeroInsets(), alignment: "center", verticalAlignment: "middle", zIndex: 1, allowOverlap: false, overflow: "clip", anchor: "previous" }
            );
          }
          else if (!target.elements.length) target.elements.push(elementFor(node, target.bounds, "notes"));
          else {
            const existing = target.elements[0];
            existing.text = [existing.text, nodeText(node)].filter(Boolean).join("\n\n");
            existing.sourceNodeIds.push(node.id);
          }
        });
        const visibleWordCount = textual.reduce((sum, n) => sum + words(nodeText(n)), 0);
        const notes: string[] = [];
        if (visibleWordCount > pattern.maxVisibleWords) {
          const target = textual.slice(Math.ceil(textual.length / 2));
          notes.push(...target.map(nodeText));
          warnings.push({ code: "SLIDE_TOO_DENSE", severity: "warning", pageIndex: pages.length, involvedNodeIds: target.map((n) => n.id), message: "Secondary content was moved to speaker notes to preserve slide readability.", suggestedResolution: "Review the speaker notes or split the slide manually.", automaticallyResolved: true });
          decisions.push({ id: nextId("decision"), pageIndex: pages.length, sourceNodeIds: target.map((n) => n.id), action: "demote-to-notes", reason: "Visible words exceeded the selected pattern capacity.", precedence: "density" });
        }
        decisions.push({ id: nextId("decision"), pageIndex: pages.length, sourceNodeIds: pageNodes.map((n) => n.id), action: "template-selected", reason: `Deterministically selected ${template} from section intent, nodes, and opportunities.`, precedence: opportunity ? "semantic" : "template" });
        const role = pattern.role;
        const page = makePage(pages.length, role, template, regions, pageNodes.map((n) => n.id));
        page.speakerNotes = notes;
        pages.push(page);
      });
    }
  }
  if (pages.length > policy.maxSlides) warnings.push({ code: "TOO_MANY_SLIDES", severity: "warning", pageIndex: pages.length - 1, involvedNodeIds: [], message: `The plan contains ${pages.length} slides, above the policy maximum.`, suggestedResolution: "Merge low-priority slides.", automaticallyResolved: false });
  if (pages.length < policy.minSlides) warnings.push({ code: "TOO_FEW_SLIDES", severity: "info", pageIndex: 0, involvedNodeIds: [], message: `The plan contains only ${pages.length} slides.`, suggestedResolution: "Add evidence or separate major arguments.", automaticallyResolved: false });
  pages.forEach((page, index) => {
    const sourceText = page.sourceNodeIds
      .map((id) => compositionFlow(composition).find((node) => node.id === id))
      .filter((node): node is CompositionNode => Boolean(node) && node!.type === "sources")
      .map(nodeText)
      .join(" · ");
    const bounds = { x: .07, y: .925, width: .86, height: .025 };
    const footerText = [sourceText, `${index + 1} / ${pages.length}`].filter(Boolean).join("   ");
    page.footer = makeRegion("footer", bounds, [{ id: nextId("footer"), type: "source-note", bounds, sourceNodeIds: [], text: footerText, typographyRole: "source", padding: zeroInsets(), alignment: sourceText ? "left" : "right", verticalAlignment: "middle", zIndex: 2, allowOverlap: false, overflow: "clip", anchor: "page" }]);
  });
  return pages;
}

function resolvePaginated(composition: CompositionDocument, measure: TextMeasurementProvider, decisions: LayoutDecision[], warnings: LayoutWarning[]): LayoutPage[] {
  const pages: LayoutPage[] = [];
  const safe = { x: .075, y: .075, width: .85, height: .845 };
  if (composition.cover.enabled) {
    const nodes = [composition.cover.hero, composition.cover.metrics].filter((n): n is CompositionNode => Boolean(n));
    const regions: LayoutRegion[] = [makeRegion("title", { x: .08, y: .42, width: .72, height: .2 }, [])];
    if (composition.cover.hero?.type === "image") regions.unshift(makeRegion("hero", { x: .08, y: .08, width: .84, height: .28 }, [elementFor(composition.cover.hero, { x: .08, y: .08, width: .84, height: .28 })]));
    if (composition.cover.metrics?.type === "metric_grid") regions.push(makeRegion("data", { x: .08, y: .76, width: .84, height: .14 }, [elementFor(composition.cover.metrics, { x: .08, y: .76, width: .84, height: .14 })], "grid"));
    pages.push(makePage(0, "cover", "premium-cover", regions, nodes.map((n) => n.id)));
  }
  if (composition.toc.enabled) pages.push(makePage(pages.length, "toc", "toc-page", [makeRegion("title", { x: .08, y: .08, width: .84, height: .1 }, []), makeRegion("body", { x: .08, y: .2, width: .84, height: .68 }, [])], []));

  let regions: LayoutRegion[] = [];
  let sourceIds: string[] = [];
  let y = safe.y;
  const flush = (role: LayoutPageRole = "content", template = "title-body", orientation: LayoutPage["orientation"] = "portrait") => {
    if (!regions.length) return;
    pages.push(makePage(pages.length, role, template, regions, sourceIds, orientation));
    regions = []; sourceIds = []; y = safe.y;
  };
  const flowNodes = compositionFlow(composition);
  for (let nodeIndex = 0; nodeIndex < flowNodes.length; nodeIndex += 1) {
    const node = flowNodes[nodeIndex];
    const width = node.layout.width === "narrow" ? .62 : node.layout.width === "full" || node.layout.width === "wide" ? safe.width : .78;
    const x = safe.x + (safe.width - width) / 2;
    let height = estimateNodeHeight(node, width, measure);
    const gap = node.layout.whitespaceBefore === "generous" ? .035 : node.layout.whitespaceBefore === "compact" ? .012 : .022;
    const wideTable = node.type === "table" && node.header.length > 6;
    const dedicatedVisual = node.type === "image" && height > .45;
    const nextNode = flowNodes[nodeIndex + 1];
    const headingBundleHeight = node.type === "heading" && nextNode ? height + estimateNodeHeight(nextNode, width, measure) + .025 : height;
    if ((node.type === "heading" && node.level === 2 && node.layout.breakBefore === "before" && regions.length) || wideTable || dedicatedVisual || y + gap + headingBundleHeight > safe.y + safe.height) {
      if (node.type === "heading" && y + gap + height <= safe.y + safe.height && y + gap + headingBundleHeight > safe.y + safe.height) warnings.push({ code: "ORPHAN_HEADING", severity: "info", pageIndex: pages.length, involvedNodeIds: [node.id, ...(nextNode ? [nextNode.id] : [])], message: "A heading would have been orphaned at the bottom of the page.", suggestedResolution: "Keep the heading with its first content block.", automaticallyResolved: true });
      flush();
      decisions.push({ id: nextId("decision"), pageIndex: pages.length, sourceNodeIds: [node.id], action: wideTable ? "landscape" : dedicatedVisual ? "move" : "page-break", reason: wideTable ? "Table exceeds six columns." : dedicatedVisual ? "Large figure receives a dedicated page." : "Estimated block height exceeds remaining safe area.", precedence: wideTable ? "density" : "composition" });
    }
    if (height > safe.height) {
      height = safe.height;
      decisions.push({ id: nextId("decision"), pageIndex: pages.length, sourceNodeIds: [node.id], action: "split", reason: "Block exceeds a complete page and is marked for semantic splitting.", precedence: "density" });
    }
    const bounds = { x: wideTable ? .04 : x, y: y + gap, width: wideTable ? .92 : width, height };
    const element = elementFor(node, bounds, node.type === "table" ? "split" : "flow");
    if (node.type === "image") decisions.push({ id: nextId("decision"), pageIndex: pages.length, sourceNodeIds: [node.id], action: "crop", reason: `Resolved ${element.image?.crop || "contain"} behavior from semantic role, aspect ratio, and approved width.`, precedence: node.source.kind === "visual-placement" ? "approved-placement" : "composition" });
    if (node.type === "image" && node.caption) {
      const captionHeight = .045;
      element.bounds.height = Math.max(.12, height - captionHeight);
      const caption: LayoutElement = { id: nextId("caption"), type: "caption", bounds: { x: bounds.x, y: bounds.y + element.bounds.height, width: bounds.width, height: captionHeight }, sourceNodeIds: [node.id], text: node.caption, typographyRole: "caption", padding: zeroInsets(), alignment: "center", verticalAlignment: "top", zIndex: 1, allowOverlap: false, overflow: "clip", anchor: "previous" };
      regions.push(makeRegion("visual", { ...bounds }, [element, caption]));
    } else regions.push(makeRegion(node.type === "table" || node.type === "metric_grid" ? "data" : node.type === "image" ? "visual" : node.type === "heading" ? "title" : "body", bounds, [element]));
    sourceIds.push(node.id);
    y = bounds.y + bounds.height;
    if (wideTable || dedicatedVisual) flush(wideTable ? "data" : "content", wideTable ? "full-width-table" : "figure-caption", wideTable ? "landscape" : "portrait");
  }
  flush(composition.appendices.length ? "appendix" : "content", composition.appendices.length ? "appendix-page" : "title-body");
  return pages;
}

function resolveContinuous(composition: CompositionDocument, measure: TextMeasurementProvider): LayoutPage[] {
  const nodes = compositionFlow(composition);
  const estimated = nodes.map((node) => estimateNodeHeight(node, .8, measure));
  const total = Math.max(1, estimated.reduce((a, b) => a + b + .02, .08));
  let y = .04 / total;
  const regions = nodes.map((node, index) => {
    const height = estimated[index] / total;
    const bounds = { x: .1, y, width: .8, height };
    y += height + .02 / total;
    return makeRegion(node.type === "image" ? "visual" : node.type === "table" ? "data" : "body", bounds, [elementFor(node, bounds)]);
  });
  return [makePage(0, "content", "continuous-flow", regions, nodes.map((node) => node.id))];
}

const averageQuality = (pages: LayoutPage[]): PageLayoutQuality => {
  const keys: Array<keyof PageLayoutQuality> = ["balance", "whitespace", "hierarchy", "readability", "density", "visualDominance", "alignmentConsistency", "collisionSafety", "confidence"];
  return Object.fromEntries(keys.map((key) => [key, Math.round(pages.reduce((sum, page) => sum + page.quality[key], 0) / Math.max(pages.length, 1))])) as unknown as PageLayoutQuality;
};

export function resolveLayout(composition: CompositionDocument, context: LayoutContext): LayoutDocument {
  idCounter = 0;
  const policy = { ...DEFAULT_LAYOUT_POLICY, ...context.policy };
  const canvas = canvasFor(context);
  const measure = context.measurementProvider || new ApproximateTextMeasurer(context.mode === "presentation" ? policy.presentationBodyCharactersPerLine : policy.documentBodyCharactersPerLine);
  const decisions: LayoutDecision[] = [];
  const warnings: LayoutWarning[] = [];
  const pages = context.mode === "presentation" ? resolvePresentation(composition, policy, measure, decisions, warnings) : context.mode === "continuous" ? resolveContinuous(composition, measure) : resolvePaginated(composition, measure, decisions, warnings);
  const safe = safeBounds(canvas.safeMargins);
  const compositionNodes = new Map(compositionFlow(composition).map((node) => [node.id, node]));
  for (const page of pages) {
    for (const element of page.regions.flatMap((region) => region.elements)) {
      if (element.text && element.typographyRole) {
        const measured = measure.measure({ text: element.text, typographyRole: element.typographyRole, maxWidth: element.bounds.width, locale: composition.language });
        if (measured.estimatedHeight > element.bounds.height * 1.05) warnings.push({ code: "TEXT_OVERFLOW_RISK", severity: context.mode === "presentation" ? "warning" : "info", pageIndex: page.index, involvedNodeIds: element.sourceNodeIds, message: "Estimated text height exceeds the resolved frame height.", suggestedResolution: context.mode === "presentation" ? "Split the slide or move secondary detail to notes." : "Allow semantic flow to the next page.", automaticallyResolved: element.overflow === "flow" || element.overflow === "split" || element.overflow === "notes" });
      }
      if (element.type === "image-frame") {
        const source = element.sourceNodeIds.map((id) => compositionNodes.get(id)).find((node): node is Extract<CompositionNode, { type: "image" }> => node?.type === "image");
        if (element.bounds.width < .16 || element.bounds.height < .12) warnings.push({ code: "IMAGE_TOO_SMALL", severity: "warning", pageIndex: page.index, involvedNodeIds: element.sourceNodeIds, message: "The image region is too small to carry meaningful visual information.", suggestedResolution: "Promote the image or move it to an appendix.", automaticallyResolved: false });
        if (source && Math.min(source.width / Math.max(element.bounds.width * policy.lowResolutionPixelsPerNormalizedUnit, 1), source.height / Math.max(element.bounds.height * policy.lowResolutionPixelsPerNormalizedUnit, 1)) < 1) warnings.push({ code: "IMAGE_LOW_RESOLUTION", severity: "warning", pageIndex: page.index, involvedNodeIds: element.sourceNodeIds, message: "Image pixel dimensions may be insufficient for the resolved region.", suggestedResolution: "Use a higher-resolution asset or reduce the frame.", automaticallyResolved: false });
        if (source?.caption && !page.regions.flatMap((region) => region.elements).some((candidate) => candidate.type === "caption" && candidate.sourceNodeIds.includes(source.id))) warnings.push({ code: "DETACHED_CAPTION", severity: "blocking", pageIndex: page.index, involvedNodeIds: [source.id], message: "An image caption is not attached to its image on the same page.", suggestedResolution: "Create a caption frame anchored to the image.", automaticallyResolved: false });
      }
      if (element.type === "table-frame" && element.table?.landscapeRecommended) warnings.push({ code: "TABLE_TOO_WIDE", severity: page.orientation === "landscape" ? "info" : "warning", pageIndex: page.index, involvedNodeIds: element.sourceNodeIds, message: "The table exceeds the preferred document column count.", suggestedResolution: "Use a landscape or dedicated data page.", automaticallyResolved: page.orientation === "landscape" });
    }
    const pageWarnings = inspectPageGeometry(page, safe);
    warnings.push(...pageWarnings);
    page.quality = scorePage(page, [...warnings.filter((w) => w.pageIndex === page.index)]);
    if (page.quality.whitespace < policy.minWhitespace) warnings.push({ code: "LOW_WHITESPACE", severity: "warning", pageIndex: page.index, involvedNodeIds: page.sourceNodeIds, message: "The resolved page has low heuristic whitespace.", suggestedResolution: "Split the page or select a lower-density pattern.", automaticallyResolved: false });
  }
  const metrics: LayoutMetrics = { pageCount: pages.length, regionCount: pages.reduce((s, p) => s + p.regions.length, 0), elementCount: pages.reduce((s, p) => s + p.regions.reduce((x, r) => x + r.elements.length, 0), 0), automaticallyResolvedIssues: warnings.filter((w) => w.automaticallyResolved).length, unresolvedBlockingIssues: warnings.filter((w) => w.severity === "blocking" && !w.automaticallyResolved).length, aggregateQuality: averageQuality(pages) };
  return { version: LAYOUT_VERSION, sourceCompositionId: composition.id, mode: context.mode, canvas, themeRef: context.themeRef, pages, warnings, decisions, metrics, metadata: { title: composition.title, language: composition.language, archetype: composition.archetype, generatedAtPolicy: "deterministic-no-timestamp", policyId: policy.id } };
}

/** Projection used by current linear adapters; order and breaks come from LayoutDocument. */
export function layoutSourceOrder(layout: LayoutDocument): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const page of layout.pages) for (const id of page.sourceNodeIds) if (!seen.has(id)) { seen.add(id); out.push(id); }
  return out;
}

export function availableLayoutPatterns() { return Object.values(LAYOUT_PATTERNS); }
