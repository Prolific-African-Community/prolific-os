import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import { verifyAuthToken } from "../../../lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    /* ---------- Validate Authorization header ---------- */
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const token = authHeader.split(" ")[1];

    let userPayload;
    try {
      userPayload = verifyAuthToken(token);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (!userPayload?.sub || userPayload.role !== "GP") {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    /* ---------- Retrieve user + GP ---------- */
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

    /* ---------- Validate body ---------- */
    const { name, currency } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Fund name is required",
      });
    }

    const allowedCurrencies = ["EUR", "USD"];
    if (!currency || !allowedCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: "Invalid currency",
      });
    }

    /* ---------- Create fund ---------- */
    const fund = await prisma.fund.create({
      data: {
        name: name.trim(),
        currency,
        gpId: userDb.gp.id,
      },
    });

    return res.status(201).json({
      success: true,
      data: fund,
    });

  } catch (err) {
    console.error("CREATE FUND ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}