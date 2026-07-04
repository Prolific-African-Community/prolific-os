import { DocumentStatus, GenerationRunStatus, Prisma } from "@prisma/client";
import type { Document, DocumentSection, Project } from "@prisma/client";
import { prisma } from "../prisma";
import { hasOpenAIKey } from "../ai/openai";
import { generateSection } from "../ai/section-generation";
import { sanitizeDocumentPlan } from "./document-plan";
import {
  SectionDTO,
  SectionStatus,
  planSectionToData,
  serializeSection,
} from "./document-sections";
import { assembleSections } from "./section-assembly";

const json = (v: unknown) => v as unknown as Prisma.InputJsonValue;

export interface OwnedContext {
  project: Project;
  document: Document;
}

export async function getOwnedContext(
  userId: string,
  projectId: string,
  documentId: string
): Promise<
  | { ok: true; project: Project; document: Document }
  | { ok: false; code: 404; message: string }
> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, createdById: userId },
  });
  if (!project) return { ok: false, code: 404, message: "Project not found" };

  const document = await prisma.document.findFirst({
    where: { id: documentId, projectId },
  });
  if (!document) return { ok: false, code: 404, message: "Document not found" };

  return { ok: true, project, document };
}

export async function listSectionDTOs(documentId: string): Promise<SectionDTO[]> {
  const sections = await prisma.documentSection.findMany({
    where: { documentId },
    orderBy: { orderIndex: "asc" },
  });
  return sections.map(serializeSection);
}

/* ------------------------------------------------------- Sync from plan */

export async function syncSectionsFromPlan(
  document: Document
): Promise<
  | { sections: SectionDTO[]; created: number; updated: number; appliedAt: string }
  | { error: string }
> {
  const rawPlan = (document as { documentPlan?: unknown }).documentPlan;
  if (!rawPlan) {
    return { error: "No document plan available. Generate a plan first." };
  }
  const plan = sanitizeDocumentPlan(rawPlan, {
    documentTitle: document.title,
    documentType: document.type,
  });
  if (!plan.sections.length) {
    return { error: "The document plan has no sections to sync." };
  }

  const existing = await prisma.documentSection.findMany({
    where: { documentId: document.id },
  });
  const byPlanId = new Map(
    existing.filter((e) => e.planSectionId).map((e) => [e.planSectionId, e])
  );

  let created = 0;
  let updated = 0;

  for (let i = 0; i < plan.sections.length; i += 1) {
    const ps = plan.sections[i];
    const data = planSectionToData(ps, i);
    const found = byPlanId.get(ps.id);

    if (found) {
      // Update metadata + order, but PRESERVE content/status/edits.
      await prisma.documentSection.update({
        where: { id: found.id },
        data: {
          title: data.title,
          level: data.level,
          purpose: data.purpose,
          targetWords: data.targetWords,
          orderIndex: data.orderIndex,
          sourceBriefs: json(data.sourceBriefs),
          keyFacts: json(data.keyFacts),
          keyFigures: json(data.keyFigures),
          tables: json(data.tables),
          risks: json(data.risks),
          assumptions: json(data.assumptions),
          openQuestions: json(data.openQuestions),
        },
      });
      updated += 1;
    } else {
      await prisma.documentSection.create({
        data: {
          documentId: document.id,
          planSectionId: ps.id,
          status: "PLANNED",
          title: data.title,
          level: data.level,
          purpose: data.purpose,
          targetWords: data.targetWords,
          orderIndex: data.orderIndex,
          sourceBriefs: json(data.sourceBriefs),
          keyFacts: json(data.keyFacts),
          keyFigures: json(data.keyFigures),
          tables: json(data.tables),
          risks: json(data.risks),
          assumptions: json(data.assumptions),
          openQuestions: json(data.openQuestions),
        },
      });
      created += 1;
    }
  }

  // Stamp when the plan was applied to sections, for out-of-sync detection.
  const appliedAt = new Date();
  await prisma.document.update({
    where: { id: document.id },
    data: { documentPlanAppliedAt: appliedAt },
  });

  const sections = await listSectionDTOs(document.id);
  return { sections, created, updated, appliedAt: appliedAt.toISOString() };
}

/* ----------------------------------------------------- Section generation */

async function generateOneRaw(
  project: Project,
  document: Document,
  section: DocumentSection,
  allSections: DocumentSection[],
  knowledgeItems: Awaited<ReturnType<typeof prisma.projectKnowledge.findMany>>,
  resources: Awaited<ReturnType<typeof prisma.resource.findMany>>
): Promise<{ ok: true } | { ok: false; message: string }> {
  await prisma.documentSection.update({
    where: { id: section.id },
    data: { status: "GENERATING" },
  });

  const run = await prisma.generationRun.create({
    data: {
      documentId: document.id,
      provider: "openai",
      model: "openai",
      status: GenerationRunStatus.RUNNING,
      inputSummary: `Section: ${section.title} (${section.id})`,
    },
  });

  try {
    const outcome = await generateSection({
      project,
      document,
      section,
      allSections,
      knowledgeItems,
      resources,
    });

    await prisma.documentSection.update({
      where: { id: section.id },
      data: {
        content: outcome.content,
        status: "GENERATED",
        model: outcome.model,
        generatedAt: new Date(),
      },
    });
    await prisma.generationRun.update({
      where: { id: run.id },
      data: {
        model: outcome.model,
        status: GenerationRunStatus.SUCCEEDED,
        output: `Generated ${outcome.words} words for « ${section.title} ».`,
      },
    });
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Section generation failed";
    await prisma.documentSection.update({
      where: { id: section.id },
      data: { status: "FAILED" },
    });
    await prisma.generationRun.update({
      where: { id: run.id },
      data: { status: GenerationRunStatus.FAILED, error: message },
    });
    return { ok: false, message };
  }
}

async function loadGenerationInputs(project: Project, document: Document) {
  const [knowledgeItems, resources, sections] = await Promise.all([
    prisma.projectKnowledge.findMany({
      where: { projectId: project.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.resource.findMany({
      where: { projectId: project.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.documentSection.findMany({
      where: { documentId: document.id },
      orderBy: { orderIndex: "asc" },
    }),
  ]);
  return { knowledgeItems, resources, sections };
}

export async function generateSingleSection(
  project: Project,
  document: Document,
  sectionId: string
): Promise<{ section: SectionDTO } | { error: string; code?: number }> {
  if (!hasOpenAIKey()) {
    return {
      error: "Section could not be generated. Check OpenAI configuration.",
    };
  }
  const { knowledgeItems, resources, sections } = await loadGenerationInputs(
    project,
    document
  );
  const target = sections.find((s) => s.id === sectionId);
  if (!target) return { error: "Section not found", code: 404 };
  if (target.status === "LOCKED") {
    return { error: "This section is locked and cannot be regenerated." };
  }

  const result = await generateOneRaw(
    project,
    document,
    target,
    sections,
    knowledgeItems,
    resources
  );

  const refreshed = await prisma.documentSection.findUnique({
    where: { id: sectionId },
  });
  if (!refreshed) return { error: "Section not found", code: 404 };
  if (!result.ok) return { error: result.message };
  return { section: serializeSection(refreshed) };
}

export async function generateSectionsFromPlan(
  project: Project,
  document: Document,
  mode: "missing" | "all"
): Promise<
  | { sections: SectionDTO[]; generated: number; failed: number; skipped: number }
  | { error: string }
> {
  if (!hasOpenAIKey()) {
    return {
      error: "Sections could not be generated. Check OpenAI configuration.",
    };
  }
  const { knowledgeItems, resources, sections } = await loadGenerationInputs(
    project,
    document
  );
  if (!sections.length) {
    return { error: "No sections yet. Sync sections from the plan first." };
  }

  const isTarget = (s: DocumentSection) => {
    if (s.status === "LOCKED") return false;
    if (mode === "all") return true;
    // "missing": no content yet or previously failed.
    return !s.content || !s.content.trim() || s.status === "FAILED";
  };

  let generated = 0;
  let failed = 0;
  let skipped = 0;

  for (const section of sections) {
    if (!isTarget(section)) {
      skipped += 1;
      continue;
    }
    // Re-read for freshest allSections context as we go.
    const current = await prisma.documentSection.findMany({
      where: { documentId: document.id },
      orderBy: { orderIndex: "asc" },
    });
    const result = await generateOneRaw(
      project,
      document,
      section,
      current,
      knowledgeItems,
      resources
    );
    if (result.ok) generated += 1;
    else failed += 1;
  }

  return {
    sections: await listSectionDTOs(document.id),
    generated,
    failed,
    skipped,
  };
}

/* --------------------------------------------------------------- Assemble */

export async function assembleDocument(
  document: Document
): Promise<
  | { content: string; sectionsIncluded: number; sectionsSkipped: number; totalWords: number }
  | { error: string }
> {
  const sections = await prisma.documentSection.findMany({
    where: { documentId: document.id },
    orderBy: { orderIndex: "asc" },
  });
  if (!sections.length) {
    return { error: "No sections to assemble. Generate sections first." };
  }

  const result = assembleSections(sections, { documentTitle: document.title });
  if (!result.sectionsIncluded) {
    return { error: "No generated section content to assemble yet." };
  }

  await prisma.document.update({
    where: { id: document.id },
    data: {
      content: result.content,
      status: DocumentStatus.READY_FOR_REVIEW,
    },
  });

  return result;
}

export function markSectionStatus(status: string): SectionStatus {
  return status as SectionStatus;
}
