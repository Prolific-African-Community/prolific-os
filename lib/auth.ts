import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { prisma } from "./prisma";

const JWT_EXPIRES_IN = "1d";

export interface AuthTokenPayload {
  sub: string;
  email?: string;
  role: UserRole;
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: UserRole;
}

export interface AuthenticatedNextApiRequest extends NextApiRequest {
  user: AuthenticatedUser;
}

export type AuthenticatedNextApiHandler = (
  req: AuthenticatedNextApiRequest,
  res: NextApiResponse
) => Promise<void> | void;

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const signAuthToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
};

export const verifyAuthToken = (token: string): AuthTokenPayload => {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
};

const DEFAULT_AUTH_ROLES = Object.values(UserRole) as UserRole[];

const getBearerToken = (req: NextApiRequest): string | null => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7);
};

export const withAuth = (
  handler: AuthenticatedNextApiHandler,
  allowedRoles: UserRole[] = DEFAULT_AUTH_ROLES
): NextApiHandler => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const payload = verifyAuthToken(token);

      if (!allowedRoles.includes(payload.role)) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true },
      });

      if (!user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const authenticatedReq = req as AuthenticatedNextApiRequest;
      authenticatedReq.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      return handler(authenticatedReq, res);
    } catch {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
  };
};
