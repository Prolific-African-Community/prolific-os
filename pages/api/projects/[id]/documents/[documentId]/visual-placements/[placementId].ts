import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../../../lib/auth";
import { getOwnedContext } from "../../../../../../../lib/documents/section-service";
import { updatePlacement } from "../../../../../../../lib/documents/visual-placement-service";

const getParam = (value: string | string[] | undefined) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "PATCH") {
      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    }

    const projectId = getParam(req.query.id);
    const documentId = getParam(req.query.documentId);
    const placementId = getParam(req.query.placementId);
    if (!projectId || !documentId || !placementId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required identifiers" });
    }

    try {
      const owned = await getOwnedContext(req.user.id, projectId, documentId);
      if (!owned.ok) {
        return res
          .status(owned.code)
          .json({ success: false, message: owned.message });
      }

      const body = (req.body ?? {}) as Record<string, unknown>;
      const result = await updatePlacement(documentId, placementId, {
        sectionId:
          body.sectionId === undefined
            ? undefined
            : typeof body.sectionId === "string" && body.sectionId
            ? body.sectionId
            : null,
        target: typeof body.target === "string" ? body.target : undefined,
        position: typeof body.position === "string" ? body.position : undefined,
        size: typeof body.size === "string" ? body.size : undefined,
        caption:
          body.caption === undefined
            ? undefined
            : typeof body.caption === "string"
            ? body.caption
            : null,
        isApproved:
          typeof body.isApproved === "boolean" ? body.isApproved : undefined,
        isEnabled:
          typeof body.isEnabled === "boolean" ? body.isEnabled : undefined,
      });

      if ("error" in result) {
        return res
          .status(result.code || 400)
          .json({ success: false, message: result.error });
      }
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error("UPDATE VISUAL PLACEMENT ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to update visual placement" });
    }
  }
);
