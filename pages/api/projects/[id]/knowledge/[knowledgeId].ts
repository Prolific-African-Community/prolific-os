import type { ProjectKnowledge } from "@prisma/client";
import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

interface KnowledgeUpdateBody {
  title?: unknown;
  content?: unknown;
  category?: unknown;
}

const getParam = (value: string | string[] | undefined) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const serializeKnowledge = (item: ProjectKnowledge) => ({
  id: item.id,
  projectId: item.projectId,
  title: item.title,
  content: item.content,
  category: item.category,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
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
    const knowledgeId = getParam(req.query.knowledgeId);

    if (!projectId) {
      return res
        .status(400)
        .json({ success: false, message: "Project id is required" });
    }

    if (!knowledgeId) {
      return res
        .status(400)
        .json({ success: false, message: "Knowledge id is required" });
    }

    try {
      const project = await getOwnedProject(projectId, req.user.id);

      if (!project) {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      const existingItem = await prisma.projectKnowledge.findFirst({
        where: {
          id: knowledgeId,
          projectId,
        },
      });

      if (!existingItem) {
        return res
          .status(404)
          .json({ success: false, message: "Knowledge item not found" });
      }

      if (req.method === "GET") {
        return res.status(200).json({
          success: true,
          data: serializeKnowledge(existingItem),
        });
      }

      if (req.method === "PATCH") {
        const body = (req.body ?? {}) as KnowledgeUpdateBody;
        const updates: {
          title?: string;
          content?: string;
          category?: string | null;
        } = {};

        if (body.title !== undefined) {
          const title = normalizeText(body.title);

          if (!title) {
            return res
              .status(400)
              .json({ success: false, message: "Knowledge title is required" });
          }

          updates.title = title;
        }

        if (body.content !== undefined) {
          const content = normalizeText(body.content);

          if (!content) {
            return res
              .status(400)
              .json({ success: false, message: "Knowledge content is required" });
          }

          updates.content = content;
        }

        if (body.category !== undefined) {
          const category = normalizeText(body.category);
          updates.category = category || null;
        }

        if (!Object.keys(updates).length) {
          return res
            .status(400)
            .json({ success: false, message: "No knowledge updates provided" });
        }

        const knowledgeItem = await prisma.projectKnowledge.update({
          where: { id: knowledgeId },
          data: updates,
        });

        return res.status(200).json({
          success: true,
          data: serializeKnowledge(knowledgeItem),
        });
      }

      if (req.method === "DELETE") {
        await prisma.projectKnowledge.delete({
          where: { id: knowledgeId },
        });

        return res.status(200).json({
          success: true,
          data: { id: knowledgeId },
        });
      }

      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    } catch (error) {
      console.error("PROJECT KNOWLEDGE ITEM ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to process knowledge request" });
    }
  }
);
