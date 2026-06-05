import type { NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import crypto from "crypto";
import { hashPassword, withAuth, AuthenticatedNextApiRequest } from "../../../lib/auth";
import { UserRole } from "@prisma/client";

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    try {
      const { name, rcsNumber, address, email } = req.body;

      if (!name || !rcsNumber || !address || !email) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Generate temporary password
      const tempPassword = crypto.randomBytes(8).toString("hex");
      const hashedPassword = await hashPassword(tempPassword);

      // Create GP entity
      const gp = await prisma.gp.create({
        data: {
          name,
          rcsNumber,
          address,
        },
      });

      // Create GP user
      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: UserRole.GP,
          gpId: gp.id,
          mustChangePassword: true,
        },
      });

      return res.status(201).json({
        message: "GP created successfully",
        temporaryPassword: tempPassword, // plus tard remplacé par email
      });
    } catch (error) {
      console.error("CREATE GP ERROR:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  [UserRole.ADMIN] // 🔒 Seul ADMIN autorisé
);
