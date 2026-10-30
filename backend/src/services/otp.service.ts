import { randomUUID } from "node:crypto";
import { OtpCooldownModel, OtpMetricModel, OtpRequestModel } from "../models.js";
import { env } from "../env.js";
import { AppError } from "../middleware/error.js";
import { otpDeliveryCallbackReady, recordOtpAccepted, recordOtpRequestFailure, safeOtpProviderError } from "./otp-delivery.service.js";

const OTP_TTL_MINUTES = 10;
const OTP_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;
const TWOFACTOR_API_URL = "https://2factor.in/API/V1";

type OtpRequestResult = {
  expiresAt: Date;
  provider: "twofactor";
};

const SUCCESSFUL_SEND_METRIC_ID = "twofactor-successful-sends";

export function otpRuntimeStatus() {
  return {
    build: "twofactor-only-v3",
    defaultProvider: "twofactor",
    providerEnabled: env.TWOFACTOR_ENABLED,
    apiKeyConfigured: Boolean(env.TWOFACTOR_API_KEY?.trim()),
    developmentFallbackEnabled: false,
    fallbackSupported: false,
    deliveryCallbackConfigured: otpDeliveryCallbackReady()
  };
}

function isTwoFactorSuccess(payload: unknown) {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  const status = String(record.status ?? record.Status ?? "").toLowerCase();
  return ["sent", "success", "submitted", "queued"].includes(status);
}

async function callTwoFactor(path: string, method: "GET" | "POST" = "POST") {
  if (!env.TWOFACTOR_API_KEY) {
    throw new Error("TWOFACTOR_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.TWOFACTOR_REQUEST_TIMEOUT_MS);
  try {
    const url = `${TWOFACTOR_API_URL}/${encodeURIComponent(env.TWOFACTOR_API_KEY)}/SMS/${path}`;
    const response = await fetch(url, {
      method,
      signal: controller.signal
    });

    const responseText = await response.text();
    let payload: unknown = undefined;
    try {
      payload = responseText ? JSON.parse(responseText) : undefined;
    } catch {
      payload = undefined;
    }

    if (!response.ok || !payload || typeof payload !== "object") {
      const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : undefined;
      const detail = record ? String(record.Details ?? record.details ?? record.Message ?? record.message ?? record.Status ?? record.status ?? "unknown response") : "non-JSON response";
      const safeDetail = detail.replaceAll(env.TWOFACTOR_API_KEY, "[redacted]").replace(/\b\d{6,10}\b/g, "[redacted]");
      throw new Error(`TwoFactor OTP API failed (HTTP ${response.status}): ${safeDetail.slice(0, 200)}`);
    }
    return payload as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendTwoFactorOtp(phone: string) {
  // The provider requires OTP1 for this SMS route; legacy environment values
  // must not block requests or select a different delivery template.
  console.info("[otp] Requesting 2Factor SMS with template OTP1");
  const payload = await callTwoFactor(`${encodeURIComponent(phone)}/AUTOGEN/OTP1`, "GET");
  if (!isTwoFactorSuccess(payload)) throw new Error(`TwoFactor OTP send failed: ${String(payload.Details ?? "unknown response").replace(/\b\d{6,10}\b/g, "[redacted]").slice(0, 200)}`);
  const sessionId = payload.Details ?? payload.details;
  if (typeof sessionId !== "string" || !/^[A-Za-z0-9-]{10,200}$/.test(sessionId)) {
    throw new Error("TwoFactor OTP send did not return a valid session ID");
  }
  return sessionId;
}

async function recordSuccessfulOtpSend() {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await OtpMetricModel.findByIdAndUpdate(
        SUCCESSFUL_SEND_METRIC_ID,
        { $inc: { successfulSendCount: 1 }, $set: { lastSentAt: new Date() } },
        { upsert: true, returnDocument: "after" }
      );
      return;
    } catch (error) {
      if (attempt === 2) {
        console.error("[otp] Provider accepted an OTP send, but the admin counter could not be updated", error);
      }
    }
  }
}

async function createOtpRequest(phone: string, providerSessionId: string): Promise<OtpRequestResult> {
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await OtpRequestModel.updateMany(
    { phone, consumedAt: { $exists: false } },
    { $set: { consumedAt: new Date() } }
  );
  await OtpRequestModel.create({ phone, providerSessionId, expiresAt, provider: "twofactor" });

  return {
    expiresAt,
    provider: "twofactor"
  };
}

async function reserveOtpRequest(phone: string) {
  const now = new Date();
  const reservationId = randomUUID();
  try {
    await OtpCooldownModel.findOneAndUpdate(
      { _id: phone, nextAllowedAt: { $lte: now } },
      { $set: { nextAllowedAt: new Date(now.getTime() + OTP_COOLDOWN_SECONDS * 1000), reservationId } },
      { upsert: true, returnDocument: "after" }
    );
    return reservationId;
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
    const cooldown = await OtpCooldownModel.findById(phone);
    const seconds = Math.max(1, Math.ceil(((cooldown?.nextAllowedAt?.getTime() ?? now.getTime() + 1000) - Date.now()) / 1000));
    throw new AppError(429, `Please wait ${seconds} seconds before requesting another OTP.`, seconds);
  }
}

async function releaseOtpReservation(phone: string, reservationId: string) {
  await OtpCooldownModel.deleteOne({ _id: phone, reservationId });
}

export async function requestOtp(phone: string, role?: string) {
  if (!env.TWOFACTOR_ENABLED || !env.TWOFACTOR_API_KEY) {
    throw new AppError(503, "2Factor OTP is not configured");
  }

  const reservationId = await reserveOtpRequest(phone);
  const requestedAt = new Date();

  let providerSessionId: string;
  const providerStartedAt = Date.now();
  try {
    providerSessionId = await sendTwoFactorOtp(phone);
    console.info(`[otp] 2Factor accepted send request in ${Date.now() - providerStartedAt}ms`);
  } catch (error) {
    console.warn(`[otp] 2Factor send failed after ${Date.now() - providerStartedAt}ms`);
    console.error(safeOtpProviderError(error));
    await recordOtpRequestFailure(reservationId, phone, role, requestedAt, error).catch(() => console.error("[otp] Could not save failed SMS request history"));
    await releaseOtpReservation(phone, reservationId);
    throw new AppError(502, "Could not send OTP. Please try again.");
  }
  await recordOtpAccepted(phone, providerSessionId, role, requestedAt).catch(() => console.error("[otp] Could not save accepted SMS request history"));
  await recordSuccessfulOtpSend();
  const request = await createOtpRequest(phone, providerSessionId);
  console.info(`[otp] 2Factor session stored in ${Date.now() - providerStartedAt}ms total`);
  return request;
}

export async function verifyOtp(phone: string, otp: string) {
  const request = await OtpRequestModel.findOne({ phone, consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });

  if (!request) {
    throw new AppError(400, "OTP expired or not requested");
  }

  if (request.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new AppError(429, "Too many incorrect OTP attempts. Request a new code.");
  }

  if (request.provider !== "twofactor" || !request.providerSessionId) {
    throw new AppError(400, "Request a new SMS OTP to continue");
  }
  let matches = false;
  try {
    const payload = await callTwoFactor(`VERIFY/${encodeURIComponent(request.providerSessionId)}/${encodeURIComponent(otp)}`);
    const detail = String(payload.Details ?? payload.details ?? "").trim();
    if (!isTwoFactorSuccess(payload) && !/otp.*(mismatch|not matched|invalid)|invalid.*otp/i.test(detail)) {
      throw new Error(`TwoFactor OTP verify failed: ${detail.replace(/\b\d{6,10}\b/g, "[redacted]").slice(0, 200)}`);
    }
    matches = isTwoFactorSuccess(payload) && detail.toLowerCase() === "otp matched";
  } catch (error) {
    console.error(safeOtpProviderError(error));
    throw new AppError(502, "Could not verify OTP with 2Factor. Please try again.");
  }
  if (!matches) {
    await OtpRequestModel.findByIdAndUpdate(request.id, { $inc: { attempts: 1 } });
    throw new AppError(400, "Invalid OTP");
  }

  await OtpRequestModel.findByIdAndUpdate(request.id, { consumedAt: new Date() });
}
