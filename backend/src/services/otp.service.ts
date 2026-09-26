import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { OtpCooldownModel, OtpRequestModel, UserModel } from "../models.js";
import { env } from "../env.js";
import { AppError } from "../middleware/error.js";

const OTP_TTL_MINUTES = 10;
const OTP_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;

type OtpRequestResult = {
  expiresAt: Date;
  otp?: string;
  provider: "twofactor" | "dev";
  fallback: boolean;
};

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
    const url = `${env.TWOFACTOR_API_BASE_URL.replace(/\/$/, "")}/API/V1/${encodeURIComponent(env.TWOFACTOR_API_KEY)}/SMS/${path}`;
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
  const templateName = env.TWOFACTOR_TEMPLATE_NAME.trim();
  if (templateName !== "OTP1") {
    throw new Error("2Factor SMS template must be OTP1; check TWOFACTOR_TEMPLATE_NAME");
  }
  console.info("[otp] Requesting 2Factor SMS with template OTP1");
  const payload = await callTwoFactor(`${encodeURIComponent(phone)}/AUTOGEN/OTP1`, "GET");
  if (!isTwoFactorSuccess(payload)) throw new Error(`TwoFactor OTP send failed: ${String(payload.Details ?? "unknown response").replace(/\b\d{6,10}\b/g, "[redacted]").slice(0, 200)}`);
  const sessionId = payload.Details ?? payload.details;
  if (typeof sessionId !== "string" || !/^[A-Za-z0-9-]{10,200}$/.test(sessionId)) {
    throw new Error("TwoFactor OTP send did not return a valid session ID");
  }
  return sessionId;
}

async function createOtpRequest(phone: string, provider: "twofactor" | "dev", fallback: boolean, otp?: string, providerSessionId?: string): Promise<OtpRequestResult> {
  const otpHash = otp ? await bcrypt.hash(otp, 10) : undefined;
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await OtpRequestModel.create({ phone, otpHash, providerSessionId, expiresAt, provider, fallback });

  return {
    expiresAt,
    provider,
    fallback,
    ...(provider === "dev" ? { otp } : {})
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

export async function requestOtp(phone: string, mode: "default" | "twofactor" = "default") {
  if (!env.TWOFACTOR_ENABLED || !env.TWOFACTOR_API_KEY) {
    throw new AppError(503, "2Factor OTP is not configured");
  }

  const reservationId = await reserveOtpRequest(phone);

  let providerSessionId: string;
  const providerStartedAt = Date.now();
  try {
    providerSessionId = await sendTwoFactorOtp(phone);
    console.info(`[otp] 2Factor accepted send request in ${Date.now() - providerStartedAt}ms`);
  } catch (error) {
    console.warn(`[otp] 2Factor send failed after ${Date.now() - providerStartedAt}ms`);
    console.error(error instanceof Error ? error.message : error);
    await releaseOtpReservation(phone, reservationId);
    throw new AppError(502, "Could not send OTP. Please try again.");
  }
  const request = await createOtpRequest(phone, "twofactor", false, undefined, providerSessionId);
  console.info(`[otp] 2Factor session stored in ${Date.now() - providerStartedAt}ms total`);
  return request;
}

export async function verifyOtp(phone: string, otp: string, role?: string) {
  const request = await OtpRequestModel.findOne({ phone, consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });

  if (!request) {
    throw new AppError(400, "OTP expired or not requested");
  }

  if (request.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new AppError(429, "Too many incorrect OTP attempts. Request a new code.");
  }

  let matches = false;
  const testExpiry = Date.parse(env.OTP_TEST_EXPIRES_AT);
  const testPhones = env.OTP_TEST_CUSTOMER_PHONES.split(",").map((value) => value.trim());
  if (role === "CUSTOMER" && request.provider === "twofactor" && otp === env.OTP_DEV_CODE &&
      env.OTP_DEV_FALLBACK_ENABLED && testExpiry > Date.now() && testPhones.includes(phone)) {
    const account = await UserModel.findOne({ phone });
    matches = !account || !["ADMIN", "SUPER_ADMIN"].includes(account.role);
  }
  if (!matches && request.provider === "twofactor") {
    if (!request.providerSessionId) throw new AppError(400, "OTP expired or not requested. Request a new code.");
    try {
      const payload = await callTwoFactor(`VERIFY/${encodeURIComponent(request.providerSessionId)}/${encodeURIComponent(otp)}`);
      const detail = String(payload.Details ?? payload.details ?? "").trim();
      if (!isTwoFactorSuccess(payload) && !/otp.*(mismatch|not matched|invalid)|invalid.*otp/i.test(detail)) {
        throw new Error(`TwoFactor OTP verify failed: ${detail.replace(/\b\d{6,10}\b/g, "[redacted]").slice(0, 200)}`);
      }
      matches = isTwoFactorSuccess(payload) && detail.toLowerCase() === "otp matched";
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      throw new AppError(502, "Could not verify OTP with 2Factor. Please try again.");
    }
  } else if (!matches && request.otpHash && env.NODE_ENV !== "production") {
    matches = await bcrypt.compare(otp, request.otpHash);
  }
  if (!matches) {
    await OtpRequestModel.findByIdAndUpdate(request.id, { $inc: { attempts: 1 } });
    throw new AppError(400, "Invalid OTP");
  }

  await OtpRequestModel.findByIdAndUpdate(request.id, { consumedAt: new Date() });
}
