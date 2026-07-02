import type { ProjectKnowledge } from "@prisma/client";
import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

interface KnowledgeBody {
  title?: unknown;
  content?: unknown;
  category?: unknown;
}

const getProjectId = (value: string | string[] | undefined) =>
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
        const knowledgeItems = await prisma.projectKnowledge.findMany({
          where: { projectId },
          orderBy: { updatedAt: "desc" },
        });

        return res.status(200).json({
          success: true,
          data: knowledgeItems.map(serializeKnowledge),
        });
      }

      if (req.method === "POST") {
        const body = (req.body ?? {}) as KnowledgeBody;
        const title = normalizeText(body.title);
        const content = normalizeText(body.content);
        const category = normalizeText(body.category);

        if (!title) {
          return res
            .status(400)
            .json({ success: false, message: "Knowledge title is required" });
        }

        if (!content) {
          return res
            .status(400)
            .json({ success: false, message: "Knowledge content is required" });
        }

        const knowledgeItem = await prisma.projectKnowledge.create({
          data: {
            projectId,
            title,
            content,
            category: category || null,
          },
        });

        return res.status(201).json({
          success: true,
          data: serializeKnowledge(knowledgeItem),
        });
      }

      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    } catch (error) {
      console.error("PROJECT KNOWLEDGE COLLECTION ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to process knowledge request" });
    }
  }
);
