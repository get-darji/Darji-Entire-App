import bcrypt from "bcryptjs";
import { randomInt, randomUUID } from "node:crypto";
import { OtpCooldownModel, OtpRequestModel } from "../models.js";
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

function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function canUseDevFallback() {
  return env.OTP_DEV_FALLBACK_ENABLED && env.NODE_ENV !== "production";
}

function twoFactorPhone(phone: string) {
  return `+91${phone.replace(/\D/g, "").slice(-10)}`;
}

function isTwoFactorSuccess(payload: unknown) {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  const status = String(record.status ?? record.Status ?? "").toLowerCase();
  return ["sent", "success", "submitted", "queued"].includes(status);
}

async function sendTwoFactorOtp(phone: string, otp: string) {
  if (!env.TWOFACTOR_API_KEY) {
    throw new Error("TWOFACTOR_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.TWOFACTOR_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${env.TWOFACTOR_API_BASE_URL.replace(/\/$/, "")}/API/V1/OTP/SEND`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": env.TWOFACTOR_API_KEY
      },
      body: JSON.stringify({
        to: twoFactorPhone(phone),
        channel: "SMS",
        template_name: env.TWOFACTOR_TEMPLATE_NAME,
        var1: otp
      }),
      signal: controller.signal
    });

    const responseText = await response.text();
    let payload: unknown = undefined;
    try {
      payload = responseText ? JSON.parse(responseText) : undefined;
    } catch {
      payload = undefined;
    }

    if (!response.ok || !isTwoFactorSuccess(payload)) {
      const detail = payload && typeof payload === "object"
        ? JSON.stringify(payload)
        : responseText || `HTTP ${response.status}`;
      throw new Error(`TwoFactor OTP send failed: ${detail}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function createOtpRequest(phone: string, otp: string, provider: "twofactor" | "dev", fallback: boolean): Promise<OtpRequestResult> {
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await OtpRequestModel.create({ phone, otpHash, expiresAt, provider, fallback });

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
  if (mode === "twofactor" && env.NODE_ENV === "production") {
    throw new AppError(400, "The test OTP option is unavailable in production");
  }

  const useDevCode = mode === "default" && canUseDevFallback();
  if (!useDevCode && (!env.TWOFACTOR_ENABLED || !env.TWOFACTOR_API_KEY)) {
    throw new AppError(503, "2Factor OTP is not configured");
  }

  const reservationId = await reserveOtpRequest(phone);
  if (useDevCode) {
    try {
      return await createOtpRequest(phone, env.OTP_DEV_CODE, "dev", true);
    } catch (error) {
      await releaseOtpReservation(phone, reservationId);
      throw error;
    }
  }

  const otp = generateOtp();

  try {
    await sendTwoFactorOtp(phone, otp);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    await releaseOtpReservation(phone, reservationId);
    throw new AppError(502, "Could not send OTP. Please try again.");
  }
  return createOtpRequest(phone, otp, "twofactor", false);
}

export async function verifyOtp(phone: string, otp: string) {
  const request = await OtpRequestModel.findOne({ phone, consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });

  if (!request) {
    throw new AppError(400, "OTP expired or not requested");
  }

  if (request.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new AppError(429, "Too many incorrect OTP attempts. Request a new code.");
  }

  const matches = await bcrypt.compare(otp, request.otpHash);
  if (!matches) {
    await OtpRequestModel.findByIdAndUpdate(request.id, { $inc: { attempts: 1 } });
    throw new AppError(400, "Invalid OTP");
  }

  await OtpRequestModel.findByIdAndUpdate(request.id, { consumedAt: new Date() });
}
