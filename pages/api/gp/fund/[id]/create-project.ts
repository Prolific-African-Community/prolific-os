import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../../../lib/prisma";
import { verifyAuthToken } from "../../../../../lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const user = verifyAuthToken(token);
    if (user.role !== "GP")
      return res.status(403).json({ message: "Forbidden" });

    const { id } = req.query;
    const { name, address, budget } = req.body;

    const userDb = await prisma.user.findUnique({
      where: { id: user.sub },
      include: { gp: true },
    });

    if (!userDb?.gp) {
      return res.status(400).json({ message: "User not linked to GP entity" });
    }

    const fund = await prisma.fund.findFirst({
      where: {
        id: String(id),
        gpId: userDb.gp.id,
      },
    });

    if (!fund) {
      return res.status(404).json({ message: "Fund not found" });
    }

    const project = await prisma.project.create({
      data: {
        name,
        address,
        budget: budget ? Number(budget) : undefined,
        fundId: fund.id,
        entityId: fund.entityId || undefined,
        organizationId: fund.organizationId || undefined,
      },
    });

    return res.status(200).json(project);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
