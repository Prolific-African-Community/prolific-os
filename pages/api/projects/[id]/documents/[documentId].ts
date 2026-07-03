import { DocumentStatus } from "@prisma/client";
import type { Document, Template } from "@prisma/client";
import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

interface DocumentUpdateBody {
  title?: unknown;
  type?: unknown;
  objective?: unknown;
  instructions?: unknown;
  outline?: unknown;
  content?: unknown;
  templateId?: unknown;
  status?: unknown;
}

type DocumentWithTemplate = Document & { template?: Template | null };

const getParam = (value: string | string[] | undefined) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeOptionalId = (value: unknown) => {
  const text = normalizeText(value);
  return text || null;
};

const parseStatus = (value: unknown) => {
  if (typeof value !== "string") return null;
  return Object.values(DocumentStatus).includes(value as DocumentStatus)
    ? (value as DocumentStatus)
    : null;
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
  documentPlan: document.documentPlan ?? null,
  documentPlanText: document.documentPlanText ?? null,
  documentPlanStatus: document.documentPlanStatus ?? null,
  documentPlanUpdatedAt: document.documentPlanUpdatedAt
    ? document.documentPlanUpdatedAt.toISOString()
    : null,
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
      const project = await getOwnedProject(projectId, req.user.id);

      if (!project) {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      const existingDocument = await prisma.document.findFirst({
        where: {
          id: documentId,
          projectId,
        },
        include: { template: true },
      });

      if (!existingDocument) {
        return res
          .status(404)
          .json({ success: false, message: "Document not found" });
      }

      if (req.method === "GET") {
        return res.status(200).json({
          success: true,
          data: serializeDocument(existingDocument),
        });
      }

      if (req.method === "PATCH") {
        const body = (req.body ?? {}) as DocumentUpdateBody;
        const updates: {
          title?: string;
          type?: string;
          objective?: string;
          instructions?: string | null;
          outline?: string | null;
          content?: string | null;
          templateId?: string | null;
          status?: DocumentStatus;
        } = {};

        if (body.title !== undefined) {
          const title = normalizeText(body.title);

          if (!title) {
            return res
              .status(400)
              .json({ success: false, message: "Document title is required" });
          }

          updates.title = title;
        }

        if (body.type !== undefined) {
          const type = normalizeText(body.type);

          if (!type) {
            return res
              .status(400)
              .json({ success: false, message: "Document type is required" });
          }

          updates.type = type;
        }

        if (body.objective !== undefined) {
          const objective = normalizeText(body.objective);

          if (!objective) {
            return res
              .status(400)
              .json({ success: false, message: "Document objective is required" });
          }

          updates.objective = objective;
        }

        if (body.instructions !== undefined) {
          const instructions = normalizeText(body.instructions);
          updates.instructions = instructions || null;
        }

        if (body.outline !== undefined) {
          const outline = normalizeText(body.outline);
          updates.outline = outline || null;
        }

        if (body.content !== undefined) {
          const content = normalizeText(body.content);
          updates.content = content || null;
        }

        if (body.templateId !== undefined) {
          const templateId = normalizeOptionalId(body.templateId);

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

          updates.templateId = templateId;
        }

        if (body.status !== undefined) {
          const status = parseStatus(body.status);

          if (!status) {
            return res
              .status(400)
              .json({ success: false, message: "Invalid document status" });
          }

          updates.status = status;
        }

        if (!Object.keys(updates).length) {
          return res
            .status(400)
            .json({ success: false, message: "No document updates provided" });
        }

        const document = await prisma.document.update({
          where: { id: documentId },
          data: updates,
          include: { template: true },
        });

        return res.status(200).json({
          success: true,
          data: serializeDocument(document),
        });
      }

      if (req.method === "DELETE") {
        await prisma.document.delete({
          where: { id: documentId },
        });

        return res.status(200).json({
          success: true,
          data: { id: documentId },
        });
      }

      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    } catch (error) {
      console.error("PROJECT DOCUMENT ITEM ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to process document request" });
    }
  }
);
