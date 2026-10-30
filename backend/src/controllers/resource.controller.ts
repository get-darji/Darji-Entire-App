import type { Request, Response } from "express";
import mongoose from "mongoose";
import archiver from "archiver";
import PDFDocument from "pdfkit";
import { PROTECTED_ADMIN_PHONE, adminInviteRole } from "../utils/admin-access.js";
import {
  CUSTOMER_WEBSITE_SLIDER_SETTING_KEY,
  addressSchema,
  couponSchema,
  createOrderSchema,
  customerWebsiteSliderSchema,
  normalizeCustomerWebsiteSlider,
  serviceCatalog,
  supportTicketSchema,
  bugReportSchema,
  accountChangeRequestSchema
} from "@darji/shared";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import {
  AddressModel,
  CouponModel,
  CouponRedemptionModel,
  DeliveryBatchModel,
  DeliveryPartnerModel,
  NotificationModel,
  OperationalAlertModel,
  OrderModel,
  OtpRequestModel,
  OtpDeliveryModel,
  PaymentModel,
  PaymentHistoryModel,
  ReviewModel,
  ServiceCategoryModel,
  ServiceModel,
  SettingModel,
  SupportTicketModel,
  TailorModel,
  TransactionModel,
  UserModel,
  WalletModel,
  WalletTransactionModel,
  BugReportModel,
  AccountChangeRequestModel,
  DeliveryRequestModel,
  TailorQuoteModel,
  TailoringRequestModel,
  deliveryTypes,
  AdminAuditLogModel,
  AdminOrderMetadataModel,
  MeasurementVisitModel,
  NotificationCampaignModel,
  MarketingSignupModel,
  ServiceAreaInterestModel,
  ensureDarjiCustomerId
} from "../models.js";
import multer from "multer";
import { z } from "zod";
import { env } from "../env.js";
import { AppError } from "../middleware/error.js";
import { auditRequestContext } from "../middleware/admin-audit.js";
import { assignOrder, createOrder, getOrder, listOrders, updateOrderStatus } from "../services/order.service.js";
import { pushRuntimeStatus, saveFcmToken, sendPushToUsers } from "../services/push.service.js";
import { nextDarjiId } from "../utils/darji-id.js";
import { sendPaymentSuccessNotification } from "../services/notificationService.js";
import { assignPendingTasksToPartner } from "./request.controller.js";
import { ensureDeliveryBatchesFromRequests, notifyScheduledBatchNow, recalculateBatchTotals } from "../services/hybrid-delivery.service.js";
import { emitToCustomer, emitToAdmins, emitToUserRole, publishFestivalTheme, publishPlatformStatus } from "../services/socket.service.js";
import { createWeeklyPayout, endOfWeek, startOfWeek, walletSummary, type WalletUserType } from "../services/wallet.service.js";
import { getPlatformStatus, savePlatformStatus } from "../services/platform-status.service.js";
import { getFestivalThemeState, saveFestivalTheme } from "../services/festival-theme.service.js";
import { getDashboardAnalytics } from "../services/dashboard-analytics.service.js";
import { OPERATIONAL_ALLOWANCE_PER_ORDER, allocateAmountExactly, paymentDedupeKey } from "../services/financial-reporting.logic.js";
import { assertFreshDeliveryLocation, markStaleDeliveryPartnersOffline } from "../services/delivery-location.service.js";
import { couponsVisibleToCustomer } from "../services/coupon.service.js";
import { checkServiceAvailability, getServiceAreaConfig, saveServiceAreaConfig } from "../services/service-area.service.js";
import { extractTailorPoint, geocodeAddress, pointFrom, roadDistanceMatrix, type LatLng } from "../services/delivery-pricing.service.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
});

export const uploadTailorAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 5 * 1024 * 1024 }
}).single("avatar");

export const uploadTailorVerificationMedia = multer({
  storage: multer.memoryStorage(),
  limits: { files: 8, fileSize: 8 * 1024 * 1024 }
}).array("media", 8);

export const uploadAdminMedia = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 100 * 1024 * 1024 }
}).single("media");

export const uploadDeliveryAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 5 * 1024 * 1024 }
}).single("avatar");

export const uploadDeliveryVerificationMedia = multer({
  storage: multer.memoryStorage(),
  limits: { files: 4, fileSize: 5 * 1024 * 1024 }
}).array("media", 4);

const tailorVerificationReuploadFields = ["aadhaarFront", "aadhaarBack", "panPhoto", "facePhoto", "shopPhotos"] as const;

function isSupportAdmin(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

function supportClientApp(role: string) {
  if (role === "TAILOR") return "tailor";
  if (role === "DELIVERY_PARTNER") return "delivery";
  return "customer";
}

function supportChannel(role: string) {
  if (role === "TAILOR") return "tailor-pickup-updates-v2";
  if (role === "DELIVERY_PARTNER") return "delivery-updates-v2";
  return "customer-orders-v2";
}

const tailorProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().min(8).max(500).optional(),
  workingHours: z.object({ from: z.string().trim().max(10).optional(), to: z.string().trim().max(10).optional() }).optional(),
  settings: z
    .object({
      notifications: z.boolean().optional(),
      soundAlerts: z.boolean().optional(),
      compactCards: z.boolean().optional(),
      autoOpenNewRequests: z.boolean().optional(),
      darkMode: z.boolean().optional(),
      measurementUnits: z.enum(["Centimeters", "Inches"]).optional()
    })
    .optional()
});

const tailorVerificationSchema = z.object({
  personal: z.object({
    name: z.string().trim().min(2).max(80),
    address: z.string().trim().min(8).max(500),
    dob: z.string().trim().min(6).max(20),
    email: z.string().trim().email().optional().or(z.literal("")),
    location: z.object({ lat: z.number(), lng: z.number() }).optional()
  }),
  shop: z.object({
    workFromHome: z.boolean().optional(),
    shopName: z.string().trim().min(2).max(100),
    shopAddress: z.string().trim().min(8).max(500),
    gstNumber: z.string().trim().max(30).optional().or(z.literal("")),
    employeeCount: z.number().int().min(0).max(500),
    yearsExperience: z.number().int().min(0).max(80),
    shopPhotos: z.array(z.string().url()).min(1).max(3)
  }),
  bank: z.object({
    accountHolder: z.string().trim().min(2).max(80).optional(),
    accountNumber: z.string().trim().min(6).max(30).optional(),
    ifsc: z.string().trim().min(4).max(20).optional(),
    upi: z.string().trim().max(80).optional().or(z.literal(""))
  }).optional().default({}).superRefine((bank, ctx) => {
    const hasBankEntry = Boolean(bank.accountHolder || bank.accountNumber || bank.ifsc);
    if (hasBankEntry && !(bank.accountHolder && bank.accountNumber && bank.ifsc)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Add account holder, account number, and IFSC together" });
    }
  }),
  specialties: z.array(z.string().trim().min(2).max(80)).max(50).optional(),
  specializationRows: z
    .array(
      z.object({
        gender: z.enum(["Men", "Women", "Both"]),
        clothType: z.string().trim().min(2).max(80),
        stitchingType: z.string().trim().min(2).max(80),
        price: z.number().min(0).max(100000)
      })
    )
    .min(1)
    .max(50),
  idVerification: z
    .object({
      idType: z.enum(["Aadhaar", "PAN", "License"]),
      idNumber: z.string().trim().min(10).max(20),
      aadhaarFrontUrl: z.string().url().optional(),
      aadhaarBackUrl: z.string().url().optional(),
      panUrl: z.string().url().optional(),
      facePhotoUrl: z.string().url().optional(),
      ocrStatus: z.string().trim().max(80).optional(),
      extractedDetails: z.record(z.string(), z.unknown()).optional(),
      faceDetectionStatus: z.string().trim().max(80).optional()
    })
    .superRefine((value, ctx) => {
      if (value.idType === "Aadhaar" && !value.aadhaarFrontUrl) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Aadhaar front photo is required", path: ["aadhaarFrontUrl"] });
      }
      if (value.idType === "Aadhaar" && !value.aadhaarBackUrl) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Aadhaar back photo is required", path: ["aadhaarBackUrl"] });
      }
      if (value.idType === "PAN" && !value.panUrl) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "PAN card photo is required", path: ["panUrl"] });
      }
      if (value.idType === "License" && !value.panUrl) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Driving licence photo is required", path: ["panUrl"] });
      }
      if (!value.facePhotoUrl) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Face verification photo is required", path: ["facePhotoUrl"] });
      }
    })
});

const tailorVerificationDraftSchema = z.object({
  step: z.number().int().min(1).max(5).optional(),
  draft: z.record(z.string(), z.unknown())
});

const deliveryProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().min(8).max(500).optional(),
  workingHours: z.string().trim().max(80).optional(),
  deliveryType: z.enum(deliveryTypes).optional(),
  assignedArea: z.string().trim().min(1).max(100).optional(),
  settings: z
    .object({
      notifications: z.boolean().optional(),
      soundAlerts: z.boolean().optional(),
      vibrationAlerts: z.boolean().optional(),
      darkMode: z.boolean().optional(),
      instantDeliveries: z.boolean().optional(),
      radius: z.string().trim().max(20).optional(),
      availability: z.string().trim().max(40).optional()
    })
    .optional()
});

const payoutSchema = z.object({
  userId: z.string().trim().min(1),
  userType: z.enum(["TAILOR", "DELIVERY_PARTNER"]),
  amount: z.coerce.number().positive(),
  receiptUrl: z.string().trim().min(1),
  notes: z.string().trim().max(500).optional(),
  weekStart: z.string().datetime().optional(),
  weekEnd: z.string().datetime().optional(),
  referenceNumber: z.string().trim().max(120).optional()
});

const fareSchema = z.object({
  partnerFare: z.coerce.number().positive(),
  customerCharge: z.coerce.number().nonnegative()
});

const deliveryFareSettingsSchema = z.object({
  normal: fareSchema,
  express: fareSchema,
  instant: fareSchema
});

const deliveryVerificationSchema = z.object({
  personal: z.object({
    fullName: z.string().trim().min(2).max(80),
    dob: z.string().trim().min(6).max(20),
    gender: z.string().trim().min(1).max(20),
    email: z.string().trim().email().optional().or(z.literal("")),
    emergencyContact: z.string().trim().min(10).max(15),
    address: z.string().trim().min(8).max(500),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    pincode: z.string().trim().min(4).max(10)
  }),
  identity: z.object({
    identityType: z.enum(["Aadhaar", "PAN"]),
    aadhaarNumber: z.string().trim().max(20).optional().or(z.literal("")),
    panNumber: z.string().trim().max(20).optional().or(z.literal("")),
    identityFrontUrl: z.string().url().optional(),
    identityBackUrl: z.string().url().optional(),
    facePhotoUrl: z.string().url().optional(),
    ocrStatus: z.string().trim().max(80).optional(),
    faceStatus: z.string().trim().max(80).optional()
  }),
  license: z.object({
    licenseNumber: z.string().trim().min(5).max(40),
    licenseExpiry: z.string().trim().min(6).max(20),
    licenseFrontUrl: z.string().url().optional(),
    licenseBackUrl: z.string().url().optional()
  }),
  vehicle: z.object({
    vehicleType: z.string().trim().min(2).max(40),
    vehicleNumber: z.string().trim().min(4).max(30),
    vehicleModel: z.string().trim().min(2).max(80),
    rcPhotoUrl: z.string().url().optional(),
    insurancePhotoUrl: z.string().url().optional()
  }),
  bank: z.object({
    accountHolder: z.string().trim().min(2).max(80),
    accountNumber: z.string().trim().min(6).max(30),
    ifsc: z.string().trim().min(4).max(20),
    upi: z.string().trim().max(80).optional().or(z.literal(""))
  }),
  preferences: z.object({
    availability: z.string().trim().min(2).max(40),
    radius: z.string().trim().min(2).max(20),
    instantDeliveries: z.boolean()
  })
});

const deliveryVerificationDraftSchema = z.object({
  step: z.number().int().min(1).max(8).optional(),
  draft: z.record(z.string(), z.unknown())
});

const verificationReviewSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED", "REUPLOAD_REQUIRED"]),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
  reuploadFields: z.array(z.enum(tailorVerificationReuploadFields)).max(tailorVerificationReuploadFields.length).optional(),
  deliveryType: z.enum(deliveryTypes).optional(),
  assignedArea: z.string().trim().min(1).max(100).optional()
});

const reassignBatchTaskSchema = z.object({
  batchId: z.string().trim().min(1)
});

const userModerationSchema = z
  .object({
    action: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]),
    reason: z.string().trim().max(500).optional().or(z.literal("")),
    suspendedUntil: z.string().datetime().optional()
  })
  .superRefine((value, ctx) => {
    if (value.action === "SUSPENDED" && !value.suspendedUntil) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "suspendedUntil is required when suspending a user",
        path: ["suspendedUntil"]
      });
    }
  });

const fcmTokenSchema = z.object({
  token: z.string().trim().min(20),
  platform: z.string().trim().max(30).optional(),
  app: z.string().trim().max(40).optional()
});

function assertCloudinaryConfigured() {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new AppError(503, "Cloudinary is not configured on the backend");
  }
}

async function uploadTailorImageBuffer(file: Express.Multer.File, folder = "darji/tailor-verification") {
  if (!file.mimetype.startsWith("image/")) throw new AppError(400, "Only image uploads are allowed");
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        use_filename: false,
        unique_filename: true
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result);
      }
    );
    stream.end(file.buffer);
  });
}

async function uploadAdminMediaBuffer(file: Express.Multer.File, folder = "darji/admin-media") {
  if (!file.mimetype.startsWith("image/") && !file.mimetype.startsWith("video/")) {
    throw new AppError(400, "Only image or video uploads are allowed");
  }
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        use_filename: false,
        unique_filename: true
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result);
      }
    );
    stream.end(file.buffer);
  });
}

function defaultTailorReuploadFields(verification: unknown): Array<(typeof tailorVerificationReuploadFields)[number]> {
  const idType = String((verification as { idVerification?: { idType?: string } } | undefined)?.idVerification?.idType ?? "Aadhaar");
  return idType === "Aadhaar" ? ["aadhaarFront", "aadhaarBack", "facePhoto"] : ["panPhoto", "facePhoto"];
}

function normalizeTailorTutorialMedia(value: unknown) {
  const media = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const images = Array.isArray(media.images) ? media.images.filter((item): item is string => typeof item === "string" && /^https?:\/\//i.test(item)).slice(0, 12) : [];
  return {
    title: typeof media.title === "string" && media.title.trim() ? media.title.trim() : "How Darji Works for Tailors",
    description: typeof media.description === "string" && media.description.trim() ? media.description.trim() : "Watch the complete tutorial before submitting your verification.",
    videoUrl: typeof media.videoUrl === "string" ? media.videoUrl : "",
    thumbnailUrl: typeof media.thumbnailUrl === "string" ? media.thumbnailUrl : "",
    durationSeconds: Number.isFinite(Number(media.durationSeconds)) ? Math.max(5, Math.min(3600, Number(media.durationSeconds))) : 15,
    images
  };
}

async function withUser<T extends { toJSON: () => Record<string, unknown>; userId: string }>(profile: T) {
  const user = await UserModel.findById(profile.userId).select("name phone role email profileUrl avatarUrl accountStatus suspendedUntil moderationReason moderatedAt");
  const profileValue = profile.toJSON() as Record<string, any>;
  const userValue = user?.toJSON() as Record<string, unknown> | undefined;
  const personal = profileValue.verification?.personal as { name?: unknown; fullName?: unknown } | undefined;
  const canonicalTailorName = "shopName" in profileValue
    ? [personal?.name, personal?.fullName, profileValue.displayName]
        .find((value) => typeof value === "string" && value.trim())
    : undefined;
  const avatarUrl = userValue?.profileUrl
    || profileValue.verification?.idVerification?.facePhotoUrl
    || profileValue.verification?.identity?.facePhotoUrl
    || userValue?.avatarUrl;
  if (avatarUrl && !user?.get("profileUrl")) {
    await UserModel.updateOne({ _id: profile.userId, profileUrl: { $in: [null, ""] } }, { $set: { profileUrl: avatarUrl } });
  }
  return {
    ...profileValue,
    user: userValue ? { ...userValue, ...(canonicalTailorName ? { name: canonicalTailorName } : {}), profileUrl: avatarUrl, avatarUrl } : avatarUrl ? { profileUrl: avatarUrl, avatarUrl } : undefined
  };
}

async function ensureDeliveryPartnerRoleId(partner: { id: string; deliveryType?: string; darjiPartnerId?: string | null }) {
  const prefix = String(partner.deliveryType ?? "").toUpperCase() === "DROP" ? "DDP" : "DPP";
  const current = String(partner.darjiPartnerId ?? "");
  if (current.includes(`-${prefix}-`)) return current;
  const darjiPartnerId = await nextDarjiId(prefix);
  await DeliveryPartnerModel.findByIdAndUpdate(partner.id, { darjiPartnerId });
  return darjiPartnerId;
}

function normalizeUserForAdmin(user: Record<string, any>) {
  const isCustomer = String(user.role ?? "").toUpperCase() === "CUSTOMER";
  const profileUrl = user.profileUrl || (isCustomer
    ? user.customerAvatarUri || user.customerAvatarUrl || user.avatarUri || user.avatarUrl
    : user.avatarUrl);
  return {
    ...user,
    name: isCustomer ? user.customerName || user.name : user.name,
    profileUrl,
    avatarUrl: profileUrl,
    avatarPreset: isCustomer ? user.customerAvatarPreset || user.avatarPreset : user.avatarPreset
  };
}

async function attachProfilesToUsers(users: Array<Record<string, unknown>>) {
  if (users.length === 0) return [];

  const userIds = users.map((user) => String(user.id ?? user._id));
  const [tailors, partners] = await Promise.all([
    TailorModel.find({ userId: { $in: userIds } }).lean(),
    DeliveryPartnerModel.find({ userId: { $in: userIds } }).lean()
  ]);

  const tailorMap = new Map(tailors.map((tailor) => [String(tailor.userId), tailor]));
  const partnerMap = new Map(partners.map((partner) => [String(partner.userId), partner]));

  return Promise.all(users.map(async (user) => {
    const userId = String(user.id ?? user._id);
    const tailorProfile = tailorMap.get(userId);
    const deliveryProfile = partnerMap.get(userId);
    const normalized = normalizeUserForAdmin(user);
    const profileUrl = user.profileUrl || (String(user.role).toUpperCase() === "TAILOR"
      ? (tailorProfile as any)?.verification?.idVerification?.facePhotoUrl
      : String(user.role).toUpperCase() === "DELIVERY_PARTNER"
        ? (deliveryProfile as any)?.verification?.identity?.facePhotoUrl
        : undefined) || normalized.profileUrl;
    if (profileUrl && !user.profileUrl) {
      await UserModel.updateOne({ _id: userId, profileUrl: { $in: [null, ""] } }, { $set: { profileUrl } });
    }
    return { ...normalized, profileUrl, avatarUrl: profileUrl, tailorProfile: tailorProfile ?? null, deliveryProfile: deliveryProfile ?? null };
  }));
}

async function deleteAccountByUserId(userId: string) {
  const user = await UserModel.findById(userId).select("role phone");
  if (!user) throw new AppError(404, "User not found");
  if (user.phone === PROTECTED_ADMIN_PHONE) throw new AppError(403, "Owner admin access cannot be removed");
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    throw new AppError(403, "Admin accounts cannot be deleted here");
  }

  await Promise.all([
    UserModel.findByIdAndDelete(userId),
    TailorModel.deleteOne({ userId }),
    DeliveryPartnerModel.deleteOne({ userId }),
    AddressModel.deleteMany({ userId }),
    NotificationModel.deleteMany({ userId }),
    WalletModel.deleteMany({ userId }),
    WalletTransactionModel.deleteMany({ userId }),
    PaymentHistoryModel.deleteMany({ userId }),
    OtpRequestModel.deleteMany({ $or: [{ userId }, { phone: user.phone }] }),
    OtpDeliveryModel.deleteMany({ phone: user.phone })
  ]);

  return { userId, role: user.role };
}

function createDarjiTailorId() {
  return `DRJ-TLR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function catalogController(_req: Request, res: Response) {
  const services = await ServiceModel.find({ isActive: true }).sort({ name: 1 });
  if (services.length > 0) {
    const data = await Promise.all(
      services.map(async (service) => {
        const category = await ServiceCategoryModel.findById(service.categoryId);
        return {
          id: service.id,
          category: category?.name ?? "General",
          name: service.name,
          price: service.price,
          estimatedDelivery: service.estimatedDelivery,
          description: service.description,
          imageUrl: service.imageUrl ?? ""
        };
      })
    );
    return res.json({ data });
  }

  const fallback = serviceCatalog.flatMap((category) =>
    category.items.map(([name, price, estimatedDelivery, description]) => ({
      id: `${category.category}-${name}`.toLowerCase().replace(/\s+/g, "-"),
      category: category.category,
      name,
      price,
      estimatedDelivery,
      description,
      imageUrl: `https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80`
    }))
  );
  return res.json({ data: fallback });
}

export async function createAddressController(req: Request, res: Response) {
  const input = addressSchema.parse(req.body);
  if (input.isDefault) {
    await AddressModel.updateMany({ userId: req.user!.id }, { isDefault: false });
  }
  const address = await AddressModel.create({ ...input, userId: req.user!.id });
  res.status(201).json({ data: address });
}

export async function listAddressesController(req: Request, res: Response) {
  const addresses = await AddressModel.find({ userId: req.user!.id }).sort({ createdAt: -1 });
  res.json({ data: addresses });
}

export async function createOrderController(req: Request, res: Response) {
  const order = await createOrder(req.user!.id, req.body);
  res.status(201).json({ data: order });
}

const adminCreateOrderSchema = createOrderSchema.omit({ addressId: true }).extend({
  customerId: z.string().min(1),
  address: addressSchema
});

export async function adminCreateOrderController(req: Request, res: Response) {
  const input = adminCreateOrderSchema.parse(req.body);
  const customer = await UserModel.findOne({ _id: input.customerId, role: "CUSTOMER" }).select("_id");
  if (!customer) throw new AppError(404, "Customer not found");
  const serviceIds = [...new Set(input.items.map((item) => item.serviceId))];
  const activeServiceCount = await ServiceModel.countDocuments({ _id: { $in: serviceIds }, isActive: true });
  if (activeServiceCount !== serviceIds.length) throw new AppError(400, "One or more selected services are no longer available");

  const address = await AddressModel.create({ ...input.address, userId: input.customerId });
  const { customerId, address: _address, ...orderInput } = input;
  const order = await createOrder(customerId, { ...orderInput, addressId: address.id });
  res.status(201).json({ data: order });
}

export async function listOrdersController(req: Request, res: Response) {
  const orders = await listOrders(req.user!, req.query);
  res.json({ data: orders });
}

export async function getOrderController(req: Request, res: Response) {
  const order = await getOrder(String(req.params.id), req.user!);
  if (!order) throw new AppError(404, "Order not found");
  res.json({ data: order });
}

export async function updateOrderStatusController(req: Request, res: Response) {
  const order = await updateOrderStatus(String(req.params.id), req.body, req.user!);
  res.json({ data: order });
}

export async function assignOrderController(req: Request, res: Response) {
  const order = await assignOrder(String(req.params.id), req.body, req.user!);
  res.json({ data: order });
}

export async function listTailorsController(req: Request, res: Response) {
  await TailorModel.updateMany(
    {
      verificationStatus: "NOT_SUBMITTED",
      $or: [
        { verificationSubmittedAt: { $exists: true, $ne: null } },
        { verification: { $exists: true, $ne: null } }
      ]
    },
    { $set: { verificationStatus: "PENDING" } }
  );
  let tailorQuery = TailorModel.find();
  if (req.query.verification === "submitted") tailorQuery = tailorQuery.where("verificationStatus").in(["PENDING", "VERIFIED", "REJECTED", "REUPLOAD_REQUIRED"]);
  const tailors = await tailorQuery.sort({ createdAt: -1 });
  const tailorIds = tailors.map((tailor) => tailor.id);
  const orders = await OrderModel.find({ tailorId: { $in: tailorIds } }).select("_id tailorId").lean();
  const orderTailorMap = new Map(orders.map((order) => [String(order._id), String(order.tailorId)]));
  const reviews = orders.length
    ? await ReviewModel.find({ kind: "tailor", orderId: { $in: orders.map((order) => String(order._id)) } }).select("orderId rating").lean()
    : [];
  const ratingStats = reviews.reduce((stats, review) => {
    const tailorId = orderTailorMap.get(String(review.orderId));
    if (!tailorId) return stats;
    const current = stats.get(tailorId) ?? { count: 0, sum: 0 };
    stats.set(tailorId, { count: current.count + 1, sum: current.sum + Number(review.rating ?? 0) });
    return stats;
  }, new Map<string, { count: number; sum: number }>());
  const data = await Promise.all(
    tailors.map(async (tailor) => {
      const stats = ratingStats.get(tailor.id);
      const profile = await withUser(tailor);
      const samples = Array.isArray((profile as any).sampleGallery) ? (profile as any).sampleGallery : [];
      return {
        ...profile,
        sampleGallery: req.user?.role === "ADMIN" || req.user?.role === "SUPER_ADMIN"
          ? samples
          : samples.filter((sample: any) => sample.status === "APPROVED"),
        rating: stats?.count ? Number((stats.sum / stats.count).toFixed(1)) : Number(tailor.rating ?? 0),
        ratingCount: stats?.count ?? 0
      };
    })
  );
  res.json({ data });
}

export async function reviewTailorVerificationController(req: Request, res: Response) {
  const input = verificationReviewSchema.parse(req.body);
  const tailor = await TailorModel.findById(String(req.params.id));
  if (!tailor) throw new AppError(404, "Tailor profile not found");
  if (tailor.verificationStatus === "VERIFIED" && input.status !== "VERIFIED") throw new AppError(409, "A verified tailor status is locked");
  const beforeReview = tailor.toObject();

  const now = new Date();
  tailor.verificationStatus = input.status;
  tailor.verificationReviewedAt = now;
  tailor.verificationRejectionReason = input.reason || undefined;

  if (input.status === "REUPLOAD_REQUIRED") {
    tailor.verificationReuploadFields = input.reuploadFields?.length ? input.reuploadFields : defaultTailorReuploadFields(tailor.verification);
    tailor.verificationRejectedUntil = undefined;
    tailor.verificationLastRejectedAt = undefined;
  } else if (input.status === "REJECTED") {
    tailor.verificationReuploadFields = [];
    tailor.verificationLastRejectedAt = now;
    tailor.verificationRejectedUntil = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  } else {
    tailor.verificationReuploadFields = [];
    tailor.verificationRejectedUntil = undefined;
    tailor.verificationLastRejectedAt = undefined;
    if (input.status === "VERIFIED") tailor.isAvailable = true;
  }

  await tailor.save();
  await recordAdminPartnerChanges(req, "TAILOR", String(tailor.id), "Tailor verification review updated", profileChanges({ profile: beforeReview }, { profile: tailor.toObject() }).filter((change) => !change.field.startsWith("profile.updatedAt")));
  res.json({ data: await withUser(tailor) });
}

export async function updateTailorAvailabilityController(req: Request, res: Response) {
  const tailor = await TailorModel.findOne({ userId: req.user!.id });
  if (!tailor) throw new AppError(404, "Tailor profile not found");
  const updated = await TailorModel.findByIdAndUpdate(tailor.id, { isAvailable: Boolean(req.body.isAvailable) }, { returnDocument: "after" });
  res.json({ data: updated });
}

export async function updateTailorProfileController(req: Request, res: Response) {
  const input = tailorProfileSchema.parse(req.body);
  const userUpdate: Record<string, string | null> = {};
  if (input.name) userUpdate.name = input.name;
  if (typeof input.email === "string") userUpdate.email = input.email || null;
  const [user, tailor] = await Promise.all([
    Object.keys(userUpdate).length ? UserModel.findByIdAndUpdate(req.user!.id, userUpdate, { returnDocument: "after" }) : UserModel.findById(req.user!.id),
    TailorModel.findOneAndUpdate(
      { userId: req.user!.id },
      {
        ...(input.name ? { displayName: input.name } : {}),
        ...(input.address ? { "verification.personal.address": input.address } : {}),
        ...(input.workingHours ? { workingHours: input.workingHours } : {}),
        ...(input.settings ? { settings: input.settings } : {})
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    )
  ]);

  res.json({ data: { ...user?.toJSON(), ...(input.name ? { name: input.name } : {}), tailorProfile: tailor } });
}

export async function submitTailorVerificationController(req: Request, res: Response) {
  const input = tailorVerificationSchema.parse(req.body);
  const specialization = input.specialties?.length
    ? [...new Set(input.specialties.map((item) => item.trim()).filter(Boolean))]
    : input.specializationRows.map((row) => `${row.gender} ${row.clothType} ${row.stitchingType}`);
  const existingTailor = await TailorModel.findOne({ userId: req.user!.id }).select("darjiTailorId verificationStatus verificationRejectedUntil verification verificationSubmittedAt registrationSnapshot");
  if (
    existingTailor?.verificationStatus === "REJECTED" &&
    existingTailor.verificationRejectedUntil &&
    existingTailor.verificationRejectedUntil.getTime() > Date.now()
  ) {
    throw new AppError(429, `You can apply again after ${existingTailor.verificationRejectedUntil.toISOString()}`);
  }

  const [user, tailor] = await Promise.all([
    UserModel.findByIdAndUpdate(
      req.user!.id,
      {
        name: input.personal.name,
        avatarUrl: input.idVerification.facePhotoUrl,
        profileUrl: input.idVerification.facePhotoUrl,
        ...(input.personal.email ? { email: input.personal.email } : {})
      },
      { returnDocument: "after" }
    ),
    TailorModel.findOneAndUpdate(
      { userId: req.user!.id },
      {
        $set: {
          displayName: input.personal.name,
          shopName: input.shop.shopName,
          darjiTailorId: existingTailor?.darjiTailorId ?? createDarjiTailorId(),
          specialization,
          verificationStatus: "PENDING",
          verificationSubmittedAt: new Date(),
          verificationReuploadFields: [],
          verification: input,
          ...(!existingTailor?.registrationSnapshot ? { registrationSnapshot: existingTailor?.verification ?? input, registrationSnapshotCapturedAt: existingTailor?.verificationSubmittedAt ?? new Date() } : {})
        },
        $unset: {
          verificationReviewedAt: "",
          verificationRejectionReason: "",
          verificationRejectedUntil: "",
          verificationLastRejectedAt: "",
          verificationDraft: ""
        }
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    )
  ]);

  res.json({ data: { ...user?.toJSON(), tailorProfile: tailor } });
}

export async function saveTailorVerificationDraftController(req: Request, res: Response) {
  const input = tailorVerificationDraftSchema.parse(req.body);
  const tailor = await TailorModel.findOneAndUpdate(
    { userId: req.user!.id },
    {
      verificationDraft: {
        ...input.draft,
        step: input.step ?? input.draft.step,
        savedAt: new Date().toISOString()
      }
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
  res.json({ data: tailor });
}

export async function uploadTailorAvatarController(req: Request, res: Response) {
  void req;
  void res;
  throw new AppError(403, "Tailor profile photos can only be changed by an admin");
}

export async function uploadTailorVerificationMediaController(req: Request, res: Response) {
  assertCloudinaryConfigured();
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw new AppError(400, "Attach at least one verification photo");
  if (files.length > 8) throw new AppError(400, "Upload up to 8 verification photos");

  const uploaded = await Promise.all(
    files.map(async (file) => {
      const result = await uploadTailorImageBuffer(file);
      return {
        url: result.secure_url,
        publicId: result.public_id,
        bytes: result.bytes,
        format: result.format,
        originalName: file.originalname
      };
    })
  );

  res.status(201).json({ data: uploaded });
}

export async function uploadTailorSamplesController(req: Request, res: Response) {
  assertCloudinaryConfigured();
  const tailor = await TailorModel.findOne({ userId: req.user!.id });
  if (!tailor) throw new AppError(404, "Tailor profile not found");

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw new AppError(400, "Attach at least one sample photo");
  const currentSamples = Array.isArray(tailor.sampleGallery) ? tailor.sampleGallery : [];
  const activeSamples = currentSamples.filter((sample: any) => sample.status !== "REJECTED");
  if (activeSamples.length + files.length > 5) throw new AppError(400, "You can keep up to 5 pending or approved sample photos");

  const uploaded = await Promise.all(
    files.slice(0, 5).map(async (file) => {
      const result = await uploadTailorImageBuffer(file, "darji/tailor-samples");
      return {
        url: result.secure_url,
        publicId: result.public_id,
        bytes: result.bytes,
        format: result.format,
        originalName: file.originalname,
        status: "PENDING",
        uploadedAt: new Date()
      };
    })
  );

  const updated = await TailorModel.findByIdAndUpdate(
    tailor.id,
    { $push: { sampleGallery: { $each: uploaded } } },
    { returnDocument: "after" }
  );
  res.status(201).json({ data: await withUser(updated!) });
}

export async function reviewTailorSampleController(req: Request, res: Response) {
  const input = z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    reason: z.string().trim().max(300).optional().or(z.literal(""))
  }).parse(req.body);
  const tailor = await TailorModel.findOneAndUpdate(
    { _id: String(req.params.tailorId), "sampleGallery._id": String(req.params.sampleId) },
    {
      $set: {
        "sampleGallery.$.status": input.status,
        "sampleGallery.$.reviewedAt": new Date(),
        "sampleGallery.$.reviewedBy": req.user!.id,
        "sampleGallery.$.rejectionReason": input.status === "REJECTED" ? input.reason : undefined
      }
    },
    { returnDocument: "after" }
  );
  if (!tailor) throw new AppError(404, "Tailor sample not found");
  res.json({ data: await withUser(tailor) });
}

export async function deleteTailorSampleController(req: Request, res: Response) {
  const tailor = await TailorModel.findOne({ userId: req.user!.id });
  if (!tailor) throw new AppError(404, "Tailor profile not found");

  const sample = (tailor.sampleGallery as any[] | undefined)?.find((item: any) => String(item._id) === String(req.params.sampleId));
  if (!sample) throw new AppError(404, "Tailor sample not found");
  if (sample.status === "APPROVED") throw new AppError(400, "Approved samples cannot be deleted from the app. Contact support.");

  const updated = await TailorModel.findByIdAndUpdate(
    tailor.id,
    { $pull: { sampleGallery: { _id: String(req.params.sampleId) } } },
    { returnDocument: "after" }
  );
  res.json({ data: await withUser(updated!) });
}

export async function uploadAdminMediaController(req: Request, res: Response) {
  assertCloudinaryConfigured();
  const file = req.file;
  if (!file) throw new AppError(400, "Attach an image or video");
  const result = await uploadAdminMediaBuffer(file);
  res.status(201).json({
    data: {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      bytes: result.bytes,
      format: result.format,
      originalName: file.originalname
    }
  });
}

export async function getTailorTutorialMediaController(_req: Request, res: Response) {
  const setting = await SettingModel.findOne({ key: "tailor_tutorial_media" });
  res.json({ data: normalizeTailorTutorialMedia(setting?.value) });
}

export async function listDeliveryPartnersController(req: Request, res: Response) {
  await markStaleDeliveryPartnersOffline();
  await DeliveryPartnerModel.updateMany(
    {
      verificationStatus: "NOT_SUBMITTED",
      $or: [
        { verificationSubmittedAt: { $exists: true, $ne: null } },
        { verification: { $exists: true, $ne: null } }
      ]
    },
    { $set: { verificationStatus: "PENDING" } }
  );
  let partnerQuery = DeliveryPartnerModel.find();
  if (req.query.verification === "submitted") partnerQuery = partnerQuery.where("verificationStatus").in(["PENDING", "VERIFIED", "REJECTED", "REUPLOAD_REQUIRED"]);
  const partners = await partnerQuery.sort({ createdAt: -1 });
  await Promise.all(partners.map((partner) => ensureDeliveryPartnerRoleId(partner)));
  let refreshedQuery = DeliveryPartnerModel.find();
  if (req.query.verification === "submitted") refreshedQuery = refreshedQuery.where("verificationStatus").in(["PENDING", "VERIFIED", "REJECTED", "REUPLOAD_REQUIRED"]);
  const refreshed = await refreshedQuery.sort({ createdAt: -1 });
  res.json({ data: await Promise.all(refreshed.map((partner) => withUser(partner))) });
}

export async function listAdminDeliveryBatchesController(_req: Request, res: Response) {
  await ensureDeliveryBatchesFromRequests();
  const batches = await DeliveryBatchModel.find().sort({ roundAt: -1 }).limit(200);
  const partnerIds = [...new Set(batches.map((batch) => String(batch.deliveryPartnerId ?? "")).filter(Boolean))];
  const batchIds = batches.map((batch) => String(batch.batchId));
  const taskIdsFromBatches = [...new Set(batches.flatMap((batch) => (batch.tasks ?? []).map((taskId) => String(taskId))))];

  const [partners, tasks] = await Promise.all([
    DeliveryPartnerModel.find({ _id: { $in: partnerIds } }),
    DeliveryRequestModel.find({
      $or: [
        { batchId: { $in: batchIds } },
        { _id: { $in: taskIdsFromBatches } }
      ]
    }).sort({ routePosition: 1, acceptedAt: 1, createdAt: 1 })
  ]);

  const partnerMap = new Map(await Promise.all(partners.map(async (partner) => [partner.id, await withUser(partner)] as const)));
  const orderIds = [...new Set(tasks.map((task) => String(task.orderId)).filter(Boolean))];
  const tailoringRequests = await TailoringRequestModel.find({ _id: { $in: orderIds } }).select("customerId orderStatus workStatus status paymentStatus totalAmount confirmedAt createdAt");
  const requestMap = new Map(tailoringRequests.map((request) => [request.id, request.toJSON()]));
  const tasksByBatch = new Map<string, Array<Record<string, unknown>>>();

  for (const task of tasks) {
    const batchId = batchIds.includes(String(task.batchId))
      ? String(task.batchId)
      : String(batches.find((batch) => (batch.tasks ?? []).some((taskId) => String(taskId) === String(task.id)))?.batchId ?? "");
    if (!batchId) continue;
    const list = tasksByBatch.get(batchId) ?? [];
    list.push({
      ...task.toJSON(),
      request: requestMap.get(String(task.orderId)) ?? null
    });
    tasksByBatch.set(batchId, list);
  }

  res.json({
    data: batches.map((batch) => ({
      ...batch.toJSON(),
      partner: batch.deliveryPartnerId ? partnerMap.get(String(batch.deliveryPartnerId)) ?? null : null,
      tasks: tasksByBatch.get(String(batch.batchId)) ?? []
    }))
  });
}

export async function reassignDeliveryBatchTaskController(req: Request, res: Response) {
  const input = reassignBatchTaskSchema.parse(req.body);
  const task = await DeliveryRequestModel.findById(String(req.params.taskId));
  if (!task) throw new AppError(404, "Delivery task not found");

  const targetBatch = await DeliveryBatchModel.findOne({ batchId: input.batchId });
  if (!targetBatch) throw new AppError(404, "Target batch not found");
  if (targetBatch.status === "cancelled" || targetBatch.status === "completed") {
    throw new AppError(409, "Cannot move orders into a completed or cancelled batch");
  }
  const previousBatchId = String(task.batchId ?? "");
  if (previousBatchId === targetBatch.batchId) {
    return res.json({ data: task });
  }

  if (previousBatchId && previousBatchId !== targetBatch.batchId) {
    await DeliveryBatchModel.updateOne(
      { batchId: previousBatchId },
      {
        $pull: { tasks: task.id },
        $inc: {
          ordersCount: -1,
          estimatedEarnings: -Number(task.estimatedEarnings ?? 0),
          totalDistance: -Number(task.estimatedDistanceKm ?? 0)
        }
      }
    );
  }

  const update: Record<string, unknown> = {
    batchId: targetBatch.batchId,
    deliveryRound: targetBatch.deliveryRound,
    roundAt: targetBatch.roundAt,
    shift: targetBatch.shift,
    assignedArea: targetBatch.area
  };
  if (targetBatch.deliveryPartnerId) {
    update.assignedDeliveryPartnerId = targetBatch.deliveryPartnerId;
    update.assignedDeliveryBoyId = targetBatch.deliveryPartnerId;
    update.acceptedAt = new Date();
    if (task.taskStatus === "pending") update.taskStatus = "accepted";
  }

  const updatedTask = await DeliveryRequestModel.findByIdAndUpdate(task.id, update, { returnDocument: "after" });
  await DeliveryBatchModel.updateOne(
    { batchId: targetBatch.batchId },
    {
      $addToSet: { tasks: task.id },
      $inc: {
        ordersCount: previousBatchId === targetBatch.batchId ? 0 : 1,
        estimatedEarnings: Number(task.estimatedEarnings ?? 0),
        totalDistance: Number(task.estimatedDistanceKm ?? 0)
      }
    }
  );
  await Promise.all([
    previousBatchId && previousBatchId !== targetBatch.batchId ? recalculateBatchTotals(previousBatchId) : Promise.resolve(null),
    recalculateBatchTotals(targetBatch.batchId),
    OrderModel.findByIdAndUpdate(task.orderId, { deliveryType: task.deliveryType, deliveryRound: targetBatch.deliveryRound, batchId: targetBatch.batchId }),
    TailoringRequestModel.findByIdAndUpdate(task.orderId, { deliveryType: task.deliveryType, deliveryRound: targetBatch.deliveryRound, batchId: targetBatch.batchId })
  ]);
  res.json({ data: updatedTask });
}

export async function notifyDeliveryBatchController(req: Request, res: Response) {
  const batchId = String(req.params.batchId);
  const result = await notifyScheduledBatchNow(batchId);
  res.json({
    data: {
      batchId,
      notifiedPartners: result.notifiedPartners,
      notifiedTasks: result.notifiedTasks,
      status: result.batch?.status ?? "scheduled"
    }
  });
}

export async function reviewDeliveryVerificationController(req: Request, res: Response) {
  const input = verificationReviewSchema.parse(req.body);
  const beforeReview = await DeliveryPartnerModel.findById(String(req.params.id)).lean();
  if (!beforeReview) throw new AppError(404, "Delivery partner profile not found");
  if (beforeReview.verificationStatus === "VERIFIED" && input.status !== "VERIFIED") throw new AppError(409, "A verified delivery partner status is locked");
  const partner = await DeliveryPartnerModel.findByIdAndUpdate(
    String(req.params.id),
    {
      verificationStatus: input.status,
      verificationReviewedAt: new Date(),
      verificationRejectionReason: input.reason || undefined,
      ...(input.deliveryType ? { deliveryType: input.deliveryType } : {}),
      ...(input.assignedArea ? { assignedArea: input.assignedArea } : {})
    },
    { returnDocument: "after" }
  );

  if (!partner) throw new AppError(404, "Delivery partner profile not found");
  await ensureDeliveryPartnerRoleId(partner);
  const refreshedPartner = await DeliveryPartnerModel.findById(partner.id) ?? partner;
  if (refreshedPartner.isAvailable && refreshedPartner.verificationStatus === "VERIFIED") {
    await assignPendingTasksToPartner(refreshedPartner);
  }
  await recordAdminPartnerChanges(req, "DELIVERY_PARTNER", String(refreshedPartner.id), "Delivery partner verification review updated", profileChanges({ profile: beforeReview }, { profile: refreshedPartner.toObject() }).filter((change) => !change.field.startsWith("profile.updatedAt")));
  res.json({ data: await withUser(refreshedPartner) });
}

export async function listUsersController(_req: Request, res: Response) {
  const users = await UserModel.find()
    .select("phone darjiCustomerId darjiAdminId name customerName email profileUrl avatarUrl avatarPreset avatarUri customerAvatarUrl customerAvatarPreset customerAvatarUri gender dateOfBirth role accountStatus suspendedUntil moderationReason moderatedAt createdAt updatedAt")
    .sort({ createdAt: -1 });
  res.json({ data: await attachProfilesToUsers(users.map((user) => user.toJSON())) });
}

export async function updateCustomerCurrentLocationController(req: Request, res: Response) {
  if (req.user?.role !== "CUSTOMER") throw new AppError(403, "Customer account required");
  const { latitude, longitude, accuracy } = z.object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    accuracy: z.number().finite().nonnegative().optional()
  }).parse(req.body ?? {});
  const updatedAt = new Date();
  const user = await UserModel.findByIdAndUpdate(req.user.id, {
    $set: {
      customerCurrentLocation: { type: "Point", coordinates: [longitude, latitude] },
      customerLocationAccuracy: accuracy,
      customerLocationUpdatedAt: updatedAt
    }
  }, { returnDocument: "after", select: "_id customerLocationUpdatedAt" });
  if (!user) throw new AppError(404, "Customer not found");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json({ data: { updatedAt: user.customerLocationUpdatedAt } });
}

export async function getAdminCustomerProfileController(req: Request, res: Response) {
  const identifier = String(req.params.id);
  const user = await UserModel.findOne({
    $or: [{ _id: identifier }, { darjiCustomerId: identifier }]
  });
  if (!user) throw new AppError(404, "Customer not found");

  const customerId = user.id;
  const [hasOrder, hasRequest, hasVisit] = await Promise.all([
    OrderModel.exists({ customerId }),
    TailoringRequestModel.exists({ customerId }),
    MeasurementVisitModel.exists({ customerId })
  ]);
  const isCustomer = user.role === "CUSTOMER" || Boolean(hasOrder || hasRequest || hasVisit);
  if (!isCustomer) throw new AppError(404, "This account has no customer activity");

  if (!user.darjiCustomerId) {
    await ensureDarjiCustomerId(customerId);
  }

  const [refreshedUser, addresses, regularOrders, tailoringRequests, supportTickets, measurementVisits, notifications] = await Promise.all([
    UserModel.findById(customerId).lean(),
    AddressModel.find({ userId: customerId }).sort({ isDefault: -1, updatedAt: -1 }).lean(),
    OrderModel.find({ customerId }).sort({ createdAt: -1 }).lean(),
    TailoringRequestModel.find({ customerId }).sort({ createdAt: -1 }).lean(),
    SupportTicketModel.find({ userId: customerId }).sort({ createdAt: -1 }).lean(),
    MeasurementVisitModel.find({ customerId }).sort({ createdAt: -1 }).lean(),
    NotificationModel.find({ userId: customerId }).sort({ createdAt: -1 }).limit(25).lean()
  ]);
  if (!refreshedUser) throw new AppError(404, "Customer not found");

  const allOrderIds = [...regularOrders, ...tailoringRequests].map((item: any) => String(item._id));
  const payments = allOrderIds.length
    ? await PaymentModel.find({ orderId: { $in: allOrderIds } }).sort({ createdAt: -1 }).lean()
    : [];
  const paymentByOrder = new Map<string, any>();
  payments.forEach((payment: any) => {
    if (!paymentByOrder.has(String(payment.orderId))) paymentByOrder.set(String(payment.orderId), payment);
  });

  const normalizedRegularOrders = regularOrders.map((order: any) => ({
    id: String(order._id),
    publicId: order.darjiId || order.orderNumber,
    orderNumber: order.orderNumber,
    source: "ORDER",
    title: `${Array.isArray(order.items) ? order.items.length : 0} item${Array.isArray(order.items) && order.items.length === 1 ? "" : "s"}`,
    status: order.status,
    paymentStatus: order.paymentStatus || paymentByOrder.get(String(order._id))?.status || "PENDING",
    paymentMethod: order.paymentMethod,
    amount: Number(order.totalAmount ?? 0),
    itemCount: Array.isArray(order.items) ? order.items.length : 0,
    placedAt: order.createdAt,
    updatedAt: order.updatedAt
  }));
  const normalizedTailoringOrders = tailoringRequests.map((request: any) => ({
    id: String(request._id),
    publicId: request.darjiId || `TRQ-${String(request._id).slice(0, 8).toUpperCase()}`,
    orderNumber: request.darjiId || `TRQ-${String(request._id).slice(0, 8).toUpperCase()}`,
    source: "TAILORING_REQUEST",
    title: [request.workType, request.clothType].filter(Boolean).join(" · ") || "Tailoring request",
    status: request.orderStatus || request.status,
    paymentStatus: request.paymentStatus || paymentByOrder.get(String(request._id))?.status || "PENDING",
    paymentMethod: request.paymentMethod,
    amount: Number(request.totalAmount ?? request.quoteAmount ?? 0),
    itemCount: Number(request.itemCount ?? request.items?.length ?? 1),
    placedAt: request.confirmedAt || request.createdAt,
    updatedAt: request.updatedAt
  }));
  const orders = [...normalizedRegularOrders, ...normalizedTailoringOrders]
    .sort((a, b) => new Date(b.placedAt ?? 0).getTime() - new Date(a.placedAt ?? 0).getTime());

  type ActivityItem = { id: string; type: string; title: string; detail?: string; timestamp?: Date | string; entityId?: string; entityType?: string; tone?: string };
  const activity: ActivityItem[] = [{
    id: `account-${customerId}`,
    type: "ACCOUNT_CREATED",
    title: "Customer account created",
    detail: refreshedUser.darjiCustomerId ? `Customer ID ${refreshedUser.darjiCustomerId}` : undefined,
    timestamp: refreshedUser.createdAt,
    entityId: customerId,
    entityType: "CUSTOMER"
  }];
  orders.forEach((order) => activity.push({
    id: `order-${order.source}-${order.id}`,
    type: String(order.status).toLowerCase().includes("cancel") ? "ORDER_CANCELLED" : "ORDER_UPDATED",
    title: String(order.status).toLowerCase().includes("cancel") ? "Order cancelled" : "Order activity",
    detail: `${order.publicId} · ${order.title} · ${String(order.status).replaceAll("_", " ")}`,
    timestamp: order.updatedAt || order.placedAt,
    entityId: order.id,
    entityType: order.source,
    tone: String(order.status).toLowerCase().includes("cancel") ? "danger" : "default"
  }));
  [...regularOrders.map((order: any) => ({ source: "ORDER", order })), ...tailoringRequests.map((order: any) => ({ source: "TAILORING_REQUEST", order }))]
    .forEach(({ source, order }: any) => {
      ((order.timelineEvents as Array<{ status?: string; description?: string; timestamp?: Date }> | undefined) ?? []).forEach((event, index) => {
        const status = String(event.status ?? "Order updated");
        activity.push({
          id: `timeline-${source}-${String(order._id)}-${index}`,
          type: "ORDER_TIMELINE",
          title: status.replaceAll("_", " "),
          detail: event.description || order.darjiId || order.orderNumber,
          timestamp: event.timestamp,
          entityId: String(order._id),
          entityType: source,
          tone: status.toLowerCase().includes("cancel") ? "danger" : status.toLowerCase().includes("complete") || status.toLowerCase().includes("deliver") ? "success" : "default"
        });
      });
    });
  payments.forEach((payment: any) => activity.push({
    id: `payment-${String(payment._id)}`,
    type: `PAYMENT_${String(payment.status ?? "UPDATED")}`,
    title: payment.status === "PAID" ? "Payment received" : payment.status === "REFUNDED" ? "Payment refunded" : "Payment updated",
    detail: `${payment.method} · ₹${Number(payment.amount ?? 0).toLocaleString("en-IN")} · ${payment.status}`,
    timestamp: payment.refundedAt || payment.paidAt || payment.updatedAt || payment.createdAt,
    entityId: String(payment.orderId),
    entityType: orders.find((order) => order.id === String(payment.orderId))?.source || "ORDER",
    tone: payment.status === "PAID" ? "success" : payment.status === "FAILED" ? "danger" : "default"
  }));
  supportTickets.forEach((ticket: any) => activity.push({
    id: `support-${String(ticket._id)}`,
    type: "SUPPORT_TICKET",
    title: "Support ticket updated",
    detail: `${ticket.darjiId || ticket.subject} · ${ticket.status}`,
    timestamp: ticket.updatedAt || ticket.createdAt,
    entityId: String(ticket._id),
    entityType: "SUPPORT"
  }));
  measurementVisits.forEach((visit: any) => activity.push({
    id: `measurement-${String(visit._id)}`,
    type: "MEASUREMENT_VISIT",
    title: "Measurement visit updated",
    detail: `${visit.darjiId || "Measurement visit"} · ${String(visit.status).replaceAll("_", " ")}`,
    timestamp: visit.submittedAt || visit.cancelledAt || visit.updatedAt || visit.createdAt,
    entityId: String(visit.requestId),
    entityType: "TAILORING_REQUEST"
  }));
  activity.sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime());

  const completedStatuses = new Set(["DELIVERED", "COMPLETED", "completed"]);
  const cancelledStatuses = new Set(["CANCELLED", "cancelled"]);
  const paidTotal = payments
    .filter((payment: any) => payment.status === "PAID")
    .reduce((sum: number, payment: any) => sum + Number(payment.amount ?? 0), 0);
  const registeredApps = [...new Set([
    ...((refreshedUser.fcmTokens as Array<{ app?: string }> | undefined) ?? []).map((token) => token.app),
    ...((refreshedUser.expoPushTokens as Array<{ app?: string }> | undefined) ?? []).map((token) => token.app)
  ].filter(Boolean))];

  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json({
    data: {
      customer: {
        id: String(refreshedUser._id),
        darjiCustomerId: refreshedUser.darjiCustomerId,
        name: refreshedUser.customerName || refreshedUser.name,
        phone: refreshedUser.phone,
        email: refreshedUser.email,
        profileUrl: refreshedUser.profileUrl || refreshedUser.customerAvatarUri || refreshedUser.customerAvatarUrl || refreshedUser.avatarUri || refreshedUser.avatarUrl,
        avatarUrl: refreshedUser.profileUrl || refreshedUser.customerAvatarUri || refreshedUser.customerAvatarUrl || refreshedUser.avatarUri || refreshedUser.avatarUrl,
        role: refreshedUser.role,
        accountStatus: refreshedUser.accountStatus,
        suspendedUntil: refreshedUser.suspendedUntil,
        moderationReason: refreshedUser.moderationReason,
        moderatedAt: refreshedUser.moderatedAt,
        preferredLanguage: refreshedUser.preferredLanguage,
        currentLocation: refreshedUser.customerCurrentLocation,
        locationAccuracy: refreshedUser.customerLocationAccuracy,
        locationUpdatedAt: refreshedUser.customerLocationUpdatedAt,
        createdAt: refreshedUser.createdAt,
        updatedAt: refreshedUser.updatedAt
      },
      stats: {
        totalOrders: orders.length,
        activeOrders: orders.filter((order) => !completedStatuses.has(String(order.status)) && !cancelledStatuses.has(String(order.status))).length,
        completedOrders: orders.filter((order) => completedStatuses.has(String(order.status))).length,
        cancelledOrders: orders.filter((order) => cancelledStatuses.has(String(order.status))).length,
        paidTotal,
        supportTickets: supportTickets.length,
        measurementVisits: measurementVisits.length
      },
      access: {
        accountStatus: refreshedUser.accountStatus,
        suspendedUntil: refreshedUser.suspendedUntil,
        moderationReason: refreshedUser.moderationReason,
        preferredLanguage: refreshedUser.preferredLanguage,
        notificationPreferences: refreshedUser.notificationPreferences?.customer ?? {},
        devicePermissions: (refreshedUser.devicePermissions as { customer?: unknown } | undefined)?.customer ?? null,
        registeredApps,
        hasPushRegistration: registeredApps.length > 0
      },
      addresses: addresses.map((address: any) => ({ ...address, id: String(address._id), _id: undefined })),
      orders,
      recentActivity: activity.slice(0, 100),
      notifications: notifications.map((notification: any) => ({ ...notification, id: String(notification._id), _id: undefined })),
      supportTickets: supportTickets.map((ticket: any) => ({ id: String(ticket._id), darjiId: ticket.darjiId, subject: ticket.subject, status: ticket.status, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt }))
    }
  });
}

export async function moderateUserController(req: Request, res: Response) {
  const input = userModerationSchema.parse(req.body);
  const userId = String(req.params.id);

  if (req.user?.id === userId) {
    throw new AppError(400, "You cannot moderate your own admin account");
  }

  const existingUser = await UserModel.findById(userId).select("role phone");
  if (!existingUser) throw new AppError(404, "User not found");
  if (existingUser.phone === PROTECTED_ADMIN_PHONE) throw new AppError(403, "Owner admin access cannot be suspended or banned");
  if (existingUser.role === "ADMIN" || existingUser.role === "SUPER_ADMIN") {
    throw new AppError(403, "Admin accounts cannot be moderated here");
  }

  const suspendedUntil = input.action === "SUSPENDED" && input.suspendedUntil ? new Date(input.suspendedUntil) : null;
  if (input.action === "SUSPENDED" && (!suspendedUntil || Number.isNaN(suspendedUntil.getTime()) || suspendedUntil.getTime() <= Date.now())) {
    throw new AppError(400, "suspendedUntil must be a future date");
  }

  const updated = await UserModel.findByIdAndUpdate(
    userId,
    {
      accountStatus: input.action,
      suspendedUntil: input.action === "SUSPENDED" ? suspendedUntil : null,
      moderationReason: input.reason || null,
      moderatedAt: new Date()
    },
    { returnDocument: "after" }
  );

  if (!updated) throw new AppError(404, "User not found");
  const [result] = await attachProfilesToUsers([updated.toJSON()]);
  res.json({ data: result });
}

export async function deleteAdminAccountController(req: Request, res: Response) {
  const userId = String(req.params.id);
  if (req.user?.id === userId) {
    throw new AppError(400, "You cannot delete your own admin account");
  }
  const target = await UserModel.findById(userId).select("phone role");
  if (target?.phone === PROTECTED_ADMIN_PHONE) {
    throw new AppError(400, "Owner admin access cannot be removed");
  }

  const deleted = await deleteAccountByUserId(userId);
  res.json({ data: deleted });
}

export async function listOperationalAlertsController(req: Request, res: Response) {
  const requestedStatus = typeof req.query.status === "string" ? req.query.status : undefined;
  const status = requestedStatus && ["OPEN", "ACKNOWLEDGED", "RESOLVED"].includes(requestedStatus) ? requestedStatus as "OPEN" | "ACKNOWLEDGED" | "RESOLVED" : undefined;
  const where = status ? { status } : {};
  const alerts = await OperationalAlertModel.find(where).sort({ status: 1, createdAt: -1 }).limit(100);
  res.json({ data: alerts });
}

export async function updateOperationalAlertController(req: Request, res: Response) {
  const input = z.object({ status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]) }).parse(req.body);
  const now = new Date();
  const update: Record<string, unknown> = { status: input.status };
  if (input.status === "ACKNOWLEDGED") {
    update.acknowledgedAt = now;
    update.acknowledgedBy = req.user!.id;
  }
  if (input.status === "RESOLVED") {
    update.resolvedAt = now;
    update.resolvedBy = req.user!.id;
  }
  const alert = await OperationalAlertModel.findByIdAndUpdate(String(req.params.id), { $set: update }, { returnDocument: "after" });
  if (!alert) throw new AppError(404, "Operational alert not found");
  res.json({ data: alert });
}

export async function inviteAdminController(req: Request, res: Response) {
  const phone = String(req.body.phone ?? "").replace(/\D/g, "").slice(-10);
  if (!/^[6-9]\d{9}$/.test(phone)) throw new AppError(400, "Enter a valid 10 digit Indian mobile number");
  
  let user = await UserModel.findOne({ phone });
  if (user) {
    user.role = adminInviteRole(phone, user.role);
    user.accountStatus = "ACTIVE";
    user.suspendedUntil = undefined;
    user.moderationReason = undefined;
    await user.save();
  } else {
    user = await UserModel.create({
      phone,
      role: adminInviteRole(phone)
    });
  }
  
  const [result] = await attachProfilesToUsers([user.toJSON()]);
  res.status(201).json({ data: result, message: "Full admin access granted" });
}

export async function updateDeliveryAvailabilityController(req: Request, res: Response) {
  const partner = await DeliveryPartnerModel.findOne({ userId: req.user!.id });
  if (!partner) throw new AppError(404, "Delivery profile not found");
  if (Boolean(req.body.isAvailable)) assertFreshDeliveryLocation(partner);
  const updated = await DeliveryPartnerModel.findByIdAndUpdate(partner.id, { isAvailable: Boolean(req.body.isAvailable) }, { returnDocument: "after" });
  if (updated && updated.isAvailable && updated.verificationStatus === "VERIFIED") {
    await assignPendingTasksToPartner(updated);
  }
  res.json({ data: updated });
}

export async function updateDeliveryProfileController(req: Request, res: Response) {
  const input = deliveryProfileSchema.parse(req.body);
  const [user, partner] = await Promise.all([
    input.name || typeof input.email === "string"
      ? UserModel.findByIdAndUpdate(
          req.user!.id,
          {
            ...(input.name ? { name: input.name } : {}),
            ...(typeof input.email === "string" ? { email: input.email || null } : {})
          },
          { returnDocument: "after" }
        )
      : UserModel.findById(req.user!.id),
    DeliveryPartnerModel.findOneAndUpdate(
      { userId: req.user!.id },
      {
        ...(input.name ? { displayName: input.name } : {}),
        ...(input.address ? { "verification.personal.address": input.address } : {}),
        ...(input.workingHours ? { workingHours: input.workingHours } : {}),
        ...(input.deliveryType ? { deliveryType: input.deliveryType } : {}),
        ...(input.assignedArea ? { assignedArea: input.assignedArea } : {}),
        ...(input.settings ? { settings: input.settings } : {})
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    )
  ]);

  if (partner && partner.isAvailable && partner.verificationStatus === "VERIFIED") {
    await assignPendingTasksToPartner(partner);
  }

  res.json({ data: { ...user?.toJSON(), ...(input.name ? { name: input.name } : {}), deliveryProfile: partner } });
}

export async function checkDeliveryEmailAvailabilityController(req: Request, res: Response) {
  const email = z.string().trim().email().parse(req.query.email);
  const existingUser = await UserModel.findOne({ email, _id: { $ne: req.user!.id } }).select("_id");
  res.json({ data: { available: !existingUser, email } });
}

export async function submitDeliveryVerificationController(req: Request, res: Response) {
  const input = deliveryVerificationSchema.parse(req.body);

  try {
    if (input.personal.email) {
      const existingEmailUser = await UserModel.findOne({ email: input.personal.email, _id: { $ne: req.user!.id } }).select("_id");
      if (existingEmailUser) throw new AppError(409, "This email is already linked to another account");
    }

    const user = await UserModel.findByIdAndUpdate(
      req.user!.id,
      {
        name: input.personal.fullName,
        gender: input.personal.gender,
        ...(input.personal.email ? { email: input.personal.email } : {}),
        ...(input.identity.facePhotoUrl ? { avatarUrl: input.identity.facePhotoUrl, profileUrl: input.identity.facePhotoUrl } : {})
      },
      { returnDocument: "after", runValidators: true }
    );
    if (!user) throw new AppError(404, "User not found");

    const partner =
      (await DeliveryPartnerModel.findOne({ userId: req.user!.id })) ??
      new DeliveryPartnerModel({
        userId: req.user!.id
      });

    partner.vehicleNumber = input.vehicle.vehicleNumber;
    partner.displayName = input.personal.fullName;
    partner.settings = {
      availability: input.preferences.availability,
      radius: input.preferences.radius,
      instantDeliveries: input.preferences.instantDeliveries
    };
    if (!partner.registrationSnapshot) {
      partner.registrationSnapshot = partner.verification ?? input;
      partner.registrationSnapshotCapturedAt = partner.verificationSubmittedAt ?? new Date();
    }
    partner.verificationStatus = "PENDING";
    partner.verificationSubmittedAt = new Date();
    partner.verification = input;
    partner.verificationDraft = undefined;
    partner.verificationReviewedAt = undefined;
    partner.verificationRejectionReason = undefined;
    await partner.save();

    res.json({ data: { ...user.toJSON(), deliveryProfile: partner } });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    if (error?.name === "ValidationError") {
      const message = Object.values(error.errors ?? {}).map((item: any) => item?.message).filter(Boolean).join(", ") || "Verification validation failed";
      throw new AppError(400, message);
    }
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern ?? error.keyValue ?? {})[0];
      throw new AppError(409, field === "email" ? "This email is already linked to another account" : "This verification profile already exists. Please refresh and try again.");
    }
    throw error;
  }
}

export async function saveDeliveryVerificationDraftController(req: Request, res: Response) {
  const input = deliveryVerificationDraftSchema.parse(req.body);
  const partner = await DeliveryPartnerModel.findOneAndUpdate(
    { userId: req.user!.id },
    {
      verificationDraft: {
        ...input.draft,
        step: input.step ?? input.draft.step,
        savedAt: new Date().toISOString()
      }
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
  res.json({ data: partner });
}

export async function uploadDeliveryAvatarController(req: Request, res: Response) {
  void req;
  void res;
  throw new AppError(403, "Delivery partner profile photos can only be changed by an admin");
}

export async function uploadDeliveryVerificationMediaController(req: Request, res: Response) {
  assertCloudinaryConfigured();
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw new AppError(400, "Attach at least one verification photo");
  if (files.length > 4) throw new AppError(400, "Upload up to 4 verification photos");

  const uploaded = await Promise.all(
    files.map(async (file) => {
      const result = await uploadTailorImageBuffer(file, "darji/delivery-verification");
      return {
        url: result.secure_url,
        publicId: result.public_id,
        bytes: result.bytes,
        format: result.format,
        originalName: file.originalname
      };
    })
  );

  res.status(201).json({ data: uploaded });
}

export async function walletController(req: Request, res: Response) {
  const userType = req.user!.role === "DELIVERY_PARTNER" ? "DELIVERY_PARTNER" : "TAILOR";
  res.json({ data: await walletSummary(req.user!.id, userType) });
}

export async function transactionsController(req: Request, res: Response) {
  const userType = req.user!.role === "DELIVERY_PARTNER" ? "DELIVERY_PARTNER" : "TAILOR";
  const transactions = await WalletTransactionModel.find({ userId: req.user!.id, userType }).sort({ createdAt: -1 });
  res.json({ data: transactions });
}

export async function adminWalletPayoutsController(req: Request, res: Response) {
  const userType = req.query.userType === "DELIVERY_PARTNER" ? "DELIVERY_PARTNER" : "TAILOR";
  const payoutKind = userType === "DELIVERY_PARTNER" ? "DELIVERY" : "TAILOR";
  const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
  const weekStartValue = typeof req.query.weekStart === "string" ? new Date(req.query.weekStart) : startOfWeek();
  const weekEndValue = typeof req.query.weekEnd === "string" ? new Date(req.query.weekEnd) : endOfWeek(weekStartValue);

  const profiles = userType === "TAILOR"
    ? await TailorModel.find().sort({ shopName: 1 })
    : await DeliveryPartnerModel.find().sort({ createdAt: -1 });

  const rows = await Promise.all(profiles.map(async (profile: any) => {
    const user = await UserModel.findById(profile.userId).select("name phone");
    const summary = await walletSummary(profile.userId, userType as WalletUserType);
    const transactions = await WalletTransactionModel.find({
      userId: profile.userId,
      userType,
      createdAt: { $gte: weekStartValue, $lt: weekEndValue }
    }).select("transactionType category amount createdAt").lean();
    const currentWeekEarnings = transactions.reduce((sum: number, transaction: any) => {
      const createdAt = new Date(transaction.createdAt ?? 0);
      if (transaction.transactionType !== "CREDIT" || transaction.category !== "ORDER_EARNING") return sum;
      return createdAt >= weekStartValue && createdAt < weekEndValue ? sum + Number(transaction.amount ?? 0) : sum;
    }, 0);
    const payoutsInPeriod = transactions.reduce((sum: number, transaction: any) => {
      const createdAt = new Date(transaction.createdAt ?? 0);
      if (transaction.transactionType !== "DEBIT" || transaction.category !== "WEEKLY_PAYOUT") return sum;
      return createdAt >= weekStartValue && createdAt < weekEndValue ? sum + Number(transaction.amount ?? 0) : sum;
    }, 0);
    return {
      userId: profile.userId,
      profileId: profile.id,
      userType,
      payoutKind,
      name: user?.name ?? profile.shopName ?? "Unnamed",
      phone: user?.phone ?? "",
      walletBalance: summary.balance,
      currentWeekEarnings,
      periodPendingAmount: Math.max(0, Number((currentWeekEarnings - payoutsInPeriod).toFixed(2))),
      pendingAmount: summary.pendingAmount,
      pendingBreakdown: summary.pendingBreakdown,
      unpaidItemCount: summary.unpaidItemCount,
      oldestUnpaidAt: summary.oldestUnpaidAt,
      lastPayment: summary.lastPayment,
      status: summary.pendingAmount > 0 ? "DUE" : "SETTLED"
    };
  }));

  const filtered = search
    ? rows.filter((row) => `${row.name} ${row.phone}`.toLowerCase().includes(search))
    : rows;
  res.json({ data: filtered });
}

export async function adminWalletDetailController(req: Request, res: Response) {
  const userId = String(req.params.userId);
  const user = await UserModel.findById(userId).select("name phone role");
  if (!user) throw new AppError(404, "User not found");
  const userType = req.query.userType === "DELIVERY_PARTNER" ? "DELIVERY_PARTNER" : "TAILOR";
  res.json({ data: { user, ...(await walletSummary(userId, userType as WalletUserType)) } });
}

export async function adminCreatePayoutController(req: Request, res: Response) {
  const input = payoutSchema.parse(req.body);
  const history = await createWeeklyPayout({
    userId: input.userId,
    userType: input.userType,
    amount: input.amount,
    receiptUrl: input.receiptUrl,
    notes: input.notes,
    paidBy: req.user!.id,
    weekStart: input.weekStart ? new Date(input.weekStart) : undefined,
    weekEnd: input.weekEnd ? new Date(input.weekEnd) : undefined,
    referenceNumber: input.referenceNumber
  });
  const actor = await UserModel.findById(req.user!.id).select("name phone").lean();
  await AdminAuditLogModel.create({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    actorName: actor?.name || actor?.phone || "Admin",
    actorPhone: actor?.phone,
    category: "FINANCE",
    action: `Recorded ${input.userType === "TAILOR" ? "tailor" : "delivery partner"} weekly payout`,
    method: req.method,
    path: req.originalUrl.split("?")[0],
    statusCode: 201,
    entityType: "PARTNER_PAYOUT",
    entityId: history.id,
    summary: `Recorded ${input.userType === "TAILOR" ? "tailor" : "delivery partner"} weekly payout`,
    metadata: { userId: input.userId, amount: input.amount, referenceNumber: input.referenceNumber, allocationCount: history.allocations?.length ?? 0 },
    ...auditRequestContext(req)
  }).catch(() => undefined);
  res.status(201).json({ data: history });
}

export async function adminFinancialLedgerController(_req: Request, res: Response) {
  const [payments, payoutHistory, earningTransactions] = await Promise.all([
    PaymentModel.find().sort({ createdAt: -1 }).lean(),
    PaymentHistoryModel.find({ status: "PAID" }).sort({ paidAt: -1, createdAt: -1 }).lean(),
    WalletTransactionModel.find({ transactionType: "CREDIT", category: { $in: ["ORDER_EARNING", "BONUS", "ADJUSTMENT"] } }).sort({ createdAt: -1 }).lean()
  ]);
  const orderIds = [...new Set(payments.map((payment: any) => String(payment.orderId)).filter(Boolean))];
  const userIds = [...new Set([
    ...payoutHistory.map((payout: any) => String(payout.userId)),
    ...earningTransactions.map((transaction: any) => String(transaction.userId))
  ])];
  const [orders, requests, users] = await Promise.all([
    OrderModel.find({ _id: { $in: orderIds } }).select("_id orderNumber").lean(),
    TailoringRequestModel.find({ _id: { $in: orderIds } }).select("_id").lean(),
    UserModel.find({ _id: { $in: userIds } }).select("_id name phone").lean()
  ]);
  const orderLabels = new Map<string, string>([
    ...orders.map((order: any) => [String(order._id), order.orderNumber || `ORD-${String(order._id).slice(0, 8).toUpperCase()}`] as [string, string]),
    ...requests.map((request: any) => [String(request._id), `TR-${String(request._id).slice(0, 8).toUpperCase()}`] as [string, string])
  ]);
  const usersById = new Map(users.map((user: any) => [String(user._id), user]));
  const entries = [
    ...payments.flatMap((payment: any) => {
      const refunded = String(payment.status).toUpperCase() === "REFUNDED";
      const collection = {
        id: String(payment._id),
        darjiId: payment.darjiId,
        occurredAt: payment.paidAt ?? payment.createdAt,
        entryType: "CUSTOMER_PAYMENT",
        direction: "IN",
        accountingType: "CASH",
        category: "Customer payment",
        amount: Number(payment.amount ?? 0),
        status: refunded ? "PAID" : payment.status,
        method: payment.method,
        referenceNumber: payment.providerRef,
        sourceId: String(payment.orderId),
        sourceLabel: orderLabels.get(String(payment.orderId)) ?? String(payment.orderId)
      };
      return refunded ? [collection, {
        ...collection,
        id: `${String(payment._id)}-refund`,
        occurredAt: payment.refundedAt ?? payment.updatedAt ?? payment.createdAt,
        entryType: "REFUND",
        direction: "OUT",
        category: "Customer refund",
        status: "REFUNDED"
      }] : [collection];
    }),
    ...payoutHistory.map((payout: any) => {
      const user: any = usersById.get(String(payout.userId));
      return {
        id: String(payout._id),
        occurredAt: payout.paidAt ?? payout.createdAt,
        entryType: "PARTNER_PAYOUT",
        direction: "OUT",
        accountingType: "CASH",
        category: payout.userType === "TAILOR" ? "Tailor payout" : "Delivery payout",
        amount: Number(payout.amount ?? 0),
        status: payout.status,
        method: "BANK / UPI",
        referenceNumber: payout.referenceNumber,
        partyId: String(payout.userId),
        partyType: payout.userType,
        partyName: user?.name || user?.phone || "Partner",
        receiptUrl: payout.receiptUrl
      };
    }),
    ...earningTransactions.map((transaction: any) => {
      const user: any = usersById.get(String(transaction.userId));
      const remarks = String(transaction.remarks ?? "");
      const measurement = /measurement visit/i.test(remarks);
      const delivery = transaction.userType === "DELIVERY_PARTNER";
      return {
        id: String(transaction._id),
        darjiId: transaction.darjiId,
        occurredAt: transaction.createdAt,
        entryType: "PARTNER_EARNING",
        direction: "ACCRUAL",
        accountingType: "LIABILITY",
        category: measurement ? "Measurement earning" : delivery ? (/batch/i.test(remarks) ? "Delivery batch earning" : "Delivery task earning") : transaction.category === "BONUS" ? "Partner bonus" : transaction.category === "ADJUSTMENT" ? "Partner adjustment" : "Stitching earning",
        amount: Number(transaction.amount ?? 0),
        status: "ACCRUED",
        sourceId: transaction.orderId ? String(transaction.orderId) : undefined,
        sourceLabel: remarks || transaction.orderId,
        partyId: String(transaction.userId),
        partyType: transaction.userType,
        partyName: user?.name || user?.phone || "Partner"
      };
    })
  ].sort((left, right) => new Date(right.occurredAt ?? 0).getTime() - new Date(left.occurredAt ?? 0).getTime());
  res.json({ data: entries });
}

export async function getDeliveryFareSettingsController(_req: Request, res: Response) {
  let setting = await SettingModel.findOne({ key: "delivery_fare_settings" });
  if (!setting) {
    setting = await SettingModel.findOneAndUpdate(
      { key: "delivery_fare_settings" },
      {
        $setOnInsert: {
          key: "delivery_fare_settings",
          value: {
            normal: { partnerFare: 8, customerCharge: 30 },
            express: { partnerFare: 8, customerCharge: 40 },
            instant: { partnerFare: 15, customerCharge: 50 }
          }
        }
      },
      { upsert: true, returnDocument: "after" }
    );
  }
  const val = setting?.value as any;
  if (val && typeof val.normal !== "object") {
    const migratedValue = {
      normal: { partnerFare: typeof val.normal === "number" ? val.normal : 8, customerCharge: 30 },
      express: { partnerFare: typeof val.express === "number" ? val.express : 8, customerCharge: 40 },
      instant: { partnerFare: typeof val.instant === "number" ? val.instant : 15, customerCharge: 50 }
    };
    setting = await SettingModel.findOneAndUpdate(
      { key: "delivery_fare_settings" },
      { value: migratedValue },
      { returnDocument: "after" }
    );
  }
  res.json({ data: setting?.value });
}

export async function updateDeliveryFareSettingsController(req: Request, res: Response) {
  deliveryFareSettingsSchema.parse(req.body);
  throw new AppError(409, "Delivery pricing is code-controlled and cannot be changed from the admin panel");
}

export async function listNotificationsController(req: Request, res: Response) {
  const notifications = await NotificationModel.find({ userId: req.user!.id }).sort({ createdAt: -1 });
  res.json({ data: notifications });
}

export async function registerFcmTokenController(req: Request, res: Response) {
  const input = fcmTokenSchema.parse(req.body);
  await saveFcmToken(req.user!.id, input);
  res.json({ data: { ok: true } });
}

export async function createReviewController(req: Request, res: Response) {
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new AppError(400, "Rating must be 1-5");
  const kind = req.body.kind === "delivery" ? "delivery" : req.body.kind === "app" ? "app" : "tailor";
  const orderId = String(req.body.orderId);
  if (!orderId || orderId === "undefined" || orderId === "null") throw new AppError(400, "orderId is required");
  if (kind === "app") {
    const existingAppReview = await ReviewModel.findOne({ userId: req.user!.id, kind: "app" });
    if (existingAppReview) throw new AppError(409, "App review already submitted");
    const appReview = await ReviewModel.create({
      userId: req.user!.id,
      orderId: "darji-app",
      kind: "app",
      rating,
      comment: req.body.comment
    });
    res.status(201).json({ data: appReview });
    return;
  }
  const [ownedOrder, ownedRequest] = await Promise.all([
    OrderModel.findOne({ _id: orderId, customerId: req.user!.id }).select("status").lean(),
    TailoringRequestModel.findOne({ _id: orderId, customerId: req.user!.id }).select("status orderStatus").lean()
  ]);
  if (!ownedOrder && !ownedRequest) throw new AppError(403, "You can only review your own orders");
  if (ownedOrder?.status !== "DELIVERED" && ownedRequest?.orderStatus !== "completed") {
    throw new AppError(409, "Reviews can be submitted after delivery");
  }
  const existingReview = await ReviewModel.findOne({ userId: req.user!.id, orderId, kind });
  if (existingReview) throw new AppError(409, "Review already submitted");
  const review = await ReviewModel.create({ userId: req.user!.id, orderId, kind, rating, comment: req.body.comment });
  if (kind === "delivery") {
    const task = await DeliveryRequestModel.findOne({ orderId, assignedDeliveryPartnerId: { $exists: true, $ne: "" } }).sort({ updatedAt: -1 });
    if (task?.assignedDeliveryPartnerId) {
      const partnerTasks = await DeliveryRequestModel.find({ assignedDeliveryPartnerId: task.assignedDeliveryPartnerId }).select("orderId");
      const orderIds = [...new Set(partnerTasks.map((item) => item.orderId).filter(Boolean))];
      const [ratingSummary] = await ReviewModel.aggregate<{ _id: null; averageRating: number }>([
        { $match: { kind: "delivery", isHidden: { $ne: true }, orderId: { $in: orderIds } } },
        { $group: { _id: null, averageRating: { $avg: "$rating" } } }
      ]);
      if (ratingSummary) {
        await DeliveryPartnerModel.findByIdAndUpdate(task.assignedDeliveryPartnerId, { rating: Number(ratingSummary.averageRating.toFixed(1)) });
      }
    }
    res.status(201).json({ data: review });
    return;
  }
  const order = await OrderModel.findById(String(req.body.orderId)).select("tailorId");
  const tailoringRequest = order?.tailorId ? null : await TailoringRequestModel.findById(orderId).select("selectedQuoteId");
  const selectedQuote = tailoringRequest?.selectedQuoteId ? await TailorQuoteModel.findById(tailoringRequest.selectedQuoteId).select("tailorId") : null;
  const tailorId = order?.tailorId ?? selectedQuote?.tailorId;
  if (tailorId) {
    const [tailorOrders, tailorQuotes] = await Promise.all([
      OrderModel.find({ tailorId }).select("_id"),
      TailorQuoteModel.find({ tailorId, status: "ACCEPTED" }).select("requestId")
    ]);
    const orderIds = [...new Set([...tailorOrders.map((tailorOrder) => tailorOrder.id), ...tailorQuotes.map((quote) => quote.requestId)])];
    const [ratingSummary] = await ReviewModel.aggregate<{ _id: null; averageRating: number }>([
      { $match: { kind: "tailor", isHidden: { $ne: true }, orderId: { $in: orderIds } } },
      { $group: { _id: null, averageRating: { $avg: "$rating" } } }
    ]);
    if (ratingSummary) {
      await TailorModel.findByIdAndUpdate(tailorId, { rating: Number(ratingSummary.averageRating.toFixed(1)) });
    }
  }
  res.status(201).json({ data: review });
}

export async function listMyTailorReviewsController(req: Request, res: Response) {
  const tailor = await TailorModel.findOne({ userId: req.user!.id }).select("_id");
  if (!tailor) throw new AppError(404, "Tailor profile not found");

  const [orders, ownQuotes] = await Promise.all([
    OrderModel.find({ tailorId: tailor.id }).select("_id"),
    TailorQuoteModel.find({ tailorId: tailor.id }).select("_id")
  ]);
  const selectedRequests = ownQuotes.length
    ? await TailoringRequestModel.find({ selectedQuoteId: { $in: ownQuotes.map((quote) => quote.id) } }).select("_id")
    : [];
  const orderIds = [...new Set([
    ...orders.map((order) => order.id),
    ...selectedRequests.map((request) => request.id)
  ])];
  const reviews = orderIds.length
    ? await ReviewModel.find({ kind: "tailor", isHidden: { $ne: true }, orderId: { $in: orderIds } }).sort({ createdAt: -1 })
    : [];

  res.json({
    data: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: String(review.comment ?? "").replace(/^Tailor:\s*/i, "").trim(),
      createdAt: review.createdAt
    }))
  });
}

export async function createSupportTicketController(req: Request, res: Response) {
  const input = supportTicketSchema.parse(req.body);
  const userRole = req.user!.role;

  // Anti-Spam: 30 seconds cooldown between any ticket submissions
  const lastTicket = await SupportTicketModel.findOne({ userId: req.user!.id, userRole }).sort({ createdAt: -1 });
  if (lastTicket && (Date.now() - new Date(lastTicket.createdAt).getTime() < 30 * 1000)) {
    res.status(429).json({ message: "Please wait 30 seconds before opening another support ticket." });
    return;
  }

  // Anti-Spam: Redirect to existing active ticket if category/order is the same
  const query: any = {
    userId: req.user!.id,
    userRole,
    status: { $in: ["OPEN", "IN_PROGRESS"] }
  };
  if (input.orderId) query.orderId = input.orderId;
  if (input.category) query.category = input.category;

  const existing = await SupportTicketModel.findOne(query);
  if (existing) {
    res.status(200).json({ data: existing, redirected: true });
    return;
  }

  const user = await UserModel.findById(req.user!.id);
  const senderName = user?.name || "User";

  // Initial message from the customer
  const initialMessage = {
    sender: "client",
    senderId: req.user!.id,
    senderName,
    text: input.message,
    attachments: input.attachments || [],
    type: "text",
    createdAt: new Date()
  };

  const ticket = await SupportTicketModel.create({
    ...input,
    userId: req.user!.id,
    userRole,
    messages: [initialMessage]
  });
  res.status(201).json({ data: ticket });
}

export async function updateSupportTicketController(req: Request, res: Response) {
  const { id } = req.params;
  const update = z.object({
    status: z.enum(["OPEN", "WAITING_FOR_CUSTOMER", "WAITING_FOR_ADMIN", "IN_REVIEW", "RESOLVED", "CLOSED"]).optional(),
    adminResponse: z.string().optional().nullable(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    assignedTo: z.string().optional().nullable()
  }).parse(req.body);

  const ticket = await SupportTicketModel.findById(id);
  if (!ticket) {
    res.status(404).json({ message: "Ticket not found" });
    return;
  }

  // Build system messages for changed values
  const systemMessages: any[] = [];
  if (update.status && update.status !== ticket.status) {
    let text = "";
    if (update.status === "OPEN") text = "Ticket reopened";
    else if (update.status === "RESOLVED") text = "Ticket resolved";
    else if (update.status === "CLOSED") text = "Ticket closed";
    else text = `Status changed to ${update.status.replace(/_/g, " ")}`;
    
    systemMessages.push({
      sender: "system",
      text,
      type: "system",
      createdAt: new Date()
    });
  }
  if (update.assignedTo && update.assignedTo !== ticket.assignedTo) {
    const agent = await UserModel.findById(update.assignedTo);
    systemMessages.push({
      sender: "system",
      text: agent ? `Agent assigned to ${agent.name}` : "Agent unassigned",
      type: "system",
      createdAt: new Date()
    });
  }

  if (update.adminResponse) {
    const adminUser = await UserModel.findById(req.user!.id);
    const adminName = adminUser?.name || "Admin";

    // Push the reply as an admin message
    systemMessages.push({
      sender: "admin",
      senderId: req.user!.id,
      senderName: adminName,
      text: update.adminResponse,
      type: "text",
      createdAt: new Date()
    });
    if (ticket.status === "OPEN" && !update.status) {
      update.status = "WAITING_FOR_CUSTOMER";
    }
  }

  const updatedTicket = await SupportTicketModel.findByIdAndUpdate(
    id,
    {
      $set: {
        ...(update.status ? { status: update.status } : {}),
        ...(update.adminResponse !== undefined ? { adminResponse: update.adminResponse } : {}),
        ...(update.priority ? { priority: update.priority } : {}),
        ...(update.assignedTo !== undefined ? { assignedTo: update.assignedTo } : {})
      },
      $push: { messages: { $each: systemMessages } }
    },
    { returnDocument: "after" }
  );

  // Send push notification
  if (update.adminResponse) {
    try {
      const user = await UserModel.findById(ticket.userId);
      if (user) {
        const recipientRole = String(ticket.userRole ?? "CUSTOMER");

        await sendPushToUsers([ticket.userId], {
          title: "New Support Reply",
          body: update.adminResponse,
          channelId: supportChannel(recipientRole),
          targetApps: [supportClientApp(recipientRole)],
          data: { type: "support" }
        });
      }
    } catch (e) {
      console.error("Failed to send push notification:", e);
    }
  }

  res.json({ data: updatedTicket });
}

export async function listSupportTicketsController(req: Request, res: Response) {
  const isAdmin = isSupportAdmin(req.user!.role);
  const where = isAdmin ? {} : { userId: req.user!.id, userRole: req.user!.role };
  const tickets = await SupportTicketModel.find(where).sort({ createdAt: -1 });
  const data = await Promise.all(
    tickets.map(async (ticket) => {
      const ticketJson = ticket.toJSON() as any;
      const ticketUser = ticket.userId
        ? await UserModel.findById(ticket.userId).select("phone name customerName role profileUrl avatarUrl avatarPreset avatarUri customerAvatarUrl customerAvatarPreset customerAvatarUri gender dateOfBirth")
        : null;
      if (!isAdmin && ticketJson.messages) {
        ticketJson.messages = ticketJson.messages.filter((m: any) => m.sender !== "internal");
      }
      return {
        ...ticketJson,
        user: ticketUser ? normalizeUserForAdmin(ticketUser.toJSON()) : undefined,
        order: ticket.orderId ? (await OrderModel.findById(ticket.orderId).select("orderNumber status"))?.toJSON() : undefined
      };
    })
  );
  res.json({ data });
}

export async function listCouponsController(req: Request, res: Response) {
  const isAdmin = req.user!.role === "ADMIN" || req.user!.role === "SUPER_ADMIN";
  let coupons = await CouponModel.find(isAdmin ? {} : {
    isActive: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $exists: false } }, { startsAt: { $lte: new Date() } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }] },
      { $or: [{ usageLimit: null }, { usageLimit: { $exists: false } }, { $expr: { $lt: [{ $ifNull: ["$usedCount", 0] }, "$usageLimit"] } }] }
    ]
  }).sort({ createdAt: -1 });
  if (!isAdmin) coupons = await couponsVisibleToCustomer(coupons, req.user!.id);
  res.json({ data: coupons });
}

export async function listCouponRedemptionsController(req: Request, res: Response) {
  const coupon = await CouponModel.findById(String(req.params.id)).select("code").lean();
  if (!coupon) throw new AppError(404, "Coupon not found");
  const documents = await CouponRedemptionModel.find({ couponId: coupon._id }).lean();
  const redemptions = documents.flatMap((document) => (document.redemptions ?? []).map((redemption: any) => ({
    customerId: String(document.customerId),
    ...redemption
  }))).sort((a: any, b: any) => new Date(b.redeemedAt ?? 0).getTime() - new Date(a.redeemedAt ?? 0).getTime());
  const customerIds = [...new Set(redemptions.map((redemption: any) => redemption.customerId))];
  const catalogOrderIds = [...new Set(redemptions.filter((redemption: any) => redemption.orderType === "CATALOG").map((redemption: any) => redemption.orderId))];
  const tailoringOrderIds = [...new Set(redemptions.filter((redemption: any) => redemption.orderType === "TAILORING").map((redemption: any) => redemption.orderId))];
  const [customers, catalogOrders, tailoringOrders] = await Promise.all([
    UserModel.find({ _id: { $in: customerIds } }).select("name phone darjiCustomerId").lean(),
    OrderModel.find({ _id: { $in: catalogOrderIds } }).select("orderNumber").lean(),
    TailoringRequestModel.find({ _id: { $in: tailoringOrderIds } }).select("darjiId").lean()
  ]);
  const customerById = new Map(customers.map((customer: any) => [String(customer._id), customer]));
  const catalogById = new Map(catalogOrders.map((order: any) => [String(order._id), order]));
  const tailoringById = new Map(tailoringOrders.map((request: any) => [String(request._id), request]));
  res.json({ data: redemptions.map((redemption: any) => {
    const customer = customerById.get(redemption.customerId);
    const order = redemption.orderType === "CATALOG" ? catalogById.get(String(redemption.orderId)) : tailoringById.get(String(redemption.orderId));
    return {
      ...redemption,
      customer: customer ? { id: redemption.customerId, name: customer.name, phone: customer.phone, darjiCustomerId: customer.darjiCustomerId } : null,
      order: order ? { id: redemption.orderId, reference: redemption.orderType === "CATALOG" ? order.orderNumber : order.darjiId } : { id: redemption.orderId, reference: redemption.orderId }
    };
  }) });
}

export async function createCouponController(req: Request, res: Response) {
  const input = couponSchema.parse(req.body);
  try {
    const coupon = await CouponModel.create({
      ...input,
      code: input.code.toUpperCase(),
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      registeredAfter: input.registeredAfter ? new Date(input.registeredAfter) : null,
      registeredBefore: input.registeredBefore ? new Date(input.registeredBefore) : null
    });
    res.status(201).json({ data: coupon });
  } catch (error: any) {
    if (error?.code === 11000) throw new AppError(409, "A coupon with this code already exists");
    throw error;
  }
}

export async function updateCouponController(req: Request, res: Response) {
  const input = z.object({
    code: z.string().trim().min(3).max(24).optional(),
    description: z.string().trim().min(3).max(500).optional(),
    discountType: z.enum(["FLAT", "PERCENTAGE"]).optional(),
    benefitType: z.enum(["ORDER_FLAT", "ORDER_PERCENTAGE", "FREE_DELIVERY", "DELIVERY_PERCENTAGE", "WAIVE_PLATFORM_FEE", "WAIVE_SMALL_ORDER_FEE", "FREE_MEASUREMENT"]).optional(),
    discountValue: z.number().nonnegative().optional(),
    minOrderValue: z.number().nonnegative().optional(),
    maxDiscount: z.number().positive().nullable().optional(),
    usageLimit: z.number().int().positive().nullable().optional(),
    perCustomerLimit: z.number().int().positive().nullable().optional(),
    maxCampaignDiscount: z.number().positive().nullable().optional(),
    startsAt: z.string().datetime().nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    orderEligibilityType: z.enum(["ANY", "FIRST", "EXACT", "RANGE"]).optional(),
    orderNumber: z.number().int().positive().nullable().optional(),
    orderNumberFrom: z.number().int().positive().nullable().optional(),
    orderNumberTo: z.number().int().positive().nullable().optional(),
    audienceType: z.enum(["EVERYONE", "SELECTED_CUSTOMERS", "NEW_CUSTOMERS", "INACTIVE_CUSTOMERS", "REGISTERED_BETWEEN"]).optional(),
    selectedCustomerIds: z.array(z.string().min(1)).max(10000).optional(),
    inactiveDays: z.number().int().positive().nullable().optional(),
    registeredAfter: z.string().datetime().nullable().optional(),
    registeredBefore: z.string().datetime().nullable().optional(),
    orderScope: z.enum(["BOTH", "CATALOG", "TAILORING"]).optional(),
    allowedDeliveryModes: z.array(z.enum(["STANDARD", "EXPRESS", "INSTANT"])).optional(),
    allowedPaymentMethods: z.array(z.enum(["UPI", "COD", "ONLINE"])).optional(),
    isActive: z.boolean().optional()
  }).parse(req.body);
  const current = await CouponModel.findById(String(req.params.id));
  if (!current) throw new AppError(404, "Coupon not found");
  const currentValue = current.toObject() as any;
  couponSchema.parse({
    ...currentValue,
    ...input,
    startsAt: input.startsAt !== undefined ? input.startsAt : current.startsAt?.toISOString() ?? null,
    expiresAt: input.expiresAt !== undefined ? input.expiresAt : current.expiresAt?.toISOString() ?? null,
    registeredAfter: input.registeredAfter !== undefined ? input.registeredAfter : current.registeredAfter?.toISOString() ?? null,
    registeredBefore: input.registeredBefore !== undefined ? input.registeredBefore : current.registeredBefore?.toISOString() ?? null
  });
  if (input.usageLimit != null && input.usageLimit < Number(current.usedCount ?? 0)) throw new AppError(400, "Usage limit cannot be lower than existing redemptions");
  if (input.maxCampaignDiscount != null && input.maxCampaignDiscount < Number(current.totalDiscountIssued ?? 0)) throw new AppError(400, "Campaign budget cannot be lower than the discount already issued");
  try {
    const coupon = await CouponModel.findByIdAndUpdate(String(req.params.id), {
      $set: {
        ...input,
        ...(input.code ? { code: input.code.toUpperCase() } : {}),
        ...(input.startsAt !== undefined ? { startsAt: input.startsAt ? new Date(input.startsAt) : null } : {}),
        ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } : {}),
        ...(input.registeredAfter !== undefined ? { registeredAfter: input.registeredAfter ? new Date(input.registeredAfter) : null } : {}),
        ...(input.registeredBefore !== undefined ? { registeredBefore: input.registeredBefore ? new Date(input.registeredBefore) : null } : {})
      }
    }, { returnDocument: "after", runValidators: true });
    res.json({ data: coupon });
  } catch (error: any) {
    if (error?.code === 11000) throw new AppError(409, "A coupon with this code already exists");
    throw error;
  }
}

export async function deleteCouponController(req: Request, res: Response) {
  const coupon = await CouponModel.findById(String(req.params.id));
  if (!coupon) throw new AppError(404, "Coupon not found");
  if (Number(coupon.usedCount ?? 0) > 0) throw new AppError(409, "Used coupons cannot be deleted. Disable the coupon instead.");
  await coupon.deleteOne();
  res.json({ data: { id: coupon.id, deleted: true } });
}

async function deliveryPartnerCostForOrder(orderId: string) {
  const tasks = await DeliveryRequestModel.find({ orderId, taskStatus: { $ne: "cancelled" } })
    .select("batchId finalPayout estimatedPayout estimatedEarnings");
  let cost = 0;
  const batchTaskCounts = new Map<string, number>();

  for (const task of tasks) {
    const batchId = String(task.batchId ?? "");
    if (!batchId) {
      cost += Number(task.finalPayout ?? task.estimatedPayout ?? task.estimatedEarnings ?? 0);
    } else {
      batchTaskCounts.set(batchId, (batchTaskCounts.get(batchId) ?? 0) + 1);
    }
  }

  await Promise.all([...batchTaskCounts].map(async ([batchId, orderTaskCount]) => {
    const [batch, activeTaskCount] = await Promise.all([
      DeliveryBatchModel.findOne({ batchId }).select("finalPayout estimatedPayout estimatedEarnings"),
      DeliveryRequestModel.countDocuments({ batchId, taskStatus: { $ne: "cancelled" } })
    ]);
    const batchPayout = Number(batch?.finalPayout ?? batch?.estimatedPayout ?? batch?.estimatedEarnings ?? 0);
    if (activeTaskCount > 0) cost += batchPayout * (orderTaskCount / activeTaskCount);
  }));

  return Number(cost.toFixed(2));
}

async function finalizedPartnerCostsForOrder(orderId: string) {
  const [tailorTransactions, deliveryTransactions, tasks] = await Promise.all([
    WalletTransactionModel.find({ orderId, userType: "TAILOR", transactionType: "CREDIT", category: "ORDER_EARNING" }).select("amount").lean(),
    WalletTransactionModel.find({ userType: "DELIVERY_PARTNER", transactionType: "CREDIT", category: "ORDER_EARNING" }).select("orderId amount").lean(),
    DeliveryRequestModel.find({ orderId, taskStatus: { $ne: "cancelled" } }).select("_id batchId finalPayout").lean()
  ]);
  if (!tailorTransactions.length || !tasks.length) return null;

  const ledgerBySource = new Map<string, number>();
  deliveryTransactions.forEach((transaction: any) => {
    const sourceId = String(transaction.orderId ?? "");
    if (sourceId) ledgerBySource.set(sourceId, (ledgerBySource.get(sourceId) ?? 0) + Number(transaction.amount ?? 0));
  });
  const batchIds = [...new Set(tasks.map((task: any) => String(task.batchId ?? "")).filter(Boolean))];
  const batches = batchIds.length ? await DeliveryBatchModel.find({ batchId: { $in: batchIds } }).select("batchId finalPayout").lean() : [];
  const batchMap = new Map(batches.map((batch: any) => [String(batch.batchId), batch]));
  const activeCounts = new Map<string, number>();
  await Promise.all(batchIds.map(async (batchId) => {
    activeCounts.set(batchId, await DeliveryRequestModel.countDocuments({ batchId, taskStatus: { $ne: "cancelled" } }));
  }));

  let deliveryCost = 0;
  for (const task of tasks as any[]) {
    const batchId = String(task.batchId ?? "");
    if (!batchId) {
      const payout = task.finalPayout ?? ledgerBySource.get(String(task._id));
      if (payout == null) return null;
      deliveryCost += Number(payout);
      continue;
    }
    const count = activeCounts.get(batchId) ?? 0;
    const payout = batchMap.get(batchId)?.finalPayout ?? ledgerBySource.get(batchId);
    if (payout == null || count <= 0) return null;
    deliveryCost += Number(payout) / count;
  }

  return {
    tailorCost: Number(tailorTransactions.reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0).toFixed(2)),
    deliveryCost: Number(deliveryCost.toFixed(2))
  };
}

export async function paymentsController(req: Request, res: Response) {
  const isAdmin = req.user!.role === "ADMIN" || req.user!.role === "SUPER_ADMIN";
  let authorizedOrderIds: string[] | undefined;
  if (!isAdmin) {
    const [orders, requests] = await Promise.all([
      OrderModel.find({ customerId: req.user!.id }).select("_id").lean(),
      TailoringRequestModel.find({ customerId: req.user!.id }).select("_id").lean()
    ]);
    authorizedOrderIds = [...orders, ...requests].map((item: any) => String(item._id));
  }
  const requestedLimit = Number(req.query.limit);
  const limit = Math.min(Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.floor(requestedLimit) : isAdmin ? 2000 : 500, 5000);
  const payments = await PaymentModel.find(authorizedOrderIds ? { orderId: { $in: authorizedOrderIds } } : {}).sort({ createdAt: -1 }).limit(limit);
  const orderIds = [...new Set(payments.map((payment) => String(payment.orderId)))];
  const [orders, tailoringRequests, tasks, measurementVisits] = await Promise.all([
    OrderModel.find({ _id: { $in: orderIds } }).select("orderNumber customerId status totalAmount").lean(),
    TailoringRequestModel.find({ _id: { $in: orderIds } }).select("customerId orderStatus status totalAmount quoteAmount selectedQuoteId cancellationFee").lean(),
    DeliveryRequestModel.find({ orderId: { $in: orderIds }, taskStatus: { $ne: "cancelled" } }).select("_id orderId batchId finalPayout").lean(),
    MeasurementVisitModel.find({ requestId: { $in: orderIds } }).select("_id requestId status visitPayout").lean()
  ]);
  const batchIds = [...new Set(tasks.map((task: any) => String(task.batchId ?? "")).filter(Boolean))];
  const taskIds = tasks.map((task: any) => String(task._id));
  const quoteIds = tailoringRequests.map((request: any) => request.selectedQuoteId).filter(Boolean);
  const customerIds = [...new Set([...orders, ...tailoringRequests].map((item: any) => String(item.customerId)))];
  const [batches, allBatchTasks, deliveryTransactions, quotes, customers] = await Promise.all([
    batchIds.length ? DeliveryBatchModel.find({ batchId: { $in: batchIds } }).select("batchId finalPayout").lean() : [],
    batchIds.length ? DeliveryRequestModel.find({ batchId: { $in: batchIds }, taskStatus: { $ne: "cancelled" } }).select("batchId").lean() : [],
    WalletTransactionModel.find({ orderId: { $in: [...taskIds, ...batchIds] }, userType: "DELIVERY_PARTNER", transactionType: "CREDIT", category: "ORDER_EARNING" }).select("orderId amount").lean(),
    quoteIds.length ? TailorQuoteModel.find({ _id: { $in: quoteIds } }).select("_id price").lean() : [],
    UserModel.find({ _id: { $in: customerIds } }).select("_id name phone").lean()
  ]);

  const orderMap = new Map(orders.map((order: any) => [String(order._id), order]));
  const requestMap = new Map(tailoringRequests.map((request: any) => [String(request._id), request]));
  const customerMap = new Map(customers.map((customer: any) => [String(customer._id), customer]));
  const quoteMap = new Map(quotes.map((quote: any) => [String(quote._id), Number(quote.price ?? 0)]));
  const measurementVisitCostMap = new Map<string, number>();
  measurementVisits.filter((visit: any) => String(visit.status).toUpperCase() === "SUBMITTED").forEach((visit: any) => {
    const requestId = String(visit.requestId);
    measurementVisitCostMap.set(requestId, (measurementVisitCostMap.get(requestId) ?? 0) + Number(visit.visitPayout ?? 0));
  });
  const batchMap = new Map(batches.map((batch: any) => [String(batch.batchId), batch]));
  const activeBatchCounts = new Map<string, number>();
  allBatchTasks.forEach((task: any) => activeBatchCounts.set(String(task.batchId), (activeBatchCounts.get(String(task.batchId)) ?? 0) + 1));
  const deliveryLedgerMap = new Map<string, number>();
  deliveryTransactions.forEach((transaction: any) => deliveryLedgerMap.set(String(transaction.orderId), (deliveryLedgerMap.get(String(transaction.orderId)) ?? 0) + Number(transaction.amount ?? 0)));
  const tasksByOrder = new Map<string, any[]>();
  tasks.forEach((task: any) => tasksByOrder.set(String(task.orderId), [...(tasksByOrder.get(String(task.orderId)) ?? []), task]));
  const deliveryCostFor = (orderId: string) => {
    const orderTasks = tasksByOrder.get(orderId) ?? [];
    if (!orderTasks.length) return null;
    let total = 0;
    for (const task of orderTasks) {
      const batchId = String(task.batchId ?? "");
      if (!batchId) {
        const payout = task.finalPayout ?? deliveryLedgerMap.get(String(task._id));
        if (payout == null) return null;
        total += Number(payout);
      } else {
        const count = activeBatchCounts.get(batchId) ?? 0;
        const payout = batchMap.get(batchId)?.finalPayout ?? deliveryLedgerMap.get(batchId);
        if (payout == null || count <= 0) return null;
        const batchTaskIds = allBatchTasks.filter((batchTask: any) => String(batchTask.batchId) === batchId).map((batchTask: any) => String(batchTask._id));
        total += allocateAmountExactly(Number(payout), batchTaskIds).get(String(task._id)) ?? 0;
      }
    }
    return Number(total.toFixed(2));
  };

  const canonicalPaymentIds = new Map<string, string>();
  const refundedPaymentKeys = new Set<string>();
  [...payments].sort((a: any, b: any) => new Date(a.paidAt ?? a.createdAt ?? 0).getTime() - new Date(b.paidAt ?? b.createdAt ?? 0).getTime())
    .filter((payment: any) => ["PAID", "REFUNDED"].includes(String(payment.status).toUpperCase()))
    .forEach((payment: any) => {
      const key = paymentDedupeKey({
        id: String(payment._id), orderId: String(payment.orderId), method: String(payment.method), status: String(payment.status), amount: Number(payment.amount),
        providerRef: payment.providerRef ?? undefined, paidAt: payment.paidAt ?? undefined, refundedAt: payment.refundedAt ?? undefined, createdAt: payment.createdAt ?? undefined, updatedAt: payment.updatedAt ?? undefined
      });
      if (!canonicalPaymentIds.has(key)) canonicalPaymentIds.set(key, String(payment._id));
      if (String(payment.status).toUpperCase() === "REFUNDED") refundedPaymentKeys.add(key);
    });

  const data = payments.map((payment) => {
    const orderId = String(payment.orderId);
    const order: any = orderMap.get(orderId);
    const request: any = requestMap.get(orderId);
    if (!order && !request) return isAdmin ? { ...payment.toJSON(), source: "UNKNOWN", realized: false, netRevenue: null } : null;
    const entity = order ?? request;
    const customer: any = customerMap.get(String(entity.customerId));
    const completed = order ? String(order.status) === "DELIVERED" : String(request.orderStatus).toLowerCase() === "completed";
    const expectedStitchingCost = order ? Number(order.totalAmount ?? payment.amount ?? 0) * 0.45 : Number(request.quoteAmount ?? quoteMap.get(String(request.selectedQuoteId)) ?? 0);
    const measurementVisitCost = measurementVisitCostMap.get(orderId) ?? 0;
    const actualTailorCost = expectedStitchingCost > 0 ? expectedStitchingCost + measurementVisitCost : undefined;
    const actualDeliveryCost = deliveryCostFor(orderId);
    const paymentKey = paymentDedupeKey({
      id: String(payment._id), orderId, method: String(payment.method), status: String(payment.status), amount: Number(payment.amount), providerRef: payment.providerRef ?? undefined,
      paidAt: payment.paidAt ?? undefined, refundedAt: payment.refundedAt ?? undefined, createdAt: payment.createdAt ?? undefined, updatedAt: payment.updatedAt ?? undefined
    });
    const duplicatePayment = ["PAID", "REFUNDED"].includes(String(payment.status).toUpperCase()) && canonicalPaymentIds.get(paymentKey) !== String(payment._id);
    const fullyRefunded = refundedPaymentKeys.has(paymentKey);
    const realized = payment.status === "PAID" && !duplicatePayment && !fullyRefunded && completed && actualTailorCost != null && actualDeliveryCost != null;
    const customerPaid = Number(payment.amount ?? entity.totalAmount ?? 0);
    const recognizedAmount = duplicatePayment || fullyRefunded || String(payment.status).toUpperCase() === "REFUNDED" ? 0 : customerPaid;
    const tailorQuote = actualTailorCost ?? expectedStitchingCost;
    const deliveryEarnings = actualDeliveryCost ?? 0;
    return {
      ...payment.toJSON(),
      source: order ? "ORDER" : "TAILORING_REQUEST",
      customerPaid,
      recognizedAmount,
      tailorQuote,
      measurementVisitCost,
      deliveryEarnings,
      netRevenue: realized ? Number((customerPaid - tailorQuote - deliveryEarnings - OPERATIONAL_ALLOWANCE_PER_ORDER).toFixed(2)) : null,
      packagingCost: realized ? OPERATIONAL_ALLOWANCE_PER_ORDER : 0,
      duplicatePayment,
      fullyRefunded,
      realized,
      order: {
        id: orderId,
        orderNumber: order?.orderNumber ?? `TR-${orderId.slice(0, 6).toUpperCase()}`,
        customerId: entity.customerId,
        customerName: customer?.name,
        customerPhone: customer?.phone,
        status: String(order?.status ?? request?.orderStatus ?? request?.status ?? "")
      }
    };
  });
  res.json({ data: data.filter(Boolean) });
}

export async function markPaymentPaidController(req: Request, res: Response) {
  const payment = await PaymentModel.findById(String(req.params.id));
  if (!payment) throw new AppError(404, "Payment not found");

  const order = await OrderModel.findById(payment.orderId).select("customerId orderNumber");
  if (!order) throw new AppError(404, "Payment order not found");

  if (payment.status !== "PAID") {
    payment.status = "PAID";
    payment.paidAt = new Date();
    payment.providerRef = typeof req.body.providerRef === "string" ? req.body.providerRef.trim().slice(0, 150) : payment.providerRef;
    await payment.save();
    await OrderModel.findByIdAndUpdate(order.id, { paymentStatus: "PAID" });
    
    // Log transaction
    await mongoose.model("Transaction").create({
      userId: order.customerId,
      entityType: "CUSTOMER",
      type: "CREDIT",
      category: "PAYMENT",
      amount: payment.amount,
      orderId: order.id,
      note: `Online payment via ${payment.method}`
    });

    await sendPaymentSuccessNotification({
      userId: order.customerId,
      title: "Payment successful",
      body: `Payment for order ${order.orderNumber ?? order.id} was successful.`,
      data: { type: "PAYMENT_SUCCESS", paymentId: payment.id, orderId: order.id, screen: "orderDetails" }
    });
  }

  res.json({ data: payment });
}

export async function analyticsController(_req: Request, res: Response) {
  const [
    transactions,
    ordersCount,
    activeOrdersCount,
    completedOrdersCount,
    cancelledOrdersCount,
    pendingOrdersCount,
    tailoringTotalCount,
    tailoringActiveCount,
    tailoringCompletedCount,
    tailoringCancelledCount,
    tailoringPendingCount,
    tailors,
    deliveryPartners,
    partnerWallets
  ] = await Promise.all([
    TransactionModel.find(),
    OrderModel.countDocuments(),
    OrderModel.countDocuments({ status: { $nin: ["DELIVERED", "CANCELLED", "ORDER_PLACED"] } }),
    OrderModel.countDocuments({ status: "DELIVERED" }),
    OrderModel.countDocuments({ status: "CANCELLED" }),
    OrderModel.countDocuments({ status: "ORDER_PLACED" }),
    TailoringRequestModel.countDocuments({ $or: [{ status: "TAILOR_SELECTED" }, { orderStatus: { $exists: true, $ne: null } }] }),
    TailoringRequestModel.countDocuments({
      status: "TAILOR_SELECTED",
      orderStatus: { $in: ["tailor_accepted", "pickup_started", "picked_up_from_customer", "received_by_tailor", "ready_for_delivery", "out_for_delivery"] }
    }),
    TailoringRequestModel.countDocuments({ orderStatus: "completed" }),
    TailoringRequestModel.countDocuments({ $or: [{ status: "CANCELLED" }, { orderStatus: "cancelled" }] }),
    TailoringRequestModel.countDocuments({
      $or: [
        { status: "PAYMENT_PENDING" },
        { orderStatus: "payment_pending" }
      ]
    }),
    TailorModel.find({ isAvailable: true, verificationStatus: "VERIFIED" }).select("_id"),
    DeliveryPartnerModel.find({ isAvailable: true, verificationStatus: "VERIFIED" }).select("_id"),
    WalletModel.find({ userType: { $in: ["TAILOR", "DELIVERY_PARTNER"] }, balance: { $gt: 0 } }).select("balance")
  ]);

  const totalOrders = ordersCount + tailoringTotalCount;
  const activeOrders = activeOrdersCount + tailoringActiveCount;
  const completedOrders = completedOrdersCount + tailoringCompletedCount;
  const cancelledOrders = cancelledOrdersCount + tailoringCancelledCount;
  const pendingOrders = pendingOrdersCount + tailoringPendingCount;
  
  let revenue = 0;
  let expenses = 0;

  transactions.forEach((t: any) => {
    if (t.category === "PAYMENT" || t.category === "COD" || t.category === "FEE") {
      revenue += t.amount;
    } else if (t.category === "PAYOUT" || t.category === "REFUND") {
      expenses += t.amount;
    }
  });

  const pendingPayouts = partnerWallets.reduce((sum, wallet) => sum + Number(wallet.balance ?? 0), 0);
  
  res.json({
    data: {
      totalOrders,
      activeOrders,
      completedOrders,
      cancelledOrders,
      pendingOrders,
      activeTailors: tailors.length,
      activeDeliveryPartners: deliveryPartners.length,
      revenue,
      expenses,
      netProfit: revenue - expenses,
      pendingPayouts
    }
  });
}

export async function settingsController(_req: Request, res: Response) {
  const settings = await SettingModel.find().sort({ key: 1 });
  res.json({ data: settings });
}

export async function customerWebsiteSliderController(_req: Request, res: Response) {
  const setting = await SettingModel.findOne({ key: CUSTOMER_WEBSITE_SLIDER_SETTING_KEY }).select("value").lean();
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json({ data: normalizeCustomerWebsiteSlider(setting?.value) });
}

const marketingSignupInputSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("launch_notify"),
    clientId: z.string().trim().min(8).max(120)
  }),
  z.object({
    source: z.literal("footer_newsletter"),
    email: z.string().trim().email().max(254)
  })
]);

export async function createMarketingSignupController(req: Request, res: Response) {
  const input = marketingSignupInputSchema.parse(req.body);
  const identity = input.source === "launch_notify"
    ? { source: input.source, clientId: input.clientId }
    : { source: input.source, email: input.email.toLowerCase() };

  const signup = await MarketingSignupModel.findOneAndUpdate(
    identity,
    { $setOnInsert: identity },
    { upsert: true, returnDocument: "after" }
  );

  res.status(201).json({ data: signup });
}

export async function listMarketingSignupsController(_req: Request, res: Response) {
  const [launchNotifyCount, newsletterCount, newsletterSignups] = await Promise.all([
    MarketingSignupModel.countDocuments({ source: "launch_notify" }),
    MarketingSignupModel.countDocuments({ source: "footer_newsletter" }),
    MarketingSignupModel.find({ source: "footer_newsletter", email: { $exists: true } })
      .select("email source createdAt")
      .sort({ createdAt: -1 })
      .lean()
  ]);

  res.json({
    data: {
      total: launchNotifyCount + newsletterCount,
      launchNotifyCount,
      newsletterCount,
      newsletterSignups: newsletterSignups.map((signup) => ({
        id: String(signup._id),
        source: signup.source,
        email: signup.email,
        createdAt: signup.createdAt
      }))
    }
  });
}

export async function platformStatusController(_req: Request, res: Response) {
  const status = await getPlatformStatus();
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json({ data: status });
}

export async function updatePlatformStatusController(req: Request, res: Response) {
  const status = await savePlatformStatus(req.body);
  publishPlatformStatus(status);
  res.json({ data: status });
}

export async function festivalThemeController(_req: Request, res: Response) {
  const theme = await getFestivalThemeState();
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json({ data: theme });
}

export async function updateFestivalThemeController(req: Request, res: Response) {
  const theme = await saveFestivalTheme(req.body, req.user!.id);
  publishFestivalTheme(theme);
  res.json({ data: theme });
}

export async function updateSettingController(req: Request, res: Response) {
  const key = String(req.params.key);
  if (key === "delivery_fare_settings") throw new AppError(409, "Delivery pricing is code-controlled and cannot be changed from the admin panel");
  const value = key === CUSTOMER_WEBSITE_SLIDER_SETTING_KEY
    ? customerWebsiteSliderSchema.parse(req.body.value)
    : req.body.value;
  const setting = await SettingModel.findOneAndUpdate({ key }, { key, value }, { upsert: true, returnDocument: "after" });
  res.json({ data: setting });
}

const serviceAvailabilityQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180)
});

export async function serviceAvailabilityController(req: Request, res: Response) {
  const input = serviceAvailabilityQuerySchema.parse(req.query);
  const availability = await checkServiceAvailability(input.latitude, input.longitude);
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json({ data: availability });
}

const forwardGeocodeQuerySchema = z.object({
  address: z.string().trim().min(3).max(500)
});

export async function forwardGeocodeController(req: Request, res: Response) {
  const { address } = forwardGeocodeQuerySchema.parse(req.query);
  const point = await geocodeAddress(address);
  if (!point) throw new AppError(404, "We could not find that area. Add the city or state and try again.");
  res.setHeader("Cache-Control", "private, max-age=300");
  res.json({ data: { latitude: point.lat, longitude: point.lng, query: address } });
}

const serviceAreaInterestInputSchema = z.object({
  address: z.string().trim().min(8).max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export async function createServiceAreaInterestController(req: Request, res: Response) {
  const input = serviceAreaInterestInputSchema.parse(req.body);
  const roundedLatitude = Number(input.latitude.toFixed(4));
  const roundedLongitude = Number(input.longitude.toFixed(4));
  const customer = await UserModel.findById(req.user!.id).select("name phone").lean();
  const interest = await ServiceAreaInterestModel.findOneAndUpdate(
    { userId: req.user!.id, latitude: roundedLatitude, longitude: roundedLongitude },
    {
      userId: req.user!.id,
      customerName: customer?.name,
      customerPhone: customer?.phone,
      address: input.address,
      latitude: roundedLatitude,
      longitude: roundedLongitude,
      status: "requested"
    },
    { upsert: true, returnDocument: "after" }
  );
  res.status(201).json({ data: interest });
}

export async function listServiceAreaInterestsController(_req: Request, res: Response) {
  const [items, total, customerIds] = await Promise.all([
    ServiceAreaInterestModel.find({}).sort({ createdAt: -1 }).limit(100).lean(),
    ServiceAreaInterestModel.countDocuments({}),
    ServiceAreaInterestModel.distinct("userId")
  ]);
  res.json({
    data: {
      items: items.map((item) => ({
        id: String(item._id),
        userId: item.userId,
        customerName: item.customerName,
        customerPhone: item.customerPhone,
        address: item.address,
        latitude: item.latitude,
        longitude: item.longitude,
        status: item.status,
        createdAt: item.createdAt
      })),
      total,
      uniqueCustomers: customerIds.length
    }
  });
}

export async function serviceAreaConfigController(_req: Request, res: Response) {
  res.json({ data: await getServiceAreaConfig() });
}

export async function updateServiceAreaConfigController(req: Request, res: Response) {
  res.json({ data: await saveServiceAreaConfig(req.body) });
}

type ResetTarget = {
  label: string;
  deleteMany: (filter?: Record<string, unknown>) => Promise<{ deletedCount?: number }>;
};

async function deleteTargets(targets: ResetTarget[]) {
  const deleted: Record<string, number> = {};
  for (const target of targets) {
    const result = await target.deleteMany({});
    deleted[target.label] = Number(result.deletedCount ?? 0);
  }
  return deleted;
}

const orderRequestBatchResetTargets: ResetTarget[] = [
  { label: "delivery_batches", deleteMany: (filter = {}) => DeliveryBatchModel.deleteMany(filter) },
  { label: "delivery_tasks", deleteMany: (filter = {}) => DeliveryRequestModel.deleteMany(filter) },
  { label: "tailorquotes", deleteMany: (filter = {}) => TailorQuoteModel.deleteMany(filter) },
  { label: "tailoringrequests", deleteMany: (filter = {}) => TailoringRequestModel.deleteMany(filter) },
  { label: "orders", deleteMany: (filter = {}) => OrderModel.deleteMany(filter) },
  { label: "admin_order_metadata", deleteMany: (filter = {}) => AdminOrderMetadataModel.deleteMany(filter) },
  { label: "coupon_redemptions", deleteMany: (filter = {}) => CouponRedemptionModel.deleteMany(filter) },
  { label: "payments", deleteMany: (filter = {}) => PaymentModel.deleteMany(filter) },
  { label: "transactions", deleteMany: (filter = {}) => TransactionModel.deleteMany(filter) },
  { label: "wallettransactions", deleteMany: (filter = {}) => WalletTransactionModel.deleteMany(filter) },
  { label: "paymenthistories", deleteMany: (filter = {}) => PaymentHistoryModel.deleteMany(filter) },
  { label: "notifications", deleteMany: (filter = {}) => NotificationModel.deleteMany(filter) },
  { label: "operational_alerts", deleteMany: (filter = {}) => OperationalAlertModel.deleteMany(filter) },
  { label: "measurement_visits", deleteMany: (filter = {}) => MeasurementVisitModel.deleteMany(filter) },
  { label: "reviews", deleteMany: (filter = {}) => ReviewModel.deleteMany(filter) },
  { label: "supporttickets", deleteMany: (filter = {}) => SupportTicketModel.deleteMany(filter) },
  { label: "bugreports", deleteMany: (filter = {}) => BugReportModel.deleteMany(filter) },
  { label: "accountchangerequests", deleteMany: (filter = {}) => AccountChangeRequestModel.deleteMany(filter) }
];

export async function resetOrderRequestBatchDataController(_req: Request, res: Response) {
  const deleted = await deleteTargets(orderRequestBatchResetTargets);
  const [tailors, deliveryPartners, wallets, coupons] = await Promise.all([
    TailorModel.updateMany({}, { $set: { earnings: 0 } }),
    DeliveryPartnerModel.updateMany({}, { $set: { dailyEarnings: 0, weeklyEarnings: 0, monthlyEarnings: 0 } }),
    WalletModel.updateMany({}, { $set: { balance: 0 } }),
    CouponModel.updateMany({}, { $set: { usedCount: 0 } })
  ]);

  res.json({
    data: {
      deleted,
      reset: {
        tailors: tailors.modifiedCount,
        deliveryPartners: deliveryPartners.modifiedCount,
        wallets: wallets.modifiedCount,
        coupons: coupons.modifiedCount
      }
    }
  });
}

export async function resetEverythingDataController(_req: Request, res: Response) {
  const deleted = await deleteTargets([
    ...orderRequestBatchResetTargets,
    { label: "addresses", deleteMany: (filter = {}) => AddressModel.deleteMany(filter) },
    { label: "coupons", deleteMany: (filter = {}) => CouponModel.deleteMany(filter) },
    { label: "servicecategories", deleteMany: (filter = {}) => ServiceCategoryModel.deleteMany(filter) },
    { label: "services", deleteMany: (filter = {}) => ServiceModel.deleteMany(filter) },
    { label: "otprequests", deleteMany: (filter = {}) => OtpRequestModel.deleteMany(filter) },
    { label: "otp_deliveries", deleteMany: (filter = {}) => OtpDeliveryModel.deleteMany(filter) },
    { label: "wallets", deleteMany: (filter = {}) => WalletModel.deleteMany(filter) },
    { label: "tailors", deleteMany: (filter = {}) => TailorModel.deleteMany(filter) },
    { label: "deliverypartners", deleteMany: (filter = {}) => DeliveryPartnerModel.deleteMany(filter) },
    { label: "notification_campaigns", deleteMany: (filter = {}) => NotificationCampaignModel.deleteMany(filter) }
  ]);

  const users = await UserModel.deleteMany({ role: { $nin: ["ADMIN", "SUPER_ADMIN"] } });
  deleted.users = Number(users.deletedCount ?? 0);

  const counters = await mongoose.connection.collection<{ _id: string }>("darjicounters").deleteMany({
    _id: { $nin: ["ADM"] }
  });
  deleted.darjicounters = Number(counters.deletedCount ?? 0);

  res.json({ data: { deleted, preserved: { adminAccounts: true, settings: true } } });
}

export async function createBugReportController(req: Request, res: Response) {
  const input = bugReportSchema.parse(req.body);
  const user = await UserModel.findById(req.user!.id);
  const senderName = user?.name || "User";

  const initialMessage = {
    sender: "client",
    senderId: req.user!.id,
    senderName,
    text: `Bug Report: ${input.title}\n\nDescription: ${input.description}\n\nDevice: ${input.deviceInfo}\nApp Version: ${input.appVersion}`,
    attachments: input.screenshot ? [input.screenshot] : [],
    type: "text",
    createdAt: new Date()
  };

  const bug = await BugReportModel.create({
    ...input,
    userId: req.user!.id,
    userRole: req.user!.role,
    messages: [initialMessage]
  });
  res.status(201).json({ data: bug });
}

export async function listBugReportsController(req: Request, res: Response) {
  const where = isSupportAdmin(req.user!.role) ? {} : { userId: req.user!.id, userRole: req.user!.role };
  const bugs = await BugReportModel.find(where).sort({ createdAt: -1 });
  const data = await Promise.all(
    bugs.map(async (bug) => ({
      ...bug.toJSON(),
      user: bug.userId ? (await UserModel.findById(bug.userId).select("phone name role"))?.toJSON() : undefined
    }))
  );
  res.json({ data });
}

export async function updateBugReportController(req: Request, res: Response) {
  const { id } = req.params;
  const update = z.object({
    status: z.enum(["NEW", "INVESTIGATING", "IN_PROGRESS", "FIXED", "CLOSED"]).optional(),
    assignedTo: z.string().optional().nullable()
  }).parse(req.body);

  const bug = await BugReportModel.findById(id);
  if (!bug) {
    res.status(404).json({ message: "Bug report not found" });
    return;
  }

  const systemMessages: any[] = [];
  if (update.status && update.status !== bug.status) {
    systemMessages.push({
      sender: "system",
      text: `Status changed to ${update.status}`,
      type: "system",
      createdAt: new Date()
    });
  }
  if (update.assignedTo && update.assignedTo !== bug.assignedTo) {
    const dev = await UserModel.findById(update.assignedTo);
    systemMessages.push({
      sender: "system",
      text: dev ? `Assigned to developer ${dev.name}` : "Developer unassigned",
      type: "system",
      createdAt: new Date()
    });
  }

  const updatedBug = await BugReportModel.findByIdAndUpdate(
    id,
    {
      $set: {
        ...(update.status ? { status: update.status } : {}),
        ...(update.assignedTo !== undefined ? { assignedTo: update.assignedTo } : {})
      },
      $push: { messages: { $each: systemMessages } }
    },
    { returnDocument: "after" }
  );

  res.json({ data: updatedBug });
}

export async function createAccountChangeRequestController(req: Request, res: Response) {
  const input = accountChangeRequestSchema.parse(req.body);
  const supportedRoles = ["CUSTOMER", "TAILOR", "DELIVERY_PARTNER"];
  if (!supportedRoles.includes(req.user!.role)) {
    throw new AppError(403, "Account change requests are not available for this account");
  }
  if (req.user!.role === "CUSTOMER" && input.type !== "AccountDeletion") {
    throw new AppError(403, "Customers can use this endpoint only for account deletion requests");
  }

  // Parse type for visual neatness
  const requestTypeNice = input.type.replace(/([A-Z])/g, ' $1').trim();
  const user = await UserModel.findById(req.user!.id);
  const senderName = user?.name || "User";
  if (input.type === "AccountDeletion") {
    const existingRequest = await AccountChangeRequestModel.findOne({
      userId: req.user!.id,
      type: "AccountDeletion",
      status: "PENDING"
    });
    if (existingRequest) {
      res.status(409).json({ message: "An account deletion request is already pending" });
      return;
    }
  }
  const requestedValues = input.type === "AccountDeletion"
    ? {
        ...input.requestedValues,
        accountName: user?.name ?? "",
        accountPhone: user?.phone ?? "",
        requestedAt: new Date().toISOString()
      }
    : input.requestedValues;

  const initialMessage = {
    sender: "client",
    senderId: req.user!.id,
    senderName,
    text: input.type === "AccountDeletion"
      ? `Request: Delete Darji account\n\nAccount: ${user?.name ?? "Darji user"}\nPhone: ${user?.phone ?? "Unknown"}`
      : `Request: Change ${requestTypeNice}\n\nDetails: ${Object.entries(requestedValues || {}).map(([k, v]) => `\n- ${k}: ${v}`).join('')}`,
    attachments: input.documents || [],
    type: "text",
    createdAt: new Date()
  };

  const request = await AccountChangeRequestModel.create({
    ...input,
    requestedValues,
    userId: req.user!.id,
    userRole: req.user!.role as "CUSTOMER" | "TAILOR" | "DELIVERY_PARTNER",
    messages: [initialMessage]
  });
  res.status(201).json({ data: request });
}

export async function listAccountChangeRequestsController(req: Request, res: Response) {
  const where = req.user!.role === "ADMIN" || req.user!.role === "SUPER_ADMIN" ? {} : { userId: req.user!.id };
  const requests = await AccountChangeRequestModel.find(where).sort({ createdAt: -1 });
  const data = await Promise.all(
    requests.map(async (request) => {
      const requestJson = request.toJSON() as any;
      let currentValues: any = {};
      try {
        if (request.userRole === "TAILOR") {
          const tailor = await TailorModel.findOne({ userId: request.userId });
          if (tailor) {
            const verification = tailor.verification || {};
            if (request.type === "ShopName") {
              currentValues = { shopName: tailor.shopName || verification.shop?.shopName || "" };
            } else if (request.type === "BankAccount") {
              const bank = verification.bank || {};
              currentValues = {
                accountHolder: bank.accountHolder || "",
                accountNumber: bank.accountNumber || "",
                ifsc: bank.ifsc || ""
              };
            } else if (request.type === "UPI") {
              currentValues = {
                upi: verification.bank?.upi || ""
              };
            } else if (request.type === "Address") {
              currentValues = {
                shopAddress: verification.shop?.shopAddress || ""
              };
            } else if (request.type === "ContactNumber") {
              const user = await UserModel.findById(request.userId);
              currentValues = { phone: user?.phone || "" };
            } else if (request.type === "IdentityDocument") {
              const identity = verification.idVerification || {};
              currentValues = { idType: identity.idType || "", idNumber: identity.idNumber || "" };
            }
          }
        } else if (request.userRole === "DELIVERY_PARTNER") {
          const partner = await DeliveryPartnerModel.findOne({ userId: request.userId });
          if (partner) {
            const verification = partner.verification || {};
            if (request.type === "Vehicle") {
              currentValues = {
                vehicleNumber: partner.vehicleNumber || verification.vehicle?.vehicleNumber || "",
                vehicleModel: verification.vehicle?.vehicleModel || ""
              };
            } else if (request.type === "RC") {
              currentValues = {
                rcPhotoUrl: verification.vehicle?.rcPhotoUrl || ""
              };
            } else if (request.type === "DrivingLicense") {
              currentValues = {
                licensePhotoUrl: verification.license?.licenseFrontUrl || verification.personal?.licensePhotoUrl || ""
              };
            } else if (request.type === "BankAccount") {
              const bank = verification.bank || {};
              currentValues = {
                accountHolder: bank.accountHolder || "",
                accountNumber: bank.accountNumber || "",
                ifsc: bank.ifsc || ""
              };
            } else if (request.type === "UPI") {
              currentValues = {
                upi: verification.bank?.upi || ""
              };
            } else if (request.type === "ContactNumber") {
              const user = await UserModel.findById(request.userId);
              currentValues = { phone: user?.phone || "" };
            } else if (request.type === "IdentityDocument") {
              const identity = verification.identity || {};
              currentValues = { identityType: identity.identityType || "", idNumber: identity.aadhaarNumber || identity.panNumber || "" };
            } else if (request.type === "Address") {
              currentValues = { address: verification.personal?.address || "" };
            }
          }
        }
      } catch (err) {
        console.error("Failed to load current values for change request:", err);
      }

      return {
        ...requestJson,
        currentValues,
        user: request.userId
          ? (await UserModel.findById(request.userId).select("phone name role"))?.toJSON() ?? (
              request.type === "AccountDeletion"
                ? {
                    id: request.userId,
                    name: request.requestedValues?.accountName,
                    phone: request.requestedValues?.accountPhone,
                    role: request.userRole
                  }
                : undefined
            )
          : undefined
      };
    })
  );
  res.json({ data });
}

export async function approveAccountChangeRequestController(req: Request, res: Response) {
  const { id } = req.params;
  const { adminNotes } = req.body || {};
  const request = await AccountChangeRequestModel.findById(id);
  if (!request) {
    res.status(404).json({ message: "Change request not found" });
    return;
  }

  if (request.status !== "PENDING") {
    res.status(400).json({ message: "Request is already processed" });
    return;
  }

  const userId = request.userId;
  const vals = request.requestedValues as Record<string, any>;

  if (request.type === "AccountDeletion") {
    await deleteAccountByUserId(userId);
  } else if (request.userRole === "TAILOR") {
    const tailor = await TailorModel.findOne({ userId });
    if (tailor) {
      const verification = (tailor.verification || {}) as Record<string, any>;
      if (request.type === "ShopName") {
        tailor.shopName = vals.shopName;
        if (!verification.shop) verification.shop = {};
        verification.shop.shopName = vals.shopName;
      } else if (request.type === "BankAccount") {
        if (!verification.bank) verification.bank = {};
        verification.bank.accountHolder = vals.accountHolder;
        verification.bank.accountNumber = vals.accountNumber;
        verification.bank.ifsc = vals.ifsc;
      } else if (request.type === "UPI") {
        if (!verification.bank) verification.bank = {};
        verification.bank.upi = vals.upi;
      } else if (request.type === "Address") {
        if (!verification.shop) verification.shop = {};
        verification.shop.shopAddress = vals.shopAddress;
      } else if (request.type === "ContactNumber") {
        await UserModel.findByIdAndUpdate(userId, { phone: vals.phone });
      } else if (request.type === "IdentityDocument") {
        if (!verification.idVerification) verification.idVerification = {};
        verification.idVerification.idType = vals.idType;
        verification.idVerification.idNumber = vals.idNumber;
        if (vals.idType === "Aadhaar") {
          if (vals.aadhaarFrontUrl) verification.idVerification.aadhaarFrontUrl = vals.aadhaarFrontUrl;
          if (vals.aadhaarBackUrl) verification.idVerification.aadhaarBackUrl = vals.aadhaarBackUrl;
        } else if (vals.panUrl) {
          verification.idVerification.panUrl = vals.panUrl;
        }
      }
      tailor.verification = verification;
      tailor.markModified("verification");
      await tailor.save();
    }
  } else if (request.userRole === "DELIVERY_PARTNER") {
    const partner = await DeliveryPartnerModel.findOne({ userId });
    if (partner) {
      const verification = (partner.verification || {}) as Record<string, any>;
      if (request.type === "Vehicle") {
        partner.vehicleNumber = vals.vehicleNumber;
        if (!verification.vehicle) verification.vehicle = {};
        verification.vehicle.vehicleNumber = vals.vehicleNumber;
        verification.vehicle.vehicleModel = vals.vehicleModel;
      } else if (request.type === "RC") {
        if (!verification.vehicle) verification.vehicle = {};
        verification.vehicle.rcPhotoUrl = vals.rcPhotoUrl;
      } else if (request.type === "DrivingLicense") {
        if (!verification.personal) verification.personal = {};
        verification.personal.licensePhotoUrl = vals.licensePhotoUrl;
      } else if (request.type === "BankAccount") {
        if (!verification.bank) verification.bank = {};
        verification.bank.accountHolder = vals.accountHolder;
        verification.bank.accountNumber = vals.accountNumber;
        verification.bank.ifsc = vals.ifsc;
      } else if (request.type === "UPI") {
        if (!verification.bank) verification.bank = {};
        verification.bank.upi = vals.upi;
      } else if (request.type === "ContactNumber") {
        await UserModel.findByIdAndUpdate(userId, { phone: vals.phone });
      } else if (request.type === "IdentityDocument") {
        if (!verification.identity) verification.identity = {};
        verification.identity.identityType = vals.identityType;
        if (vals.identityType === "Aadhaar") {
          verification.identity.aadhaarNumber = vals.idNumber;
          verification.identity.panNumber = "";
          if (vals.identityFrontUrl) verification.identity.identityFrontUrl = vals.identityFrontUrl;
          if (vals.identityBackUrl) verification.identity.identityBackUrl = vals.identityBackUrl;
        } else {
          verification.identity.panNumber = vals.idNumber;
          verification.identity.aadhaarNumber = "";
          if (vals.identityFrontUrl) verification.identity.identityFrontUrl = vals.identityFrontUrl;
        }
      } else if (request.type === "Address") {
        if (!verification.personal) verification.personal = {};
        verification.personal.address = vals.address;
      }
      partner.verification = verification;
      partner.markModified("verification");
      await partner.save();
    }
  }

  request.status = "APPROVED";
  request.adminNotes = adminNotes;
  request.processedBy = req.user!.id;
  request.processedByName = (await UserModel.findById(req.user!.id))?.name || "Admin";
  request.processedAt = new Date();
  request.messages.push({
    sender: "system",
    text: `Change Request Approved by ${request.processedByName}.${adminNotes ? ` Notes: ${adminNotes}` : ""}`,
    type: "system",
    createdAt: new Date()
  });
  await request.save();

  emitToAdmins("support:change_request_updated", { request });
  emitToCustomer(request.userId, "support:change_request_updated", { request });

  res.json({ data: request });
}

export async function rejectAccountChangeRequestController(req: Request, res: Response) {
  const { id } = req.params;
  const { adminNotes } = req.body || {};
  const request = await AccountChangeRequestModel.findById(id);
  if (!request) {
    res.status(404).json({ message: "Change request not found" });
    return;
  }

  if (request.status !== "PENDING") {
    res.status(400).json({ message: "Request is already processed" });
    return;
  }

  request.status = "REJECTED";
  request.adminNotes = adminNotes;
  request.processedBy = req.user!.id;
  request.processedByName = (await UserModel.findById(req.user!.id))?.name || "Admin";
  request.processedAt = new Date();
  request.messages.push({
    sender: "system",
    text: `Change Request Rejected by ${request.processedByName}.${adminNotes ? ` Reason: ${adminNotes}` : ""}`,
    type: "system",
    createdAt: new Date()
  });
  await request.save();

  emitToAdmins("support:change_request_updated", { request });
  emitToCustomer(request.userId, "support:change_request_updated", { request });

  res.json({ data: request });
}

export async function getSupportStatsController(req: Request, res: Response) {
  const openTickets = await SupportTicketModel.countDocuments({ status: "OPEN" });
  const pendingTickets = await SupportTicketModel.countDocuments({ status: "WAITING_FOR_ADMIN" });
  const resolvedTickets = await SupportTicketModel.countDocuments({ status: "RESOLVED" });
  const closedTickets = await SupportTicketModel.countDocuments({ status: "CLOSED" });
  const newBugs = await BugReportModel.countDocuments({ status: "NEW" });

  const repliedTickets = await SupportTicketModel.find({ adminResponse: { $exists: true, $ne: null } });
  let totalResponseTimeMs = 0;
  let responseCount = 0;
  for (const t of repliedTickets) {
    const diff = new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime();
    if (diff > 0) {
      totalResponseTimeMs += diff;
      responseCount++;
    }
  }
  const avgResponseTime = responseCount > 0 ? (totalResponseTimeMs / responseCount / 60000) : 0;

  const resolvedList = await SupportTicketModel.find({ status: { $in: ["RESOLVED", "CLOSED"] } });
  let totalResolutionTimeMs = 0;
  let resolutionCount = 0;
  for (const t of resolvedList) {
    const diff = new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime();
    if (diff > 0) {
      totalResolutionTimeMs += diff;
      resolutionCount++;
    }
  }
  const avgResolutionTime = resolutionCount > 0 ? (totalResolutionTimeMs / resolutionCount / 60000) : 0;

  const categoryVolume = await SupportTicketModel.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } }
  ]);
  const volumeByCategory = Object.fromEntries(
    categoryVolume.map((item) => [item._id || "Other Issue", item.count])
  );

  const allTickets = await SupportTicketModel.find({});
  const volumeByUserType = { CUSTOMER: 0, TAILOR: 0, DELIVERY_PARTNER: 0 };
  for (const t of allTickets) {
    const user = await UserModel.findById(t.userId);
    if (user) {
      const role = user.role as keyof typeof volumeByUserType;
      if (volumeByUserType[role] !== undefined) {
        volumeByUserType[role]++;
      }
    }
  }

  res.json({
    data: {
      totalOpen: openTickets,
      pendingTickets,
      resolvedTickets,
      closedTickets,
      newBugs,
      avgResponseTime,
      avgResolutionTime,
      volumeByCategory,
      volumeByUserType
    }
  });
}

export async function addSupportTicketMessageController(req: Request, res: Response) {
  const { id } = req.params;
  const input = z.object({
    text: z.string(),
    attachments: z.array(z.string()).optional(),
    attachmentUrl: z.string().optional(),
    attachmentName: z.string().optional(),
    attachmentSize: z.number().optional(),
    thumbnail: z.string().optional(),
    type: z.enum(["text", "voice", "audio", "image", "video", "document", "system", "internal"]).default("text"),
    isInternal: z.boolean().optional().default(false)
  }).parse(req.body);

  const isAdmin = isSupportAdmin(req.user!.role);
  const ticket = isAdmin
    ? await SupportTicketModel.findById(id)
    : await SupportTicketModel.findOne({ _id: id, userId: req.user!.id, userRole: req.user!.role });
  if (!ticket) {
    res.status(404).json({ message: "Ticket not found" });
    return;
  }

  const senderRole = isAdmin && input.isInternal ? "internal" : (isAdmin ? "admin" : "client");
  const user = await UserModel.findById(req.user!.id);
  const senderName = user?.name || (isAdmin ? "Admin" : "User");

  // Reopen ticket if a closed/resolved ticket receives a client message
  const systemMessages: any[] = [];
  let autoStatus: string | undefined;

  if (senderRole === "client" && ["RESOLVED", "CLOSED"].includes(ticket.status)) {
    autoStatus = "OPEN";
    systemMessages.push({ sender: "system", text: "Ticket reopened by customer reply", type: "system", createdAt: new Date() });
  } else if (senderRole === "admin" && ticket.status === "OPEN") {
    autoStatus = "WAITING_FOR_CUSTOMER";
  } else if (senderRole === "client" && ticket.status === "WAITING_FOR_CUSTOMER") {
    autoStatus = "WAITING_FOR_ADMIN";
  }

  const newMessage = {
    sender: senderRole,
    senderId: req.user!.id,
    senderName,
    text: input.text,
    attachments: input.attachments || [],
    attachmentUrl: input.attachmentUrl,
    attachmentName: input.attachmentName,
    attachmentSize: input.attachmentSize,
    thumbnail: input.thumbnail,
    type: input.isInternal ? "text" : input.type,
    read: false,
    createdAt: new Date()
  };

  const updatedTicket = await SupportTicketModel.findByIdAndUpdate(
    id,
    {
      $set: { ...(autoStatus ? { status: autoStatus } : {}) },
      $push: { messages: { $each: [...systemMessages, newMessage] } }
    },
    { returnDocument: "after" }
  );

  // Socket.IO real-time broadcast
  if (updatedTicket) {
    // Emit to the ticket owner (customer) — skip internal notes
    if (senderRole !== "internal") {
      emitToUserRole(ticket.userId, String(ticket.userRole), "support:ticket_updated", { ticket: updatedTicket });
    }
    // Broadcast to all admins so their queues update live
    emitToAdmins("support:ticket_updated", { ticket: updatedTicket });
  }

  // Push notification if admin sending a public message
  if (senderRole === "admin") {
    try {
      const pushUser = await UserModel.findById(ticket.userId);
      if (pushUser) {
        const recipientRole = String(ticket.userRole ?? "CUSTOMER");
        await sendPushToUsers([ticket.userId], {
          title: "New Message from Support",
          body: input.text,
          channelId: supportChannel(recipientRole),
          targetApps: [supportClientApp(recipientRole)],
          data: { type: "support" }
        });
      }
    } catch (e) {
      console.error("Push error:", e);
    }
  }

  res.json({ data: updatedTicket });
}

export async function addBugReportMessageController(req: Request, res: Response) {
  const { id } = req.params;
  const input = z.object({
    text: z.string(),
    attachments: z.array(z.string()).optional(),
    attachmentUrl: z.string().optional(),
    attachmentName: z.string().optional(),
    attachmentSize: z.number().optional(),
    thumbnail: z.string().optional(),
    type: z.enum(["text", "voice", "audio", "image", "video", "document", "system"]).default("text"),
    isInternal: z.boolean().optional().default(false)
  }).parse(req.body);

  const isAdmin = isSupportAdmin(req.user!.role);
  const bug = isAdmin
    ? await BugReportModel.findById(id)
    : await BugReportModel.findOne({ _id: id, userId: req.user!.id, userRole: req.user!.role });
  if (!bug) {
    res.status(404).json({ message: "Bug report not found" });
    return;
  }

  const senderRole = isAdmin && input.isInternal ? "internal" : (isAdmin ? "admin" : "client");
  const user = await UserModel.findById(req.user!.id);
  const senderName = user?.name || (isAdmin ? "Admin" : "User");

  const newMessage = {
    sender: senderRole,
    senderId: req.user!.id,
    senderName,
    text: input.text,
    attachments: input.attachments || [],
    attachmentUrl: input.attachmentUrl,
    attachmentName: input.attachmentName,
    attachmentSize: input.attachmentSize,
    thumbnail: input.thumbnail,
    type: input.type,
    read: false,
    createdAt: new Date()
  };

  const updatedBug = await BugReportModel.findByIdAndUpdate(
    id,
    { $push: { messages: newMessage } },
    { returnDocument: "after" }
  );

  if (updatedBug) {
    emitToAdmins("support:bug_updated", { bug: updatedBug });
    if (senderRole !== "internal") {
      emitToUserRole(bug.userId, String(bug.userRole), "support:bug_updated", { bug: updatedBug });
    }
  }

  // Push notification if admin sending a public message
  if (senderRole === "admin") {
    try {
      const pushUser = await UserModel.findById(bug.userId);
      if (pushUser) {
        const recipientRole = String(bug.userRole ?? "CUSTOMER");
        await sendPushToUsers([bug.userId], {
          title: "New Message from Support",
          body: input.text,
          channelId: supportChannel(recipientRole),
          targetApps: [supportClientApp(recipientRole)],
          data: { type: "bug" }
        });
      }
    } catch (e) {
      console.error("Push error:", e);
    }
  }

  res.json({ data: updatedBug });
}

export async function addChangeRequestMessageController(req: Request, res: Response) {
  const { id } = req.params;
  const input = z.object({
    text: z.string(),
    attachments: z.array(z.string()).optional(),
    attachmentUrl: z.string().optional(),
    attachmentName: z.string().optional(),
    attachmentSize: z.number().optional(),
    thumbnail: z.string().optional(),
    type: z.enum(["text", "voice", "audio", "image", "video", "document", "system"]).default("text"),
    isInternal: z.boolean().optional().default(false)
  }).parse(req.body);

  const isAdmin = req.user!.role === "ADMIN" || req.user!.role === "SUPER_ADMIN";
  if (!isAdmin && req.user!.role !== "TAILOR" && req.user!.role !== "DELIVERY_PARTNER") {
    throw new AppError(403, "Account change requests are available only to partner accounts");
  }
  const request = isAdmin
    ? await AccountChangeRequestModel.findById(id)
    : await AccountChangeRequestModel.findOne({
        _id: id,
        userId: req.user!.id,
        userRole: req.user!.role as "TAILOR" | "DELIVERY_PARTNER"
      });
  if (!request) {
    res.status(404).json({ message: "Change request not found" });
    return;
  }

  const senderRole = isAdmin && input.isInternal ? "internal" : (isAdmin ? "admin" : "client");
  const user = await UserModel.findById(req.user!.id);
  const senderName = user?.name || (isAdmin ? "Admin" : "User");

  const newMessage = {
    sender: senderRole,
    senderId: req.user!.id,
    senderName,
    text: input.text,
    attachments: input.attachments || [],
    attachmentUrl: input.attachmentUrl,
    attachmentName: input.attachmentName,
    attachmentSize: input.attachmentSize,
    thumbnail: input.thumbnail,
    type: input.type,
    read: false,
    createdAt: new Date()
  };

  const updatedRequest = await AccountChangeRequestModel.findByIdAndUpdate(
    id,
    { $push: { messages: newMessage } },
    { returnDocument: "after" }
  );

  if (updatedRequest) {
    emitToAdmins("support:change_request_updated", { request: updatedRequest });
    if (senderRole !== "internal") {
      emitToCustomer(request.userId, "support:change_request_updated", { request: updatedRequest });
    }
  }

  res.json({ data: updatedRequest });
}

function formatReviewAddress(address?: {
  line1?: string | null;
  line2?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
} | null) {
  if (!address) return undefined;
  const locality = [address.city, address.state, address.pincode].filter(Boolean).join(", ");
  return [address.line1, address.line2, address.landmark, locality].filter(Boolean).join(", ") || undefined;
}

const publicAccountDeletionRequestSchema = z.object({
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10 digit Indian mobile number"),
  reason: z.string().trim().max(1000).optional().default("")
});

export async function createPublicAccountDeletionRequestController(req: Request, res: Response) {
  const input = publicAccountDeletionRequestSchema.parse(req.body);
  const user = await UserModel.findOne({ phone: input.phone }).select("_id name phone role");

  // Always return the same acknowledgement so this public endpoint cannot be
  // used to discover which phone numbers have Darji accounts.
  if (user && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    const userRole = (["CUSTOMER", "TAILOR", "DELIVERY_PARTNER"].includes(user.role) ? user.role : "CUSTOMER") as "CUSTOMER" | "TAILOR" | "DELIVERY_PARTNER";
    const existingRequest = await AccountChangeRequestModel.findOne({
      userId: user.id,
      type: "AccountDeletion",
      status: "PENDING"
    });

    if (!existingRequest) {
      const reason = input.reason || "No additional reason provided.";
      const request = await AccountChangeRequestModel.create({
        userId: user.id,
        userRole,
        type: "AccountDeletion",
        requestedValues: {
          accountName: user.name ?? "",
          accountPhone: user.phone,
          reason,
          requestSource: "Darji website",
          requestedAt: new Date().toISOString()
        },
        messages: [{
          sender: "client",
          senderId: user.id,
          senderName: user.name || "Darji user",
          text: `Request: Delete Darji account\n\nPhone: ${user.phone}\nReason: ${reason}\nSource: Darji website`,
          type: "text",
          createdAt: new Date()
        }]
      });
      emitToAdmins("support:change_request_updated", { request });
    }
  }

  res.status(202).json({
    data: { submitted: true },
    message: "If the phone number is linked to a Darji account, the deletion request has been recorded for verification."
  });
}

async function reviewOrderContext(orderId: string, kind: string, customerId: string) {
  const order = await OrderModel.findById(orderId).select("orderNumber addressId tailorId createdAt");
  const tailoringRequest = order ? null : await TailoringRequestModel.findById(orderId).select("selectedQuoteId pickupAddress createdAt");
  const selectedQuote = tailoringRequest?.selectedQuoteId ? await TailorQuoteModel.findById(tailoringRequest.selectedQuoteId).select("tailorId") : null;
  const deliveryTask = kind === "delivery"
    ? await DeliveryRequestModel.findOne({ orderId, assignedDeliveryPartnerId: { $exists: true, $ne: "" } }).sort({ updatedAt: -1 }).select("assignedDeliveryPartnerId")
    : null;
  const tailorId = order?.tailorId ?? selectedQuote?.tailorId;
  const partnerId = deliveryTask?.assignedDeliveryPartnerId;
  const [orderAddress, defaultAddress, tailor, partner] = await Promise.all([
    order?.addressId ? AddressModel.findById(order.addressId).select("line1 line2 landmark city state pincode") : null,
    !order?.addressId && !tailoringRequest?.pickupAddress
      ? AddressModel.findOne({ userId: customerId }).sort({ isDefault: -1, updatedAt: -1 }).select("line1 line2 landmark city state pincode")
      : null,
    tailorId ? TailorModel.findById(tailorId).select("shopName userId darjiTailorId") : null,
    partnerId ? DeliveryPartnerModel.findById(partnerId).select("userId vehicleNumber darjiPartnerId deliveryType assignedArea") : null
  ]);
  const [tailorUser, partnerUser] = await Promise.all([
    tailor?.userId ? UserModel.findById(tailor.userId).select("name phone profileUrl avatarUrl") : null,
    partner?.userId ? UserModel.findById(partner.userId).select("name phone profileUrl avatarUrl") : null
  ]);
  const customerAddress = tailoringRequest?.pickupAddress
    ? String(tailoringRequest.pickupAddress)
    : formatReviewAddress(orderAddress ?? defaultAddress);
  const location = customerAddress
    ? customerAddress.split(",").slice(-3).map((part) => part.trim()).filter(Boolean).join(", ")
    : "Darji customer";

  return {
    orderNumber: order?.orderNumber || orderId.slice(0, 8).toUpperCase(),
    location,
    customerAddress,
    targetId: kind === "delivery" ? partnerId : kind === "tailor" ? tailorId : undefined,
    targetDarjiId: kind === "delivery" ? partner?.darjiPartnerId : kind === "tailor" ? tailor?.darjiTailorId : undefined,
    targetName: kind === "delivery"
      ? partnerUser?.name || "Delivery partner"
      : kind === "tailor"
        ? tailor?.shopName || tailorUser?.name || "Tailor"
        : "Darji App",
    targetPhone: kind === "delivery" ? partnerUser?.phone : tailorUser?.phone,
    targetAvatarUrl: kind === "delivery" ? (partnerUser?.profileUrl || partnerUser?.avatarUrl) : (tailorUser?.profileUrl || tailorUser?.avatarUrl),
    targetVehicleNumber: kind === "delivery" ? partner?.vehicleNumber : undefined,
    targetRole: kind === "delivery" ? partner?.deliveryType : kind === "tailor" ? "STITCHING_TAILOR" : "DARJI_APP",
    targetArea: kind === "delivery" ? partner?.assignedArea : undefined
  };
}

export async function listAdminReviewsController(req: Request, res: Response) {
  const reviews = await ReviewModel.find({}).sort({ createdAt: -1 });
  const populated = await Promise.all(
    reviews.map(async (review) => {
      const user = await UserModel.findById(review.userId).select("name customerName phone role profileUrl avatarUrl avatarPreset avatarUri customerAvatarUrl customerAvatarPreset customerAvatarUri gender dateOfBirth");
      const context = await reviewOrderContext(String(review.orderId), String(review.kind), String(review.userId));
      return {
        id: review.id,
        userId: review.userId,
        orderId: review.orderId,
        kind: review.kind,
        rating: review.rating,
        comment: review.comment,
        isFeatured: review.isFeatured ?? false,
        isHidden: review.isHidden ?? false,
        createdAt: review.createdAt,
        user: user ? normalizeUserForAdmin(user.toJSON()) : null,
        orderNumber: context.orderNumber,
        customerAddress: context.customerAddress,
        targetId: context.targetId,
        targetDarjiId: context.targetDarjiId,
        targetName: context.targetName,
        targetPhone: context.targetPhone,
        targetAvatarUrl: context.targetAvatarUrl,
        targetVehicleNumber: context.targetVehicleNumber,
        targetRole: context.targetRole,
        targetArea: context.targetArea
      };
    })
  );
  res.json({ data: populated });
}

export async function toggleReviewFeaturedController(req: Request, res: Response) {
  const { id } = req.params;
  const review = await ReviewModel.findById(id);
  if (!review) throw new AppError(404, "Review not found");
  
  if (review.isHidden) throw new AppError(409, "Restore this review before featuring it");
  review.isFeatured = !review.isFeatured;
  await review.save();
  
  res.json({ data: review });
}

async function refreshReviewTargetRating(orderId: string, kind: string) {
  if (kind === "delivery") {
    const task = await DeliveryRequestModel.findOne({ orderId, assignedDeliveryPartnerId: { $exists: true, $ne: "" } }).sort({ updatedAt: -1 }).select("assignedDeliveryPartnerId").lean();
    if (!task?.assignedDeliveryPartnerId) return;
    const partnerTasks = await DeliveryRequestModel.find({ assignedDeliveryPartnerId: task.assignedDeliveryPartnerId }).select("orderId").lean();
    const orderIds = [...new Set(partnerTasks.map((item) => String(item.orderId)).filter(Boolean))];
    const [summary] = await ReviewModel.aggregate<{ _id: null; averageRating: number }>([
      { $match: { kind: "delivery", isHidden: { $ne: true }, orderId: { $in: orderIds } } },
      { $group: { _id: null, averageRating: { $avg: "$rating" } } }
    ]);
    await DeliveryPartnerModel.findByIdAndUpdate(task.assignedDeliveryPartnerId, { rating: summary ? Number(summary.averageRating.toFixed(1)) : 0 });
    return;
  }
  if (kind !== "tailor") return;
  const order = await OrderModel.findById(orderId).select("tailorId").lean();
  const request = order?.tailorId ? null : await TailoringRequestModel.findById(orderId).select("selectedQuoteId").lean();
  const quote = request?.selectedQuoteId ? await TailorQuoteModel.findById(request.selectedQuoteId).select("tailorId").lean() : null;
  const tailorId = order?.tailorId ?? quote?.tailorId;
  if (!tailorId) return;
  const [orders, quotes] = await Promise.all([
    OrderModel.find({ tailorId }).select("_id").lean(),
    TailorQuoteModel.find({ tailorId, status: "ACCEPTED" }).select("requestId").lean()
  ]);
  const orderIds = [...new Set([...orders.map((item) => String(item._id)), ...quotes.map((item) => String(item.requestId))])];
  const [summary] = await ReviewModel.aggregate<{ _id: null; averageRating: number }>([
    { $match: { kind: "tailor", isHidden: { $ne: true }, orderId: { $in: orderIds } } },
    { $group: { _id: null, averageRating: { $avg: "$rating" } } }
  ]);
  await TailorModel.findByIdAndUpdate(tailorId, { rating: summary ? Number(summary.averageRating.toFixed(1)) : 0 });
}

export async function toggleReviewHiddenController(req: Request, res: Response) {
  const review = await ReviewModel.findById(String(req.params.id));
  if (!review) throw new AppError(404, "Review not found");
  review.isHidden = !review.isHidden;
  if (review.isHidden) review.isFeatured = false;
  await review.save();
  await refreshReviewTargetRating(String(review.orderId), String(review.kind));
  res.json({ data: review });
}

export async function deleteReviewController(req: Request, res: Response) {
  const review = await ReviewModel.findByIdAndDelete(String(req.params.id));
  if (!review) throw new AppError(404, "Review not found");
  await refreshReviewTargetRating(String(review.orderId), String(review.kind));
  res.json({ data: { id: review.id, deleted: true } });
}

export async function listFeaturedReviewsController(req: Request, res: Response) {
  const reviews = await ReviewModel.find({ isFeatured: true, isHidden: { $ne: true } }).sort({ createdAt: -1 });
  const populated = await Promise.all(
    reviews.map(async (review) => {
      const user = await UserModel.findById(review.userId).select("name phone profileUrl avatarUrl");
      const context = await reviewOrderContext(String(review.orderId), String(review.kind), String(review.userId));
      return {
        id: review.id,
        name: user?.name || "Customer",
        location: context.location,
        rating: review.rating,
        review: review.comment || "No comment",
        createdAt: review.createdAt
      };
    })
  );
  res.json({ data: populated });
}

export async function dashboardAnalyticsController(req: Request, res: Response) {
  const data = await getDashboardAnalytics(req.query.start, req.query.endExclusive, String(req.query.lifetime).toLowerCase() === "true");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json({ data });
}

export async function listAdminActivityLogsController(req: Request, res: Response) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const search = String(req.query.search ?? "").trim().slice(0, 100);
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const category = String(req.query.category ?? "").trim().toUpperCase();
  const filter: Record<string, unknown> = search ? {
    $or: ["actorName", "actorPhone", "method", "path", "entityType", "entityId", "summary", "action", "ipAddress"].map((field) => ({ [field]: { $regex: escaped, $options: "i" } }))
  } : {};
  if (category && category !== "ALL") filter.category = category;
  const logs = await AdminAuditLogModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ data: logs.map((log: any) => ({ ...log, id: String(log._id), _id: undefined })) });
}

export async function listAdminOrderMetadataController(_req: Request, res: Response) {
  const records = await AdminOrderMetadataModel.find().sort({ updatedAt: -1 }).limit(5000).lean();
  res.json({ data: records.map((record: any) => ({ ...record, id: String(record._id), _id: undefined })) });
}

export async function updateAdminOrderMetadataController(req: Request, res: Response) {
  const input = z.object({
    priority: z.enum(["Normal", "High", "Urgent", "VIP"]).optional(),
    note: z.string().trim().min(1).max(2000).optional()
  }).refine((value) => value.priority !== undefined || value.note !== undefined, "Provide a priority or note").parse(req.body);
  const admin = await UserModel.findById(req.user!.id).select("name phone").lean();
  const update: Record<string, unknown> = {
    $set: { ...(input.priority ? { priority: input.priority } : {}), updatedBy: req.user!.id },
    $setOnInsert: { entityId: String(req.params.id) }
  };
  if (input.note) {
    update.$push = {
      notes: {
        $each: [{ adminId: req.user!.id, adminName: admin?.name || admin?.phone || "Admin", note: input.note, createdAt: new Date() }],
        $position: 0
      }
    };
  }
  const metadata = await AdminOrderMetadataModel.findOneAndUpdate(
    { entityId: String(req.params.id) },
    update,
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
  res.json({ data: metadata });
}

type AdminOrderEntity = {
  kind: "ORDER" | "TAILORING_REQUEST";
  document: any;
  value: Record<string, any>;
};

async function findAdminOrderEntity(id: string): Promise<AdminOrderEntity | null> {
  const order = await OrderModel.findById(id);
  if (order) return { kind: "ORDER", document: order, value: order.toJSON() as Record<string, any> };
  const request = await TailoringRequestModel.findById(id);
  if (request) return { kind: "TAILORING_REQUEST", document: request, value: request.toJSON() as Record<string, any> };
  return null;
}

function safeFilePart(value: unknown, fallback: string) {
  const normalized = String(value ?? "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function mediaExtension(url: string, originalName?: string) {
  const originalExtension = String(originalName ?? "").match(/\.([a-zA-Z0-9]{2,5})$/)?.[1];
  if (originalExtension) return originalExtension.toLowerCase();
  try {
    const extension = new URL(url).pathname.match(/\.([a-zA-Z0-9]{2,5})$/)?.[1];
    return extension?.toLowerCase() || "jpg";
  } catch {
    return "jpg";
  }
}

type DownloadableMedia = { folder: string; label: string; url: string; originalName?: string };

function collectAdminOrderMedia(entity: AdminOrderEntity, deliveryTasks: any[]): DownloadableMedia[] {
  const value = entity.value;
  const media: DownloadableMedia[] = [];
  const add = (folder: string, label: string, item: any) => {
    const url = typeof item === "string" ? item : item?.url || item?.imageUrl;
    const resourceType = typeof item === "object" ? item?.resourceType : "image";
    if (url && (!resourceType || resourceType === "image")) media.push({ folder, label, url, originalName: item?.originalName });
  };
  const addMany = (folder: string, label: string, items: any) => (Array.isArray(items) ? items : []).forEach((item) => add(folder, label, item));

  if (entity.kind === "ORDER") {
    (value.items ?? []).forEach((item: any) => add("01-customer-uploads", "customer-reference", item.referenceImageUrl));
    add("03-tailor-before-stitching", "tailor-before-stitching", value.pickupImageUrl);
    add("04-tailor-after-stitching", "tailor-after-stitching", value.finalImageUrl);
    add("06-delivery-partner-proof", "delivery-proof", value.deliveryProofUrl);
  } else {
    addMany("01-customer-uploads", "customer-upload", value.media);
    addMany("02-customer-reference-designs", "customer-sample", value.sampleMedia);
    addMany("02-customer-reference-designs", "customer-design", value.designMedia);
    (value.items ?? []).forEach((item: any) => {
      addMany("01-customer-uploads", "customer-upload", item.media);
      addMany("02-customer-reference-designs", "customer-sample", item.sampleMedia);
      addMany("02-customer-reference-designs", "customer-design", item.designMedia);
    });
    addMany("03-tailor-before-stitching", "tailor-before-stitching", value.receivedMedia);
    addMany("04-tailor-after-stitching", "tailor-after-stitching", value.stitchedMedia);
  }
  deliveryTasks.forEach((task) => {
    const folder = task.type === "customer_to_tailor" ? "05-pickup-partner-proof" : "06-delivery-partner-proof";
    addMany(folder, "cloth-photo", task.clothPhotos);
    addMany(folder, "sample-photo", task.samplePhotos);
    addMany(folder, "delivery-photo", task.deliveryPhotos);
  });
  return media;
}

export async function downloadAdminOrderImagesController(req: Request, res: Response) {
  const entity = await findAdminOrderEntity(String(req.params.id));
  if (!entity) throw new AppError(404, "Order not found");
  const deliveryTasks = await DeliveryRequestModel.find({ orderId: String(req.params.id) }).lean();
  const media = collectAdminOrderMedia(entity, deliveryTasks);
  const orderNumber = safeFilePart(entity.value.orderNumber || entity.value.darjiId || entity.value.id || req.params.id, "order");
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="Darji-${orderNumber}-images.zip"`);
  res.setHeader("Cache-Control", "no-store");
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (error: Error) => res.destroy(error));
  archive.pipe(res);

  const folders = [
    "01-customer-uploads",
    "02-customer-reference-designs",
    "03-tailor-before-stitching",
    "04-tailor-after-stitching",
    "05-pickup-partner-proof",
    "06-delivery-partner-proof"
  ];
  for (const folder of folders) {
    const folderMedia = media.filter((item) => item.folder === folder);
    if (!folderMedia.length) archive.append("No images were uploaded for this stage.\n", { name: `${folder}/NO-IMAGES.txt` });
  }
  for (const [index, item] of media.entries()) {
    try {
      const response = await fetch(item.url, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      const extension = mediaExtension(item.url, item.originalName);
      archive.append(buffer, { name: `${item.folder}/${safeFilePart(item.label, "image")}-${String(index + 1).padStart(2, "0")}.${extension}` });
    } catch (error) {
      archive.append(`Image could not be downloaded from ${item.url}\n${error instanceof Error ? error.message : "Unknown error"}\n`, {
        name: `${item.folder}/FAILED-${String(index + 1).padStart(2, "0")}.txt`
      });
    }
  }
  await archive.finalize();
}

function invoiceLine(doc: PDFKit.PDFDocument, label: string, value: unknown) {
  const left = 54;
  const y = doc.y;
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#555555").text(label.toUpperCase(), left, y, { width: 160 });
  doc.font("Helvetica").fontSize(10).fillColor("#111111").text(String(value ?? "-"), left + 170, y, { width: 330 });
  doc.moveDown(0.8);
}

export async function downloadAdminOrderInvoiceController(req: Request, res: Response) {
  const entity = await findAdminOrderEntity(String(req.params.id));
  if (!entity) throw new AppError(404, "Order not found");
  const value = entity.value;
  const [customer, address, quote] = await Promise.all([
    UserModel.findById(value.customerId).lean(),
    value.addressId ? AddressModel.findById(value.addressId).lean() : null,
    value.selectedQuoteId ? TailorQuoteModel.findById(value.selectedQuoteId).lean() : null
  ]);
  const orderNumber = safeFilePart(value.orderNumber || value.darjiId || value.id || req.params.id, "order");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="Darji-Invoice-${orderNumber}.pdf"`);
  res.setHeader("Cache-Control", "no-store");
  const pdf = new PDFDocument({ size: "A4", margin: 54, info: { Title: `Darji invoice ${orderNumber}` } });
  pdf.pipe(res);
  pdf.font("Helvetica-Bold").fontSize(25).fillColor("#111111").text("DARJI");
  pdf.font("Helvetica").fontSize(10).fillColor("#777777").text("Tailoring order invoice");
  pdf.moveDown(1.5);
  pdf.moveTo(54, pdf.y).lineTo(541, pdf.y).strokeColor("#E9A23B").stroke();
  pdf.moveDown(1.2);
  invoiceLine(pdf, "Invoice / order", orderNumber);
  invoiceLine(pdf, "Order date", new Date(value.confirmedAt || value.createdAt || Date.now()).toLocaleString("en-IN"));
  invoiceLine(pdf, "Customer", customer?.name || customer?.customerName || customer?.phone || value.customerId);
  invoiceLine(pdf, "Phone", customer?.phone || "-");
  invoiceLine(pdf, "Address", address ? [address.line1, address.line2, address.landmark, address.city, address.state, address.pincode].filter(Boolean).join(", ") : value.pickupAddress || value.address || "-");
  invoiceLine(pdf, "Delivery urgency", value.deliveryMode || value.urgency || "STANDARD");
  invoiceLine(pdf, "Payment", `${value.paymentMethod || "-"} / ${value.paymentStatus || "PENDING"}`);
  invoiceLine(pdf, "Status", value.orderStatus || value.status || "-");
  pdf.moveDown(1);
  pdf.font("Helvetica-Bold").fontSize(13).fillColor("#111111").text("Charges");
  pdf.moveDown(0.7);
  const tailoringSubtotal = Number(value.subtotal ?? value.quoteAmount ?? quote?.price ?? 0);
  const rows: Array<[string, number]> = [
    ["Tailoring subtotal", tailoringSubtotal],
    ["Delivery charges", Number(value.deliveryFee ?? 0)],
    ["Platform fee", Number(value.platformFee ?? 0)],
    ["Small-order fee", Number(value.smallOrderFee ?? 0)],
    ["Home measurement", Number(value.homeMeasurementFee ?? 0)],
    ["Discount", -Number(value.discount ?? value.discountAmount ?? 0)]
  ];
  rows.forEach(([label, amount]) => {
    pdf.font("Helvetica").fontSize(10).fillColor("#333333").text(label, 54, pdf.y, { continued: true, width: 370 });
    pdf.font("Helvetica-Bold").text(`${amount < 0 ? "-" : ""}INR ${Math.abs(amount).toLocaleString("en-IN")}`, { align: "right" });
  });
  pdf.moveDown(0.5);
  pdf.moveTo(54, pdf.y).lineTo(541, pdf.y).strokeColor("#DDDDDD").stroke();
  pdf.moveDown(0.6);
  pdf.font("Helvetica-Bold").fontSize(14).fillColor("#111111").text("Total", 54, pdf.y, { continued: true, width: 370 });
  pdf.text(`INR ${Number(value.totalAmount ?? rows.reduce((sum, [, amount]) => sum + amount, 0)).toLocaleString("en-IN")}`, { align: "right" });
  pdf.moveDown(2);
  pdf.font("Helvetica").fontSize(9).fillColor("#777777").text("This invoice was generated from the order information recorded by Darji.", { align: "center" });
  pdf.end();
}

export async function listAdminOrderQuotesController(req: Request, res: Response) {
  const entity = await findAdminOrderEntity(String(req.params.id));
  if (!entity) throw new AppError(404, "Order not found");
  const requestId = entity.kind === "TAILORING_REQUEST" ? String(req.params.id) : String(entity.value.requestId || "");
  if (!requestId) return res.json({ data: [] });
  const quotes = await TailorQuoteModel.find({ requestId }).sort({ createdAt: 1 });
  const data = await Promise.all(quotes.map(async (quote) => {
    const tailor = await TailorModel.findById(quote.tailorId);
    return { ...quote.toJSON(), tailor: tailor ? await withUser(tailor) : null };
  }));
  res.json({ data });
}

export async function updateAdminOrderQuoteController(req: Request, res: Response) {
  const entity = await findAdminOrderEntity(String(req.params.id));
  if (!entity) throw new AppError(404, "Order not found");
  const requestId = entity.kind === "TAILORING_REQUEST" ? String(req.params.id) : String(entity.value.requestId || "");
  if (!requestId) throw new AppError(400, "This order does not have tailor quotes");
  const input = z.object({
    price: z.coerce.number().min(0).max(1_000_000).optional(),
    estimatedDays: z.coerce.number().int().min(0).max(365).optional(),
    estimatedHours: z.coerce.number().int().min(0).max(8760).nullable().optional(),
    message: z.string().trim().max(1000).optional()
  }).refine((value) => Object.keys(value).length > 0, "Provide at least one quote field").parse(req.body);
  const quote = await TailorQuoteModel.findOne({ _id: String(req.params.quoteId), requestId });
  if (!quote) throw new AppError(404, "Tailor quote not found");
  const request = await TailoringRequestModel.findById(requestId);
  const isSelected = String(request?.selectedQuoteId ?? "") === String(quote.id) || quote.status === "ACCEPTED";
  if (isSelected && (request?.paymentStatus === "PAID" || ["completed", "cancelled"].includes(String(request?.orderStatus ?? "")))) {
    throw new AppError(409, "An accepted quote cannot be changed after payment or order completion");
  }
  const previousPrice = Number(quote.price ?? 0);
  if (input.price !== undefined) quote.price = input.price;
  if (input.estimatedDays !== undefined) quote.estimatedDays = input.estimatedDays;
  if (input.estimatedHours !== undefined) quote.estimatedHours = input.estimatedHours ?? undefined;
  if (input.message !== undefined) quote.message = input.message;
  await quote.save();
  if (request && isSelected && input.price !== undefined) {
    const priceDelta = input.price - previousPrice;
    request.quoteAmount = input.price;
    request.totalAmount = Math.max(0, Number(request.totalAmount ?? previousPrice) + priceDelta);
    await request.save();
  }
  const tailor = await TailorModel.findById(quote.tailorId);
  res.json({ data: { ...quote.toJSON(), tailor: tailor ? await withUser(tailor) : null } });
}

function addressText(address?: Record<string, any> | null) {
  return address ? [address.line1, address.line2, address.landmark, address.city, address.state, address.pincode].filter(Boolean).join(", ") : "";
}

function profileAddress(profile: Record<string, any>) {
  const verification = profile.verification ?? profile.verificationDraft ?? {};
  const value = verification.shop?.address ?? verification.shopAddress ?? verification.personal?.address ?? verification.address ?? profile.assignedArea;
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return addressText(value);
  return "";
}

async function resolveAdminDistanceOrigin(query: Record<string, unknown>): Promise<{ point: LatLng; label: string }> {
  const orderId = String(query.orderId ?? "").trim();
  const customerId = String(query.customerId ?? "").trim();
  const typedAddress = String(query.address ?? "").trim();
  if (orderId) {
    const order = await OrderModel.findById(orderId).lean();
    if (order) {
      const address = await AddressModel.findById(order.addressId).lean();
      const label = addressText(address as Record<string, any> | null);
      const point = pointFrom(address) ?? await geocodeAddress(label);
      if (point) return { point, label: label || `Order ${order.orderNumber}` };
    }
    const request = await TailoringRequestModel.findById(orderId).lean();
    if (request) {
      const label = String(request.pickupAddress ?? "");
      const point = pointFrom(request.pickupLocation) ?? await geocodeAddress(label);
      if (point) return { point, label };
    }
  }
  if (customerId) {
    const address = await AddressModel.findOne({ userId: customerId }).sort({ isDefault: -1, updatedAt: -1 }).lean();
    const label = addressText(address as Record<string, any> | null);
    const point = pointFrom(address) ?? await geocodeAddress(label);
    if (point) return { point, label };
  }
  if (typedAddress) {
    const point = await geocodeAddress(typedAddress);
    if (point) return { point, label: typedAddress };
  }
  throw new AppError(422, "A usable customer or address location could not be found");
}

export async function listAdminAssignmentCandidatesController(req: Request, res: Response) {
  const input = z.object({
    role: z.enum(["TAILOR", "DELIVERY_PARTNER"]),
    orderId: z.string().trim().optional(),
    customerId: z.string().trim().optional(),
    address: z.string().trim().optional()
  }).parse(req.query);
  const origin = await resolveAdminDistanceOrigin(input);
  const profiles = input.role === "TAILOR"
    ? await TailorModel.find({}).lean()
    : await DeliveryPartnerModel.find({}).lean();
  const resolved = await Promise.all(profiles.map(async (profile: any) => {
    const address = profileAddress(profile);
    const point = input.role === "TAILOR"
      ? extractTailorPoint(profile)
      : pointFrom(profile.currentLocation) ?? extractTailorPoint(profile);
    return { profile, address, point: point ?? await geocodeAddress(address) };
  }));
  const located = resolved.filter((item): item is typeof item & { point: LatLng } => Boolean(item.point));
  const distanceById = new Map<string, number>();
  for (let start = 0; start < located.length; start += 40) {
    const chunk = located.slice(start, start + 40);
    const matrix = await roadDistanceMatrix([origin.point, ...chunk.map((item) => item.point)]);
    chunk.forEach((item, index) => distanceById.set(String(item.profile._id), Math.round(matrix[0]?.[index + 1]?.distance ?? 0)));
  }
  const data = await Promise.all(resolved.map(async ({ profile, address }) => {
    const model = input.role === "TAILOR" ? await TailorModel.findById(profile._id) : await DeliveryPartnerModel.findById(profile._id);
    return {
      profile: model ? await withUser(model as any) : { ...profile, id: String(profile._id) },
      distanceMeters: distanceById.get(String(profile._id)) ?? null,
      locationLabel: address || "Location unavailable"
    };
  }));
  data.sort((a, b) => (a.distanceMeters ?? Number.POSITIVE_INFINITY) - (b.distanceMeters ?? Number.POSITIVE_INFINITY));
  res.json({ data: { originLabel: origin.label, candidates: data } });
}

export async function reportAdminOrderIssueController(req: Request, res: Response) {
  const entity = await findAdminOrderEntity(String(req.params.id));
  if (!entity) throw new AppError(404, "Order not found");
  const input = z.object({ message: z.string().trim().min(3).max(1000).default("Order requires admin review") }).parse(req.body ?? {});
  const identifier = entity.kind === "TAILORING_REQUEST" ? `REQ-${String(req.params.id).slice(0, 8).toUpperCase()}` : String(entity.value.orderNumber || entity.value.darjiId || req.params.id);
  const alert = await OperationalAlertModel.findOneAndUpdate(
    { dedupeKey: `admin-order-issue:${req.params.id}` },
    {
      $set: {
        type: "ADMIN_ORDER_ISSUE",
        status: "OPEN",
        severity: "WARNING",
        title: `Review ${identifier}`,
        message: input.message,
        entityType: entity.kind,
        entityId: String(req.params.id),
        customerId: entity.value.customerId,
        metadata: { reportedBy: req.user!.id, identifier }
      }
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
  res.status(201).json({ data: alert });
}

export async function deleteAdminOrderController(req: Request, res: Response) {
  const entity = await findAdminOrderEntity(String(req.params.id));
  if (!entity) throw new AppError(404, "Order not found");
  const identifier = entity.kind === "TAILORING_REQUEST"
    ? `REQ-${String(req.params.id).slice(0, 8).toUpperCase()}`
    : String(entity.value.orderNumber || entity.value.darjiId || entity.value.id || req.params.id);
  const input = z.object({ confirmation: z.string() }).parse(req.body);
  if (input.confirmation !== `DELETE ${identifier}`) throw new AppError(400, `Type DELETE ${identifier} to permanently delete this order`);
  const entityId = String(req.params.id);
  const deliveryTasks = await DeliveryRequestModel.find({ orderId: entityId }).lean();
  const taskIds = deliveryTasks.map((task: any) => String(task._id));
  const batchIds = [...new Set(deliveryTasks.map((task: any) => String(task.batchId || "")).filter(Boolean))];
  const walletTransactions = await WalletTransactionModel.find({ orderId: entityId }).lean();
  const walletAdjustments = new Map<string, number>();
  walletTransactions.forEach((transaction: any) => {
    const signedAmount = transaction.transactionType === "CREDIT" ? Number(transaction.amount ?? 0) : -Number(transaction.amount ?? 0);
    walletAdjustments.set(String(transaction.walletId), (walletAdjustments.get(String(transaction.walletId)) ?? 0) + signedAmount);
  });
  await Promise.all([...walletAdjustments].map(([walletId, amount]) => WalletModel.updateOne({ _id: walletId }, { $inc: { balance: -amount } })));
  await Promise.all([
    OrderModel.deleteOne({ _id: entityId }),
    TailoringRequestModel.deleteOne({ _id: entityId }),
    TailorQuoteModel.deleteMany({ requestId: entityId }),
    DeliveryRequestModel.deleteMany({ orderId: entityId }),
    PaymentModel.deleteMany({ orderId: entityId }),
    PaymentHistoryModel.deleteMany({ walletTransactionId: { $in: walletTransactions.map((transaction: any) => String(transaction._id)) } }),
    TransactionModel.deleteMany({ orderId: entityId }),
    WalletTransactionModel.deleteMany({ orderId: entityId }),
    ReviewModel.deleteMany({ orderId: entityId }),
    MeasurementVisitModel.deleteMany({ requestId: entityId }),
    NotificationModel.deleteMany({ orderId: entityId }),
    OperationalAlertModel.deleteMany({ entityId }),
    CouponRedemptionModel.updateMany({ orderIds: entityId }, { $pull: { orderIds: entityId } }),
    SupportTicketModel.updateMany({ orderId: entityId }, { $unset: { orderId: "" } }),
    AdminOrderMetadataModel.deleteMany({ entityId }),
    DeliveryBatchModel.updateMany({ $or: [{ batchId: { $in: batchIds } }, { tasks: { $in: taskIds } }] }, { $pull: { tasks: { $in: taskIds } } })
  ]);
  res.json({ data: { deleted: true, id: entityId, identifier } });
}

const adminProfileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(7).max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  displayName: z.string().trim().max(120).optional(),
  shopName: z.string().trim().max(160).optional(),
  specialization: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  vehicleNumber: z.string().trim().max(40).optional(),
  deliveryType: z.enum(["PICKUP", "DROP"]).optional(),
  assignedArea: z.string().trim().max(160).optional(),
  isAvailable: z.boolean().optional(),
  workingHours: z.unknown().optional(),
  verification: z.record(z.string(), z.unknown()).optional()
});

const protectedRegistrationKeys = new Set([
  "status", "verificationstatus", "ocrstatus", "facedetectionstatus", "reviewstatus", "approvalstatus",
  "submittedat", "reviewedat", "approvedat", "rejectedat", "savedat", "createdat", "updatedat",
  "reviewedby", "approvedby", "rejectedby", "lat", "lng", "latitude", "longitude", "coordinates"
]);

function mergeAdminRegistrationFields(current: unknown, incoming: unknown): unknown {
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return incoming;
  const base = current && typeof current === "object" && !Array.isArray(current)
    ? structuredClone(current as Record<string, unknown>)
    : {};
  Object.entries(incoming as Record<string, unknown>).forEach(([key, value]) => {
    const normalizedKey = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (protectedRegistrationKeys.has(normalizedKey) || /(url|photo|image|media|resourcetype|originalname)$/.test(normalizedKey)) return;
    (base as Record<string, unknown>)[key] = value && typeof value === "object" && !Array.isArray(value)
      ? mergeAdminRegistrationFields((base as Record<string, unknown>)[key], value)
      : value;
  });
  return base;
}

type AdminProfileChange = { field: string; before: unknown; after: unknown };

function profileChanges(before: unknown, after: unknown, prefix = ""): AdminProfileChange[] {
  const beforeObject = before && typeof before === "object" && !Array.isArray(before) ? before as Record<string, unknown> : null;
  const afterObject = after && typeof after === "object" && !Array.isArray(after) ? after as Record<string, unknown> : null;
  if (beforeObject && afterObject) {
    return [...new Set([...Object.keys(beforeObject), ...Object.keys(afterObject)])].flatMap((key) => profileChanges(beforeObject[key], afterObject[key], prefix ? `${prefix}.${key}` : key));
  }
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  return [{ field: prefix || "profile", before: before ?? null, after: after ?? null }];
}

async function recordAdminPartnerChanges(req: Request, role: "TAILOR" | "DELIVERY_PARTNER", profileId: string, summary: string, changes: AdminProfileChange[]) {
  if (!changes.length) return;
  const actor = await UserModel.findById(req.user!.id).select("name phone").lean();
  await AdminAuditLogModel.create({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    actorName: actor?.name || actor?.phone || "Admin",
    actorPhone: actor?.phone,
    category: "PEOPLE",
    action: summary,
    method: req.method,
    path: req.originalUrl.split("?")[0],
    statusCode: 200,
    entityType: role === "TAILOR" ? "TAILOR_PROFILE" : "DELIVERY_PARTNER_PROFILE",
    entityId: profileId,
    summary,
    metadata: { changes: changes.slice(0, 250) },
    ...auditRequestContext(req)
  });
}

async function updateAdminPartnerProfile(req: Request, res: Response, role: "TAILOR" | "DELIVERY_PARTNER") {
  const input = adminProfileUpdateSchema.parse(req.body);
  const profile = role === "TAILOR"
    ? await TailorModel.findById(String(req.params.id))
    : await DeliveryPartnerModel.findById(String(req.params.id));
  if (!profile) throw new AppError(404, `${role === "TAILOR" ? "Tailor" : "Delivery partner"} profile not found`);
  const existingUser = await UserModel.findById(profile.userId).lean();
  const before = {
    user: { name: existingUser?.name, phone: existingUser?.phone, email: existingUser?.email, profileUrl: existingUser?.profileUrl, avatarUrl: existingUser?.avatarUrl },
    profile: profile.toObject()
  };
  const userUpdate = Object.fromEntries(Object.entries({ name: input.name, phone: input.phone, email: input.email || undefined, profileUrl: input.avatarUrl || undefined, avatarUrl: input.avatarUrl || undefined }).filter(([, value]) => value !== undefined));
  if (Object.keys(userUpdate).length) await UserModel.findByIdAndUpdate(profile.userId, { $set: userUpdate });
  const profileUpdate = { ...input } as Record<string, unknown>;
  delete profileUpdate.name;
  delete profileUpdate.phone;
  delete profileUpdate.email;
  delete profileUpdate.avatarUrl;
  if (input.verification) profileUpdate.verification = mergeAdminRegistrationFields(profile.verification, input.verification);
  if (!profile.registrationSnapshot && profile.verification) {
    profileUpdate.registrationSnapshot = structuredClone(profile.verification);
    profileUpdate.registrationSnapshotCapturedAt = profile.verificationSubmittedAt ?? new Date();
  }
  if (Object.keys(profileUpdate).length) {
    if (role === "TAILOR") await TailorModel.findByIdAndUpdate(profile.id, { $set: profileUpdate });
    else await DeliveryPartnerModel.findByIdAndUpdate(profile.id, { $set: profileUpdate });
  }
  const updated = role === "TAILOR" ? await TailorModel.findById(profile.id) : await DeliveryPartnerModel.findById(profile.id);
  const updatedUser = await UserModel.findById(profile.userId).lean();
  const changes = profileChanges(before, {
    user: { name: updatedUser?.name, phone: updatedUser?.phone, email: updatedUser?.email, profileUrl: updatedUser?.profileUrl, avatarUrl: updatedUser?.avatarUrl },
    profile: updated?.toObject()
  }).filter((change) => !change.field.startsWith("profile.updatedAt") && !change.field.startsWith("profile.registrationSnapshot"));
  await recordAdminPartnerChanges(req, role, String(profile.id), `${role === "TAILOR" ? "Tailor" : "Delivery partner"} profile updated`, changes);
  res.json({ data: await withUser(updated!) });
}

export async function listAdminPartnerProfileChangeLogController(req: Request, res: Response) {
  const role = req.originalUrl.includes("/delivery-partners/") ? "DELIVERY_PARTNER" : "TAILOR";
  const logs = await AdminAuditLogModel.find({ entityType: role === "TAILOR" ? "TAILOR_PROFILE" : "DELIVERY_PARTNER_PROFILE", entityId: String(req.params.id) }).sort({ createdAt: -1 }).limit(250).lean();
  res.json({ data: logs.map((log: any) => ({ ...log, id: String(log._id), _id: undefined })) });
}

export async function updateAdminTailorProfileController(req: Request, res: Response) {
  return updateAdminPartnerProfile(req, res, "TAILOR");
}

export async function updateAdminDeliveryProfileController(req: Request, res: Response) {
  return updateAdminPartnerProfile(req, res, "DELIVERY_PARTNER");
}

export async function systemHealthController(_req: Request, res: Response) {
  const push = pushRuntimeStatus();
  const cloudinaryConfigured = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
  const razorpayConfigured = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
  const databaseHealthy = mongoose.connection.readyState === 1;
  const productionSecrets = env.NODE_ENV !== "production" || (
    env.JWT_ACCESS_SECRET !== "dev-access-secret-change-me" &&
    env.JWT_REFRESH_SECRET !== "dev-refresh-secret-change-me"
  );
  const checks = [
    { key: "backend", label: "Backend API", status: "healthy", detail: "Health endpoint is responding" },
    { key: "database", label: "Database", status: databaseHealthy ? "healthy" : "degraded", detail: databaseHealthy ? "MongoDB connection is ready" : "MongoDB connection is not ready" },
    { key: "firebase", label: "Firebase Push", status: push.firebaseReady ? "healthy" : push.firebaseConfigured ? "degraded" : "unconfigured", detail: push.firebaseReady ? "Firebase Admin initialized" : push.firebaseConfigured ? "Configured but not initialized" : "FCM credentials are missing" },
    { key: "storage", label: "Cloudinary Storage", status: cloudinaryConfigured ? "healthy" : "unconfigured", detail: cloudinaryConfigured ? "Cloudinary credentials are configured" : "Cloudinary credentials are missing" },
    { key: "payments", label: "Razorpay", status: razorpayConfigured ? "healthy" : "unconfigured", detail: razorpayConfigured ? "Razorpay credentials are configured" : "Razorpay credentials are missing" },
    { key: "maps", label: "Google Maps", status: env.GOOGLE_MAPS_API_KEY ? "healthy" : "unconfigured", detail: env.GOOGLE_MAPS_API_KEY ? "Maps key is configured" : "Maps key is missing" },
    { key: "cors", label: "Browser Origins", status: env.CORS_ALLOWED_ORIGINS || env.NODE_ENV !== "production" ? "healthy" : "degraded", detail: env.CORS_ALLOWED_ORIGINS ? "Explicit external origin allowlist configured" : env.NODE_ENV !== "production" ? "Loopback development origins enabled" : "Loopback origins work, but CORS_ALLOWED_ORIGINS is required for deployed web frontends" },
    { key: "environment", label: "Environment", status: productionSecrets ? "healthy" : "degraded", detail: productionSecrets ? `${env.NODE_ENV} configuration loaded` : "Production is using development JWT secrets" }
  ];
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json({ data: { checkedAt: new Date().toISOString(), overall: checks.every((check) => check.status === "healthy") ? "healthy" : "attention", checks } });
}

// ---------------------------------------------------------------------------
// Location — server-side Google reverse geocoding (keeps API key server-side)
// GET /api/location/reverse-geocode?lat=&lng=
// ---------------------------------------------------------------------------
export async function reverseGeocodeController(req: Request, res: Response) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    res.status(400).json({ message: "Invalid lat/lng parameters" });
    return;
  }

  // Helper to try Nominatim (OpenStreetMap) fallback
  async function tryNominatimFallback() {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Darji-App/1.0"
        }
      });
      if (response.ok) {
        const osmData = await response.json() as {
          display_name?: string;
          address?: {
            house_number?: string;
            road?: string;
            suburb?: string;
            neighbourhood?: string;
            city?: string;
            town?: string;
            village?: string;
            county?: string;
            state?: string;
            postcode?: string;
            country?: string;
          };
        };

        if (osmData && osmData.display_name) {
          const addr = osmData.address || {};
          const houseNumber = addr.house_number ?? "";
          const route = addr.road ?? "";
          const area = addr.suburb ?? addr.neighbourhood ?? "";
          const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? "";
          const state = addr.state ?? "";
          const postalCode = addr.postcode ?? "";
          const country = addr.country ?? "";

          return {
            latitude: lat,
            longitude: lng,
            formattedAddress: osmData.display_name,
            houseNumber,
            route,
            area,
            locality: city,
            city,
            state,
            postalCode,
            country
          };
        }
      }
    } catch (e) {
      // Ignore error and return null
    }
    return null;
  }

  if (!env.GOOGLE_MAPS_API_KEY) {
    const fallback = await tryNominatimFallback();
    if (fallback) {
      res.json({ data: fallback });
      return;
    }
    res.status(503).json({ message: "Geocoding service not configured and fallback failed" });
    return;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${env.GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = (await response.json()) as {
      status: string;
      results: Array<{
        formatted_address: string;
        address_components: Array<{ long_name: string; types: string[] }>;
      }>;
    };

    if (data.status === "OK" && data.results?.[0]) {
      const components = data.results[0].address_components;
      const get = (...types: string[]) =>
        components.find((c) => types.some((t) => c.types.includes(t)))?.long_name ?? "";

      res.json({
        data: {
          latitude: lat,
          longitude: lng,
          formattedAddress: data.results[0].formatted_address,
          houseNumber: get("street_number"),
          route: get("route"),
          area: get("sublocality_level_1", "sublocality"),
          locality: get("locality"),
          city: get("administrative_area_level_2", "locality"),
          state: get("administrative_area_level_1"),
          postalCode: get("postal_code"),
          country: get("country")
        }
      });
      return;
    }
  } catch (e) {
    // If Google fetch fails, fallback to Nominatim
  }

  const fallback = await tryNominatimFallback();
  if (fallback) {
    res.json({ data: fallback });
    return;
  }

  res.status(422).json({ message: "Could not geocode location" });
}

// ---------------------------------------------------------------------------
// Rider live location — Delivery Partner updates their own GPS position
// PATCH /api/delivery-partners/me/location
// ---------------------------------------------------------------------------
export async function updateRiderLocationController(req: Request, res: Response) {
  const { latitude, longitude, accuracy, heading, speed, isAvailable } = req.body as {
    latitude: unknown;
    longitude: unknown;
    accuracy?: unknown;
    heading?: unknown;
    speed?: unknown;
    isAvailable?: unknown;
  };

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json({ message: "Invalid coordinates" });
    return;
  }

  const userId: string = req.user!.id;
  const existingPartner = await DeliveryPartnerModel.findOne({ userId });
  if (!existingPartner) {
    res.status(404).json({ message: "Delivery partner not found" });
    return;
  }
  const availabilityWasProvided = typeof isAvailable === "boolean";
  const activateOnline = isAvailable === true;
  if (activateOnline && existingPartner.verificationStatus !== "VERIFIED") {
    throw new AppError(403, "Complete admin verification before going online");
  }

  const partner = await DeliveryPartnerModel.findOneAndUpdate(
    { _id: existingPartner.id },
    {
      currentLocation: { type: "Point", coordinates: [lng, lat] },
      lastLocationAccuracy: Number.isFinite(Number(accuracy)) ? Number(accuracy) : undefined,
      lastLocationUpdatedAt: new Date(),
      lastLocationHeading: Number.isFinite(Number(heading)) ? Number(heading) : undefined,
      lastLocationSpeed: Number.isFinite(Number(speed)) ? Number(speed) : undefined,
      ...(availabilityWasProvided ? { isAvailable } : {})
    },
    { returnDocument: "after", select: "_id darjiPartnerId isAvailable lastLocationUpdatedAt lastLocationAccuracy" }
  );

  if (!partner) {
    res.status(404).json({ message: "Delivery partner not found" });
    return;
  }

  // Broadcast to authenticated admin sockets only — not customers, not tailors
  emitToAdmins("rider:location_updated", {
    partnerId: partner.id,
    latitude: lat,
    longitude: lng,
    accuracy: Number.isFinite(Number(accuracy)) ? Number(accuracy) : null,
    heading: Number.isFinite(Number(heading)) ? Number(heading) : null,
    isAvailable: partner.isAvailable,
    lastLocationUpdatedAt: partner.lastLocationUpdatedAt
  });

  res.json({ data: { ok: true, isAvailable: partner.isAvailable, lastLocationUpdatedAt: partner.lastLocationUpdatedAt } });
}
