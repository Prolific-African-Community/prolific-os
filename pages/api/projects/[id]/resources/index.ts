import type { Resource } from "@prisma/client";
import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

interface ResourceBody {
  filename?: unknown;
  mimeType?: unknown;
  sizeBytes?: unknown;
  storageUrl?: unknown;
  extractedText?: unknown;
}

const getProjectId = (value: string | string[] | undefined) =>
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

const serializeResource = (resource: Resource) => ({
  id: resource.id,
  projectId: resource.projectId,
  documentId: resource.documentId,
  filename: resource.filename,
  mimeType: resource.mimeType,
  sizeBytes: resource.sizeBytes,
  storageUrl: resource.storageUrl,
  extractedText: resource.extractedText,
  createdAt: resource.createdAt.toISOString(),
  updatedAt: resource.updatedAt.toISOString(),
});

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
    const projectId = getProjectId(req.query.id);

    if (!projectId) {
      return res
        .status(400)
        .json({ success: false, message: "Project id is required" });
    }

    try {
      const project = await getOwnedProject(projectId, req.user.id);

      if (!project) {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      if (req.method === "GET") {
        const resources = await prisma.resource.findMany({
          where: { projectId },
          orderBy: { updatedAt: "desc" },
        });

        return res.status(200).json({
          success: true,
          data: resources.map(serializeResource),
        });
      }

      if (req.method === "POST") {
        const body = (req.body ?? {}) as ResourceBody;
        const filename = normalizeText(body.filename);
        const mimeType = normalizeText(body.mimeType);
        const storageUrl = normalizeText(body.storageUrl);
        const extractedText = normalizeText(body.extractedText);
        const sizeBytes = normalizeSizeBytes(body.sizeBytes);

        if (!filename) {
          return res
            .status(400)
            .json({ success: false, message: "File name is required" });
        }

        if (!mimeType) {
          return res
            .status(400)
            .json({ success: false, message: "MIME type is required" });
        }

        if (sizeBytes === undefined) {
          return res
            .status(400)
            .json({ success: false, message: "Size in bytes must be a non-negative integer" });
        }

        const resource = await prisma.resource.create({
          data: {
            projectId,
            filename,
            mimeType,
            sizeBytes,
            storageUrl: storageUrl || null,
            extractedText: extractedText || null,
          },
        });

        return res.status(201).json({
          success: true,
          data: serializeResource(resource),
        });
      }

      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    } catch (error) {
      console.error("PROJECT RESOURCES COLLECTION ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to process resource request" });
    }
  }
);
