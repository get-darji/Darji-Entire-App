import { createHash, randomUUID } from "node:crypto";
import { env } from "../env.js";
import { OperationalAlertEmailDispatchModel, SettingModel } from "../models.js";

export const OPERATIONAL_ALERT_EMAIL_SETTINGS_KEY = "operational_alert_email_settings";
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
let warnedMissingAlertWebhook = false;

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
  adminBase.hash = "";
  const adminUrl = escapeHtml(adminBase.toString());
  const logoUrl = escapeHtml(new URL("/darji-alert-logo.png", adminBase.origin).toString());

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Darji | ${title}</title><style>@media only screen and (max-width:620px){.shell{width:100%!important}.pad{padding-left:24px!important;padding-right:24px!important}.heading{font-size:29px!important}.cta{display:block!important;text-align:center!important}}</style></head><body style="margin:0;padding:0;background:#090909;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif"><div style="display:none;font-size:1px;max-height:0;opacity:0;overflow:hidden">New Darji live alert: ${title} — ${severity}.</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#090909"><tr><td align="center" style="padding:44px 16px 48px"><table role="presentation" width="600" class="shell" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px"><tr><td class="pad" style="padding:0 38px 30px"><table role="presentation" width="100%"><tr><td><img src="${logoUrl}" alt="Darji" width="132" style="display:block;width:132px;height:auto;border:0"></td><td align="right" style="font-size:10px;letter-spacing:2.4px;font-weight:700;color:#858585">ADMIN MONITORING</td></tr></table></td></tr><tr><td style="height:3px;background:#ff7733;font-size:0;line-height:0">&nbsp;</td></tr><tr><td class="pad" style="background:#141414;border-left:1px solid #282828;border-right:1px solid #282828;padding:38px 38px 34px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#3d2418;border:1px solid #834626;border-radius:4px;padding:8px 12px;font-size:11px;font-weight:800;letter-spacing:1.6px;color:${color}">&#9679; &nbsp; ${severity}</td></tr></table><p style="margin:27px 0 9px;font-size:11px;letter-spacing:2.3px;color:#a2a2a2;font-weight:700">LIVE SYSTEM ALERT</p><h1 class="heading" style="margin:0;color:#fff;font-size:36px;line-height:1.15;letter-spacing:-1.4px;font-weight:800">${title}</h1><p style="margin:17px 0 27px;color:#aaa;font-size:15px;line-height:1.75;white-space:pre-wrap">${description}</p><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#1d1d1d;border:1px solid #333;border-radius:8px"><tr><td style="padding:21px 22px 5px;font-size:10px;letter-spacing:2px;color:#fa8d4e;font-weight:800">ALERT DETAILS</td></tr><tr><td style="padding:6px 22px 21px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse"><tr><td style="padding:11px 0;color:#888;font-size:13px;width:35%;border-bottom:1px solid #343434">Alert ID</td><td style="padding:11px 0;color:#f0f0f0;font-size:13px;font-weight:700;border-bottom:1px solid #343434">${escapeHtml(input.incidentKey)}</td></tr><tr><td style="padding:11px 0;color:#888;font-size:13px;border-bottom:1px solid #343434">Category</td><td style="padding:11px 0;color:#f0f0f0;font-size:13px;font-weight:700;border-bottom:1px solid #343434">${category}</td></tr><tr><td style="padding:11px 0;color:#888;font-size:13px">Detected at</td><td style="padding:11px 0;color:#f0f0f0;font-size:13px;font-weight:700">${escapeHtml(detectedAt)}</td></tr><tr><td style="padding:11px 0;color:#888;font-size:13px">Source</td><td style="padding:11px 0;color:#f0f0f0;font-size:13px;font-weight:700">${escapeHtml(input.source ?? "Admin Live Alerts")}</td></tr></table></td></tr></table><p style="margin:25px 0 20px;font-size:13px;line-height:1.7;color:#999">Check the alert in the Darji admin panel for more context and available actions.</p><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#ff7733" style="border-radius:6px"><a class="cta" href="${adminUrl}" style="background:#ff7733;border:1px solid #ff7733;color:#15100d;display:inline-block;font-size:14px;font-weight:800;line-height:20px;padding:15px 24px;text-decoration:none;border-radius:6px">View alert in Admin Panel &nbsp; &#8599;</a></td></tr></table></td></tr><tr><td class="pad" style="padding:23px 38px;background:#101010;border:1px solid #282828"><p style="margin:0 0 8px;color:#d2d2d2;font-size:12px;font-weight:700">Darji Operations · Automated Alert</p><p style="margin:0;color:#777;font-size:11px;line-height:1.65">This notification was triggered automatically by Darji's live monitoring system. Please do not reply to this email.</p></td></tr><tr><td style="padding:26px 38px 0;text-align:center;color:#646464;font-size:11px">© ${new Date().getFullYear()} Darji · Internal operations notification</td></tr></table></td></tr></table></body></html>`;
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
    const response = await fetch(env.ALERT_EMAIL_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: [recipient],
        subject: `[Darji ${input.severity.toUpperCase()}] ${input.title}`,
        text: `${input.title}\n\n${input.description}\n\nCategory: ${readableCategory(input.category)}\nAlert ID: ${input.incidentKey}\nDetected at: ${input.detectedAt ?? now.toISOString()}\n\n${adminUrl.toString()}`,
        html: emailMarkup(input),
        metadata: { alertId: input.incidentKey, category: input.category, severity: input.severity, source: input.source, adminUrl: adminUrl.toString() }
      })
    });
    if (!response.ok) throw new Error(`Alert email webhook returned ${response.status}`);
    await OperationalAlertEmailDispatchModel.updateOne({ dedupeKey, leaseToken }, { $set: { status: "SENT", sentAt: new Date() }, $unset: { leaseToken: 1, leaseUntil: 1, lastError: 1 } });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email failure";
    await OperationalAlertEmailDispatchModel.updateOne({ dedupeKey, leaseToken }, { $set: { status: "ERROR", lastError: message }, $unset: { leaseToken: 1, leaseUntil: 1 } });
    throw error;
  }
}

export async function sendOperationalAlertEmails(inputs: LiveAlertEmailInput[]) {
  if (!env.ALERT_EMAIL_WEBHOOK_URL) {
    if (!warnedMissingAlertWebhook) console.warn("[alerts] ALERT_EMAIL_WEBHOOK_URL is not configured; skipping live alert emails");
    warnedMissingAlertWebhook = true;
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
