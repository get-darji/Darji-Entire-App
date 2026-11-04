import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { AdminAccessModel, AdminAuditLogModel } from "../models.js";
import { AppError } from "../middleware/error.js";
import { auditRequestContext } from "../middleware/admin-audit.js";
import type { Request } from "express";
import { createAdminAccessSession, normalizeAdminEmail, serializeAdminAccess } from "./admin-access.service.js";

const STATE_PURPOSE = "darji-admin-google-sign-in";

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
  const admin = await AdminAccessModel.findOne({ email: normalizeAdminEmail(email) });
  if (!admin) throw new AppError(403, "This verified email has not been approved in Admin Accounts");
  const session = await createAdminAccessSession(admin);

  await AdminAuditLogModel.create({
    actorId: admin.id,
    actorRole: session.role,
    actorName: admin.name,
    actorPhone: admin.phone,
    category: "ACCESS",
    action: "Signed in to admin panel with Google",
    method: "POST",
    path: "/api/auth/admin/google/exchange",
    statusCode: 200,
    entityType: "ADMIN_SESSION",
    entityId: session.sessionId,
    summary: "Signed in to admin panel with Google",
    ...auditRequestContext(req),
    metadata: { loginMethod: "GOOGLE", email }
  }).catch(() => undefined);

  return {
    user: serializeAdminAccess(admin),
    accessToken: session.accessToken,
    refreshToken: session.refreshToken
  };
}
