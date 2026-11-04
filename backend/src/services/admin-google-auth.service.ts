import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import type { Role } from "@darji/shared";
import { env } from "../env.js";
import { AdminAuditLogModel, UserModel } from "../models.js";
import { AppError } from "../middleware/error.js";
import { auditRequestContext } from "../middleware/admin-audit.js";
import type { Request } from "express";
import { signAccessToken, signRefreshToken } from "../utils/tokens.js";
import { PROTECTED_ADMIN_PHONE } from "../utils/admin-access.js";

const STATE_PURPOSE = "darji-admin-google-sign-in";
const OWNER_ADMIN_EMAIL = "amankumarschool7@gmail.com";

function getAdminGoogleOAuthCredentials() {
  return {
    clientId: env.ADMIN_GOOGLE_OAUTH_CLIENT_ID || env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.ADMIN_GOOGLE_OAUTH_CLIENT_SECRET || env.GOOGLE_OAUTH_CLIENT_SECRET
  };
}

export function adminGoogleRedirectUri() {
  return new URL("/api/auth/google/callback", env.ADMIN_PANEL_URL).toString();
}

export function createAdminGoogleAuthorizationUrl() {
  const credentials = getAdminGoogleOAuthCredentials();
  if (!credentials.clientId || !credentials.clientSecret) {
    throw new AppError(503, "Google sign-in is not configured on the backend");
  }
  const state = jwt.sign({ purpose: STATE_PURPOSE, nonce: randomUUID() }, env.JWT_ACCESS_SECRET, { expiresIn: "10m" });
  const query = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: adminGoogleRedirectUri(),
    response_type: "code",
    scope: "openid email",
    state,
    prompt: "select_account"
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
}

export async function completeAdminGoogleSignIn(code: string, state: string, req: Request) {
  let statePayload: jwt.JwtPayload;
  try {
    statePayload = jwt.verify(state, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
  } catch {
    throw new AppError(401, "Google sign-in expired. Please try again.");
  }
  if (statePayload.purpose !== STATE_PURPOSE || typeof statePayload.nonce !== "string") {
    throw new AppError(401, "Invalid Google sign-in state");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getAdminGoogleOAuthCredentials().clientId!,
      client_secret: getAdminGoogleOAuthCredentials().clientSecret!,
      redirect_uri: adminGoogleRedirectUri(),
      grant_type: "authorization_code"
    }),
    signal: AbortSignal.timeout(15_000)
  });
  const tokens = await tokenResponse.json() as { access_token?: string };
  if (!tokenResponse.ok || !tokens.access_token) throw new AppError(401, "Google could not verify this sign-in. Please try again.");

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    signal: AbortSignal.timeout(15_000)
  });
  const profile = await profileResponse.json() as { email?: string; email_verified?: boolean };
  if (!profileResponse.ok || !profile.email || profile.email_verified !== true) {
    throw new AppError(403, "Google did not return a verified email address");
  }

  const email = profile.email.trim().toLowerCase();
  const user = email === OWNER_ADMIN_EMAIL
    ? await UserModel.findOne({ email, phone: PROTECTED_ADMIN_PHONE, role: "SUPER_ADMIN" })
    : await UserModel.findOne({ email, role: { $in: ["ADMIN", "SUPER_ADMIN"] } });
  if (!user) throw new AppError(403, "This verified email has not been approved for an admin account");
  if (user.accountStatus === "BANNED") throw new AppError(403, "This admin account is banned");
  if (user.accountStatus === "SUSPENDED") {
    const until = user.suspendedUntil ? new Date(user.suspendedUntil) : null;
    if (!until || until.getTime() > Date.now()) throw new AppError(403, "This admin account is suspended");
    user.accountStatus = "ACTIVE";
    user.suspendedUntil = undefined;
    user.moderationReason = undefined;
    user.moderatedAt = new Date();
  }

  const role = user.role as Role;
  const sessionId = randomUUID();
  const accessToken = signAccessToken({ sub: user.id, role, sid: sessionId });
  const refreshToken = signRefreshToken({ sub: user.id, role, sid: sessionId });
  user.set({
    [`activeSessionIds.${role}`]: sessionId,
    [`refreshTokenHashes.${role}`]: await bcrypt.hash(refreshToken, 10)
  });
  await user.save();

  await AdminAuditLogModel.create({
    actorId: user.id,
    actorRole: role,
    actorName: user.name,
    actorPhone: user.phone,
    category: "ACCESS",
    action: "Signed in to admin panel with Google",
    method: "POST",
    path: "/api/auth/admin/google/exchange",
    statusCode: 200,
    entityType: "ADMIN_SESSION",
    entityId: sessionId,
    summary: "Signed in to admin panel with Google",
    ...auditRequestContext(req),
    metadata: { loginMethod: "GOOGLE", email }
  }).catch(() => undefined);

  return {
    user: { id: user.id, phone: user.phone, email, name: user.name, role },
    accessToken,
    refreshToken
  };
}
