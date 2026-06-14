import type { NextFunction, Request, Response } from "express";
import type { Role } from "@darzi/shared";
import { prisma } from "../prisma.js";
import { AppError } from "./error.js";
import { verifyAccessToken } from "../utils/tokens.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
      };
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return next(new AppError(401, "Authentication required"));
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true } });
    if (!user) {
      return next(new AppError(401, "Invalid session"));
    }
    req.user = { id: user.id, role: user.role as Role };
    return next();
  } catch {
    return next(new AppError(401, "Invalid or expired token"));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "Authentication required"));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "You do not have access to this resource"));
    }
    return next();
  };
}
