import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { planDocument } from "../ai/document-planning";
import { ProduceMode, ProduceResult } from "./document-sections";
import {
  assembleDocument,
  generateSectionsFromPlan,
  getOwnedContext,
  listSectionDTOs,
  syncSectionsFromPlan,
} from "./section-service";

const emptySections = (): ProduceResult["sections"] => ({
  total: 0,
  created: 0,
  generated: 0,
  failed: 0,
  skippedLocked: 0,
  skippedExisting: 0,
});

/**
 * Orchestrates the full document production pipeline from a single call:
 * ensure a plan → sync sections → generate missing/unlocked → assemble.
 * Reuses the section-service functions; adds no business logic of its own
 * beyond sequencing and summarizing.
 */
export async function produceDocument({
  userId,
  projectId,
  documentId,
  mode,
}: {
  userId: string;
  projectId: string;
  documentId: string;
  mode: ProduceMode;
}): Promise<ProduceResult | { error: string; code: number }> {
  const owned = await getOwnedContext(userId, projectId, documentId);
  if (!owned.ok) return { error: owned.message, code: owned.code };

  let { document } = owned;
  const { project } = owned;

  const steps: ProduceResult["steps"] = [];
  const warnings: string[] = [];
  const planSummary = { existed: false, generated: false, updated: false };

  const refreshDocument = async () => {
    const fresh = await prisma.document.findUnique({ where: { id: documentId } });
    if (fresh) document = fresh;
  };

  /* --------------------------------------------------- 1. Plan */
  const hadPlan = Boolean(document.documentPlan);
  planSummary.existed = hadPlan;

  if (!hadPlan || mode === "plan_only") {
    const [knowledgeItems, resources] = await Promise.all([
      prisma.projectKnowledge.findMany({
        where: { projectId },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.resource.findMany({
        where: { projectId },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const outcome = await planDocument({
      project,
      document,
      knowledgeItems,
      resources,
    });

    if (!outcome.plan) {
      steps.push({
        name: "Plan",
        status: "failed",
        message: outcome.warning || "Plan generation failed.",
      });
      return {
        ok: false,
        status: "failed",
        message:
          outcome.warning ||
          "Document production failed while generating the plan.",
        steps,
        plan: planSummary,
        sections: emptySections(),
        assembly: { assembled: false },
        warnings,
      };
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        documentPlan: outcome.plan as unknown as Prisma.InputJsonValue,
        documentPlanText: outcome.markdown,
        documentPlanStatus: outcome.status,
        documentPlanModel: outcome.model,
        documentPlanUpdatedAt: new Date(),
      },
    });
    planSummary.generated = !hadPlan;
    planSummary.updated = hadPlan;
    if (outcome.warning) warnings.push(outcome.warning);
    steps.push({
      name: "Plan",
      status: "done",
      message: hadPlan ? "Plan refreshed." : "Plan generated.",
    });
    await refreshDocument();
  } else {
    steps.push({
      name: "Plan",
      status: "skipped",
      message: "Using the existing plan.",
    });
  }

  if (mode === "plan_only") {
    const dtos = await listSectionDTOs(documentId);
    return {
      ok: true,
      status: "ready",
      message: "Plan ready.",
      steps,
      plan: planSummary,
      sections: { ...emptySections(), total: dtos.length },
      assembly: { assembled: false },
      warnings,
    };
  }

  /* --------------------------------------------------- 2. Sync sections */
  const sync = await syncSectionsFromPlan(document);
  if ("error" in sync) {
    steps.push({ name: "Sync sections", status: "failed", message: sync.error });
    return {
      ok: false,
      status: "failed",
      message: sync.error,
      steps,
      plan: planSummary,
      sections: emptySections(),
      assembly: { assembled: false },
      warnings,
    };
  }
  steps.push({
    name: "Sync sections",
    status: "done",
    message: `${sync.created} created · ${sync.updated} updated.`,
  });
  await refreshDocument();

  /* --------------------------------------------------- 3. Generate */
  const sectionsSummary: ProduceResult["sections"] = {
    ...emptySections(),
    total: sync.sections.length,
    created: sync.created,
  };

  const gen = await generateSectionsFromPlan(
    project,
    document,
    mode === "refresh_unlocked" ? "all" : "missing"
  );
  if ("error" in gen) {
    steps.push({
      name: "Generate sections",
      status: "failed",
      message: gen.error,
    });
    warnings.push(gen.error);
  } else {
    sectionsSummary.generated = gen.generated;
    sectionsSummary.failed = gen.failed;
    sectionsSummary.skippedLocked = gen.skippedLocked;
    sectionsSummary.skippedExisting = gen.skippedExisting;
    sectionsSummary.total = gen.sections.length;

    const parts = [`${gen.generated} generated`];
    if (gen.failed) parts.push(`${gen.failed} failed`);
    if (gen.skippedLocked) parts.push(`${gen.skippedLocked} locked skipped`);
    if (gen.skippedExisting) parts.push(`${gen.skippedExisting} already written`);
    steps.push({
      name: "Generate sections",
      status: gen.failed && gen.generated === 0 ? "failed" : "done",
      message: parts.join(" · "),
    });
    if (gen.failed) warnings.push(`${gen.failed} section(s) failed to generate.`);
    if (gen.skippedLocked) warnings.push("Locked sections were preserved.");
    if (gen.skippedExisting)
      warnings.push("Existing sections with content were skipped.");
  }

  /* --------------------------------------------------- 4. Assemble */
  await refreshDocument();
  const assembly: ProduceResult["assembly"] = { assembled: false };
  const asm = await assembleDocument(document);
  if ("error" in asm) {
    steps.push({ name: "Assemble", status: "failed", message: asm.error });
    warnings.push(asm.error);
  } else {
    assembly.assembled = true;
    assembly.assembledAt = asm.assembledAt;
    assembly.wordCount = asm.totalWords;
    steps.push({
      name: "Assemble",
      status: "done",
      message: `${asm.sectionsIncluded} sections · ${asm.totalWords} words.`,
    });
    if (asm.sectionsSkipped)
      warnings.push(`${asm.sectionsSkipped} empty section(s) were not included.`);
  }

  /* --------------------------------------------------- 5. Final state */
  const dtos = await listSectionDTOs(documentId);
  sectionsSummary.total = dtos.length;
  const withContent = dtos.filter((s) => s.content && s.content.trim()).length;
  const failedCount = dtos.filter((s) => s.status === "FAILED").length;

  let status: ProduceResult["status"];
  if (!assembly.assembled) status = "failed";
  else if (failedCount > 0 || withContent < dtos.length) status = "partial";
  else status = "ready";

  const message =
    status === "ready"
      ? "Final document assembled successfully."
      : status === "partial"
      ? `Document partially generated: ${sectionsSummary.generated} generated${
          sectionsSummary.failed ? `, ${sectionsSummary.failed} failed` : ""
        }${
          sectionsSummary.skippedLocked
            ? `, ${sectionsSummary.skippedLocked} locked skipped`
            : ""
        }.`
      : "Document production could not assemble the final document.";

  return {
    ok: status !== "failed",
    status,
    message,
    steps,
    plan: planSummary,
    sections: sectionsSummary,
    assembly,
    warnings,
  };
}
