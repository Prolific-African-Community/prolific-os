import type { NextApiResponse } from "next";
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

  return slug || "document";
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
          content: true,
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

      const filename = `${slugify(project.name)}_${slugify(
        document.title
      )}_${today()}.md`;

      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.status(200).send(document.content);
    } catch (error) {
      console.error("MARKDOWN EXPORT ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to export Markdown" });
    }
  }
);
