import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { requestOtpSchema, verifyOtpSchema } from "@darzi/shared";
import { prisma } from "../prisma.js";
import { requestOtp, verifyOtp } from "../services/otp.service.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
import { AppError } from "../middleware/error.js";

export async function requestOtpController(req: Request, res: Response) {
  const input = requestOtpSchema.parse(req.body);
  const result = await requestOtp(input.phone);
  res.json({ data: result, message: "OTP sent" });
}

export async function verifyOtpController(req: Request, res: Response) {
  const input = verifyOtpSchema.parse(req.body);
  await verifyOtp(input.phone, input.otp);

  const user = await prisma.user.upsert({
    where: { phone: input.phone },
    update: { role: input.role },
    create: { phone: input.phone, role: input.role, wallet: { create: { balance: 0 } } }
  });

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role });
  await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: await bcrypt.hash(refreshToken, 10) } });

  res.json({ data: { user, accessToken, refreshToken } });
}

export async function refreshController(req: Request, res: Response) {
  const refreshToken = String(req.body.refreshToken ?? "");
  if (!refreshToken) {
    throw new AppError(400, "refreshToken is required");
  }

  const payload = verifyRefreshToken(refreshToken);
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user?.refreshTokenHash || !(await bcrypt.compare(refreshToken, user.refreshTokenHash))) {
    throw new AppError(401, "Invalid refresh token");
  }

  res.json({
    data: {
      accessToken: signAccessToken({ sub: user.id, role: user.role }),
      refreshToken
    }
  });
}

export async function meController(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { wallet: true, tailorProfile: true, deliveryProfile: true }
  });
  res.json({ data: user });
}
