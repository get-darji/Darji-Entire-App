import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../env.js";
import { AppError } from "../middleware/error.js";
import {
  completeOperationalAlertGmailOAuth,
  createOperationalAlertGmailAuthorizationUrl,
  disconnectOperationalAlertGmail,
  getOperationalAlertGmailOAuthStatus,
  isOperationalAlertEmailConfigured
} from "../services/email-alert.service.js";

function adminSettingsUrl(result: "connected" | "error" | "denied") {
  const url = new URL(env.ADMIN_PANEL_URL);
  url.searchParams.set("section", "settings");
  url.searchParams.set("gmail_oauth", result);
  return url.toString();
}

export async function getAdminLiveAlertGmailStatusController(_req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json({ data: await getOperationalAlertGmailOAuthStatus() });
}

export function startAdminLiveAlertGmailOAuthController(req: Request, res: Response) {
  if (!isOperationalAlertEmailConfigured()) {
    throw new AppError(503, "Google OAuth client settings are missing from the backend environment");
  }
  res.json({ data: { authorizationUrl: createOperationalAlertGmailAuthorizationUrl(req.user?.id ?? "admin") } });
}

export async function completeAdminLiveAlertGmailOAuthController(req: Request, res: Response) {
  if (typeof req.query.error === "string") {
    res.redirect(302, adminSettingsUrl("denied"));
    return;
  }
  const query = z.object({ code: z.string().min(1), state: z.string().min(1) }).safeParse(req.query);
  if (!query.success) {
    res.redirect(302, adminSettingsUrl("error"));
    return;
  }
  try {
    await completeOperationalAlertGmailOAuth(query.data.code, query.data.state);
    res.redirect(302, adminSettingsUrl("connected"));
  } catch (error) {
    console.error("[alerts] Gmail OAuth connection failed", error instanceof Error ? error.message : "Unknown OAuth error");
    res.redirect(302, adminSettingsUrl("error"));
  }
}

export async function disconnectAdminLiveAlertGmailController(_req: Request, res: Response) {
  await disconnectOperationalAlertGmail();
  res.sendStatus(204);
}
