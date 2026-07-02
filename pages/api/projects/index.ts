import { ProjectStatus } from "@prisma/client";
import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

interface ProjectBody {
  name?: unknown;
  description?: unknown;
}

const serializeProject = (project: {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  ...project,
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
});

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
      try {
        const projects = await prisma.project.findMany({
          where: { createdById: req.user.id },
          orderBy: { updatedAt: "desc" },
        });

        return res.status(200).json({
          success: true,
          data: projects.map(serializeProject),
        });
      } catch (error) {
        console.error("GET /api/projects ERROR:", error);
        return res
          .status(500)
          .json({ success: false, message: "Unable to load projects" });
      }
    }

    if (req.method === "POST") {
      try {
        const body = (req.body ?? {}) as ProjectBody;
        const name = normalizeText(body.name);
        const description = normalizeText(body.description);

        if (!name) {
          return res
            .status(400)
            .json({ success: false, message: "Project name is required" });
        }

        const project = await prisma.project.create({
          data: {
            name,
            description: description || null,
            status: ProjectStatus.ACTIVE,
            createdById: req.user.id,
          },
        });

        return res.status(201).json({
          success: true,
          data: serializeProject(project),
        });
      } catch (error) {
        console.error("POST /api/projects ERROR:", error);
        return res
          .status(500)
          .json({ success: false, message: "Unable to create project" });
      }
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  }
);
