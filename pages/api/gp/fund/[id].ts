import { NextApiRequest, NextApiResponse } from "next";
import {
  getCurrentUserRecord,
  isSuperAdminUser,
  userCanAccessEntity,
} from "../../../../lib/entity-access";
import { prisma } from "../../../../lib/prisma";
import { verifyAuthToken } from "../../../../lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false });
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyAuthToken(token);

    if (!user?.sub) {
      return res.status(403).json({ success: false });
    }

    const fundId = req.query.id as string;
    const currentUser = await getCurrentUserRecord(user.sub);

    if (!currentUser) {
      return res.status(404).json({ success: false });
    }

    if (user.role === "GP") {
      if (!currentUser.gp) {
        return res.status(400).json({ success: false });
      }

      const gpFund = await prisma.fund.findFirst({
        where: {
          id: fundId,
          gpId: currentUser.gp.id,
        },
        include: {
          projects: true,
        },
      });

      if (!gpFund) {
        return res.status(404).json({ success: false });
      }

      return res.status(200).json({
        success: true,
        data: gpFund,
      });
    }

    const fund = await prisma.fund.findUnique({
      where: {
        id: fundId,
      },
      include: {
        projects: true,
      },
    });

    if (!fund) {
      return res.status(404).json({ success: false });
    }

    if (!isSuperAdminUser(currentUser)) {
      if (!fund.entityId) {
        return res.status(403).json({ success: false });
      }

      const hasAccess = await userCanAccessEntity(currentUser, fund.entityId);

      if (!hasAccess) {
        return res.status(403).json({ success: false });
      }
    }

    return res.status(200).json({
      success: true,
      data: fund,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
}
