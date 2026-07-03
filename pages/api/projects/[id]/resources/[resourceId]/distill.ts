import { Prisma } from "@prisma/client";
import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import {
  decodeExtraction,
  serializeResource,
} from "../../../../../../lib/resources/extraction-meta";
import { resourceTypeFrom } from "../../../../../../lib/resources/source-brief";
import { distillResource } from "../../../../../../lib/ai/resource-distillation";

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
    const resourceId = getParam(req.query.resourceId);

    if (!projectId) {
      return res
        .status(400)
        .json({ success: false, message: "Project id is required" });
    }
    if (!resourceId) {
      return res
        .status(400)
        .json({ success: false, message: "Resource id is required" });
    }

    try {
      const project = await prisma.project.findFirst({
        where: { id: projectId, createdById: req.user.id },
        select: { id: true },
      });

      if (!project) {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      const resource = await prisma.resource.findFirst({
        where: { id: resourceId, projectId },
      });

      if (!resource) {
        return res
          .status(404)
          .json({ success: false, message: "Resource not found" });
      }

      const { text, meta } = decodeExtraction(resource.extractedText);
      const distillation = await distillResource({
        filename: resource.filename,
        resourceType: resourceTypeFrom(meta?.fileType, resource.mimeType),
        extractionStatus: meta?.status ?? (text ? "extracted" : "empty"),
        extractedText: text,
      });

      const updated = await prisma.resource.update({
        where: { id: resourceId },
        data: {
          sourceBrief: distillation.brief as unknown as Prisma.InputJsonValue,
          sourceBriefText: distillation.markdown,
          sourceBriefStatus: distillation.status,
          sourceBriefModel: distillation.model,
          sourceBriefUpdatedAt: new Date(),
        },
      });

      return res.status(200).json({
        success: true,
        data: serializeResource(updated),
        message: distillation.warning || undefined,
      });
    } catch (error) {
      console.error("RESOURCE DISTILL ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to generate source brief",
      });
    }
  }
);
