import { GenerationRunStatus } from "@prisma/client";
import type {
  Document,
  GenerationRun,
  Project,
  ProjectKnowledge,
  Resource,
  Template,
} from "@prisma/client";
import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../../../lib/auth";
import { prisma } from "../../../../../../../lib/prisma";

type DocumentWithTemplate = Document & { template?: Template | null };

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

const shortList = (items: string[]) =>
  items.length ? items.map((item) => `- ${item}`).join("\n") : "- None";

const clamp = (value: string, limit = 600) =>
  value.length > limit ? `${value.slice(0, limit)}...` : value;

function buildInputSummary({
  project,
  document,
  knowledgeItems,
  resources,
}: {
  project: Project;
  document: DocumentWithTemplate;
  knowledgeItems: ProjectKnowledge[];
  resources: Resource[];
}) {
  const knowledgeSummary = knowledgeItems.slice(0, 8).map((item) => {
    const category = item.category ? ` (${item.category})` : "";
    return `${item.title}${category}`;
  });
  const resourceSummary = resources.slice(0, 8).map((item) => {
    const extractedText = item.extractedText
      ? `\n  Extracted text: ${clamp(item.extractedText)}`
      : "";

    return `${item.filename} (${item.mimeType})${extractedText}`;
  });

  return [
    "Generation Context Preview",
    "",
    "Project",
    `Name: ${project.name}`,
    `Description: ${project.description || "None"}`,
    "",
    "Document",
    `Title: ${document.title}`,
    `Type: ${document.type}`,
    `Objective: ${document.objective}`,
    `Instructions: ${document.instructions || "None"}`,
    "",
    "Template",
    document.template
      ? `Name: ${document.template.name}\nType: ${document.template.type}`
      : "No template selected",
    "",
    "Knowledge",
    `Count: ${knowledgeItems.length}`,
    shortList(knowledgeSummary),
    "",
    "Resources",
    `Count: ${resources.length}`,
    shortList(resourceSummary),
  ].join("\n");
}

async function getOwnedDocument(projectId: string, documentId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      createdById: userId,
    },
  });

  if (!project) return null;

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      projectId,
    },
    include: { template: true },
  });

  if (!document) return null;

  return { project, document };
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
      const owned = await getOwnedDocument(projectId, documentId, req.user.id);

      if (!owned) {
        return res
          .status(404)
          .json({ success: false, message: "Document not found" });
      }

      if (req.method === "GET") {
        const runs = await prisma.generationRun.findMany({
          where: { documentId },
          orderBy: { createdAt: "desc" },
        });

        return res.status(200).json({
          success: true,
          data: runs.map(serializeRun),
        });
      }

      if (req.method === "POST") {
        const [knowledgeItems, resources] = await Promise.all([
          prisma.projectKnowledge.findMany({
            where: { projectId },
            orderBy: { updatedAt: "desc" },
          }),
          prisma.resource.findMany({
            where: { projectId },
            orderBy: { updatedAt: "desc" },
          }),
        ]);
        const inputSummary = buildInputSummary({
          project: owned.project,
          document: owned.document,
          knowledgeItems,
          resources,
        });
        const run = await prisma.generationRun.create({
          data: {
            documentId,
            provider: "manual-preview",
            model: "none",
            status: GenerationRunStatus.PENDING,
            inputSummary,
            output: null,
            error: null,
          },
        });

        return res.status(201).json({
          success: true,
          data: serializeRun(run),
        });
      }

      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    } catch (error) {
      console.error("GENERATION RUNS COLLECTION ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to process generation run request" });
    }
  }
);
