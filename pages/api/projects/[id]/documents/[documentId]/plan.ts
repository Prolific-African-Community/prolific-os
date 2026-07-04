import { Prisma } from "@prisma/client";
import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import { planDocument } from "../../../../../../lib/ai/document-planning";

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

    if (!projectId) {
      return res
        .status(400)
        .json({ success: false, message: "Project id is required" });
    }
    if (!documentId) {
      return res
        .status(400)
        .json({ success: false, message: "Document id is required" });
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

      const updated = await prisma.document.update({
        where: { id: documentId },
        data: {
          documentPlan: outcome.plan
            ? (outcome.plan as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
          documentPlanText: outcome.markdown,
          documentPlanStatus: outcome.status,
          documentPlanModel: outcome.model,
          documentPlanUpdatedAt: new Date(),
        },
      });

      return res.status(200).json({
        success: true,
        message: outcome.warning || undefined,
        data: {
          documentPlan: outcome.plan,
          documentPlanText: outcome.markdown,
          documentPlanStatus: outcome.status,
          documentPlanUpdatedAt: updated.documentPlanUpdatedAt
            ? updated.documentPlanUpdatedAt.toISOString()
            : null,
          warning: outcome.warning ?? null,
          rawPreview:
            process.env.NODE_ENV !== "production"
              ? outcome.rawPreview ?? null
              : undefined,
        },
      });
    } catch (error) {
      console.error("DOCUMENT PLAN ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to generate document plan",
      });
    }
  }
);
