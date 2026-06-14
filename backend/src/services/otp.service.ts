import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { env } from "../env.js";
import { AppError } from "../middleware/error.js";

const OTP_TTL_MINUTES = 10;

export async function requestOtp(phone: string) {
  const otp = env.NODE_ENV === "production" ? String(Math.floor(100000 + Math.random() * 900000)) : env.OTP_DEV_CODE;
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpRequest.create({
    data: {
      phone,
      otpHash,
      expiresAt
    }
  });

  // Plug SMS provider here. In development the OTP is returned to speed local testing.
  return env.NODE_ENV === "production" ? { expiresAt } : { expiresAt, otp };
}

export async function verifyOtp(phone: string, otp: string) {
  const request = await prisma.otpRequest.findFirst({
    where: {
      phone,
      consumedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!request) {
    throw new AppError(400, "OTP expired or not requested");
  }

  const matches = await bcrypt.compare(otp, request.otpHash);
  if (!matches) {
    await prisma.otpRequest.update({ where: { id: request.id }, data: { attempts: { increment: 1 } } });
    throw new AppError(400, "Invalid OTP");
  }

  await prisma.otpRequest.update({ where: { id: request.id }, data: { consumedAt: new Date() } });
}
