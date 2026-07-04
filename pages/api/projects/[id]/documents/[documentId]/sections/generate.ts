import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../../../lib/auth";
import {
  generateSectionsFromPlan,
  getOwnedContext,
} from "../../../../../../../lib/documents/section-service";

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
    if (!projectId || !documentId) {
      return res
        .status(400)
        .json({ success: false, message: "Project and document id are required" });
    }

    const body = (req.body ?? {}) as { mode?: unknown };
    const mode = body.mode === "all" ? "all" : "missing";

    try {
      const owned = await getOwnedContext(req.user.id, projectId, documentId);
      if (!owned.ok) {
        return res
          .status(owned.code)
          .json({ success: false, message: owned.message });
      }

      const result = await generateSectionsFromPlan(
        owned.project,
        owned.document,
        mode
      );
      if ("error" in result) {
        return res.status(400).json({ success: false, message: result.error });
      }

      const parts = [`${result.generated} generated`];
      if (result.failed) parts.push(`${result.failed} failed`);
      if (result.skippedLocked)
        parts.push(`${result.skippedLocked} locked skipped`);
      if (result.skippedExisting)
        parts.push(`${result.skippedExisting} already written`);

      return res.status(200).json({
        success: true,
        message: parts.join(" · "),
        data: {
          sections: result.sections,
          generated: result.generated,
          failed: result.failed,
          skippedLocked: result.skippedLocked,
          skippedExisting: result.skippedExisting,
        },
      });
    } catch (error) {
      console.error("GENERATE SECTIONS ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to generate sections" });
    }
  }
);
