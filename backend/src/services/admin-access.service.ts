import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type { Role } from "@darji/shared";
import { AdminAccessModel } from "../models.js";
import { AppError } from "../middleware/error.js";
import { signAccessToken, signRefreshToken } from "../utils/tokens.js";

export function normalizeAdminPhone(value: unknown) {
  const phone = String(value ?? "").replace(/\D/g, "").slice(-10);
  return /^[6-9]\d{9}$/.test(phone) ? phone : "";
}

export function normalizeAdminEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function serializeAdminAccess(access: any) {
  const value = typeof access.toJSON === "function" ? access.toJSON() : access;
  return {
    id: String(value.id ?? value._id),
    phone: value.phone,
    email: value.email,
    name: value.name,
    role: value.role,
    accountStatus: value.accountStatus,
    isOwner: Boolean(value.isOwner),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  };
}

export function assertAdminAccessActive(access: { accountStatus?: string } | null) {
  if (!access) throw new AppError(403, "This admin sign-in has not been approved");
  if (access.accountStatus === "BANNED") throw new AppError(403, "This admin access has been removed");
}

export async function createAdminAccessSession(access: any) {
  assertAdminAccessActive(access);
  const role = access.role as Role;
  const sessionId = randomUUID();
  const tokenPayload = { sub: access.id, role, sid: sessionId, kind: "admin" as const };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);
  access.activeSessionId = sessionId;
  access.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await access.save();
  return { role, sessionId, accessToken, refreshToken };
}

export async function requireOwnerAdminAccess(adminAccessId: string) {
  const actor = await AdminAccessModel.findById(adminAccessId);
  if (!actor || actor.accountStatus !== "ACTIVE" || !actor.isOwner || actor.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Only the protected owner can manage admin access");
  }
  return actor;
}
