import { CompositionDocument, CompositionNode, CompositionSection, CompositionWarning } from "./model";

const visualKey = (node: CompositionNode) =>
  node.type === "image" ? `${node.assetId}|${node.caption || ""}` : null;

export function validateComposition(
  sections: CompositionSection[],
  documentWarnings: CompositionWarning[] = []
): CompositionWarning[] {
  const warnings = [...documentWarnings];
  const seenVisuals = new Set<string>();

  for (const section of sections) {
    const { density } = section;
    if (!section.nodes.length) warnings.push({ code: "empty_section", severity: "warning", message: `Section “${section.title}” is empty.`, sectionId: section.id });
    if (density.paragraphCount > 7) warnings.push({ code: "paragraph_overload", severity: "warning", message: `Section “${section.title}” contains ${density.paragraphCount} paragraphs without enough visual relief.`, sectionId: section.id });
    if (density.bulletCount > 12) warnings.push({ code: "bullet_overload", severity: "warning", message: `Section “${section.title}” contains ${density.bulletCount} bullet items.`, sectionId: section.id });
    if (density.tableCount > 2) warnings.push({ code: "table_overload", severity: "warning", message: `Section “${section.title}” contains too many adjacent tables.`, sectionId: section.id });
    if (density.citationCount > Math.max(8, density.wordCount / 35)) warnings.push({ code: "citation_overload", severity: "info", message: `Section “${section.title}” has a high citation density.`, sectionId: section.id });
    if (density.whitespaceScore < 35) warnings.push({ code: "low_whitespace", severity: "warning", message: `Section “${section.title}” has low whitespace potential.`, sectionId: section.id });
    if (density.visualBalance < 35) warnings.push({ code: "unbalanced_layout", severity: "warning", message: `Section “${section.title}” is visually unbalanced.`, sectionId: section.id });

    let previousVisual = false;
    for (const node of section.nodes) {
      if (node.type === "image") {
        const key = visualKey(node)!;
        if (seenVisuals.has(key)) warnings.push({ code: "duplicate_visual", severity: "warning", message: "The same visual appears more than once.", nodeId: node.id, sectionId: section.id });
        seenVisuals.add(key);
        if (node.height / node.width > 1.8 && node.layout.width === "full") warnings.push({ code: "oversized_image", severity: "warning", message: "A tall image is configured at full width.", nodeId: node.id, sectionId: section.id });
        if ((node.caption || "").length > 180) warnings.push({ code: "long_caption", severity: "info", message: "Image caption is longer than 180 characters.", nodeId: node.id, sectionId: section.id });
        if (previousVisual) warnings.push({ code: "poor_visual_rhythm", severity: "info", message: "Adjacent visuals may interrupt reading flow.", nodeId: node.id, sectionId: section.id });
        previousVisual = true;
      } else if (node.type !== "divider") previousVisual = false;
    }
  }
  return warnings;
}

export function summarizeDocumentDensity(document: Pick<CompositionDocument, "chapters" | "appendices">) {
  const sections = [...document.chapters.flatMap((chapter) => chapter.sections), ...document.appendices];
  const nodes = sections.flatMap((section) => section.nodes);
  return { sections, nodes };
}
