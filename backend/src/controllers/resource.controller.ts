import type { Request, Response } from "express";
import { addressSchema, couponSchema, serviceCatalog, supportTicketSchema, bugReportSchema, accountChangeRequestSchema } from "@darzi/shared";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import {
  AddressModel,
  CouponModel,
  DeliveryPartnerModel,
  NotificationModel,
  OrderModel,
  PaymentModel,
  ReviewModel,
  ServiceCategoryModel,
  ServiceModel,
  SettingModel,
  SupportTicketModel,
  TailorModel,
  TransactionModel,
  UserModel,
  WalletModel,
  BugReportModel,
  AccountChangeRequestModel,
  deliveryTypes
} from "../models.js";
import multer from "multer";
import { z } from "zod";
import { env } from "../env.js";
import { AppError } from "../middleware/error.js";
import { assignOrder, createOrder, getOrder, listOrders, updateOrderStatus } from "../services/order.service.js";
import { saveFcmToken, sendPushToUsers } from "../services/push.service.js";
import { sendPaymentSuccessNotification } from "../services/notificationService.js";
import { assignPendingTasksToPartner } from "./request.controller.js";
import { emitToCustomer, emitToAdmins } from "../services/socket.service.js";

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
  limits: { files: 4, fileSize: 5 * 1024 * 1024 }
}).array("media", 4);

export const uploadDeliveryAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 5 * 1024 * 1024 }
}).single("avatar");

export const uploadDeliveryVerificationMedia = multer({
  storage: multer.memoryStorage(),
  limits: { files: 4, fileSize: 5 * 1024 * 1024 }
}).array("media", 4);

const tailorProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  shopName: z.string().trim().min(2).max(100).optional(),
  specialization: z.array(z.string().trim().min(2).max(40)).max(8).optional(),
  workingHours: z.object({ from: z.string().trim().max(10).optional(), to: z.string().trim().max(10).optional() }).optional(),
  settings: z
    .object({
      notifications: z.boolean().optional(),
      soundAlerts: z.boolean().optional(),
      compactCards: z.boolean().optional(),
      autoOpenNewRequests: z.boolean().optional(),
      maxOrdersPerDay: z.number().int().positive().max(50).optional(),
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
    machinery: z.array(z.string().trim().min(2).max(60)).max(20)
  }),
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
  idVerification: z.object({
    idType: z.enum(["Aadhaar", "PAN"]),
    idNumber: z.string().trim().min(10).max(20),
    aadhaarFrontUrl: z.string().url().optional(),
    aadhaarBackUrl: z.string().url().optional(),
    panUrl: z.string().url().optional(),
    facePhotoUrl: z.string().url().optional(),
    ocrStatus: z.string().trim().max(80).optional(),
    extractedDetails: z.record(z.string(), z.unknown()).optional(),
    faceDetectionStatus: z.string().trim().max(80).optional()
  })
});

const tailorVerificationDraftSchema = z.object({
  step: z.number().int().min(1).max(6).optional(),
  draft: z.record(z.string(), z.unknown())
});

const deliveryProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
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
    workingHours: z.string().trim().min(2).max(80),
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
  deliveryType: z.enum(deliveryTypes).optional(),
  assignedArea: z.string().trim().min(1).max(100).optional()
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

function uploadAvatarBuffer(file: Express.Multer.File, folder = "darzi/tailor-profiles") {
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

async function uploadTailorImageBuffer(file: Express.Multer.File, folder = "darzi/tailor-verification") {
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

async function withUser<T extends { toJSON: () => Record<string, unknown>; userId: string }>(profile: T) {
  const user = await UserModel.findById(profile.userId).select("name phone role email avatarUrl accountStatus suspendedUntil moderationReason moderatedAt");
  return { ...profile.toJSON(), user: user?.toJSON() };
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

  return users.map((user) => ({
    ...user,
    tailorProfile: tailorMap.get(String(user.id ?? user._id)) ?? null,
    deliveryProfile: partnerMap.get(String(user.id ?? user._id)) ?? null
  }));
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

export async function listOrdersController(req: Request, res: Response) {
  const orders = await listOrders(req.user!, req.query);
  res.json({ data: orders });
}

export async function getOrderController(req: Request, res: Response) {
  const order = await getOrder(String(req.params.id));
  if (!order) throw new AppError(404, "Order not found");
  res.json({ data: order });
}

export async function updateOrderStatusController(req: Request, res: Response) {
  const order = await updateOrderStatus(String(req.params.id), req.body, req.user!);
  res.json({ data: order });
}

export async function assignOrderController(req: Request, res: Response) {
  const order = await assignOrder(String(req.params.id), req.body);
  res.json({ data: order });
}

export async function listTailorsController(_req: Request, res: Response) {
  const tailors = await TailorModel.find().sort({ createdAt: -1 });
  res.json({ data: await Promise.all(tailors.map((tailor) => withUser(tailor))) });
}

export async function reviewTailorVerificationController(req: Request, res: Response) {
  const input = verificationReviewSchema.parse(req.body);
  const tailor = await TailorModel.findByIdAndUpdate(
    String(req.params.id),
    {
      verificationStatus: input.status,
      verificationReviewedAt: new Date(),
      verificationRejectionReason: input.reason || undefined
    },
    { returnDocument: "after" }
  );

  if (!tailor) throw new AppError(404, "Tailor profile not found");
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
  const [user, tailor] = await Promise.all([
    input.name ? UserModel.findByIdAndUpdate(req.user!.id, { name: input.name }, { returnDocument: "after" }) : UserModel.findById(req.user!.id),
    TailorModel.findOneAndUpdate(
      { userId: req.user!.id },
      {
        ...(input.shopName ? { shopName: input.shopName } : {}),
        ...(input.specialization ? { specialization: input.specialization } : {}),
        ...(input.workingHours ? { workingHours: input.workingHours } : {}),
        ...(input.settings ? { settings: input.settings } : {})
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    )
  ]);

  res.json({ data: { ...user?.toJSON(), tailorProfile: tailor } });
}

export async function submitTailorVerificationController(req: Request, res: Response) {
  const input = tailorVerificationSchema.parse(req.body);
  const specialization = input.specializationRows.map((row) => `${row.gender} ${row.clothType} ${row.stitchingType}`);
  const existingTailor = await TailorModel.findOne({ userId: req.user!.id }).select("darjiTailorId");

  const [user, tailor] = await Promise.all([
    UserModel.findByIdAndUpdate(req.user!.id, { name: input.personal.name }, { returnDocument: "after" }),
    TailorModel.findOneAndUpdate(
      { userId: req.user!.id },
      {
        shopName: input.shop.shopName,
        darjiTailorId: existingTailor?.darjiTailorId ?? createDarjiTailorId(),
        specialization,
        verificationStatus: "PENDING",
        verificationSubmittedAt: new Date(),
        verificationReviewedAt: undefined,
        verificationRejectionReason: undefined,
        verification: input,
        verificationDraft: undefined
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
  assertCloudinaryConfigured();
  const file = req.file;
  if (!file) throw new AppError(400, "Attach a profile photo");
  const result = await uploadAvatarBuffer(file);
  const user = await UserModel.findByIdAndUpdate(req.user!.id, { avatarUrl: result.secure_url }, { returnDocument: "after" });
  res.status(201).json({ data: { avatarUrl: result.secure_url, user } });
}

export async function uploadTailorVerificationMediaController(req: Request, res: Response) {
  assertCloudinaryConfigured();
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw new AppError(400, "Attach at least one verification photo");
  if (files.length > 4) throw new AppError(400, "Upload up to 4 verification photos");

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

export async function listDeliveryPartnersController(_req: Request, res: Response) {
  const partners = await DeliveryPartnerModel.find().sort({ createdAt: -1 });
  res.json({ data: await Promise.all(partners.map((partner) => withUser(partner))) });
}

export async function reviewDeliveryVerificationController(req: Request, res: Response) {
  const input = verificationReviewSchema.parse(req.body);
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
  if (partner.isAvailable && partner.verificationStatus === "VERIFIED") {
    await assignPendingTasksToPartner(partner);
  }
  res.json({ data: await withUser(partner) });
}

export async function listUsersController(_req: Request, res: Response) {
  const users = await UserModel.find().sort({ createdAt: -1 });
  res.json({ data: await attachProfilesToUsers(users.map((user) => user.toJSON())) });
}

export async function moderateUserController(req: Request, res: Response) {
  const input = userModerationSchema.parse(req.body);
  const userId = String(req.params.id);

  if (req.user?.id === userId) {
    throw new AppError(400, "You cannot moderate your own admin account");
  }

  const existingUser = await UserModel.findById(userId).select("role");
  if (!existingUser) throw new AppError(404, "User not found");
  if (existingUser.role === "ADMIN") {
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

export async function updateDeliveryAvailabilityController(req: Request, res: Response) {
  const partner = await DeliveryPartnerModel.findOne({ userId: req.user!.id });
  if (!partner) throw new AppError(404, "Delivery profile not found");
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

  res.json({ data: { ...user?.toJSON(), deliveryProfile: partner } });
}

export async function submitDeliveryVerificationController(req: Request, res: Response) {
  const input = deliveryVerificationSchema.parse(req.body);

  const [user, partner] = await Promise.all([
    UserModel.findByIdAndUpdate(
      req.user!.id,
      {
        name: input.personal.fullName,
        ...(input.personal.email ? { email: input.personal.email } : {})
      },
      { returnDocument: "after" }
    ),
    DeliveryPartnerModel.findOneAndUpdate(
      { userId: req.user!.id },
      {
        vehicleNumber: input.vehicle.vehicleNumber,
        workingHours: input.preferences.workingHours,
        settings: {
          availability: input.preferences.availability,
          radius: input.preferences.radius,
          instantDeliveries: input.preferences.instantDeliveries
        },
        verificationStatus: "PENDING",
        verificationSubmittedAt: new Date(),
        verificationReviewedAt: undefined,
        verificationRejectionReason: undefined,
        verification: input,
        verificationDraft: undefined
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    )
  ]);

  res.json({ data: { ...user?.toJSON(), deliveryProfile: partner } });
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
  assertCloudinaryConfigured();
  const file = req.file;
  if (!file) throw new AppError(400, "Attach a profile photo");
  const result = await uploadAvatarBuffer(file, "darzi/delivery-profiles");
  const user = await UserModel.findByIdAndUpdate(req.user!.id, { avatarUrl: result.secure_url }, { returnDocument: "after" });
  res.status(201).json({ data: { avatarUrl: result.secure_url, user } });
}

export async function uploadDeliveryVerificationMediaController(req: Request, res: Response) {
  assertCloudinaryConfigured();
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw new AppError(400, "Attach at least one verification photo");
  if (files.length > 4) throw new AppError(400, "Upload up to 4 verification photos");

  const uploaded = await Promise.all(
    files.map(async (file) => {
      const result = await uploadTailorImageBuffer(file, "darzi/delivery-verification");
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
  const wallet = await WalletModel.findOneAndUpdate({ userId: req.user!.id }, { $setOnInsert: { userId: req.user!.id, balance: 0 } }, { upsert: true, returnDocument: "after" });
  res.json({ data: wallet });
}

export async function transactionsController(req: Request, res: Response) {
  const transactions = await TransactionModel.find({ userId: req.user!.id }).sort({ createdAt: -1 });
  res.json({ data: transactions });
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
  const review = await ReviewModel.create({ userId: req.user!.id, orderId: String(req.body.orderId), rating, comment: req.body.comment });
  const order = await OrderModel.findById(String(req.body.orderId)).select("tailorId");
  if (order?.tailorId) {
    const tailorOrders = await OrderModel.find({ tailorId: order.tailorId }).select("_id");
    const orderIds = tailorOrders.map((tailorOrder) => tailorOrder.id);
    const [ratingSummary] = await ReviewModel.aggregate<{ _id: null; averageRating: number }>([
      { $match: { orderId: { $in: orderIds } } },
      { $group: { _id: null, averageRating: { $avg: "$rating" } } }
    ]);
    if (ratingSummary) {
      await TailorModel.findByIdAndUpdate(order.tailorId, { rating: Number(ratingSummary.averageRating.toFixed(1)) });
    }
  }
  res.status(201).json({ data: review });
}

export async function createSupportTicketController(req: Request, res: Response) {
  const input = supportTicketSchema.parse(req.body);

  // Anti-Spam: 30 seconds cooldown between any ticket submissions
  const lastTicket = await SupportTicketModel.findOne({ userId: req.user!.id }).sort({ createdAt: -1 });
  if (lastTicket && (Date.now() - new Date(lastTicket.createdAt).getTime() < 30 * 1000)) {
    res.status(429).json({ message: "Please wait 30 seconds before opening another support ticket." });
    return;
  }

  // Anti-Spam: Redirect to existing active ticket if category/order is the same
  const query: any = {
    userId: req.user!.id,
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
    { new: true }
  );

  // Send push notification
  if (update.adminResponse) {
    try {
      const user = await UserModel.findById(ticket.userId);
      if (user) {
        let channelId = "customer-orders-v2";
        if (user.role === "TAILOR") {
          channelId = "tailor-pickup-updates-v2";
        } else if (user.role === "DELIVERY_PARTNER") {
          channelId = "delivery-updates-v2";
        }

        await sendPushToUsers([ticket.userId], {
          title: "New Support Reply",
          body: update.adminResponse,
          channelId,
          targetApps: [user.role.toLowerCase()],
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
  const where = req.user!.role === "ADMIN" ? {} : { userId: req.user!.id };
  const tickets = await SupportTicketModel.find(where).sort({ createdAt: -1 });
  const data = await Promise.all(
    tickets.map(async (ticket) => {
      const ticketJson = ticket.toJSON() as any;
      if (req.user!.role !== "ADMIN" && ticketJson.messages) {
        ticketJson.messages = ticketJson.messages.filter((m: any) => m.sender !== "internal");
      }
      return {
        ...ticketJson,
        user: ticket.userId ? (await UserModel.findById(ticket.userId).select("phone name role"))?.toJSON() : undefined,
        order: ticket.orderId ? (await OrderModel.findById(ticket.orderId).select("orderNumber status"))?.toJSON() : undefined
      };
    })
  );
  res.json({ data });
}

export async function listCouponsController(_req: Request, res: Response) {
  const coupons = await CouponModel.find().sort({ createdAt: -1 });
  res.json({ data: coupons });
}

export async function createCouponController(req: Request, res: Response) {
  const input = couponSchema.parse(req.body);
  const coupon = await CouponModel.create({ ...input, code: input.code.toUpperCase(), expiresAt: input.expiresAt ? new Date(input.expiresAt) : null });
  res.status(201).json({ data: coupon });
}

export async function paymentsController(req: Request, res: Response) {
  const payments = await PaymentModel.find().sort({ createdAt: -1 });
  const data = await Promise.all(
    payments.map(async (payment) => {
      const order = await OrderModel.findById(payment.orderId).select("orderNumber customerId");
      if (req.user!.role !== "ADMIN" && order?.customerId !== req.user!.id) return null;
      return { ...payment.toJSON(), order: order?.toJSON() };
    })
  );
  res.json({ data: data.filter(Boolean) });
}

export async function markPaymentPaidController(req: Request, res: Response) {
  const payment = await PaymentModel.findById(String(req.params.id));
  if (!payment) throw new AppError(404, "Payment not found");

  const order = await OrderModel.findById(payment.orderId).select("customerId orderNumber");
  if (!order) throw new AppError(404, "Payment order not found");

  if (payment.status !== "PAID") {
    payment.status = "PAID";
    payment.providerRef = typeof req.body.providerRef === "string" ? req.body.providerRef.trim().slice(0, 150) : payment.providerRef;
    await payment.save();
    await OrderModel.findByIdAndUpdate(order.id, { paymentStatus: "PAID" });
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
  const [paidPayments, customers, tailors, deliveryPartners, orders, openTickets] = await Promise.all([
    PaymentModel.find({ status: "PAID" }).select("amount"),
    UserModel.countDocuments({ role: "CUSTOMER" }),
    TailorModel.countDocuments({ isAvailable: true }),
    DeliveryPartnerModel.countDocuments({ isAvailable: true }),
    OrderModel.countDocuments(),
    SupportTicketModel.countDocuments({ status: "OPEN" })
  ]);
  res.json({
    data: {
      revenue: paidPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      customers,
      activeTailors: tailors,
      activeDeliveryPartners: deliveryPartners,
      orders,
      openTickets
    }
  });
}

export async function settingsController(_req: Request, res: Response) {
  const settings = await SettingModel.find().sort({ key: 1 });
  res.json({ data: settings });
}

export async function updateSettingController(req: Request, res: Response) {
  const key = String(req.params.key);
  const setting = await SettingModel.findOneAndUpdate({ key }, { key, value: req.body.value }, { upsert: true, returnDocument: "after" });
  res.json({ data: setting });
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
    messages: [initialMessage]
  });
  res.status(201).json({ data: bug });
}

export async function listBugReportsController(req: Request, res: Response) {
  const where = req.user!.role === "ADMIN" ? {} : { userId: req.user!.id };
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
    { new: true }
  );

  res.json({ data: updatedBug });
}

export async function createAccountChangeRequestController(req: Request, res: Response) {
  const input = accountChangeRequestSchema.parse(req.body);

  // Parse type for visual neatness
  const requestTypeNice = input.type.replace(/([A-Z])/g, ' $1').trim();
  const user = await UserModel.findById(req.user!.id);
  const senderName = user?.name || "User";

  const initialMessage = {
    sender: "client",
    senderId: req.user!.id,
    senderName,
    text: `Request: Change ${requestTypeNice}\n\nDetails: ${Object.entries(input.requestedValues || {}).map(([k, v]) => `\n- ${k}: ${v}`).join('')}`,
    attachments: input.documents || [],
    type: "text",
    createdAt: new Date()
  };

  const request = await AccountChangeRequestModel.create({
    ...input,
    userId: req.user!.id,
    userRole: req.user!.role as "TAILOR" | "DELIVERY_PARTNER",
    messages: [initialMessage]
  });
  res.status(201).json({ data: request });
}

export async function listAccountChangeRequestsController(req: Request, res: Response) {
  const where = req.user!.role === "ADMIN" ? {} : { userId: req.user!.id };
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
            }
          }
        }
      } catch (err) {
        console.error("Failed to load current values for change request:", err);
      }

      return {
        ...requestJson,
        currentValues,
        user: request.userId ? (await UserModel.findById(request.userId).select("phone name role"))?.toJSON() : undefined
      };
    })
  );
  res.json({ data });
}

export async function approveAccountChangeRequestController(req: Request, res: Response) {
  const { id } = req.params;
  const { adminNotes } = req.body;
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

  if (request.userRole === "TAILOR") {
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
  const { adminNotes } = req.body;
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

  const ticket = await SupportTicketModel.findById(id);
  if (!ticket) {
    res.status(404).json({ message: "Ticket not found" });
    return;
  }

  const isAdmin = req.user!.role === "ADMIN";
  const senderRole = input.isInternal ? "internal" : (isAdmin ? "admin" : "client");
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
    { new: true }
  );

  // Socket.IO real-time broadcast
  if (updatedTicket) {
    // Emit to the ticket owner (customer) — skip internal notes
    if (senderRole !== "internal") {
      emitToCustomer(ticket.userId, "support:ticket_updated", { ticket: updatedTicket });
    }
    // Broadcast to all admins so their queues update live
    emitToAdmins("support:ticket_updated", { ticket: updatedTicket });
  }

  // Push notification if admin sending a public message
  if (senderRole === "admin") {
    try {
      const pushUser = await UserModel.findById(ticket.userId);
      if (pushUser) {
        let channelId = "customer-orders-v2";
        if (pushUser.role === "TAILOR") channelId = "tailor-pickup-updates-v2";
        else if (pushUser.role === "DELIVERY_PARTNER") channelId = "delivery-updates-v2";
        await sendPushToUsers([ticket.userId], {
          title: "New Message from Support",
          body: input.text,
          channelId,
          targetApps: [pushUser.role.toLowerCase()],
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

  const bug = await BugReportModel.findById(id);
  if (!bug) {
    res.status(404).json({ message: "Bug report not found" });
    return;
  }

  const isAdmin = req.user!.role === "ADMIN";
  const senderRole = input.isInternal ? "internal" : (isAdmin ? "admin" : "client");
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
    { new: true }
  );

  if (updatedBug) {
    emitToAdmins("support:bug_updated", { bug: updatedBug });
    if (senderRole !== "internal") {
      emitToCustomer(bug.userId, "support:bug_updated", { bug: updatedBug });
    }
  }

  // Push notification if admin sending a public message
  if (senderRole === "admin") {
    try {
      const pushUser = await UserModel.findById(bug.userId);
      if (pushUser) {
        let channelId = "customer-orders-v2";
        if (pushUser.role === "TAILOR") channelId = "tailor-pickup-updates-v2";
        else if (pushUser.role === "DELIVERY_PARTNER") channelId = "delivery-updates-v2";
        await sendPushToUsers([bug.userId], {
          title: "New Message from Support",
          body: input.text,
          channelId,
          targetApps: [pushUser.role.toLowerCase()],
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

  const request = await AccountChangeRequestModel.findById(id);
  if (!request) {
    res.status(404).json({ message: "Change request not found" });
    return;
  }

  const isAdmin = req.user!.role === "ADMIN";
  const senderRole = input.isInternal ? "internal" : (isAdmin ? "admin" : "client");
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
    { new: true }
  );

  if (updatedRequest) {
    emitToAdmins("support:change_request_updated", { request: updatedRequest });
    if (senderRole !== "internal") {
      emitToCustomer(request.userId, "support:change_request_updated", { request: updatedRequest });
    }
  }

  res.json({ data: updatedRequest });
}
