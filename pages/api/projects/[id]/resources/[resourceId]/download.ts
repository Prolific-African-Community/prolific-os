import { issueSignedToken, presignUrl } from "@vercel/blob";
import type { NextApiResponse } from "next";
import {
  AuthenticatedNextApiRequest,
  withAuth,
} from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

const SIGNED_URL_TTL_MS = 5 * 60 * 1000;

const getParam = (value: string | string[] | undefined) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const isVercelBlobUrl = (value: string) => {
  try {
    return new URL(value).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
};

const getBlobPathname = (value: string) => {
  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return value;
  }
};

async function getOwnedProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      createdById: userId,
    },
    select: { id: true },
  });
}

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    const projectId = getParam(req.query.id);
    const resourceId = getParam(req.query.resourceId);

    if (req.method !== "GET") {
      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    }

    if (!projectId) {
      return res
        .status(400)
        .json({ success: false, message: "Project id is required" });
    }

    if (!resourceId) {
      return res
        .status(400)
        .json({ success: false, message: "Resource id is required" });
    }

    try {
      const project = await getOwnedProject(projectId, req.user.id);

      if (!project) {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      const resource = await prisma.resource.findFirst({
        where: {
          id: resourceId,
          projectId,
        },
        select: {
          storageUrl: true,
        },
      });

      if (!resource) {
        return res
          .status(404)
          .json({ success: false, message: "Resource not found" });
      }

      if (!resource.storageUrl) {
        return res
          .status(400)
          .json({ success: false, message: "Resource has no uploaded file" });
      }

      if (!isVercelBlobUrl(resource.storageUrl)) {
        res.redirect(302, resource.storageUrl);
        return;
      }

      const token = process.env.BLOB_READ_WRITE_TOKEN;

      if (!token) {
        return res.status(500).json({
          success: false,
          message: "Blob storage is not configured",
        });
      }

      const validUntil = Date.now() + SIGNED_URL_TTL_MS;
      const pathname = getBlobPathname(resource.storageUrl);
      const signedToken = await issueSignedToken({
        token,
        pathname,
        operations: ["get"],
        validUntil,
      });
      const { presignedUrl } = await presignUrl(signedToken, {
        access: "private",
        operation: "get",
        pathname,
        validUntil,
      });

      res.redirect(302, presignedUrl);
      return;
    } catch (error) {
      console.error("PROJECT RESOURCE DOWNLOAD ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to open resource file",
      });
    }
  }
);
