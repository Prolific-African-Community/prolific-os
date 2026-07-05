import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../../../lib/auth";
import { getOwnedContext } from "../../../../../../../lib/documents/section-service";
import { suggestPlacementsForDocument } from "../../../../../../../lib/documents/visual-placement-service";

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

    try {
      const owned = await getOwnedContext(req.user.id, projectId, documentId);
      if (!owned.ok) {
        return res
          .status(owned.code)
          .json({ success: false, message: owned.message });
      }
      const result = await suggestPlacementsForDocument(projectId, documentId);
      return res.status(200).json({
        success: true,
        message: result.created
          ? `${result.created} placement suggestion(s) added.`
          : "No new image resources to place.",
        data: result.placements,
      });
    } catch (error) {
      console.error("SUGGEST VISUAL PLACEMENTS ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to suggest visual placements" });
    }
  }
);
