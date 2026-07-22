import type { NextFunction, Request, Response } from "express";
import type { Role } from "@darzi/shared";
import { UserModel } from "../models.js";
import { AppError } from "./error.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { getPlatformStatus } from "../services/platform-status.service.js";

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
    const user = await UserModel.findById(payload.sub).select("role accountStatus suspendedUntil moderationReason activeSessionId").lean();
    if (!user) {
      return next(new AppError(401, "Invalid session"));
    }
    if (!payload.sid || !user.activeSessionId || payload.sid !== user.activeSessionId) {
      return next(new AppError(401, "Your account has been signed in on another device."));
    }
    if (user.accountStatus === "BANNED") {
      return next(new AppError(403, user.moderationReason ? `Account banned: ${user.moderationReason}` : "Account banned"));
    }
    if (user.accountStatus === "SUSPENDED") {
      const suspendedUntil = user.suspendedUntil ? new Date(user.suspendedUntil) : null;
      if (suspendedUntil && suspendedUntil.getTime() <= Date.now()) {
        await UserModel.findByIdAndUpdate(payload.sub, {
          accountStatus: "ACTIVE",
          suspendedUntil: null,
          moderationReason: null,
          moderatedAt: new Date()
        });
      } else {
        return next(
          new AppError(
            403,
            user.moderationReason
              ? `Account suspended: ${user.moderationReason}`
              : suspendedUntil
                ? `Account suspended until ${suspendedUntil.toISOString()}`
                : "Account suspended"
          )
        );
      }
    }
    req.user = { id: String(user._id), role: user.role as Role };
    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
    const isProfileBootstrap = req.method === "GET" && req.path === "/auth/me";
    if (!isAdmin && !isProfileBootstrap) {
      const platformStatus = await getPlatformStatus();
      if (platformStatus.maintenanceMode) {
        return next(new AppError(503, platformStatus.title));
      }
    }
    return next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
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
