import type { Template } from "@prisma/client";
import type { NextApiResponse } from "next";
import { AuthenticatedNextApiRequest, withAuth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

const serializeTemplate = (template: Template) => ({
  id: template.id,
  name: template.name,
  type: template.type,
  description: template.description,
  structure: template.structure,
  generationRules: template.generationRules,
  createdAt: template.createdAt.toISOString(),
  updatedAt: template.updatedAt.toISOString(),
});

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    }

    try {
      const templates = await prisma.template.findMany({
        orderBy: { name: "asc" },
      });

      return res.status(200).json({
        success: true,
        data: templates.map(serializeTemplate),
      });
    } catch (error) {
      console.error("GET /api/templates ERROR:", error);
      return res
        .status(500)
        .json({ success: false, message: "Unable to load templates" });
    }
  }
);
