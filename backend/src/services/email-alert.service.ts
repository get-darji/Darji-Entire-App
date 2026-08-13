import { env } from "../env.js";

export async function sendOperationalAlertEmail(input: { subject: string; text: string; metadata?: unknown }) {
  const recipients = (env.ADMIN_ALERT_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!recipients.length) {
    console.warn("[alerts] ADMIN_ALERT_EMAILS is not configured; skipping alert email", input.subject);
    return { skipped: true };
  }
  if (!env.ALERT_EMAIL_WEBHOOK_URL) {
    console.warn("[alerts] ALERT_EMAIL_WEBHOOK_URL is not configured; skipping alert email", input.subject);
    return { skipped: true };
  }

  const response = await fetch(env.ALERT_EMAIL_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: recipients,
      subject: input.subject,
      text: input.text,
      metadata: input.metadata
    })
  });
  if (!response.ok) throw new Error(`Alert email webhook returned ${response.status}`);
  return { skipped: false };
}
