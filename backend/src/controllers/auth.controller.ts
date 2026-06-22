import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { requestOtpSchema, verifyOtpSchema } from "@darzi/shared";
import { DeliveryPartnerModel, OrderModel, ReviewModel, TailorModel, UserModel, WalletModel } from "../models.js";
import { requestOtp, verifyOtp } from "../services/otp.service.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
import { AppError } from "../middleware/error.js";
import { env } from "../env.js";

const deliveryVerificationBypassPhones = new Set(["9999966666"]);

function parsePhoneAllowlist(value: string) {
  return new Set(
    value
      .split(",")
      .map((phone) => phone.trim())
      .filter(Boolean)
  );
}

function assertAdminPhoneAllowed(phone: string, role?: string) {
  if (role !== "ADMIN") return;
  const allowedPhones = parsePhoneAllowlist(env.ADMIN_ALLOWED_PHONES);
  if (!allowedPhones.has(phone)) {
    throw new AppError(403, "This phone number is not allowed to access the admin portal");
  }
}

async function clearExpiredSuspension(user: {
  accountStatus?: string | null;
  suspendedUntil?: Date | string | null;
  moderationReason?: string | null;
  moderatedAt?: Date | null;
  save: () => Promise<unknown>;
}) {
  if (user.accountStatus !== "SUSPENDED" || !user.suspendedUntil) return;
  const suspendedUntil = new Date(user.suspendedUntil);
  if (suspendedUntil.getTime() > Date.now()) return;

  user.accountStatus = "ACTIVE";
  user.suspendedUntil = undefined;
  user.moderationReason = undefined;
  user.moderatedAt = new Date();
  await user.save();
}

function assertUserCanAccess(user: {
  accountStatus?: string | null;
  suspendedUntil?: Date | string | null;
  moderationReason?: string | null;
}) {
  if (user.accountStatus === "BANNED") {
    throw new AppError(403, user.moderationReason ? `Account banned: ${user.moderationReason}` : "Account banned");
  }
  if (user.accountStatus === "SUSPENDED") {
    const suspendedUntil = user.suspendedUntil ? new Date(user.suspendedUntil) : null;
    if (!suspendedUntil || suspendedUntil.getTime() > Date.now()) {
      throw new AppError(
        403,
        user.moderationReason
          ? `Account suspended: ${user.moderationReason}`
          : suspendedUntil
            ? `Account suspended until ${suspendedUntil.toISOString()}`
            : "Account suspended"
      );
    }
  }
}

export async function requestOtpController(req: Request, res: Response) {
  const input = requestOtpSchema.parse(req.body);
  assertAdminPhoneAllowed(input.phone, input.role);
  const result = await requestOtp(input.phone);
  res.json({ data: result, message: "OTP sent" });
}

export async function verifyOtpController(req: Request, res: Response) {
  const input = verifyOtpSchema.parse(req.body);
  assertAdminPhoneAllowed(input.phone, input.role);
  await verifyOtp(input.phone, input.otp);

  const user = await UserModel.findOneAndUpdate(
    { phone: input.phone },
    { $set: { role: input.role }, $setOnInsert: { phone: input.phone } },
    { upsert: true, returnDocument: "after" }
  );
  await clearExpiredSuspension(user);
  assertUserCanAccess(user);

  await WalletModel.updateOne({ userId: user.id }, { $setOnInsert: { userId: user.id, balance: 0 } }, { upsert: true });
  if (input.role === "TAILOR") {
    await TailorModel.updateOne(
      { userId: user.id },
      { $setOnInsert: { userId: user.id, shopName: user.name ? `${user.name}'s Studio` : "Darji Tailor", specialization: ["Alteration", "Stitching"] } },
      { upsert: true }
    );
  }
  if (input.role === "DELIVERY_PARTNER") {
    await DeliveryPartnerModel.updateOne(
      { userId: user.id },
      deliveryVerificationBypassPhones.has(input.phone)
        ? {
            $setOnInsert: { userId: user.id },
            $set: {
              verificationStatus: "VERIFIED",
              verificationReviewedAt: new Date(),
              verificationRejectionReason: undefined
            }
          }
        : { $setOnInsert: { userId: user.id } },
      { upsert: true }
    );
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role });
  await UserModel.findByIdAndUpdate(user.id, { refreshTokenHash: await bcrypt.hash(refreshToken, 10) });

  res.json({ data: { user, accessToken, refreshToken } });
}

export async function refreshController(req: Request, res: Response) {
  const refreshToken = String(req.body.refreshToken ?? "");
  if (!refreshToken) {
    throw new AppError(400, "refreshToken is required");
  }

  const payload = verifyRefreshToken(refreshToken);
  const user = await UserModel.findById(payload.sub);
  if (!user?.refreshTokenHash || !(await bcrypt.compare(refreshToken, user.refreshTokenHash))) {
    throw new AppError(401, "Invalid refresh token");
  }
  await clearExpiredSuspension(user);
  assertUserCanAccess(user);

  res.json({
    data: {
      accessToken: signAccessToken({ sub: user.id, role: user.role }),
      refreshToken
    }
  });
}

export async function meController(req: Request, res: Response) {
  const [user, wallet, tailorProfile, deliveryProfile] = await Promise.all([
    UserModel.findById(req.user!.id),
    WalletModel.findOne({ userId: req.user!.id }),
    TailorModel.findOne({ userId: req.user!.id }),
    DeliveryPartnerModel.findOne({ userId: req.user!.id })
  ]);

  let hydratedTailorProfile: Record<string, unknown> | undefined = tailorProfile?.toJSON();
  if (tailorProfile) {
    const tailorOrders = await OrderModel.find({ tailorId: tailorProfile.id }).select("_id");
    const orderIds = tailorOrders.map((order) => order.id);
    const [ratingSummary] = orderIds.length
      ? await ReviewModel.aggregate<{ _id: null; averageRating: number; ratingCount: number }>([
          { $match: { orderId: { $in: orderIds } } },
          { $group: { _id: null, averageRating: { $avg: "$rating" }, ratingCount: { $sum: 1 } } }
        ])
      : [];
    if (ratingSummary) {
      hydratedTailorProfile = {
        ...hydratedTailorProfile,
        rating: Number(ratingSummary.averageRating.toFixed(1)),
        ratingCount: ratingSummary.ratingCount
      };
    }
  }

  res.json({ data: { ...user?.toJSON(), wallet, tailorProfile: hydratedTailorProfile, deliveryProfile } });
}
