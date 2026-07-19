import {
  CompositionNode,
  CompositionOpportunity,
  CompositionSection,
  DensityAnalysis,
  OpportunityKind,
} from "./model";

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const nodeText = (node: CompositionNode): string => {
  if (node.type === "paragraph" || node.type === "quote" || node.type === "callout") return node.text;
  if (node.type === "heading") return node.text;
  if (node.type === "list") return node.items.join(" ");
  if (node.type === "table") return [...node.header, ...node.rows.flat()].join(" ");
  if (node.type === "sources") return node.entries.join(" ");
  if (node.type === "metric_grid") return node.metrics.map((item) => `${item.value} ${item.label}`).join(" ");
  return "";
};

export function analyzeDensity(nodes: CompositionNode[]): DensityAnalysis {
  const text = nodes.map(nodeText).join(" ");
  const wordCount = words(text);
  const paragraphCount = nodes.filter((node) => node.type === "paragraph").length;
  const bulletCount = nodes
    .filter((node): node is Extract<CompositionNode, { type: "list" }> => node.type === "list")
    .reduce((sum, node) => sum + node.items.length, 0);
  const tableCount = nodes.filter((node) => node.type === "table").length;
  const imageCount = nodes.filter((node) => node.type === "image").length;
  const citationCount = (text.match(/\[[0-9]+\]|\([^)]*(?:19|20)\d{2}[^)]*\)|https?:\/\//g) || []).length;
  const longWords = (text.match(/\b\w{11,}\b/g) || []).length;
  const sentenceCount = Math.max(1, (text.match(/[.!?](?:\s|$)/g) || []).length);
  const avgSentence = wordCount / sentenceCount;
  const informationDensity = clamp(wordCount / 5 + tableCount * 14 + citationCount * 2);
  const visualDensity = clamp(imageCount * 24 + tableCount * 18 + (nodes.some((n) => n.type === "metric_grid") ? 18 : 0));
  const readingComplexity = clamp(avgSentence * 2.2 + (longWords / Math.max(wordCount, 1)) * 180);
  const visualBalance = clamp(100 - Math.abs(informationDensity - visualDensity) * 0.72);
  const whitespaceScore = clamp(100 - paragraphCount * 7 - bulletCount * 2 - tableCount * 9 + imageCount * 4);
  const layoutConfidence = clamp(55 + Math.min(nodes.length, 10) * 3 + visualBalance * 0.15);

  return {
    wordCount,
    paragraphCount,
    bulletCount,
    tableCount,
    imageCount,
    citationCount,
    informationDensity,
    visualDensity,
    readingComplexity,
    estimatedReadingMinutes: Math.max(1, Math.ceil(wordCount / 220)),
    estimatedSpeakingMinutes: Math.max(1, Math.ceil(wordCount / 130)),
    visualBalance,
    whitespaceScore,
    layoutConfidence,
  };
}

const opportunity = (
  kind: OpportunityKind,
  confidence: number,
  reason: string,
  nodes: CompositionNode[]
): CompositionOpportunity => ({ kind, confidence, reason, sourceNodeIds: nodes.map((node) => node.id) });

export function detectOpportunities(section: Pick<CompositionSection, "title" | "nodes">): CompositionOpportunity[] {
  const title = section.title.toLowerCase();
  const text = section.nodes.map(nodeText).join(" ").toLowerCase();
  const lists = section.nodes.filter((node): node is Extract<CompositionNode, { type: "list" }> => node.type === "list");
  const out: CompositionOpportunity[] = [];

  if (/timeline|roadmap|milestone|chronolog|calendrier|phase|étape|etape/.test(`${title} ${text}`)) {
    out.push(opportunity("timeline", 0.82, "Sequential or time-based language can be expressed as a timeline.", lists.flatMap((node) => [node])));
  }
  if (/process|workflow|flow|parcours|journey|lifecycle|cycle|from .+ to|de .+ à/.test(`${title} ${text}`)) {
    out.push(opportunity(/cycle|lifecycle/.test(text) ? "cycle" : "flowchart", 0.78, "Process language indicates a connected visual flow.", section.nodes));
  }
  if (/versus| vs\.? |compare|comparison|comparatif|advantages|inconvénients|pros and cons/.test(`${title} ${text}`)) {
    out.push(opportunity("comparison", 0.84, "Contrasting concepts are easier to scan in a comparison composition.", section.nodes));
  }
  if (lists.some((list) => list.items.length === 4)) {
    out.push(opportunity("four_pillars", 0.72, "A four-item peer list is a candidate for a four-pillar composition.", lists));
  }
  if ((text.match(/(?:€|\$|£|%|\b\d+[.,]?\d*\b)/g) || []).length >= 4) {
    out.push(opportunity("metric_grid", 0.7, "Multiple numeric facts can be promoted into a metric grid.", section.nodes));
  }
  if (/architecture|ecosystem|écosystème|system components|operating model/.test(`${title} ${text}`)) {
    out.push(opportunity("architecture", 0.76, "System relationships suggest an architecture diagram.", section.nodes));
  }
  return out;
}
