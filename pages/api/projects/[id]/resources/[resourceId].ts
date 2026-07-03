import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { serializeResource } from "../../../../../lib/resources/extraction-meta";

interface ResourceUpdateBody {
  filename?: unknown;
  mimeType?: unknown;
  sizeBytes?: unknown;
  storageUrl?: unknown;
  extractedText?: unknown;
}

const getParam = (value: string | string[] | undefined) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeSizeBytes = (value: unknown) => {
  if (value === undefined || value === null || value === "") return null;

  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isSafeInteger(numberValue) && numberValue >= 0
    ? numberValue
    : undefined;
};

async function getOwnedProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      createdById: userId,
    },
    select: { id: true },
  });
}

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
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
      const project = await getOwnedProject(projectId, req.user.id);

      if (!project) {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      const existingResource = await prisma.resource.findFirst({
        where: {
          id: resourceId,
          projectId,
        },
      });

      if (!existingResource) {
        return res
          .status(404)
          .json({ success: false, message: "Resource not found" });
      }

      if (req.method === "GET") {
        return res.status(200).json({
          success: true,
          data: serializeResource(existingResource),
        });
      }

      if (req.method === "PATCH") {
        const body = (req.body ?? {}) as ResourceUpdateBody;
        const updates: {
          filename?: string;
          mimeType?: string;
          sizeBytes?: number | null;
          storageUrl?: string | null;
          extractedText?: string | null;
        } = {};

        if (body.filename !== undefined) {
          const filename = normalizeText(body.filename);

          if (!filename) {
            return res
              .status(400)
              .json({ success: false, message: "File name is required" });
          }

          updates.filename = filename;
        }

        if (body.mimeType !== undefined) {
          const mimeType = normalizeText(body.mimeType);

          if (!mimeType) {
            return res
              .status(400)
              .json({ success: false, message: "MIME type is required" });
          }

          updates.mimeType = mimeType;
        }

        if (body.sizeBytes !== undefined) {
          const sizeBytes = normalizeSizeBytes(body.sizeBytes);

          if (sizeBytes === undefined) {
            return res
              .status(400)
              .json({ success: false, message: "Size in bytes must be a non-negative integer" });
          }

          updates.sizeBytes = sizeBytes;
        }

        if (body.storageUrl !== undefined) {
          const storageUrl = normalizeText(body.storageUrl);
          updates.storageUrl = storageUrl || null;
        }

        if (body.extractedText !== undefined) {
          const extractedText = normalizeText(body.extractedText);
          updates.extractedText = extractedText || null;
        }

        if (!Object.keys(updates).length) {
          return res
            .status(400)
            .json({ success: false, message: "No resource updates provided" });
        }

        const resource = await prisma.resource.update({
          where: { id: resourceId },
          data: updates,
        });

        return res.status(200).json({
          success: true,
          data: serializeResource(resource),
        });
      }

      if (req.method === "DELETE") {
        await prisma.resource.delete({
          where: { id: resourceId },
        });

        return res.status(200).json({
          success: true,
          data: { id: resourceId },
        });
      }

      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    } catch (error) {
      console.error("PROJECT RESOURCE ITEM ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to process resource request" });
    }
  }
);
