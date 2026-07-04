import { Prisma } from "@prisma/client";
import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../../../lib/auth";
import { prisma } from "../../../../../../../lib/prisma";
import { reviseDocumentPlan } from "../../../../../../../lib/ai/document-planning";
import { sanitizeDocumentPlan } from "../../../../../../../lib/documents/document-plan";

const getParam = (value: string | string[] | undefined) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    }

    const projectId = getParam(req.query.id);
    const documentId = getParam(req.query.documentId);
    if (!projectId || !documentId) {
      return res
        .status(400)
        .json({ success: false, message: "Project and document id are required" });
    }

    const body = (req.body ?? {}) as { feedback?: unknown };
    const feedback =
      typeof body.feedback === "string" ? body.feedback.trim() : "";
    if (!feedback) {
      return res.status(400).json({
        success: false,
        message: "Describe how the plan should be improved.",
      });
    }

    try {
      const project = await prisma.project.findFirst({
        where: { id: projectId, createdById: req.user.id },
      });
      if (!project) {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      const document = await prisma.document.findFirst({
        where: { id: documentId, projectId },
        include: { template: true },
      });
      if (!document) {
        return res
          .status(404)
          .json({ success: false, message: "Document not found" });
      }

      if (!document.documentPlan) {
        return res.status(400).json({
          success: false,
          message: "Generate a plan first, then improve it with feedback.",
        });
      }

      const currentPlan = sanitizeDocumentPlan(document.documentPlan, {
        documentTitle: document.title,
        documentType: document.type,
      });

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

      const outcome = await reviseDocumentPlan(
        { project, document, knowledgeItems, resources },
        feedback,
        currentPlan
      );

      if (!outcome.plan) {
        return res.status(200).json({
          success: true,
          message: outcome.warning || "The plan could not be revised.",
          data: {
            documentPlan: null,
            documentPlanStatus: outcome.status,
            warning: outcome.warning ?? null,
            rawPreview:
              process.env.NODE_ENV !== "production"
                ? outcome.rawPreview ?? null
                : undefined,
          },
        });
      }

      const updated = await prisma.document.update({
        where: { id: documentId },
        data: {
          documentPlan: outcome.plan as unknown as Prisma.InputJsonValue,
          documentPlanText: outcome.markdown,
          documentPlanStatus: outcome.status,
          documentPlanModel: outcome.model,
          documentPlanUpdatedAt: new Date(),
        },
      });

      return res.status(200).json({
        success: true,
        message: outcome.warning || "Plan improved.",
        data: {
          documentPlan: outcome.plan,
          documentPlanText: outcome.markdown,
          documentPlanStatus: outcome.status,
          documentPlanUpdatedAt: updated.documentPlanUpdatedAt
            ? updated.documentPlanUpdatedAt.toISOString()
            : null,
          documentPlanAppliedAt: updated.documentPlanAppliedAt
            ? updated.documentPlanAppliedAt.toISOString()
            : null,
          warning: outcome.warning ?? null,
        },
      });
    } catch (error) {
      console.error("DOCUMENT PLAN REVISE ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to revise document plan" });
    }
  }
);
