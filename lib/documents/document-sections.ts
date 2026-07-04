import type { DocumentSection } from "@prisma/client";
import { PlanKeyFigure, PlanSection, PlanTable } from "./document-plan";

/**
 * Section-based generation (Ticket 023) — pure helpers for DocumentSection:
 * status handling, JSON-field coercion, serialization and plan→section mapping.
 * No AI, no DB, no heavy deps (safe for client + API + generation layers).
 */

export type SectionStatus =
  | "PLANNED"
  | "GENERATING"
  | "GENERATED"
  | "EDITED"
  | "FAILED"
  | "LOCKED";

export const SECTION_STATUSES: SectionStatus[] = [
  "PLANNED",
  "GENERATING",
  "GENERATED",
  "EDITED",
  "FAILED",
  "LOCKED",
];

export type ReviewStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "REVIEWED"
  | "APPROVED"
  | "NEEDS_CHANGES";

export const REVIEW_STATUSES: ReviewStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "REVIEWED",
  "APPROVED",
  "NEEDS_CHANGES",
];

export function countWords(text: string | null | undefined): number {
  const t = (text || "").trim();
  return t ? t.split(/\s+/).length : 0;
}

function strArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((v) => (typeof v === "string" ? v : String(v ?? ""))).filter(Boolean)
    : [];
}

function figureArray(value: unknown): PlanKeyFigure[] {
  return Array.isArray(value)
    ? (value.filter((v) => v && typeof v === "object") as PlanKeyFigure[])
    : [];
}

function tableArray(value: unknown): PlanTable[] {
  return Array.isArray(value)
    ? (value.filter((v) => v && typeof v === "object") as PlanTable[])
    : [];
}

export interface SectionDTO {
  id: string;
  documentId: string;
  planSectionId: string | null;
  orderIndex: number;
  title: string;
  level: number;
  purpose: string | null;
  targetWords: number | null;
  sourceBriefs: string[];
  keyFacts: string[];
  keyFigures: PlanKeyFigure[];
  tables: PlanTable[];
  risks: string[];
  assumptions: string[];
  openQuestions: string[];
  content: string | null;
  status: SectionStatus;
  model: string | null;
  wordCount: number;
  generatedAt: string | null;
  editedAt: string | null;
  lastRewriteInstruction: string | null;
  rewriteCount: number;
  reviewStatus: ReviewStatus;
  isLocked: boolean;
  lockedAt: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function serializeSection(section: DocumentSection): SectionDTO {
  return {
    id: section.id,
    documentId: section.documentId,
    planSectionId: section.planSectionId,
    orderIndex: section.orderIndex,
    title: section.title,
    level: section.level,
    purpose: section.purpose,
    targetWords: section.targetWords,
    sourceBriefs: strArray(section.sourceBriefs),
    keyFacts: strArray(section.keyFacts),
    keyFigures: figureArray(section.keyFigures),
    tables: tableArray(section.tables),
    risks: strArray(section.risks),
    assumptions: strArray(section.assumptions),
    openQuestions: strArray(section.openQuestions),
    content: section.content,
    status: (section.status as SectionStatus) || "PLANNED",
    model: section.model,
    wordCount: countWords(section.content),
    generatedAt: section.generatedAt ? section.generatedAt.toISOString() : null,
    editedAt: section.editedAt ? section.editedAt.toISOString() : null,
    lastRewriteInstruction: section.lastRewriteInstruction,
    rewriteCount: section.rewriteCount,
    reviewStatus: (section.reviewStatus as ReviewStatus) || "DRAFT",
    isLocked: section.isLocked,
    lockedAt: section.lockedAt ? section.lockedAt.toISOString() : null,
    reviewedAt: section.reviewedAt ? section.reviewedAt.toISOString() : null,
    approvedAt: section.approvedAt ? section.approvedAt.toISOString() : null,
    createdAt: section.createdAt.toISOString(),
    updatedAt: section.updatedAt.toISOString(),
  };
}

/* -------------------------------------------------- Review / readiness */

export function isSectionLocked(section: { isLocked?: boolean }): boolean {
  return Boolean(section.isLocked);
}

export interface SectionReadiness {
  total: number;
  withContent: number;
  generated: number;
  edited: number;
  reviewed: number;
  approved: number;
  locked: number;
  failed: number;
}

export function summarizeSectionReadiness(
  sections: Pick<
    SectionDTO,
    "status" | "reviewStatus" | "isLocked" | "content"
  >[]
): SectionReadiness {
  return sections.reduce<SectionReadiness>(
    (acc, s) => {
      acc.total += 1;
      if (s.content && s.content.trim()) acc.withContent += 1;
      if (s.status === "GENERATED") acc.generated += 1;
      if (s.status === "EDITED") acc.edited += 1;
      if (s.status === "FAILED") acc.failed += 1;
      if (s.reviewStatus === "REVIEWED") acc.reviewed += 1;
      if (s.reviewStatus === "APPROVED") acc.approved += 1;
      if (s.isLocked) acc.locked += 1;
      return acc;
    },
    {
      total: 0,
      withContent: 0,
      generated: 0,
      edited: 0,
      reviewed: 0,
      approved: 0,
      locked: 0,
      failed: 0,
    }
  );
}

/**
 * The assembled document is stale when there is section content but it was
 * never assembled, or a section changed after the last assembly.
 */
export function isDocumentStale(
  assembledAt: string | null,
  sections: Pick<SectionDTO, "content" | "updatedAt">[]
): boolean {
  const withContent = sections.filter((s) => s.content && s.content.trim());
  if (!withContent.length) return false;
  if (!assembledAt) return true;
  const assembled = new Date(assembledAt).getTime();
  return withContent.some(
    (s) => new Date(s.updatedAt).getTime() > assembled
  );
}

export const REVIEW_STATUS_UI: Record<
  ReviewStatus,
  { label: string; tone: "success" | "accent" | "warning" | "danger" | "neutral" }
> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  IN_REVIEW: { label: "Needs review", tone: "warning" },
  REVIEWED: { label: "Reviewed", tone: "accent" },
  APPROVED: { label: "Approved", tone: "success" },
  NEEDS_CHANGES: { label: "Needs changes", tone: "warning" },
};

/** Metadata payload derived from a plan section (JSON fields for Prisma). */
export function planSectionToData(section: PlanSection, orderIndex: number) {
  return {
    title: section.title,
    level: section.level ?? 2,
    purpose: section.purpose || null,
    targetWords: section.targetWords ?? null,
    sourceBriefs: section.sourceBriefs ?? [],
    keyFacts: section.keyFacts ?? [],
    keyFigures: section.keyFigures ?? [],
    tables: section.tables ?? [],
    risks: section.risks ?? [],
    assumptions: section.assumptions ?? [],
    openQuestions: section.openQuestions ?? [],
    orderIndex,
  };
}

export const SECTION_STATUS_UI: Record<
  SectionStatus,
  { label: string; tone: "success" | "accent" | "warning" | "danger" | "neutral" }
> = {
  PLANNED: { label: "Planned", tone: "neutral" },
  GENERATING: { label: "Generating", tone: "accent" },
  GENERATED: { label: "Generated", tone: "success" },
  EDITED: { label: "Edited", tone: "accent" },
  FAILED: { label: "Failed", tone: "danger" },
  LOCKED: { label: "Locked", tone: "warning" },
};
