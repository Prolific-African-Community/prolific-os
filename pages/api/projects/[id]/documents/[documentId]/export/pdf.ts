import type { NextApiResponse } from "next";
import { markdownToPdfBuffer } from "../../../../../../../lib/export/pdf";
import {
  buildRenderMetadata,
  collectKeyFigures,
  loadLogoFromResources,
  loadPlacementVisuals,
  parseExportQuery,
} from "../../../../../../../lib/export/export-context";
import { listApprovedPlacementsForExport } from "../../../../../../../lib/documents/visual-placement-service";
import {
  guessLanguage,
  resolveRenderPreset,
} from "../../../../../../../lib/export/rendering-presets";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../../../lib/auth";
import { prisma } from "../../../../../../../lib/prisma";

const getParam = (value: string | string[] | undefined) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const slugify = (value: string) => {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "document-export";
};

const today = () => new Date().toISOString().slice(0, 10);

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
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

    try {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          createdById: req.user.id,
        },
        select: {
          id: true,
          name: true,
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
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          content: true,
          assembledAt: true,
          documentPlan: true,
        },
      });

      if (!document) {
        return res
          .status(404)
          .json({ success: false, message: "Document not found" });
      }

      if (!document.content?.trim()) {
        return res
          .status(400)
          .json({ success: false, message: "Document has no content to export" });
      }

      const options = parseExportQuery(req.query);
      const preset = resolveRenderPreset(options.presetId, options.orientation);
      const language = guessLanguage(document.content);
      const imageResources = await prisma.resource.findMany({
        where: { projectId, mimeType: { startsWith: "image/" } },
        select: { id: true, filename: true, mimeType: true, storageUrl: true },
      });
      const logo = await loadLogoFromResources(imageResources);
      const approvedPlacements = await listApprovedPlacementsForExport(
        documentId
      );
      const visuals = await loadPlacementVisuals(approvedPlacements);
      const metadata = buildRenderMetadata({
        documentTitle: document.title,
        projectName: project.name,
        documentType: document.type,
        status: document.status,
        date: document.assembledAt ?? new Date(),
        options,
        keyFigures: collectKeyFigures(document.documentPlan, preset.keyFigures.max),
        logo,
        visuals,
        language,
      });

      const filename = `${slugify(project.name)}_${slugify(
        document.title
      )}_${today()}.pdf`;
      const buffer = await markdownToPdfBuffer(document.content, {
        presetId: options.presetId ?? undefined,
        orientation: options.orientation ?? undefined,
        metadata,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.status(200).send(buffer);
    } catch (error) {
      console.error("PDF EXPORT ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to export PDF" });
    }
  }
);
