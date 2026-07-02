import { DocumentStatus } from "@prisma/client";
import type { Document, Template } from "@prisma/client";
import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

interface DocumentBody {
  title?: unknown;
  type?: unknown;
  objective?: unknown;
  instructions?: unknown;
  templateId?: unknown;
}

type DocumentWithTemplate = Document & { template?: Template | null };

const getProjectId = (value: string | string[] | undefined) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeOptionalId = (value: unknown) => {
  const text = normalizeText(value);
  return text || null;
};

const serializeDocument = (document: DocumentWithTemplate) => ({
  id: document.id,
  projectId: document.projectId,
  templateId: document.templateId,
  template: document.template
    ? {
        id: document.template.id,
        name: document.template.name,
        type: document.template.type,
      }
    : null,
  title: document.title,
  type: document.type,
  objective: document.objective,
  instructions: document.instructions,
  status: document.status,
  outline: document.outline,
  content: document.content,
  createdAt: document.createdAt.toISOString(),
  updatedAt: document.updatedAt.toISOString(),
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
        const documents = await prisma.document.findMany({
          where: { projectId },
          include: { template: true },
          orderBy: { updatedAt: "desc" },
        });

        return res.status(200).json({
          success: true,
          data: documents.map(serializeDocument),
        });
      }

      if (req.method === "POST") {
        const body = (req.body ?? {}) as DocumentBody;
        const title = normalizeText(body.title);
        const type = normalizeText(body.type);
        const objective = normalizeText(body.objective);
        const instructions = normalizeText(body.instructions);
        const templateId = normalizeOptionalId(body.templateId);

        if (!title) {
          return res
            .status(400)
            .json({ success: false, message: "Document title is required" });
        }

        if (!type) {
          return res
            .status(400)
            .json({ success: false, message: "Document type is required" });
        }

        if (!objective) {
          return res
            .status(400)
            .json({ success: false, message: "Document objective is required" });
        }

        if (templateId) {
          const template = await prisma.template.findUnique({
            where: { id: templateId },
            select: { id: true },
          });

          if (!template) {
            return res
              .status(400)
              .json({ success: false, message: "Selected template does not exist" });
          }
        }

        const document = await prisma.document.create({
          data: {
            projectId,
            templateId,
            title,
            type,
            objective,
            instructions: instructions || null,
            status: DocumentStatus.DRAFT,
          },
          include: { template: true },
        });

        return res.status(201).json({
          success: true,
          data: serializeDocument(document),
        });
      }

      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    } catch (error) {
      console.error("PROJECT DOCUMENTS COLLECTION ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to process document request" });
    }
  }
);
