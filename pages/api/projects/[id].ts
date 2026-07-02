import { ProjectStatus } from "@prisma/client";
import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

interface ProjectUpdateBody {
  name?: unknown;
  description?: unknown;
  status?: unknown;
}

const serializeProject = (project: {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    documents: number;
    knowledgeItems: number;
    resources: number;
  };
}) => ({
  id: project.id,
  name: project.name,
  description: project.description,
  status: project.status,
  createdById: project.createdById,
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
  counts: project._count
    ? {
        documents: project._count.documents,
        knowledgeItems: project._count.knowledgeItems,
        resources: project._count.resources,
      }
    : undefined,
});

const getProjectId = (value: string | string[] | undefined) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const parseStatus = (value: unknown) => {
  if (typeof value !== "string") return null;
  return Object.values(ProjectStatus).includes(value as ProjectStatus)
    ? (value as ProjectStatus)
    : null;
};

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    const projectId = getProjectId(req.query.id);

    if (!projectId) {
      return res
        .status(400)
        .json({ success: false, message: "Project id is required" });
    }

    if (req.method === "GET") {
      try {
        const project = await prisma.project.findFirst({
          where: {
            id: projectId,
            createdById: req.user.id,
          },
          include: {
            _count: {
              select: {
                documents: true,
                knowledgeItems: true,
                resources: true,
              },
            },
          },
        });

        if (!project) {
          return res
            .status(404)
            .json({ success: false, message: "Project not found" });
        }

        return res.status(200).json({
          success: true,
          data: serializeProject(project),
        });
      } catch (error) {
        console.error("GET /api/projects/[id] ERROR:", error);
        return res
          .status(500)
          .json({ success: false, message: "Unable to load project" });
      }
    }

    if (req.method === "PATCH") {
      try {
        const existingProject = await prisma.project.findFirst({
          where: {
            id: projectId,
            createdById: req.user.id,
          },
          select: { id: true },
        });

        if (!existingProject) {
          return res
            .status(404)
            .json({ success: false, message: "Project not found" });
        }

        const body = (req.body ?? {}) as ProjectUpdateBody;
        const updates: {
          name?: string;
          description?: string | null;
          status?: ProjectStatus;
        } = {};

        if (body.name !== undefined) {
          const name = normalizeText(body.name);

          if (!name) {
            return res
              .status(400)
              .json({ success: false, message: "Project name is required" });
          }

          updates.name = name;
        }

        if (body.description !== undefined) {
          const description = normalizeText(body.description);
          updates.description = description || null;
        }

        if (body.status !== undefined) {
          const status = parseStatus(body.status);

          if (!status) {
            return res
              .status(400)
              .json({ success: false, message: "Invalid project status" });
          }

          updates.status = status;
        }

        if (!Object.keys(updates).length) {
          return res
            .status(400)
            .json({ success: false, message: "No project updates provided" });
        }

        const project = await prisma.project.update({
          where: { id: projectId },
          data: updates,
        });

        return res.status(200).json({
          success: true,
          data: serializeProject(project),
        });
      } catch (error) {
        console.error("PATCH /api/projects/[id] ERROR:", error);
        return res
          .status(500)
          .json({ success: false, message: "Unable to update project" });
      }
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  }
);
