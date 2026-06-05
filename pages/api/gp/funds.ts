import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import { verifyAuthToken } from "../../../lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    /* ---------- Extract & validate token ---------- */
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    let userPayload;
    try {
      userPayload = verifyAuthToken(token);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    if (!userPayload?.sub || userPayload.role !== "GP") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    /* ---------- Retrieve user + GP entity ---------- */
    const userDb = await prisma.user.findUnique({
      where: { id: userPayload.sub },
      include: { gp: true },
    });

    if (!userDb?.gp) {
      return res.status(400).json({
        success: false,
        message: "User not linked to GP entity",
      });
    }

    /* ---------- Retrieve funds ---------- */
    const funds = await prisma.fund.findMany({
      where: {
        gpId: userDb.gp.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      data: funds,
    });

  } catch (err) {
    console.error("GET FUNDS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}