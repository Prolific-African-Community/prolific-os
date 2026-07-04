import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../../../../lib/auth";
import {
  getOwnedContext,
  rewriteSectionById,
} from "../../../../../../../../lib/documents/section-service";
import {
  REWRITE_MODES,
  RewriteMode,
} from "../../../../../../../../lib/ai/section-rewrite";

const getParam = (value: string | string[] | undefined) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    }

    const projectId = getParam(req.query.id);
    const documentId = getParam(req.query.documentId);
    const sectionId = getParam(req.query.sectionId);
    if (!projectId || !documentId || !sectionId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required identifiers" });
    }

    const body = (req.body ?? {}) as { instruction?: unknown; mode?: unknown };
    const instruction =
      typeof body.instruction === "string" ? body.instruction.trim() : "";
    const mode: RewriteMode = REWRITE_MODES.includes(body.mode as RewriteMode)
      ? (body.mode as RewriteMode)
      : "rewrite";

    if (!instruction) {
      return res
        .status(400)
        .json({ success: false, message: "Add an instruction before rewriting." });
    }

    try {
      const owned = await getOwnedContext(req.user.id, projectId, documentId);
      if (!owned.ok) {
        return res
          .status(owned.code)
          .json({ success: false, message: owned.message });
      }

      const result = await rewriteSectionById(
        owned.project,
        owned.document,
        sectionId,
        instruction,
        mode
      );
      if ("error" in result) {
        return res
          .status(result.code || 400)
          .json({ success: false, message: result.error });
      }

      return res.status(200).json({
        success: true,
        message: "Section rewritten. Re-assemble to update the final document.",
        data: result.section,
      });
    } catch (error) {
      console.error("REWRITE SECTION ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to rewrite section" });
    }
  }
);
