import type { NextApiRequest, NextApiResponse } from "next";
import { hashPassword, verifyAuthToken } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

interface ChangePasswordBody {
  password?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = verifyAuthToken(token);
    const { password } = req.body as ChangePasswordBody;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    await prisma.user.update({
      where: { id: user.sub },
      data: {
        passwordHash: await hashPassword(password),
      },
    });

    return res.status(200).json({ message: "Password updated" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
