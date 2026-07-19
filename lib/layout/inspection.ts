import type { LayoutDocument } from "./model";

/** JSON-safe inspection form for scripts, APIs, and the future layout inspector UI. */
export function serializeLayoutInspection(layout: LayoutDocument): string {
  return JSON.stringify(layout, null, 2);
}
