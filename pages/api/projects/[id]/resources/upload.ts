import { put } from "@vercel/blob";
import { Prisma } from "@prisma/client";
import formidable, { File } from "formidable";
import fs from "fs/promises";
import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import {
  inferResourceMimeType,
  RESOURCE_UPLOAD_MAX_BYTES,
  sanitizeUploadedFilename,
} from "../../../../../lib/resources/upload";
import {
  encodeExtractionForStorage,
  runResourceExtraction,
} from "../../../../../lib/resources/resource-intelligence";
import { serializeResource } from "../../../../../lib/resources/extraction-meta";
import { resourceTypeFrom } from "../../../../../lib/resources/source-brief";
import { distillResource } from "../../../../../lib/ai/resource-distillation";

export const config = {
  api: {
    bodyParser: false,
  },
};

const getProjectId = (value: string | string[] | undefined) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

async function getOwnedProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      createdById: userId,
    },
    select: { id: true },
  });
}

function parseForm(req: AuthenticatedNextApiRequest) {
  const form = formidable({
    multiples: false,
    maxFileSize: RESOURCE_UPLOAD_MAX_BYTES,
    keepExtensions: true,
  });

  return new Promise<File>((resolve, reject) => {
    form.parse(req, (error, _fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      const uploadedFile = files.file;
      const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;

      if (!file) {
        reject(new Error("File is required"));
        return;
      }

      resolve(file);
    });
  });
}

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    const projectId = getProjectId(req.query.id);

    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    }

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

      let file: File;

      try {
        file = await parseForm(req);
      } catch (parseError) {
        const message =
          parseError instanceof Error && parseError.message === "File is required"
            ? "File is required"
            : "Uploaded file must be 10 MB or smaller";

        return res.status(400).json({ success: false, message });
      }

      const originalFilename = file.originalFilename?.trim() || "uploaded-file";
      const mimeType = inferResourceMimeType(originalFilename, file.mimetype);

      if (!mimeType) {
        return res.status(400).json({
          success: false,
          message:
            "Unsupported file type. Supported formats: PDF, DOCX, XLSX, Markdown, TXT, PNG, JPG, JPEG, WebP.",
        });
      }

      if (file.size > RESOURCE_UPLOAD_MAX_BYTES) {
        return res.status(400).json({
          success: false,
          message: "Uploaded file must be 10 MB or smaller",
        });
      }

      const token = process.env.BLOB_READ_WRITE_TOKEN;

      if (!token) {
        return res.status(500).json({
          success: false,
          message: "Blob storage is not configured",
        });
      }

      const safeFilename = sanitizeUploadedFilename(originalFilename);
      const fileBuffer = await fs.readFile(file.filepath);
      const extraction = await runResourceExtraction({
        filename: originalFilename,
        mimeType,
        buffer: fileBuffer,
        sizeBytes: file.size,
      });
      const extractedText = encodeExtractionForStorage(extraction);

      // Auto-distill on upload. This never throws — on any failure (no key,
      // quota, parse error) it returns a graceful status so upload succeeds.
      const distillation = await distillResource({
        filename: originalFilename,
        resourceType: resourceTypeFrom(extraction.meta.fileType, mimeType),
        extractionStatus: extraction.meta.status,
        extractedText: extraction.extractedText,
      });

      const blob = await put(
        `projects/${projectId}/resources/${Date.now()}-${safeFilename}`,
        fileBuffer,
        {
          access: "private",
          contentType: mimeType,
          token,
        }
      );

      const resource = await prisma.resource.create({
        data: {
          projectId,
          filename: originalFilename,
          mimeType,
          sizeBytes: file.size,
          storageUrl: blob.url,
          extractedText,
          sourceBrief: distillation.brief as unknown as Prisma.InputJsonValue,
          sourceBriefText: distillation.markdown,
          sourceBriefStatus: distillation.status,
          sourceBriefModel: distillation.model,
          sourceBriefUpdatedAt: new Date(),
        },
      });

      return res.status(201).json({
        success: true,
        data: serializeResource(resource),
      });
    } catch (error) {
      console.error("PROJECT RESOURCE UPLOAD ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to upload resource",
      });
    }
  }
);
