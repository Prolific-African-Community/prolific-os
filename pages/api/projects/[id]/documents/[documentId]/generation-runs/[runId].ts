import type { GenerationRun } from "@prisma/client";
import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../../../lib/auth";
import { prisma } from "../../../../../../../lib/prisma";

const getParam = (value: string | string[] | undefined) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const serializeRun = (run: GenerationRun) => ({
  id: run.id,
  documentId: run.documentId,
  provider: run.provider,
  model: run.model,
  status: run.status,
  inputSummary: run.inputSummary,
  output: run.output,
  error: run.error,
  createdAt: run.createdAt.toISOString(),
  updatedAt: run.updatedAt.toISOString(),
});

async function getOwnedDocument(projectId: string, documentId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      createdById: userId,
    },
    select: { id: true },
  });

  if (!project) return null;

  return prisma.document.findFirst({
    where: {
      id: documentId,
      projectId,
    },
    select: { id: true },
  });
}

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    const projectId = getParam(req.query.id);
    const documentId = getParam(req.query.documentId);
    const runId = getParam(req.query.runId);

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

    if (!runId) {
      return res
        .status(400)
        .json({ success: false, message: "Generation run id is required" });
    }

    if (req.method !== "GET") {
      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    }

    try {
      const document = await getOwnedDocument(projectId, documentId, req.user.id);

      if (!document) {
        return res
          .status(404)
          .json({ success: false, message: "Document not found" });
      }

      const run = await prisma.generationRun.findFirst({
        where: {
          id: runId,
          documentId,
        },
      });

      if (!run) {
        return res
          .status(404)
          .json({ success: false, message: "Generation run not found" });
      }

      return res.status(200).json({
        success: true,
        data: serializeRun(run),
      });
    } catch (error) {
      console.error("GENERATION RUN ITEM ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to load generation run" });
    }
  }
);
