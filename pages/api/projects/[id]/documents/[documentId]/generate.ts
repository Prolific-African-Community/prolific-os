import { DocumentStatus, GenerationRunStatus } from "@prisma/client";
import type { NextApiResponse } from "next";
import {
  buildDocumentGenerationPrompt,
  buildDocumentSystemInstructions,
  buildGenerationInputSummary,
} from "../../../../../../lib/ai/document-generation";
import { generateTextWithOpenAI, getOpenAIModel } from "../../../../../../lib/ai/openai";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

const getParam = (value: string | string[] | undefined) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const serializeDocument = (document: {
  id: string;
  projectId: string;
  templateId: string | null;
  title: string;
  type: string;
  objective: string;
  instructions: string | null;
  status: DocumentStatus;
  outline: string | null;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  ...document,
  createdAt: document.createdAt.toISOString(),
  updatedAt: document.updatedAt.toISOString(),
});

const serializeRun = (run: {
  id: string;
  documentId: string;
  provider: string;
  model: string;
  status: GenerationRunStatus;
  inputSummary: string | null;
  output: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  ...run,
  createdAt: run.createdAt.toISOString(),
  updatedAt: run.updatedAt.toISOString(),
});

const cleanErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Document generation failed";

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    }

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

    let runId: string | null = null;

    try {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          createdById: req.user.id,
        },
      });

      if (!project) {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          projectId,
        },
        include: { template: true },
      });

      if (!document) {
        return res
          .status(404)
          .json({ success: false, message: "Document not found" });
      }

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
      const context = {
        project,
        document,
        knowledgeItems,
        resources,
      };
      const inputSummary = buildGenerationInputSummary(context);
      const run = await prisma.generationRun.create({
        data: {
          documentId,
          provider: "openai",
          model: getOpenAIModel(),
          status: GenerationRunStatus.PENDING,
          inputSummary,
          output: null,
          error: null,
        },
      });
      runId = run.id;

      await prisma.generationRun.update({
        where: { id: run.id },
        data: { status: GenerationRunStatus.RUNNING },
      });

      const prompt = buildDocumentGenerationPrompt(context);
      const generated = await generateTextWithOpenAI(prompt, {
        instructions: buildDocumentSystemInstructions(),
      });
      const [updatedDocument, updatedRun] = await prisma.$transaction([
        prisma.document.update({
          where: { id: documentId },
          data: {
            content: generated.text,
            status: DocumentStatus.READY_FOR_REVIEW,
          },
        }),
        prisma.generationRun.update({
          where: { id: run.id },
          data: {
            model: generated.model,
            status: GenerationRunStatus.SUCCEEDED,
            output: generated.text,
            error: null,
          },
        }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          document: serializeDocument(updatedDocument),
          generationRun: serializeRun(updatedRun),
        },
      });
    } catch (error) {
      const message = cleanErrorMessage(error);

      if (runId) {
        try {
          await prisma.generationRun.update({
            where: { id: runId },
            data: {
              status: GenerationRunStatus.FAILED,
              error: message,
            },
          });
        } catch (updateError) {
          console.error("GENERATION RUN FAILURE UPDATE ERROR:", updateError);
        }
      }

      console.error("DOCUMENT GENERATION ERROR:", error);
      return res.status(500).json({
        success: false,
        message,
      });
    }
  }
);
