import type { Bounds, LayoutMode, LayoutPageRole } from "./model";

export interface LayoutPattern {
  id: string;
  modes: LayoutMode[];
  role: LayoutPageRole;
  intendedContent: string[];
  requiredElements: string[];
  optionalElements: string[];
  maxVisibleWords: number;
  maxElements: number;
  regions: Array<{ role: string; bounds: Bounds }>;
  allowedFallbacks: string[];
  qualityConstraints: string[];
}

const region = (role: string, x: number, y: number, width: number, height: number) => ({ role, bounds: { x, y, width, height } });
const doc = ["paginated-document" as const, "continuous" as const];
const slides = ["presentation" as const];

export const LAYOUT_PATTERNS: Record<string, LayoutPattern> = Object.fromEntries(
  [
    ["premium-cover", doc, "cover", ["title", "hero"], ["title"], ["image", "metrics"], 90, 5, [region("hero", .08, .08, .84, .34), region("title", .08, .48, .84, .25), region("data", .08, .78, .84, .14)], ["title-body"], ["single dominant title"]],
    ["toc-page", doc, "toc", ["navigation"], ["headings"], [], 220, 18, [region("title", .08, .08, .84, .1), region("body", .08, .2, .84, .68)], ["title-body"], ["no orphan entries"]],
    ["title-lead", doc, "section-opener", ["heading", "lead"], ["heading"], ["lead"], 180, 4, [region("title", .08, .1, .84, .16), region("body", .08, .32, .7, .46)], ["title-body"], ["generous whitespace"]],
    ["title-body", doc, "content", ["prose", "lists"], ["heading"], ["body"], 520, 12, [region("title", .08, .08, .84, .1), region("body", .08, .2, .84, .7)], ["two-column-editorial"], ["heading kept with content"]],
    ["title-hero-image", doc, "content", ["hero", "prose"], ["heading", "image"], ["body"], 320, 8, [region("title", .08, .07, .84, .1), region("visual", .08, .2, .84, .4), region("body", .15, .65, .7, .23)], ["title-image-text"], ["caption attached"]],
    ["title-image-text", doc, "content", ["image", "prose"], ["heading", "image"], ["body"], 360, 9, [region("title", .08, .07, .84, .1), region("visual", .08, .22, .4, .55), region("body", .53, .22, .39, .55)], ["title-body"], ["balanced columns"]],
    ["two-column-editorial", doc, "content", ["dense prose"], ["heading", "body"], [], 650, 16, [region("title", .08, .07, .84, .1), region("body", .08, .21, .4, .66), region("sidebar", .52, .21, .4, .66)], ["title-body"], ["semantic column split"]],
    ["full-width-table", doc, "data", ["table"], ["table"], ["heading"], 180, 4, [region("title", .06, .06, .88, .1), region("data", .06, .2, .88, .68)], ["landscape-table"], ["readable columns"]],
    ["figure-caption", doc, "content", ["figure"], ["image"], ["caption"], 120, 4, [region("visual", .12, .12, .76, .58), region("body", .12, .73, .76, .1)], ["title-image-text"], ["caption attached"]],
    ["callout-page", doc, "content", ["quote", "callout"], ["callout"], ["heading"], 180, 4, [region("title", .12, .14, .76, .12), region("body", .16, .34, .68, .38)], ["title-body"], ["callout intact"]],
    ["metric-strip", doc, "data", ["metrics"], ["metrics"], ["heading"], 120, 6, [region("title", .08, .12, .84, .12), region("data", .08, .36, .84, .22)], ["metric-grid"], ["2-4 metrics"]],
    ["metric-grid", doc, "data", ["metrics"], ["metrics"], ["heading"], 160, 8, [region("title", .08, .08, .84, .1), region("data", .08, .25, .84, .5)], ["title-body"], ["regular grid"]],
    ["appendix-page", doc, "appendix", ["appendix"], ["heading"], ["body"], 560, 14, [region("title", .08, .08, .84, .1), region("body", .08, .2, .84, .7)], ["title-body"], ["appendix label"]],
    ["sources-page", doc, "appendix", ["sources"], ["sources"], [], 520, 18, [region("title", .08, .08, .84, .1), region("body", .08, .2, .84, .7)], ["appendix-page"], ["readable citations"]],
    ["full-bleed-cover", slides, "cover", ["title", "image"], ["title"], ["image", "subtitle"], 45, 4, [region("hero", 0, 0, 1, 1), region("title", .08, .55, .72, .28)], ["split-hero"], ["title <= 2 lines"]],
    ["split-hero", slides, "cover", ["title", "image"], ["title"], ["image"], 60, 5, [region("title", .07, .12, .44, .72), region("visual", .54, 0, .46, 1)], ["statement-slide"], ["one dominant visual"]],
    ["statement-slide", slides, "content", ["statement"], ["title"], ["support"], 55, 4, [region("title", .1, .2, .8, .35), region("body", .16, .62, .68, .16)], ["two-column-argument"], ["one core idea"]],
    ["big-question", slides, "content", ["question"], ["title"], ["source"], 45, 3, [region("title", .1, .2, .8, .46), region("footer", .08, .9, .84, .04)], ["statement-slide"], ["title <= 2 lines"]],
    ["three-metrics", slides, "data", ["metrics"], ["3 metrics"], ["insight"], 65, 6, [region("title", .07, .08, .86, .12), region("data", .07, .3, .86, .4), region("body", .12, .75, .76, .1)], ["statement-slide"], ["exactly 3 preferred"]],
    ["four-pillars", slides, "diagram", ["4 peers"], ["4 items"], ["center concept"], 70, 7, [region("title", .07, .07, .86, .12), region("data", .07, .28, .86, .5)], ["hub-and-spoke"], ["four balanced regions"]],
    ["hub-and-spoke", slides, "diagram", ["hub"], ["center", "satellites"], [], 70, 8, [region("title", .07, .07, .86, .12), region("visual", .15, .25, .7, .58)], ["four-pillars"], ["clear center"]],
    ["horizontal-process", slides, "timeline", ["sequence"], ["stages"], ["source"], 75, 9, [region("title", .07, .07, .86, .12), region("visual", .06, .3, .88, .38), region("footer", .07, .9, .86, .04)], ["lifecycle"], ["3-6 stages"]],
    ["lifecycle", slides, "diagram", ["cycle"], ["stages"], ["center"], 70, 9, [region("title", .07, .07, .86, .12), region("visual", .2, .23, .6, .62)], ["horizontal-process"], ["closed sequence"]],
    ["comparison", slides, "content", ["comparison"], ["two sides"], ["verdict"], 80, 7, [region("title", .07, .07, .86, .12), region("body", .07, .26, .4, .55), region("sidebar", .53, .26, .4, .55)], ["two-column-argument"], ["parallel structure"]],
    ["two-column-argument", slides, "content", ["argument"], ["title"], ["visual"], 80, 7, [region("title", .07, .07, .86, .12), region("body", .07, .26, .4, .58), region("sidebar", .53, .26, .4, .58)], ["statement-slide"], ["balanced columns"]],
    ["data-insight", slides, "data", ["table", "insight"], ["data"], ["callout"], 70, 6, [region("title", .07, .07, .86, .12), region("data", .07, .25, .58, .6), region("sidebar", .69, .25, .24, .6)], ["three-metrics"], ["one takeaway"]],
    ["case-study-journey", slides, "timeline", ["journey"], ["stages"], ["result"], 80, 8, [region("title", .07, .07, .86, .12), region("visual", .07, .26, .86, .52)], ["horizontal-process"], ["clear progression"]],
    ["methodology-loop", slides, "diagram", ["method"], ["steps"], ["evidence"], 75, 8, [region("title", .07, .07, .86, .12), region("visual", .18, .23, .64, .62)], ["lifecycle"], ["method loop"]],
    ["architectural-stack", slides, "diagram", ["architecture"], ["layers"], ["annotations"], 80, 9, [region("title", .07, .07, .86, .12), region("visual", .12, .24, .76, .58)], ["horizontal-process"], ["ordered layers"]],
    ["three-year-roadmap", slides, "timeline", ["roadmap"], ["3 phases"], ["milestones"], 75, 8, [region("title", .07, .07, .86, .12), region("visual", .07, .28, .86, .48)], ["horizontal-process"], ["three balanced periods"]],
    ["candidate-closing", slides, "closing", ["profile", "needs"], ["title"], ["image"], 75, 7, [region("title", .07, .08, .86, .12), region("body", .07, .27, .42, .52), region("sidebar", .54, .27, .39, .52)], ["image-led-closing"], ["clear closing ask"]],
    ["image-led-closing", slides, "closing", ["closing", "image"], ["title"], ["body"], 55, 5, [region("visual", 0, 0, 1, 1), region("title", .08, .62, .76, .22)], ["candidate-closing"], ["single dominant image"]],
  ].map(([id, modes, role, intendedContent, requiredElements, optionalElements, maxVisibleWords, maxElements, regions, allowedFallbacks, qualityConstraints]) => [id, { id, modes, role, intendedContent, requiredElements, optionalElements, maxVisibleWords, maxElements, regions, allowedFallbacks, qualityConstraints } as LayoutPattern])
);

export const getLayoutPattern = (id: string) => LAYOUT_PATTERNS[id] || LAYOUT_PATTERNS["title-body"];
