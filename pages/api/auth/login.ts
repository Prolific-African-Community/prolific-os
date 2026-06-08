import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OrganizationStatus, PlatformRole, UserRole } from "@prisma/client";
import { measureApi, measureStep } from "../../../lib/performance-log";

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

    const user = await measureStep("POST /api/auth/login user lookup", () =>
      prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        platformRole: true,
        mustChangePassword: true,
        gp: {
          select: {
            id: true,
          },
        },
      },
    })
    );

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValid = await measureStep("POST /api/auth/login password compare", () =>
      bcrypt.compare(password, user.password)
    );

    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }
    const jwtSecret = process.env.JWT_SECRET;

    const isPlatformAdmin =
      user.platformRole === PlatformRole.SUPER_ADMIN || user.role === UserRole.ADMIN;
    if (!isPlatformAdmin) {
      const [
        organizationUserCount,
        entityUserCount,
        activeOrganizationUserCount,
        activeEntityUserCount,
      ] =
        await measureApi("POST /api/auth/login organization checks", () =>
          Promise.all([
            measureStep("POST /api/auth/login org membership count", () =>
              prisma.organizationUser.count({
                where: {
                  userId: user.id,
                  isActive: true,
                },
              })
            ),
            measureStep("POST /api/auth/login entity membership count", () =>
              prisma.entityUser.count({
                where: {
                  userId: user.id,
                  isActive: true,
                },
              })
            ),
            measureStep("POST /api/auth/login active org membership count", () =>
              prisma.organizationUser.count({
                where: {
                  userId: user.id,
                  isActive: true,
                  organization: {
                    isActive: true,
                    status: OrganizationStatus.ACTIVE,
                  },
                },
              })
            ),
            measureStep("POST /api/auth/login active entity membership count", () =>
              prisma.entityUser.count({
                where: {
                  userId: user.id,
                  isActive: true,
                  entity: {
                    organization: {
                      isActive: true,
                      status: OrganizationStatus.ACTIVE,
                    },
                  },
                },
              })
            ),
          ])
        );
      const hasTenantMemberships =
        organizationUserCount > 0 || entityUserCount > 0;
      const hasActiveOrganization =
        activeOrganizationUserCount > 0 || activeEntityUserCount > 0;

      if (hasTenantMemberships && !hasActiveOrganization) {
        return res.status(403).json({
          success: false,
          message:
            "Your organization is currently inactive. Please contact your administrator.",
        });
      }
    }

    // 🔥 IMPORTANT : gpId réel via relation
    const gpId = user.gp?.id ?? null;

    const token = await measureStep("POST /api/auth/login token sign", () =>
      Promise.resolve(
        jwt.sign(
          {
            sub: user.id,
            role: user.role,
            gpId,
          },
          jwtSecret,
          { expiresIn: "1d" }
        )
      )
    );

    // ✅ Réponse simple et cohérente pour le front
    return res.status(200).json({
      token,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      gpId,
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
