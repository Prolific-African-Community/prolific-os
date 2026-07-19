import type { Bounds, LayoutPage, LayoutWarning, PageLayoutQuality } from "./model";

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
export const intersects = (a: Bounds, b: Bounds) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

export function inspectPageGeometry(page: LayoutPage, safe: Bounds): LayoutWarning[] {
  const warnings: LayoutWarning[] = [];
  const elements = page.regions.flatMap((region) => region.elements);
  for (const element of elements) {
    const b = element.bounds;
    const insideCanvas = b.x >= 0 && b.y >= 0 && b.x + b.width <= 1 && b.y + b.height <= 1;
    const isFurniture = element.type === "background" || element.type === "overlay" || element.type === "source-note" || (element.type === "image-frame" && (element.image?.role === "cover" || element.image?.role === "background"));
    const insideSafe = b.x >= safe.x && b.y >= safe.y && b.x + b.width <= safe.x + safe.width && b.y + b.height <= safe.y + safe.height;
    if (!insideCanvas || (!insideSafe && !isFurniture)) warnings.push({ code: "OUT_OF_BOUNDS", severity: "blocking", pageIndex: page.index, involvedNodeIds: element.sourceNodeIds, message: "A layout element falls outside the permitted canvas or safe area.", suggestedResolution: "Move or resize the element inside the safe region.", automaticallyResolved: false });
  }
  for (let i = 0; i < elements.length; i += 1) {
    for (let j = i + 1; j < elements.length; j += 1) {
      const a = elements[i];
      const b = elements[j];
      if (a.allowOverlap || b.allowOverlap || a.zIndex !== b.zIndex) continue;
      if (intersects(a.bounds, b.bounds)) warnings.push({ code: "REGION_COLLISION", severity: "blocking", pageIndex: page.index, involvedNodeIds: [...a.sourceNodeIds, ...b.sourceNodeIds], message: "Two resolved layout elements overlap without an explicit overlay rule.", suggestedResolution: "Select a fallback template or move the lower-priority element.", automaticallyResolved: false });
    }
  }
  return warnings;
}

export function scorePage(page: LayoutPage, warnings: LayoutWarning[]): PageLayoutQuality {
  const elements = page.regions.flatMap((region) => region.elements);
  const occupied = elements.filter((e) => e.type !== "background").reduce((sum, e) => sum + e.bounds.width * e.bounds.height, 0);
  const centers = elements.map((e) => e.bounds.x + e.bounds.width / 2);
  const horizontalBias = centers.length ? Math.abs(0.5 - centers.reduce((a, b) => a + b, 0) / centers.length) : 0;
  const titleCount = elements.filter((e) => e.typographyRole === "title" || e.typographyRole === "display").length;
  const textOverflow = warnings.filter((w) => w.code === "TEXT_OVERFLOW_RISK").length;
  const blocking = warnings.filter((w) => w.severity === "blocking").length;
  const visualArea = elements.filter((e) => e.type === "image-frame" || e.type === "diagram-frame").reduce((sum, e) => sum + e.bounds.width * e.bounds.height, 0);
  return {
    balance: clampScore(100 - horizontalBias * 120),
    whitespace: clampScore((1 - Math.min(occupied, 1)) * 100),
    hierarchy: clampScore(titleCount === 1 ? 96 : titleCount === 0 ? 55 : 68),
    readability: clampScore(100 - textOverflow * 25),
    density: clampScore(100 - Math.max(0, occupied - 0.7) * 180),
    visualDominance: clampScore(55 + visualArea * 80),
    alignmentConsistency: clampScore(100 - Math.max(0, new Set(elements.map((e) => e.bounds.x.toFixed(3))).size - 3) * 8),
    collisionSafety: clampScore(100 - blocking * 50),
    confidence: clampScore(96 - warnings.length * 7 - blocking * 18),
  };
}
