import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import { produceDocument } from "../../../../../../lib/documents/document-production-service";
import { listSectionDTOs } from "../../../../../../lib/documents/section-service";
import { ProduceMode } from "../../../../../../lib/documents/document-sections";

const getParam = (value: string | string[] | undefined) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const MODES: ProduceMode[] = ["missing", "refresh_unlocked", "plan_only"];

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    }

    const projectId = getParam(req.query.id);
    const documentId = getParam(req.query.documentId);
    if (!projectId || !documentId) {
      return res
        .status(400)
        .json({ success: false, message: "Project and document id are required" });
    }

    const body = (req.body ?? {}) as { mode?: unknown };
    const mode: ProduceMode = MODES.includes(body.mode as ProduceMode)
      ? (body.mode as ProduceMode)
      : "missing";

    try {
      const result = await produceDocument({
        userId: req.user.id,
        projectId,
        documentId,
        mode,
      });

      if ("error" in result) {
        return res
          .status(result.code)
          .json({ success: false, message: result.error });
      }

      // Refresh the document + sections for the client.
      const [document, sections] = await Promise.all([
        prisma.document.findUnique({ where: { id: documentId } }),
        listSectionDTOs(documentId),
      ]);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          result,
          sections,
          content: document?.content ?? null,
          documentStatus: document?.status ?? null,
          documentPlan: document?.documentPlan ?? null,
          documentPlanStatus: document?.documentPlanStatus ?? null,
          documentPlanUpdatedAt: document?.documentPlanUpdatedAt
            ? document.documentPlanUpdatedAt.toISOString()
            : null,
          documentPlanAppliedAt: document?.documentPlanAppliedAt
            ? document.documentPlanAppliedAt.toISOString()
            : null,
          assembledAt: document?.assembledAt
            ? document.assembledAt.toISOString()
            : null,
        },
      });
    } catch (error) {
      console.error("PRODUCE DOCUMENT ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to produce document" });
    }
  }
);
