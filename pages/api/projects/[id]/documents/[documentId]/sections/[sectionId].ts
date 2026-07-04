import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../../../lib/auth";
import { prisma } from "../../../../../../../lib/prisma";
import { getOwnedContext } from "../../../../../../../lib/documents/section-service";
import {
  REVIEW_STATUSES,
  ReviewStatus,
  SectionStatus,
  serializeSection,
} from "../../../../../../../lib/documents/document-sections";

const getParam = (value: string | string[] | undefined) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const VALID_STATUSES: SectionStatus[] = [
  "PLANNED",
  "GENERATING",
  "GENERATED",
  "EDITED",
  "FAILED",
  "LOCKED",
];

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "PATCH") {
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

    try {
      const owned = await getOwnedContext(req.user.id, projectId, documentId);
      if (!owned.ok) {
        return res
          .status(owned.code)
          .json({ success: false, message: owned.message });
      }

      const section = await prisma.documentSection.findFirst({
        where: { id: sectionId, documentId },
      });
      if (!section) {
        return res
          .status(404)
          .json({ success: false, message: "Section not found" });
      }

      const body = (req.body ?? {}) as {
        content?: unknown;
        status?: unknown;
        reviewStatus?: unknown;
        isLocked?: unknown;
      };
      const data: {
        content?: string;
        status?: string;
        editedAt?: Date;
        reviewStatus?: string;
        reviewedAt?: Date;
        approvedAt?: Date;
        isLocked?: boolean;
        lockedAt?: Date;
      } = {};

      const now = new Date();

      // Content / manual edits are blocked on locked sections.
      if (body.content !== undefined) {
        if (typeof body.content !== "string") {
          return res
            .status(400)
            .json({ success: false, message: "Content must be a string" });
        }
        if (section.isLocked && body.isLocked !== false) {
          return res.status(409).json({
            success: false,
            message: "Section is locked. Unlock it before editing.",
          });
        }
        data.content = body.content;
        data.status = "EDITED";
        data.reviewStatus = "NEEDS_CHANGES";
        data.editedAt = now;
      }

      if (body.reviewStatus !== undefined) {
        if (
          typeof body.reviewStatus !== "string" ||
          !REVIEW_STATUSES.includes(body.reviewStatus as ReviewStatus)
        ) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid review status" });
        }
        data.reviewStatus = body.reviewStatus;
        if (body.reviewStatus === "REVIEWED") data.reviewedAt = now;
        if (body.reviewStatus === "APPROVED") data.approvedAt = now;
      }

      if (typeof body.isLocked === "boolean") {
        data.isLocked = body.isLocked;
        if (body.isLocked) data.lockedAt = now;
      }

      if (
        typeof body.status === "string" &&
        VALID_STATUSES.includes(body.status as SectionStatus)
      ) {
        data.status = body.status;
      }

      if (!Object.keys(data).length) {
        return res
          .status(400)
          .json({ success: false, message: "No section updates provided" });
      }

      const updated = await prisma.documentSection.update({
        where: { id: sectionId },
        data,
      });

      return res
        .status(200)
        .json({ success: true, data: serializeSection(updated) });
    } catch (error) {
      console.error("UPDATE SECTION ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to update section" });
    }
  }
);
