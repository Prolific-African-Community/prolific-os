import type { NextApiRequest, NextApiResponse } from "next";
import { comparePassword, signAuthToken } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

interface LoginBody {
  email?: string;
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
    const { email, password } = req.body as LoginBody;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
      },
    });

    if (!user || !(await comparePassword(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signAuthToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return res.status(200).json({
      token,
      role: user.role,
      mustChangePassword: false,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
