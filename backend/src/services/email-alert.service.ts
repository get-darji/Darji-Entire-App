import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { OperationalAlertEmailDispatchModel, SettingModel } from "../models.js";

export const OPERATIONAL_ALERT_EMAIL_SETTINGS_KEY = "operational_alert_email_settings";
export const OPERATIONAL_ALERT_GMAIL_CONNECTION_KEY = "operational_alert_gmail_oauth";
export const LIVE_ALERT_CATEGORIES = ["delivery", "order", "payment", "support", "tailoring", "other"] as const;
export type LiveAlertCategory = typeof LIVE_ALERT_CATEGORIES[number];

export type LiveAlertEmailInput = {
  incidentKey: string;
  category: LiveAlertCategory;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  source?: string;
  detectedAt?: string;
};

export function operationalAlertCategory(type: string, title: string): LiveAlertCategory {
  const key = `${type} ${title}`.toLowerCase();
  if (key.includes("payment") || key.includes("cod")) return "payment";
  if (key.includes("support") || key.includes("ticket")) return "support";
  if (key.includes("quote") || key.includes("tailor")) return "tailoring";
  if (key.includes("delivery") || key.includes("pickup") || key.includes("drop") || key.includes("batch")) return "delivery";
  if (key.includes("order")) return "order";
  return "other";
}

type RecipientRule = { email: string; mode: "ALL" | "SELECTED"; categories: LiveAlertCategory[] };
let warnedMissingGmailOAuth = false;
let cachedGmailAccessToken: { token: string; expiresAt: number } | undefined;

export function isOperationalAlertEmailConfigured() {
  return Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET && env.GOOGLE_OAUTH_REDIRECT_URI);
}

type StoredGmailConnection = {
  email: string;
  encryptedRefreshToken: { iv: string; tag: string; ciphertext: string };
  connectedAt: string;
};

function gmailTokenEncryptionKey() {
  return createHash("sha256").update(env.JWT_REFRESH_SECRET).digest();
}

function encryptRefreshToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", gmailTokenEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return { iv: iv.toString("base64url"), tag: cipher.getAuthTag().toString("base64url"), ciphertext: ciphertext.toString("base64url") };
}

function decryptRefreshToken(encrypted: StoredGmailConnection["encryptedRefreshToken"]) {
  const decipher = createDecipheriv("aes-256-gcm", gmailTokenEncryptionKey(), Buffer.from(encrypted.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(encrypted.tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted.ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

async function getStoredGmailConnection(): Promise<(StoredGmailConnection & { refreshToken: string }) | null> {
  const setting = await SettingModel.findOne({ key: OPERATIONAL_ALERT_GMAIL_CONNECTION_KEY }).select("value").lean();
  if (!setting?.value || typeof setting.value !== "object") return null;
  const value = setting.value as Partial<StoredGmailConnection>;
  if (!value.email || !value.encryptedRefreshToken?.iv || !value.encryptedRefreshToken.tag || !value.encryptedRefreshToken.ciphertext) return null;
  try {
    return { ...value as StoredGmailConnection, refreshToken: decryptRefreshToken(value.encryptedRefreshToken) };
  } catch {
    console.error("[alerts] Stored Gmail OAuth token could not be decrypted; reconnect Gmail in Admin Settings");
    return null;
  }
}

export async function getOperationalAlertGmailOAuthStatus() {
  const connection = await getStoredGmailConnection();
  return { configured: isOperationalAlertEmailConfigured(), connected: Boolean(connection), email: connection?.email };
}

export async function isOperationalAlertEmailReady() {
  return isOperationalAlertEmailConfigured() && Boolean(await getStoredGmailConnection());
}

export function createOperationalAlertGmailAuthorizationUrl(adminId: string) {
  if (!isOperationalAlertEmailConfigured()) throw new Error("Google OAuth client settings are not configured on the backend");
  const state = jwt.sign({ purpose: "darji-live-alert-gmail-oauth", adminId, nonce: randomUUID() }, env.JWT_ACCESS_SECRET, { expiresIn: "10m" });
  const query = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI!,
    response_type: "code",
    scope: "openid email https://www.googleapis.com/auth/gmail.send",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
}

export async function completeOperationalAlertGmailOAuth(code: string, state: string) {
  const statePayload = jwt.verify(state, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
  if (statePayload.purpose !== "darji-live-alert-gmail-oauth" || typeof statePayload.adminId !== "string") {
    throw new Error("Invalid Gmail OAuth state");
  }
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI!,
      grant_type: "authorization_code"
    })
  });
  const tokenBody = await tokenResponse.json() as { access_token?: string; refresh_token?: string; error?: string };
  if (!tokenResponse.ok || !tokenBody.access_token) throw new Error(`Google OAuth token exchange failed (${tokenResponse.status})`);
  if (!tokenBody.refresh_token) throw new Error("Google did not return a refresh token. Reconnect Gmail and approve offline access.");

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenBody.access_token}` }
  });
  const profile = await profileResponse.json() as { email?: string };
  if (!profileResponse.ok || !profile.email) throw new Error("Could not read the authorized Gmail account address");

  const value: StoredGmailConnection = {
    email: profile.email.toLowerCase(),
    encryptedRefreshToken: encryptRefreshToken(tokenBody.refresh_token),
    connectedAt: new Date().toISOString()
  };
  await SettingModel.findOneAndUpdate(
    { key: OPERATIONAL_ALERT_GMAIL_CONNECTION_KEY },
    { key: OPERATIONAL_ALERT_GMAIL_CONNECTION_KEY, value },
    { upsert: true, returnDocument: "after" }
  );
  cachedGmailAccessToken = undefined;
  return { email: value.email, adminId: statePayload.adminId };
}

export async function disconnectOperationalAlertGmail() {
  await SettingModel.deleteOne({ key: OPERATIONAL_ALERT_GMAIL_CONNECTION_KEY });
  cachedGmailAccessToken = undefined;
}

async function gmailAccessToken(refreshToken: string) {
  if (cachedGmailAccessToken && cachedGmailAccessToken.expiresAt > Date.now() + 60_000) return cachedGmailAccessToken.token;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  const body = await response.json() as { access_token?: string; expires_in?: number };
  if (!response.ok || !body.access_token) throw new Error(`Google access-token refresh failed (${response.status})`);
  cachedGmailAccessToken = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return body.access_token;
}

function escapeHtml(value: unknown) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>\"']/g, (character) => entities[character] ?? character);
}

function readableCategory(category: LiveAlertCategory) {
  return ({ delivery: "Delivery Operations", order: "Order Operations", payment: "Payments", support: "Customer Support", tailoring: "Tailoring Operations", other: "System Operations" })[category];
}

function recipientRules(value: unknown): RecipientRule[] {
  if (!value || typeof value !== "object") return [];
  const candidates = (value as { recipients?: unknown }).recipients;
  if (!Array.isArray(candidates)) return [];
  return candidates.flatMap((candidate): RecipientRule[] => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Partial<RecipientRule>;
    if (typeof item.email !== "string" || !item.email.includes("@")) return [];
    const categories = Array.isArray(item.categories)
      ? item.categories.filter((category): category is LiveAlertCategory => LIVE_ALERT_CATEGORIES.includes(category as LiveAlertCategory))
      : [];
    return [{ email: item.email.trim().toLowerCase(), mode: item.mode === "SELECTED" ? "SELECTED" : "ALL", categories }];
  });
}

async function configuredRecipients(): Promise<RecipientRule[]> {
  const saved = await SettingModel.findOne({ key: OPERATIONAL_ALERT_EMAIL_SETTINGS_KEY }).select("value").lean();
  if (saved) return recipientRules(saved.value);
  return (env.ADMIN_ALERT_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes("@"))
    .map((email) => ({ email, mode: "ALL", categories: [...LIVE_ALERT_CATEGORIES] }));
}

function emailMarkup(input: LiveAlertEmailInput) {
  const title = escapeHtml(input.title);
  const description = escapeHtml(input.description);
  const severity = input.severity.toUpperCase();
  const color = input.severity === "critical" ? "#ff755f" : input.severity === "info" ? "#6eb4ff" : "#ff995f";
  const category = escapeHtml(readableCategory(input.category));
  const date = new Date(input.detectedAt ?? Date.now());
  const detectedAt = Number.isNaN(date.getTime())
    ? escapeHtml(input.detectedAt ?? "Not available")
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date) + " IST";
  const adminBase = new URL(env.ADMIN_PANEL_URL);
  adminBase.search = "?section=alerts";
  adminBase.searchParams.set("alertId", input.incidentKey);
  adminBase.hash = "";
  const adminUrl = escapeHtml(adminBase.toString());
  const logoUrl = escapeHtml(new URL("/darji-alert-logo.png", adminBase.origin).toString());

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Darji | ${title}</title><style>@media only screen and (max-width:620px){.shell{width:100%!important}.pad{padding-left:24px!important;padding-right:24px!important}.heading{font-size:29px!important}.cta{display:block!important;text-align:center!important}}</style></head><body style="margin:0;padding:0;background:#090909;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif"><div style="display:none;font-size:1px;max-height:0;opacity:0;overflow:hidden">New Darji live alert: ${title} — ${severity}.</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#090909"><tr><td align="center" style="padding:44px 16px 48px"><table role="presentation" width="600" class="shell" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px"><tr><td class="pad" style="padding:0 38px 30px"><table role="presentation" width="100%"><tr><td><img src="${logoUrl}" alt="Darji" width="132" style="display:block;width:132px;height:auto;border:0"></td><td align="right" style="font-size:10px;letter-spacing:2.4px;font-weight:700;color:#858585">ADMIN MONITORING</td></tr></table></td></tr><tr><td style="height:3px;background:#ff7733;font-size:0;line-height:0">&nbsp;</td></tr><tr><td class="pad" style="background:#141414;border-left:1px solid #282828;border-right:1px solid #282828;padding:38px 38px 34px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#3d2418;border:1px solid #834626;border-radius:4px;padding:8px 12px;font-size:11px;font-weight:800;letter-spacing:1.6px;color:${color}">&#9679; &nbsp; ${severity}</td></tr></table><p style="margin:27px 0 9px;font-size:11px;letter-spacing:2.3px;color:#a2a2a2;font-weight:700">LIVE SYSTEM ALERT</p><h1 class="heading" style="margin:0;color:#fff;font-size:36px;line-height:1.15;letter-spacing:-1.4px;font-weight:800">${title}</h1><p style="margin:17px 0 27px;color:#aaa;font-size:15px;line-height:1.75;white-space:pre-wrap">${description}</p><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#1d1d1d;border:1px solid #333;border-radius:8px"><tr><td style="padding:21px 22px 5px;font-size:10px;letter-spacing:2px;color:#fa8d4e;font-weight:800">ALERT DETAILS</td></tr><tr><td style="padding:6px 22px 21px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse"><tr><td style="padding:11px 0;color:#888;font-size:13px;width:35%;border-bottom:1px solid #343434">Alert ID</td><td style="padding:11px 0;color:#f0f0f0;font-size:13px;font-weight:700;border-bottom:1px solid #343434">${escapeHtml(input.incidentKey)}</td></tr><tr><td style="padding:11px 0;color:#888;font-size:13px;border-bottom:1px solid #343434">Category</td><td style="padding:11px 0;color:#f0f0f0;font-size:13px;font-weight:700;border-bottom:1px solid #343434">${category}</td></tr><tr><td style="padding:11px 0;color:#888;font-size:13px">Detected at</td><td style="padding:11px 0;color:#f0f0f0;font-size:13px;font-weight:700">${escapeHtml(detectedAt)}</td></tr><tr><td style="padding:11px 0;color:#888;font-size:13px">Source</td><td style="padding:11px 0;color:#f0f0f0;font-size:13px;font-weight:700">${escapeHtml(input.source ?? "Admin Live Alerts")}</td></tr></table></td></tr></table><p style="margin:25px 0 20px;font-size:13px;line-height:1.7;color:#999">Check the alert in the Darji admin panel for more context and available actions.</p><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#ff7733" style="border-radius:6px"><a class="cta" href="${adminUrl}" style="background:#ff7733;border:1px solid #ff7733;color:#15100d;display:inline-block;font-size:14px;font-weight:800;line-height:20px;padding:15px 24px;text-decoration:none;border-radius:6px">View alert in Admin Panel &nbsp; &#8599;</a></td></tr></table></td></tr><tr><td class="pad" style="padding:23px 38px;background:#101010;border:1px solid #282828"><p style="margin:0 0 8px;color:#d2d2d2;font-size:12px;font-weight:700">Darji Operations · Automated Alert</p><p style="margin:0;color:#777;font-size:11px;line-height:1.65">This notification was triggered automatically by Darji's live monitoring system. Please do not reply to this email.</p></td></tr><tr><td style="padding:26px 38px 0;text-align:center;color:#646464;font-size:11px">© ${new Date().getFullYear()} Darji · Internal operations notification</td></tr></table></td></tr></table></body></html>`;
}

function base64Lines(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n");
}

function buildGmailRawMessage(input: LiveAlertEmailInput, recipient: string, adminUrl: string, sender: string, now: Date) {
  const boundary = `darji-${randomUUID()}`;
  const subject = `=?UTF-8?B?${Buffer.from(`[Darji ${input.severity.toUpperCase()}] ${input.title}`, "utf8").toString("base64")}?=`;
  const text = `${input.title}\n\n${input.description}\n\nCategory: ${readableCategory(input.category)}\nAlert ID: ${input.incidentKey}\nDetected at: ${input.detectedAt ?? now.toISOString()}\n\n${adminUrl}`;
  const body = [
    `From: ${sender}`,
    `To: ${recipient}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary=\"${boundary}\"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(text),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(emailMarkup(input)),
    `--${boundary}--`,
    ""
  ].join("\r\n");
  return Buffer.from(body, "utf8").toString("base64url");
}

async function sendThroughGmailApi(input: LiveAlertEmailInput, recipient: string, adminUrl: string, now: Date) {
  const connection = await getStoredGmailConnection();
  if (!connection) throw new Error("Gmail is not connected in Admin Settings");
  const accessToken = await gmailAccessToken(connection.refreshToken);
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: buildGmailRawMessage(input, recipient, adminUrl, connection.email, now) })
  });
  if (!response.ok) throw new Error(`Gmail API send failed (${response.status})`);
}

async function dispatchToRecipient(input: LiveAlertEmailInput, recipient: string) {
  const dedupeKey = createHash("sha256").update(`${input.incidentKey}\n${recipient}`).digest("hex");
  const now = new Date();
  await OperationalAlertEmailDispatchModel.updateOne(
    { dedupeKey },
    { $setOnInsert: { dedupeKey, incidentKey: input.incidentKey, recipient, category: input.category, title: input.title, status: "PENDING" } },
    { upsert: true }
  );

  const leaseToken = randomUUID();
  const claimed = await OperationalAlertEmailDispatchModel.updateOne(
    {
      dedupeKey,
      status: { $ne: "SENT" },
      $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lt: now } }]
    },
    { $set: { leaseToken, leaseUntil: new Date(now.getTime() + 2 * 60_000), attemptedAt: now, status: "PENDING" }, $unset: { lastError: 1 } }
  );
  if (claimed.modifiedCount !== 1) return false;

  try {
    const adminUrl = new URL(env.ADMIN_PANEL_URL);
    adminUrl.search = "?section=alerts";
    adminUrl.searchParams.set("alertId", input.incidentKey);
    await sendThroughGmailApi(input, recipient, adminUrl.toString(), now);
    await OperationalAlertEmailDispatchModel.updateOne({ dedupeKey, leaseToken }, { $set: { status: "SENT", sentAt: new Date() }, $unset: { leaseToken: 1, leaseUntil: 1, lastError: 1 } });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email failure";
    await OperationalAlertEmailDispatchModel.updateOne({ dedupeKey, leaseToken }, { $set: { status: "ERROR", lastError: message }, $unset: { leaseToken: 1, leaseUntil: 1 } });
    throw error;
  }
}

export async function sendOperationalAlertEmails(inputs: LiveAlertEmailInput[]) {
  if (!await isOperationalAlertEmailReady()) {
    if (!warnedMissingGmailOAuth) console.warn("[alerts] Gmail OAuth is not configured or connected; skipping live alert emails");
    warnedMissingGmailOAuth = true;
    return { skipped: true, sent: 0, failed: 0 };
  }
  const configured = await configuredRecipients();
  const recipientsByCategory = new Map<LiveAlertCategory, string[]>();
  for (const category of LIVE_ALERT_CATEGORIES) {
    recipientsByCategory.set(category, [...new Set(configured
      .filter((rule) => rule.mode === "ALL" || rule.categories.includes(category))
      .map((rule) => rule.email))]);
  }
  let sent = 0;
  let failed = 0;
  for (const input of inputs) {
    for (const recipient of recipientsByCategory.get(input.category) ?? []) {
      try {
        if (await dispatchToRecipient(input, recipient)) sent += 1;
      } catch (error) {
        failed += 1;
        console.error("[alerts] Failed to send live alert email", input.incidentKey, recipient, error instanceof Error ? error.message : "Unknown email failure");
      }
    }
  }
  return { skipped: sent === 0 && failed === 0, sent, failed };
}

export async function sendOperationalAlertEmail(input: LiveAlertEmailInput) {
  return sendOperationalAlertEmails([input]);
}

export async function sendOperationalAlertEmailTest(input: LiveAlertEmailInput) {
  if (!await isOperationalAlertEmailReady()) {
    if (!warnedMissingGmailOAuth) console.warn("[alerts] Gmail OAuth is not configured or connected; skipping live alert email tests");
    warnedMissingGmailOAuth = true;
    return { skipped: true, sent: 0, failed: 0, recipients: 0 };
  }

  const recipients = [...new Set((await configuredRecipients()).map((recipient) => recipient.email))];
  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    try {
      if (await dispatchToRecipient(input, recipient)) sent += 1;
    } catch (error) {
      failed += 1;
      console.error("[alerts] Failed to send test alert email", input.incidentKey, recipient, error instanceof Error ? error.message : "Unknown email failure");
    }
  }
  return { skipped: sent === 0 && failed === 0, sent, failed, recipients: recipients.length };
}
