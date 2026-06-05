import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OrganizationStatus, PlatformRole, UserRole } from "@prisma/client";

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
      include: {
        gp: true,
        organizationUsers: {
          where: { isActive: true },
          include: {
            organization: {
              select: {
                isActive: true,
                status: true,
              },
            },
          },
        },
        entityUsers: {
          where: { isActive: true },
          include: {
            entity: {
              select: {
                organization: {
                  select: {
                    isActive: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    const isPlatformAdmin =
      user.platformRole === PlatformRole.SUPER_ADMIN || user.role === UserRole.ADMIN;
    const hasTenantMemberships =
      user.organizationUsers.length > 0 || user.entityUsers.length > 0;
    const hasActiveOrganization = user.organizationUsers.some(
      (membership) =>
        membership.organization.isActive &&
        membership.organization.status === OrganizationStatus.ACTIVE
    ) || user.entityUsers.some(
      (membership) =>
        membership.entity.organization.isActive &&
        membership.entity.organization.status === OrganizationStatus.ACTIVE
    );

    if (!isPlatformAdmin && hasTenantMemberships && !hasActiveOrganization) {
      return res.status(403).json({
        success: false,
        message:
          "Your organization is currently inactive. Please contact your administrator.",
      });
    }

    // 🔥 IMPORTANT : gpId réel via relation
    const gpId = user.gp?.id ?? null;

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        gpId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
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
