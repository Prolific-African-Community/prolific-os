import { composeDocument, CompositionDocument, CompositionNode } from "../composition";
import { LayoutDocument, layoutSourceOrder, resolveLayout } from "../layout";
import { DocumentBlock } from "./document-structure";
import { DocumentRenderMetadata, DocumentRenderPreset, RenderVisual } from "./rendering-presets";

export function composeForExport(
  markdown: string,
  preset: DocumentRenderPreset,
  metadata: DocumentRenderMetadata | undefined,
  language: "fr" | "en"
): CompositionDocument {
  return composeDocument({
    markdown,
    title: metadata?.documentTitle || "Document",
    language,
    documentType: metadata?.documentType,
    presetStyle: preset.coverPage.style,
    toc: preset.tableOfContents,
    coverEnabled: Boolean(metadata && preset.coverPage.enabled),
    keyFigures: metadata?.keyFigures,
    images: (metadata?.visuals || []).map((visual) => ({
      assetId: visual.assetId,
      filename: visual.filename,
      role: visual.role,
      target: visual.target,
      sectionTitle: visual.sectionTitle,
      position: visual.position,
      size: visual.size,
      caption: visual.caption,
      buffer: visual.buffer,
      mime: visual.mime,
      width: visual.width,
      height: visual.height,
    })),
    plan: metadata?.documentPlan,
  });
}

/** Transitional primitive adapter. It preserves composed order and directives;
 * renderers only translate universal nodes into format-native drawing calls. */
export function nodeToRenderBlock(node: CompositionNode): DocumentBlock | null {
  switch (node.type) {
    case "heading": return { type: "heading", level: node.level, text: node.text };
    case "paragraph": return { type: "paragraph", text: node.text };
    case "list": return { type: "list", ordered: node.ordered, items: node.items };
    case "quote": return { type: "blockquote", text: node.text };
    case "callout": return { type: "callout", kind: node.kind === "insight" ? "note" : node.kind, text: node.text };
    case "table": return { type: "table", header: node.header, rows: node.rows, aligns: node.aligns };
    case "divider": return { type: "divider" };
    case "sources": return { type: "list", ordered: false, items: node.entries };
    default: return null;
  }
}

export function imageNodeToRenderVisual(
  node: Extract<CompositionNode, { type: "image" }>,
  target: RenderVisual["target"] = "section"
): RenderVisual {
  return {
    assetId: node.assetId,
    role: node.role,
    buffer: node.bytes,
    mime: node.mime,
    width: node.width,
    height: node.height,
    target,
    sectionTitle: null,
    size: node.layout.width === "full" ? "full_width" : node.layout.width === "wide" ? "large" : node.layout.width === "narrow" ? "small" : "medium",
    caption: node.caption,
  };
}

export function resolveExportLayout(composition: CompositionDocument): LayoutDocument {
  return resolveLayout(composition, { mode: "paginated-document" });
}

export interface ResolvedFlowItem {
  node: CompositionNode;
  layoutPageIndex: number;
  breakBefore: boolean;
}

export function layoutNodeFlow(
  layout: LayoutDocument,
  composition: CompositionDocument
): ResolvedFlowItem[] {
  const nodeById = new Map(
    [
      ...composition.chapters.flatMap((chapter) => chapter.sections.flatMap((section) => section.nodes)),
      ...composition.appendices.flatMap((section) => section.nodes),
    ].map((node) => [node.id, node])
  );
  const pageByNode = new Map<string, number>();
  for (const page of layout.pages) for (const id of page.sourceNodeIds) pageByNode.set(id, page.index);
  let previousPage = -1;
  return layoutSourceOrder(layout).flatMap((id) => {
    const node = nodeById.get(id);
    if (!node) return [];
    const layoutPageIndex = pageByNode.get(id) ?? previousPage;
    const item = { node, layoutPageIndex, breakBefore: previousPage >= 0 && layoutPageIndex !== previousPage };
    previousPage = layoutPageIndex;
    return [item];
  });
}
