import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env.js";
import { OtpDeliveryModel, OtpMetricModel } from "../models.js";
import { AppError } from "../middleware/error.js";

const DAY_MS = 24 * 60 * 60 * 1000;
export const otpPeriods = ["24h", "7d", "30d", "lifetime"] as const;
export type OtpPeriod = typeof otpPeriods[number];
export const deliveryStatuses = ["PENDING", "DELIVERED", "FAILED", "REJECTED", "REQUEST_FAILED"] as const;

function callbackSecret() {
  if (env.TWOFACTOR_DLR_WEBHOOK_SECRET) return env.TWOFACTOR_DLR_WEBHOOK_SECRET;
  // Domain-separated HMAC creates a stable callback credential without exposing
  // the provider key or requiring another Railway variable. Key rotation changes
  // the callback URL; a dedicated secret can be configured to decouple rotation.
  return env.TWOFACTOR_API_KEY
    ? createHmac("sha256", env.TWOFACTOR_API_KEY).update("darji:sms-otp-delivery-callback:v1").digest("hex")
    : undefined;
}

export function otpDeliveryCallbackReady() {
  return Boolean(callbackSecret());
}

export function getOtpDeliveryCallbackSetup() {
  const token = callbackSecret();
  if (!token) throw new AppError(503, "Configure the 2Factor API key before setting up delivery reports");
  const url = new URL("https://darji-entire-app-production.up.railway.app/api/webhooks/2factor/otp");
  url.searchParams.set("token", token);
  return { url: url.toString() };
}

export function safeOtpProviderError(error: unknown) {
  const message = error instanceof Error ? error.message : "OTP provider request failed";
  return (env.TWOFACTOR_API_KEY ? message.replaceAll(env.TWOFACTOR_API_KEY, "[redacted]") : message)
    .replace(/\b\d{6,15}\b/g, "[redacted]").slice(0, 240);
}

export async function recordOtpAccepted(phone: string, sessionId: string, role: string | undefined, requestedAt: Date) {
  const update = {
    $set: { requestedAt, acceptedAt: new Date(), ...(role ? { role } : {}) },
    // A delivery callback can beat the API response. Preserve its final status.
    $setOnInsert: { phone, providerSessionId: sessionId, status: "PENDING" }
  };
  try {
    await OtpDeliveryModel.updateOne({ _id: sessionId, phone }, update, { upsert: true });
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
    const existing = await OtpDeliveryModel.findById(sessionId).select("phone").lean();
    if (existing?.phone !== phone) throw new Error("Provider session destination mismatch");
    await OtpDeliveryModel.updateOne({ _id: sessionId, phone }, update);
  }
}

export async function recordOtpRequestFailure(id: string, phone: string, role: string | undefined, requestedAt: Date, error: unknown) {
  await OtpDeliveryModel.create({ _id: id, phone, role, requestedAt, status: "REQUEST_FAILED", failureReason: safeOtpProviderError(error) });
}

export function authorizeOtpDeliveryCallback(token: unknown) {
  const secret = callbackSecret();
  if (!secret) throw new AppError(503, "OTP delivery callbacks are not configured");
  const provided = Buffer.from(typeof token === "string" ? token : "");
  const expected = Buffer.from(secret);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw new AppError(401, "Invalid delivery callback");
}

export function parseOtpDeliveryCallback(body: Record<string, unknown>) {
  const sessionId = String(body.SessionId ?? "").trim();
  const rawPhone = String(body.To ?? "").replace(/\D/g, "");
  const phone = rawPhone.length === 12 && rawPhone.startsWith("91") ? rawPhone.slice(2) : rawPhone;
  const status = String(body.Status ?? "").trim().toUpperCase();
  if (body.mode !== "SMS_OTP" || !/^[A-Za-z0-9-]{10,200}$/.test(sessionId) || !/^[6-9]\d{9}$/.test(phone) || !["DELIVERED", "FAILED", "REJECTED"].includes(status)) {
    throw new AppError(400, "Invalid SMS OTP delivery report");
  }
  return { sessionId, phone, status };
}

export async function receiveOtpDeliveryCallback(body: Record<string, unknown>) {
  const { sessionId, phone, status } = parseOtpDeliveryCallback(body);
  const now = new Date();
  try {
    await OtpDeliveryModel.updateOne({ _id: sessionId, phone }, {
      $setOnInsert: { phone, providerSessionId: sessionId, status: "PENDING", requestedAt: now }
    }, { upsert: true });
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
    const existing = await OtpDeliveryModel.findById(sessionId).select("phone").lean();
    if (existing?.phone !== phone) throw new AppError(400, "Delivery report does not match the destination");
  }
  // Duplicate callbacks are harmless. A delayed failure must never overwrite a
  // delivery receipt (the provider can retry through another carrier).
  const result = await OtpDeliveryModel.updateOne({ _id: sessionId, phone, status: { $ne: "DELIVERED" } }, { $set: { status, reportedAt: now } });
  console.info("[otp] Delivery report processed", { reportedStatus: status, applied: result.modifiedCount > 0 });
}

export function otpPeriodStart(period: OtpPeriod, now: Date) {
  const days = period === "24h" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : null;
  return days === null ? undefined : new Date(now.getTime() - days * DAY_MS);
}

export async function preserveOtpDeliveryHistory() {
  try {
    const indexes = await OtpDeliveryModel.collection.listIndexes().toArray();
    for (const index of indexes) {
      if (index.key?.expiresAt === 1 && index.expireAfterSeconds !== undefined && index.name) {
        await OtpDeliveryModel.collection.dropIndex(index.name);
      }
    }
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && (error.code === 26 || error.code === 27))) throw error;
  }
}

export async function getOtpDeliveryHistory(phone?: string, status?: typeof deliveryStatuses[number], options: { period?: OtpPeriod; page?: number; pageSize?: number } = {}) {
  const now = new Date();
  const period = options.period ?? "lifetime";
  const start = otpPeriodStart(period, now);
  const scope = { requestedAt: { ...(start ? { $gte: start } : {}), $lte: now }, ...(phone ? { phone: { $regex: phone } } : {}) };
  const filter = { ...scope, status: status ?? { $ne: "REQUEST_FAILED" as const } };
  const [total, counts, latestReport, firstRecord, acceptedTotals, lifetimeMetric] = await Promise.all([
    OtpDeliveryModel.countDocuments(filter),
    OtpDeliveryModel.aggregate<{ _id: string; count: number }>([{ $match: scope }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    OtpDeliveryModel.findOne({ reportedAt: { $exists: true } }).sort({ reportedAt: -1 }).select("reportedAt").lean(),
    OtpDeliveryModel.findOne().sort({ requestedAt: 1 }).select("requestedAt").lean(),
    OtpDeliveryModel.aggregate<{ all: number; day: number; week: number; month: number }>([
      { $match: { status: { $ne: "REQUEST_FAILED" }, requestedAt: { $lte: now } } },
      { $group: { _id: null, all: { $sum: 1 },
        day: { $sum: { $cond: [{ $gte: ["$requestedAt", otpPeriodStart("24h", now)] }, 1, 0] } },
        week: { $sum: { $cond: [{ $gte: ["$requestedAt", otpPeriodStart("7d", now)] }, 1, 0] } },
        month: { $sum: { $cond: [{ $gte: ["$requestedAt", otpPeriodStart("30d", now)] }, 1, 0] } }
      } }
    ]),
    OtpMetricModel.findById("twofactor-successful-sends").lean()
  ]);
  const tracked = acceptedTotals[0] ?? { all: 0, day: 0, week: 0, month: 0 };
  const lifetime = Math.max(tracked.all, Number(lifetimeMetric?.successfulSendCount ?? 0));
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 25));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(totalPages, Math.max(1, options.page ?? 1));
  const rows = await OtpDeliveryModel.find(filter).sort({ requestedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean();
  return {
    checkedAt: now.toISOString(),
    callbackConfigured: otpDeliveryCallbackReady(),
    lastReportAt: latestReport?.reportedAt?.toISOString() ?? null,
    historyStartedAt: firstRecord?.requestedAt?.toISOString() ?? null,
    legacyAcceptedWithoutDetails: Math.max(0, lifetime - tracked.all),
    periodCounts: { "24h": tracked.day, "7d": tracked.week, "30d": tracked.month, lifetime },
    window: { period, start: start?.toISOString() ?? null, end: now.toISOString() },
    pagination: { page, pageSize, total, totalPages },
    counts: Object.fromEntries(deliveryStatuses.map((status) => [status, counts.find((row) => row._id === status)?.count ?? 0])),
    rows: rows.map((row) => ({ id: row._id, phone: row.phone, role: row.role ?? null, status: row.status, requestedAt: row.requestedAt.toISOString(), acceptedAt: row.acceptedAt?.toISOString() ?? null, reportedAt: row.reportedAt?.toISOString() ?? null, failureReason: row.failureReason ?? null }))
  };
}
