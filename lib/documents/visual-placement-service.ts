import type { DocumentVisualPlacement } from "@prisma/client";
import { prisma } from "../prisma";
import {
  classifyVisualAsset,
  isImageResource,
  suggestVisualPlacements,
} from "../export/visual-assets";

/**
 * Visual placement service: deterministic suggestions from image resources +
 * section titles, persisted so the user can approve/adjust before export.
 */

export const PLACEMENT_TARGETS = ["cover", "section", "appendix", "ignore"] as const;
export const PLACEMENT_POSITIONS = [
  "after_heading",
  "after_first_paragraph",
  "before_section",
  "after_section",
  "appendix",
] as const;
export const PLACEMENT_SIZES = ["small", "medium", "large", "full_width"] as const;

export interface PlacementDTO {
  id: string;
  resourceId: string;
  filename: string;
  mimeType: string;
  role: string;
  target: string;
  sectionId: string | null;
  sectionTitle: string | null;
  position: string;
  size: string;
  caption: string | null;
  confidence: string | null;
  reason: string | null;
  isEnabled: boolean;
  isApproved: boolean;
  isSuggested: boolean;
  orderIndex: number;
}

type PlacementWithJoins = DocumentVisualPlacement & {
  resource: { filename: string; mimeType: string };
  section: { title: string } | null;
};

function serializePlacement(p: PlacementWithJoins): PlacementDTO {
  return {
    id: p.id,
    resourceId: p.resourceId,
    filename: p.resource.filename,
    mimeType: p.resource.mimeType,
    role: p.role,
    target: p.target,
    sectionId: p.sectionId,
    sectionTitle: p.section?.title ?? null,
    position: p.position,
    size: p.size,
    caption: p.caption,
    confidence: p.confidence,
    reason: p.reason,
    isEnabled: p.isEnabled,
    isApproved: p.isApproved,
    isSuggested: p.isSuggested,
    orderIndex: p.orderIndex,
  };
}

export async function listPlacementDTOs(
  documentId: string
): Promise<PlacementDTO[]> {
  const placements = await prisma.documentVisualPlacement.findMany({
    where: { documentId },
    include: {
      resource: { select: { filename: true, mimeType: true } },
      section: { select: { title: true } },
    },
    orderBy: { orderIndex: "asc" },
  });
  return placements.map(serializePlacement);
}

/**
 * Generate suggestions for image resources that don't have a placement yet.
 * Never duplicates: one placement per (document, resource).
 */
export async function suggestPlacementsForDocument(
  projectId: string,
  documentId: string
): Promise<{ placements: PlacementDTO[]; created: number }> {
  const [resources, sections, existing] = await Promise.all([
    prisma.resource.findMany({
      where: { projectId, mimeType: { startsWith: "image/" } },
      select: { id: true, filename: true, mimeType: true },
    }),
    prisma.documentSection.findMany({
      where: { documentId },
      orderBy: { orderIndex: "asc" },
      select: { id: true, title: true },
    }),
    prisma.documentVisualPlacement.findMany({
      where: { documentId },
      select: { resourceId: true },
    }),
  ]);

  const placed = new Set(existing.map((e) => e.resourceId));
  const candidates = resources.filter(
    (r) => isImageResource(r) && !placed.has(r.id)
  );

  const sectionByTitle = new Map(sections.map((s) => [s.title, s.id]));
  const suggestions = suggestVisualPlacements(
    candidates,
    sections.map((s) => s.title)
  );

  let created = 0;
  let orderIndex = existing.length;
  for (const suggestion of suggestions) {
    // Cover suggestions are handled by the automatic logo pipeline; store
    // them so they appear in the UI, but logos stay cover-managed.
    const sectionId = suggestion.sectionTitle
      ? sectionByTitle.get(suggestion.sectionTitle) ?? null
      : null;

    await prisma.documentVisualPlacement.create({
      data: {
        documentId,
        resourceId: suggestion.resourceId,
        sectionId,
        target: suggestion.target,
        role: suggestion.role,
        position: suggestion.target === "appendix" ? "appendix" : "after_heading",
        size: suggestion.role === "chart" || suggestion.role === "diagram" ? "large" : "medium",
        confidence: suggestion.confidence,
        reason: suggestion.reason,
        isSuggested: true,
        isApproved: false,
        isEnabled: true,
        orderIndex: orderIndex++,
      },
    });
    created += 1;
  }

  return { placements: await listPlacementDTOs(documentId), created };
}

export interface PlacementUpdate {
  sectionId?: string | null;
  target?: string;
  position?: string;
  size?: string;
  caption?: string | null;
  isApproved?: boolean;
  isEnabled?: boolean;
}

export async function updatePlacement(
  documentId: string,
  placementId: string,
  update: PlacementUpdate
): Promise<PlacementDTO | { error: string; code?: number }> {
  const placement = await prisma.documentVisualPlacement.findFirst({
    where: { id: placementId, documentId },
  });
  if (!placement) return { error: "Placement not found", code: 404 };

  const data: Record<string, unknown> = {};

  if (update.target !== undefined) {
    if (!PLACEMENT_TARGETS.includes(update.target as never)) {
      return { error: "Invalid target" };
    }
    data.target = update.target;
  }
  if (update.position !== undefined) {
    if (!PLACEMENT_POSITIONS.includes(update.position as never)) {
      return { error: "Invalid position" };
    }
    data.position = update.position;
  }
  if (update.size !== undefined) {
    if (!PLACEMENT_SIZES.includes(update.size as never)) {
      return { error: "Invalid size" };
    }
    data.size = update.size;
  }
  if (update.sectionId !== undefined) {
    if (update.sectionId) {
      const section = await prisma.documentSection.findFirst({
        where: { id: update.sectionId, documentId },
        select: { id: true },
      });
      if (!section) return { error: "Section not found", code: 404 };
    }
    data.sectionId = update.sectionId;
  }
  if (update.caption !== undefined) {
    data.caption = update.caption ? update.caption.slice(0, 200) : null;
  }
  if (typeof update.isApproved === "boolean") {
    data.isApproved = update.isApproved;
    if (update.isApproved) data.isSuggested = false;
  }
  if (typeof update.isEnabled === "boolean") data.isEnabled = update.isEnabled;

  if (!Object.keys(data).length) {
    return { error: "No placement updates provided" };
  }

  const updated = await prisma.documentVisualPlacement.update({
    where: { id: placementId },
    data,
    include: {
      resource: { select: { filename: true, mimeType: true } },
      section: { select: { title: true } },
    },
  });
  return serializePlacement(updated);
}

/** Approved + enabled placements, including dedicated cover artwork. */
export async function listApprovedPlacementsForExport(documentId: string) {
  return prisma.documentVisualPlacement.findMany({
    where: {
      documentId,
      isApproved: true,
      isEnabled: true,
      target: { in: ["cover", "section", "appendix"] },
    },
    orderBy: { orderIndex: "asc" },
    select: {
      target: true,
      role: true,
      position: true,
      size: true,
      caption: true,
      section: { select: { title: true } },
      resource: {
        select: { id: true, filename: true, mimeType: true, storageUrl: true },
      },
    },
  });
}

export { classifyVisualAsset };
