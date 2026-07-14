import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { requestOtpSchema, verifyOtpSchema } from "@darzi/shared";
import { DeliveryPartnerModel, DeliveryRequestModel, OrderModel, ReviewModel, TailorModel, TailoringRequestModel, TailorQuoteModel, UserModel, WalletModel } from "../models.js";
import { requestOtp, verifyOtp } from "../services/otp.service.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
import { AppError } from "../middleware/error.js";
import { env } from "../env.js";

async function resetAutoVerifiedDeliveryProfile(userId: string, phone?: string) {
  const profile = await DeliveryPartnerModel.findOne({ userId });
  if (
    profile?.verificationStatus === "VERIFIED" &&
    !profile.verificationReviewedAt &&
    !profile.verificationSubmittedAt &&
    !profile.verification
  ) {
    return DeliveryPartnerModel.findByIdAndUpdate(
      profile.id,
      { verificationStatus: "NOT_SUBMITTED", isAvailable: false },
      { returnDocument: "after" }
    );
  }
  return profile;
}

async function resetAutoVerifiedTailorProfile(userId: string) {
  const profile = await TailorModel.findOne({ userId });
  if (
    profile?.verificationStatus === "VERIFIED" &&
    !profile.verificationReviewedAt &&
    !profile.verificationSubmittedAt &&
    !profile.verification
  ) {
    return TailorModel.findByIdAndUpdate(
      profile.id,
      { verificationStatus: "NOT_SUBMITTED", isAvailable: false },
      { returnDocument: "after" }
    );
  }
  return profile;
}

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

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - diff);
  return start;
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function dateValue(value?: Date | string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
    await resetAutoVerifiedTailorProfile(user.id);
  }
  if (input.role === "DELIVERY_PARTNER") {
    await DeliveryPartnerModel.updateOne(
      { userId: user.id },
      { $setOnInsert: { userId: user.id, verificationStatus: "NOT_SUBMITTED", isAvailable: false } },
      { upsert: true }
    );
    await resetAutoVerifiedDeliveryProfile(user.id, input.phone);
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
  const [user, wallet] = await Promise.all([
    UserModel.findById(req.user!.id),
    WalletModel.findOne({ userId: req.user!.id })
  ]);
  const [tailorProfile, deliveryProfile] = await Promise.all([
    resetAutoVerifiedTailorProfile(req.user!.id),
    resetAutoVerifiedDeliveryProfile(req.user!.id, user?.phone)
  ]);

  let hydratedTailorProfile: Record<string, unknown> | undefined = tailorProfile?.toJSON();
  if (tailorProfile) {
    const [tailorOrders, completedGenericOrders, acceptedQuotes] = await Promise.all([
      OrderModel.find({ tailorId: tailorProfile.id }).select("_id"),
      OrderModel.find({ tailorId: tailorProfile.id, status: { $in: ["READY", "DELIVERED", "STITCHING_COMPLETED"] } }).select("totalAmount"),
      TailorQuoteModel.find({ tailorId: tailorProfile.id, status: "ACCEPTED" }).select("_id price")
    ]);
    const orderIds = tailorOrders.map((order) => order.id);
    const [ratingSummary] = orderIds.length
      ? await ReviewModel.aggregate<{ _id: null; averageRating: number; ratingCount: number }>([
          { $match: { orderId: { $in: orderIds } } },
          { $group: { _id: null, averageRating: { $avg: "$rating" }, ratingCount: { $sum: 1 } } }
        ])
      : [];
    const acceptedQuoteIds = acceptedQuotes.map((quote) => quote.id);
    const completedTailoringRequests = acceptedQuoteIds.length
      ? await TailoringRequestModel.find({
          selectedQuoteId: { $in: acceptedQuoteIds },
          status: "TAILOR_SELECTED",
          workStatus: "READY"
        }).select("selectedQuoteId quoteAmount")
      : [];
    const acceptedQuoteAmountById = new Map(acceptedQuotes.map((quote) => [quote.id, Number(quote.price ?? 0)]));
    const tailoringEarnings = completedTailoringRequests.reduce(
      (sum, request) => sum + Number(request.quoteAmount ?? acceptedQuoteAmountById.get(String(request.selectedQuoteId ?? "")) ?? 0),
      0
    );
    const genericOrderEarnings = completedGenericOrders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0);
    if (ratingSummary) {
      hydratedTailorProfile = {
        ...hydratedTailorProfile,
        earnings: tailoringEarnings + genericOrderEarnings,
        rating: Number(ratingSummary.averageRating.toFixed(1)),
        ratingCount: ratingSummary.ratingCount
      };
    } else {
      hydratedTailorProfile = {
        ...hydratedTailorProfile,
        earnings: tailoringEarnings + genericOrderEarnings
      };
    }
  }

  let hydratedDeliveryProfile: Record<string, unknown> | undefined = deliveryProfile?.toJSON();
  if (deliveryProfile) {
    const deliveredTasks = await DeliveryRequestModel.find({
      assignedDeliveryPartnerId: deliveryProfile.id,
      taskStatus: "delivered"
    }).select("estimatedEarnings deliveredAt createdAt");
    const today = startOfToday();
    const week = startOfWeek();
    const month = startOfMonth();
    const totalEarnings = deliveredTasks.reduce((sum, task) => sum + Number(task.estimatedEarnings ?? 0), 0);
    const dailyEarnings = deliveredTasks.reduce((sum, task) => {
      const deliveredAt = dateValue(task.deliveredAt ?? task.createdAt);
      return deliveredAt && deliveredAt >= today ? sum + Number(task.estimatedEarnings ?? 0) : sum;
    }, 0);
    const weeklyEarnings = deliveredTasks.reduce((sum, task) => {
      const deliveredAt = dateValue(task.deliveredAt ?? task.createdAt);
      return deliveredAt && deliveredAt >= week ? sum + Number(task.estimatedEarnings ?? 0) : sum;
    }, 0);
    const monthlyEarnings = deliveredTasks.reduce((sum, task) => {
      const deliveredAt = dateValue(task.deliveredAt ?? task.createdAt);
      return deliveredAt && deliveredAt >= month ? sum + Number(task.estimatedEarnings ?? 0) : sum;
    }, 0);
    hydratedDeliveryProfile = {
      ...hydratedDeliveryProfile,
      totalEarnings,
      withdrawableBalance: totalEarnings,
      dailyEarnings,
      weeklyEarnings,
      monthlyEarnings
    };
  }

  res.json({ data: { ...user?.toJSON(), wallet, tailorProfile: hydratedTailorProfile, deliveryProfile: hydratedDeliveryProfile } });
}

export async function updateMeController(req: Request, res: Response) {
  const { name, email, gender, dateOfBirth, avatarPreset, avatarUri } = req.body;
  const updateData: Record<string, any> = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (gender !== undefined) updateData.gender = gender;
  if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
  if (avatarPreset !== undefined) updateData.avatarPreset = avatarPreset;
  if (avatarUri !== undefined) updateData.avatarUri = avatarUri;

  if (avatarUri) {
    updateData.avatarUrl = avatarUri;
  }

  const user = await UserModel.findByIdAndUpdate(
    req.user!.id,
    { $set: updateData },
    { returnDocument: "after" }
  );
  if (!user) {
    throw new AppError(404, "User not found");
  }
  res.json({ data: user });
}

