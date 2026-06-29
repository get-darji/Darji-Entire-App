import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import type { Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { env } from "../env.js";
import { AppError } from "../middleware/error.js";
import { CouponModel, DeliveryBatchModel, DeliveryPartnerModel, DeliveryRequestModel, PaymentModel, ReviewModel, TailoringRequestModel, TailorModel, TailorQuoteModel, UserModel, SettingModel, TransactionModel, DeliveryType, DeliveryRound } from "../models.js";
import { emitDeliveryEvent, latestDeliveryEventId, waitForDeliveryEvents } from "../delivery-events.js";
import { emitTailoringEvent, latestTailoringEventId, waitForTailoringEvents } from "../tailoring-events.js";
import { sendPushToUsers } from "../services/push.service.js";
import {
  sendNewRequestNotification,
  sendOrderCompletedNotification,
  sendOrderConfirmedNotification,
  sendOtpNotification,
  sendPickupAssignedNotification,
  sendQuoteReceivedNotification
} from "../services/notificationService.js";
import { emitToAdmins, emitToCustomer, emitToDeliveryPartner, emitToDeliveryPartners, emitToTailor, emitToTailors } from "../services/socket.service.js";
import { creditOrderEarning } from "../services/wallet.service.js";

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 20;

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
});

export function getDeliveryRoundForTime(date: Date, rounds: Array<{ name: string; time: string }>) {
  const sortedRounds = [...rounds].sort((a, b) => {
    const [aH, aM] = a.time.split(":").map(Number);
    const [bH, bM] = b.time.split(":").map(Number);
    return aH * 60 + aM - (bH * 60 + bM);
  });

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric"
  });
  const parts = formatter.formatToParts(date);
  const getVal = (type: string) => {
    const part = parts.find((p) => p.type === type);
    return part ? Number(part.value) : 0;
  };

  const year = getVal("year");
  const month = getVal("month") - 1; // 0-indexed
  const day = getVal("day");
  let hours = getVal("hour");
  if (hours === 24) hours = 0;
  const minutes = getVal("minute");
  const minutesOfDay = hours * 60 + minutes;

  const createIstDate = (y: number, m: number, d: number, h: number, min: number) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const isoString = `${y}-${pad(m + 1)}-${pad(d)}T${pad(h)}:${pad(min)}:00+05:30`;
    return new Date(isoString);
  };

  for (const round of sortedRounds) {
    const [rH, rM] = round.time.split(":").map(Number);
    const roundMinutes = rH * 60 + rM;
    if (minutesOfDay < roundMinutes) {
      const roundAt = createIstDate(year, month, day, rH, rM);
      return { deliveryRound: round.name, roundAt };
    }
  }

  const firstRound = sortedRounds[0];
  const [rH, rM] = firstRound.time.split(":").map(Number);
  
  const todayIstMid = createIstDate(year, month, day, 12, 0);
  const nextDayIst = new Date(todayIstMid.getTime() + 24 * 60 * 60 * 1000);
  const nextParts = formatter.formatToParts(nextDayIst);
  const getNextVal = (type: string) => {
    const part = nextParts.find((p) => p.type === type);
    return part ? Number(part.value) : 0;
  };
  const nYear = getNextVal("year");
  const nMonth = getNextVal("month") - 1;
  const nDay = getNextVal("day");

  const roundAt = createIstDate(nYear, nMonth, nDay, rH, rM);
  return { deliveryRound: firstRound.name, roundAt };
}

const defaultDeliveryRounds = [
  { name: DeliveryRound.ONE_PM, time: "13:00" },
  { name: DeliveryRound.SIX_PM, time: "18:00" }
];

function istDateAt(date: Date, addDays: number, hour: number, minute = 0) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });
  const parts = formatter.formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const anchor = new Date(`${value("year")}-${String(value("month")).padStart(2, "0")}-${String(value("day")).padStart(2, "0")}T12:00:00+05:30`);
  anchor.setUTCDate(anchor.getUTCDate() + addDays);
  const nextParts = formatter.formatToParts(anchor);
  const nextValue = (type: string) => Number(nextParts.find((part) => part.type === type)?.value ?? 0);
  return new Date(`${nextValue("year")}-${String(nextValue("month")).padStart(2, "0")}-${String(nextValue("day")).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`);
}

function retryBatchForReason(reason: (typeof deliveryFailureReasons)[number], failedAt = new Date()) {
  if (reason === "Customer requested tomorrow") {
    return { action: "retry_scheduled", deliveryRound: DeliveryRound.ONE_PM, roundAt: istDateAt(failedAt, 1, 13) };
  }
  if (reason === "Customer requested later today") {
    return { action: "retry_scheduled", ...getDeliveryRoundForTime(failedAt, defaultDeliveryRounds) };
  }
  if (reason === "Customer not available" || reason === "Phone unreachable") {
    return { action: "retry_scheduled", ...getDeliveryRoundForTime(failedAt, defaultDeliveryRounds) };
  }
  if (reason === "Customer cancelled") {
    return { action: "cancelled", deliveryRound: undefined, roundAt: undefined };
  }
  return { action: "admin_review", deliveryRound: undefined, roundAt: undefined };
}

function nextSpecificDeliveryRound(round: string, from = new Date()) {
  const time = round === DeliveryRound.ONE_PM ? "13:00" : "18:00";
  return getDeliveryRoundForTime(from, [{ name: round, time }]);
}

function etaWindowForRound(roundAt?: Date) {
  if (!roundAt) return {};
  return {
    etaWindowStart: roundAt,
    etaWindowEnd: new Date(roundAt.getTime() + 2 * 60 * 60 * 1000)
  };
}

function routePositionFields(position = 1, total = 1) {
  return {
    routePosition: position,
    routeTotal: total
  };
}

async function refreshBatchRoutePositions(batchId?: string) {
  if (!batchId) return;
  const tasks = await DeliveryRequestModel.find({ batchId, taskStatus: { $ne: "cancelled" } }).sort({ roundAt: 1, acceptedAt: 1, createdAt: 1 });
  await Promise.all(tasks.map((task, index) =>
    DeliveryRequestModel.findByIdAndUpdate(task.id, routePositionFields(index + 1, tasks.length))
  ));
}

async function sendNewOrderScheduledNotification(partner: any, task: any) {
  if (!partner?.userId) return;
  await sendPushToUsers([partner.userId], {
    title: "New Order Scheduled",
    body: `${task.clothType ?? "Clothes"} has been added to your ${task.deliveryType === "DROP" ? "delivery" : "pickup"} batch.`,
    data: {
      type: "NEW_ORDER_SCHEDULED",
      taskId: task.id,
      orderId: task.orderId,
      screen: "activeOrder"
    },
    channelId: "delivery-orders-v2",
    categoryId: "DARJI_ORDER",
    sound: "ding.mp3",
    actions: ["View Order"]
  });
}

export function matchAddressToArea(address: string, areas: string[]): string {
  const normalizedAddress = address.toLowerCase();
  for (const area of areas) {
    if (normalizedAddress.includes(area.toLowerCase())) {
      return area;
    }
  }
  return "unassigned";
}

export async function assignPendingTasksToPartner(partner: any) {
  if (!partner.isAvailable || partner.verificationStatus !== "VERIFIED") {
    return;
  }

  const areaFilteringSetting = await SettingModel.findOne({ key: "enable_area_filtering" });
  const enableAreaFiltering = areaFilteringSetting?.value === true;

  if (enableAreaFiltering && partner.assignedArea === "unassigned") {
    return;
  }

  const pendingTasksQuery: Record<string, any> = {
    deliveryType: partner.deliveryType,
    taskStatus: "pending",
    retryStatus: { $ne: "ACTION_REQUIRED" }
  };
  if (enableAreaFiltering) {
    pendingTasksQuery.$or = [{ assignedArea: partner.assignedArea }, { assignedArea: "unassigned" }];
  }
  const pendingTasks = await DeliveryRequestModel.find(pendingTasksQuery).sort({ retryCount: -1, nextScheduledBatch: 1, createdAt: 1 });

  if (!pendingTasks.length) return;

  for (const task of pendingTasks) {
    let batchId: string = randomUUID();
    const batchQuery: Record<string, any> = {
      deliveryPartnerId: partner._id,
      deliveryType: partner.deliveryType,
      deliveryRound: task.deliveryRound,
      roundAt: task.roundAt,
      status: "active"
    };
    if (enableAreaFiltering) {
      batchQuery.area = partner.assignedArea;
    }
    let batch = await DeliveryBatchModel.findOne(batchQuery);

    if (batch) {
      batchId = batch.batchId;
      await DeliveryBatchModel.findByIdAndUpdate(batch._id, {
        $addToSet: { tasks: task._id },
        $inc: { estimatedEarnings: task.estimatedEarnings || 0 }
      });
    } else {
      await DeliveryBatchModel.create({
        batchId,
        deliveryPartnerId: partner._id,
        deliveryType: partner.deliveryType,
        deliveryRound: task.deliveryRound,
        roundAt: task.roundAt,
        shift: task.deliveryRound === "ONE_PM" ? "morning" : "evening",
        area: enableAreaFiltering ? partner.assignedArea : "All Areas",
        tasks: [task._id],
        estimatedEarnings: task.estimatedEarnings || 0,
        status: "active"
      });
    }

    const updatedTask = await DeliveryRequestModel.findByIdAndUpdate(
      task._id,
      {
        assignedDeliveryPartnerId: partner._id,
        assignedDeliveryBoyId: partner._id,
        batchId,
        taskStatus: "accepted",
        acceptedAt: new Date(),
        deadlineAt: new Date(Date.now() + 12 * 60 * 60 * 1000)
      },
      { returnDocument: "after" }
    );

    if (updatedTask) {
      await refreshBatchRoutePositions(batchId);
      const routedTask = await DeliveryRequestModel.findById(updatedTask.id) ?? updatedTask;
      await TailoringRequestModel.findByIdAndUpdate(task.orderId, {
        orderStatus: task.type === "customer_to_tailor" ? "pickup_started" : "out_for_delivery",
        deliveryType: partner.deliveryType,
        deliveryRound: task.deliveryRound,
        batchId,
        assignedDeliveryBoyId: partner._id
      });

      emitToDeliveryPartner(partner._id, "delivery:task_assigned", routedTask.toJSON());
      emitToCustomer(routedTask.customerId, "customer:delivery_status_updated", {
        requestId: routedTask.id,
        tailoringRequestId: routedTask.orderId,
        status: updatedTask.type === "customer_to_tailor" ? "PICKUP_STARTED" : "OUT_FOR_DELIVERY",
        deliveryRequest: routedTask.toJSON()
      });
      await sendNewOrderScheduledNotification(partner, routedTask);
      await sendPushToUsers([routedTask.customerId], {
        title: updatedTask.type === "customer_to_tailor" ? "Pickup started" : "Out for delivery",
        body: updatedTask.type === "customer_to_tailor" ? "A delivery partner is heading to pick up your clothes." : "Your stitched clothes are on the way.",
        data: {
          type: "DELIVERY_REQUEST_ACCEPTED",
          requestId: routedTask.id,
          tailoringRequestId: routedTask.orderId,
          screen: "trackOrder"
        },
        channelId: "customer-orders-v2",
        categoryId: "DARJI_ORDER",
        sound: "ding.mp3",
        actions: ["View Order"]
      });
    }
  }
}

export const uploadTailoringMedia = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_FILES,
    fileSize: VIDEO_MAX_BYTES
  }
}).array("media", MAX_FILES);

const tailoringMediaSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  resourceType: z.enum(["image", "video"]),
  bytes: z.number().int().positive(),
  format: z.string().optional(),
  originalName: z.string().optional()
});

const tailoringMeasurementSchema = z.object({
  label: z.string().trim().min(2).max(80),
  fields: z.record(z.string(), z.union([z.string().trim().max(40), z.number()])).default({}),
  imageUrl: z.string().url().optional().nullable()
});

const tailoringRequestItemInputSchema = z.object({
  description: z.string().trim().min(10).max(1000),
  gender: z.string().trim().min(2).max(40).optional(),
  clothType: z.string().trim().min(2).max(80),
  workType: z.string().trim().min(2).max(80),
  measurement: tailoringMeasurementSchema.optional(),
  measurementNotes: z.string().trim().max(1000).optional(),
  homeMeasurementBooked: z.boolean().default(false),
  sampleProvided: z.boolean().default(false),
  media: z.array(tailoringMediaSchema).max(MAX_FILES).default([]),
  sampleMedia: z.array(tailoringMediaSchema).max(1).default([])
});

const createTailoringRequestSchema = tailoringRequestItemInputSchema.extend({
  urgency: z.string().trim().min(2).max(80),
  pickupAddress: z.string().trim().min(8).max(500),
  items: z.array(tailoringRequestItemInputSchema).min(1).max(20).optional()
});

const createTailorQuoteSchema = z.object({
  price: z.number().positive(),
  estimatedDays: z.number().int().min(1).max(6),
  estimatedHours: z.number().int().min(1).max(24).optional(),
  message: z.string().trim().max(500).optional()
});

const checkoutTailoringRequestSchema = z.object({
  quoteId: z.string().trim().min(1),
  paymentMethod: z.enum(["ONLINE", "COD", "UPI"]),
  deliveryFee: z.number().nonnegative().default(0),
  platformFee: z.number().nonnegative().default(0),
  homeMeasurementFee: z.number().nonnegative().default(0),
  couponCode: z.string().trim().max(40).optional(),
  additionalItems: z.array(z.object({
    gender: z.string().trim().max(80).optional(),
    clothType: z.string().trim().max(120).optional(),
    workType: z.string().trim().max(120).optional(),
    description: z.string().trim().max(500).optional()
  })).max(10).default([]),
  totalAmount: z.number().positive()
});

const verifyCheckoutSchema = z.object({
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_order_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1)
});

const cancelTailoringRequestSchema = z.object({
  reason: z.string().trim().max(300).optional()
});

const cashCollectionSchema = z.object({
  collected: z.boolean().default(true)
});

const auditMediaSchema = z.object({
  stage: z.enum(["RECEIVED", "STITCHED"])
});

const updateTailoringWorkStatusSchema = z.object({
  status: z.enum(["WORKING", "READY"])
});

const updateDeliveryTaskSchema = z.object({
  status: z.enum(["picked_up", "delivered"])
});

const deliveryFailureReasons = [
  "Customer not available",
  "Customer requested later today",
  "Customer requested tomorrow",
  "Phone unreachable",
  "Wrong address",
  "Customer cancelled",
  "Other"
] as const;

const failDeliveryTaskSchema = z.object({
  reason: z.enum(deliveryFailureReasons),
  note: z.string().trim().max(500).optional()
});

const adminRetryNowSchema = z.object({
  roundAt: z.coerce.date().optional(),
  deliveryRound: z.string().trim().optional()
});

const deliveryTaskOtpSchema = z.object({
  stage: z.enum(["pickup", "drop"]),
  otp: z.string().trim().regex(/^\d{4}$/, "Enter the 4 digit OTP")
});

const deliveryTaskPhotosSchema = z.object({
  kind: z.enum(["cloth", "sample", "delivery"]),
  photos: z.array(z.object({
    url: z.string().url(),
    publicId: z.string().min(1),
    resourceType: z.enum(["image", "video"]),
    bytes: z.number().int().nonnegative(),
    format: z.string().optional(),
    originalName: z.string().optional()
  })).min(1, "Upload at least one photo").max(MAX_FILES)
});

function normalizeUrgency(urgency?: string) {
  const value = String(urgency ?? "").toLowerCase();
  if (value.includes("instant")) return "instant";
  if (value.includes("same day")) return "same_day";
  if (value.includes("express")) return "express";
  return "normal";
}

function urgencyWindow(urgency?: string) {
  const normalized = normalizeUrgency(urgency);
  if (normalized === "instant") return { mode: "hours" as const, min: 1, max: 24 };
  if (normalized === "same_day") return { mode: "days" as const, min: 1, max: 1 };
  if (normalized === "express") return { mode: "days" as const, min: 1, max: 2 };
  return { mode: "days" as const, min: 1, max: 4 };
}

function quoteEtaLabel(quote: { estimatedDays?: number | null; estimatedHours?: number | null }) {
  if (quote.estimatedHours && quote.estimatedHours > 0) {
    return `${quote.estimatedHours} hour(s)`;
  }
  return `${quote.estimatedDays ?? 1} day(s)`;
}

function tailoringItemsForRequest(request: any) {
  const items = Array.isArray(request.items) ? request.items : [];
  if (items.length) return items;
  return [
    {
      description: request.description,
      gender: request.gender,
      clothType: request.clothType,
      workType: request.workType,
      measurement: request.measurement,
      measurementNotes: request.measurementNotes,
      media: request.media ?? [],
      sampleProvided: request.sampleProvided,
      sampleMedia: request.sampleMedia ?? [],
      homeMeasurementBooked: request.homeMeasurementBooked
    }
  ];
}

function requestItemCount(request: any) {
  return Math.max(1, tailoringItemsForRequest(request).length);
}

function requestClothingLabel(request: any) {
  const count = requestItemCount(request);
  return count === 1 ? `${request.workType} requested for ${request.clothType}` : `New Order - ${count} Clothing Items`;
}

function taskOtp(taskId: string, stage: "pickup" | "drop"): string {
  const digest = createHmac("sha256", env.JWT_ACCESS_SECRET).update(`delivery:${taskId}:${stage}`).digest();
  const otp = String(digest.readUInt32BE(0) % 10000).padStart(4, "0");
  if (stage === "drop" && otp === taskOtp(taskId, "pickup")) return String((Number(otp) + 1) % 10000).padStart(4, "0");
  return otp;
}

function otpMatches(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function assertRazorpayConfigured() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError(503, "Razorpay is not configured on the backend");
  }
}

async function createRazorpayOrder(input: { amount: number; receipt: string; notes: Record<string, string> }) {
  assertRazorpayConfigured();
  const token = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: Math.round(input.amount * 100),
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new AppError(502, `Razorpay order creation failed${body ? `: ${body}` : ""}`);
  }
  return response.json() as Promise<{ id: string; amount: number; currency: string; receipt: string; status: string }>;
}

async function findSelectedQuote(requestId: string, selectedQuoteId?: string | null) {
  if (selectedQuoteId) {
    const selected = await TailorQuoteModel.findById(selectedQuoteId);
    if (selected) return selected;
  }
  return TailorQuoteModel.findOne({ requestId, status: { $in: ["RESERVED", "ACCEPTED"] } }).sort({ updatedAt: -1, createdAt: -1 });
}

async function hydrateTailorQuote(quoteInput: unknown) {
  const quote =
    typeof (quoteInput as { toJSON?: unknown })?.toJSON === "function"
      ? (quoteInput as { toJSON: () => Record<string, unknown> }).toJSON()
      : (quoteInput as Record<string, unknown>);
  if (!quote) return null;

  const tailor = await TailorModel.findById(quote.tailorId);
  const user = tailor ? await UserModel.findById(tailor.userId).select("name phone role") : null;
  return {
    ...quote,
    tailor: tailor ? { ...tailor.toJSON(), user: user?.toJSON() } : null
  };
}

async function hydrateTailoringRequest(requestInput: unknown, tailorUserId?: string) {
  const request =
    typeof (requestInput as { toJSON?: unknown })?.toJSON === "function"
      ? (requestInput as { toJSON: () => Record<string, unknown> }).toJSON()
      : (requestInput as Record<string, unknown>);
  if (!request) return null;

  const [customer, tailor] = await Promise.all([
    UserModel.findById(request.customerId).select("name phone role"),
    tailorUserId ? TailorModel.findOne({ userId: tailorUserId }) : null
  ]);
  const ownQuote = tailor ? await TailorQuoteModel.findOne({ requestId: String(request.id ?? request._id), tailorId: tailor.id }) : null;
  const selectedQuoteDoc = await findSelectedQuote(String(request.id ?? request._id), typeof request.selectedQuoteId === "string" ? request.selectedQuoteId : undefined);
  const quoteCount = await TailorQuoteModel.countDocuments({ requestId: String(request.id ?? request._id) });
  const reviews = await ReviewModel.find({ orderId: String(request.id ?? request._id) }).sort({ createdAt: -1 });
  const reviewByKind = new Map(reviews.map((review) => [String(review.kind), review]));
  const tailorReview = reviewByKind.get("tailor");
  const deliveryReview = reviewByKind.get("delivery");

  return {
    ...request,
    customer: customer?.toJSON(),
    ownQuote: ownQuote?.toJSON() ?? null,
    selectedQuote: selectedQuoteDoc ? await hydrateTailorQuote(selectedQuoteDoc) : null,
    quoteCount,
    tailorRating: tailorReview?.rating,
    tailorReview: tailorReview?.comment,
    tailorRatingSubmittedAt: tailorReview?.createdAt,
    deliveryRating: deliveryReview?.rating,
    deliveryReview: deliveryReview?.comment,
    deliveryRatingSubmittedAt: deliveryReview?.createdAt
  };
}

function tailorDropAddress(tailor: Record<string, unknown> | null | undefined) {
  const verification = tailor?.verification as { shop?: { shopAddress?: string }; personal?: { address?: string } } | undefined;
  return verification?.shop?.shopAddress || verification?.personal?.address || String(tailor?.shopName ?? "Tailor address pending");
}

async function deliveryTaskEstimatedEarnings(
  request: { deliveryFee?: number | null; urgency?: string | null },
  _type: "customer_to_tailor" | "tailor_to_customer"
) {
  const setting = await SettingModel.findOne({ key: "delivery_fare_settings" });
  const value = typeof setting?.value === "object" && setting.value ? setting.value as Record<string, unknown> : {};
  const normalized = normalizeUrgency(request.urgency ?? "");
  const key = normalized === "same_day" ? "sameDay" : normalized;
  const defaults: Record<string, number> = { normal: 8, express: 8, sameDay: 10, instant: 15 };
  const fare = Number(value[key] ?? defaults[key] ?? defaults.normal);
  return Number((Number.isFinite(fare) && fare > 0 ? fare : defaults.normal).toFixed(2));
}

async function createDeliveryRequestForTailoringRequest(requestId: string, type: "customer_to_tailor" | "tailor_to_customer", acceptedTailorId?: string) {
  const request = await TailoringRequestModel.findById(requestId);
  if (!request) return null;
  if (request.status !== "TAILOR_SELECTED") return null;
  if (type === "tailor_to_customer" && request.workStatus !== "READY") return null;

  const acceptedQuote = acceptedTailorId
    ? await TailorQuoteModel.findOne({ requestId: request.id, tailorId: acceptedTailorId, status: "ACCEPTED" })
    : await TailorQuoteModel.findOne({ requestId: request.id, status: "ACCEPTED" });
  if (!acceptedQuote) return null;

  const [tailor, customer] = await Promise.all([
    TailorModel.findById(acceptedQuote.tailorId),
    UserModel.findById(request.customerId).select("name phone role")
  ]);
  if (!tailor) return null;

  const tailorUser = await UserModel.findById(tailor.userId).select("name phone role");
  const tailorJson = tailor.toJSON() as Record<string, unknown>;
  const customerAddress = request.pickupAddress;
  const tailorAddress = tailorDropAddress(tailorJson);
  const pickupAddress = type === "customer_to_tailor" ? customerAddress : tailorAddress;
  const dropAddress = type === "customer_to_tailor" ? tailorAddress : customerAddress;
  const estimatedEarnings = await deliveryTaskEstimatedEarnings(request, type);
  const cashCollectionRequired = type === "tailor_to_customer" && request.paymentMethod === "COD";

  const roundsSetting = await SettingModel.findOne({ key: "delivery_rounds" });
  const rounds = roundsSetting?.value || [
    { name: "ONE_PM", time: "13:00" },
    { name: "SIX_PM", time: "18:00" }
  ];
  const { deliveryRound, roundAt } = getDeliveryRoundForTime(new Date(), rounds);

  const activePartners = await DeliveryPartnerModel.find({ assignedArea: { $ne: "unassigned" } }).select("assignedArea");
  const areas = activePartners.map((p) => p.assignedArea).filter((a): a is string => typeof a === "string");
  const assignedArea = matchAddressToArea(customerAddress, areas);

  const areaFilteringSetting = await SettingModel.findOne({ key: "enable_area_filtering" });
  const enableAreaFiltering = areaFilteringSetting?.value === true;

  const deliveryType: DeliveryType = type === "customer_to_tailor" ? DeliveryType.PICKUP : DeliveryType.DROP;

  const boyQuery: Record<string, any> = {
    deliveryType,
    isAvailable: true,
    verificationStatus: "VERIFIED"
  };
  if (enableAreaFiltering && assignedArea !== "unassigned") {
    boyQuery.assignedArea = assignedArea;
  }
  const assignedBoy = await DeliveryPartnerModel.findOne(boyQuery);

  const taskStatus = assignedBoy ? "accepted" : "pending";
  let batchId: string = randomUUID();
  const items = tailoringItemsForRequest(request);
  const itemCount = requestItemCount(request);
  const deliveryClothType = itemCount === 1 ? request.clothType : `${itemCount} clothing items`;
  const deliveryWorkType = itemCount === 1 ? request.workType : "Multi-cloth order";
  const sampleMedia = items.flatMap((item: any) => item.sampleProvided ? item.sampleMedia ?? [] : []);
  const sampleProvided = sampleMedia.length > 0 || items.some((item: any) => item.sampleProvided);

  if (assignedBoy) {
    const batchQuery: Record<string, any> = {
      deliveryPartnerId: assignedBoy._id,
      deliveryType,
      deliveryRound,
      roundAt,
      status: "active"
    };
    if (enableAreaFiltering) {
      batchQuery.area = assignedArea;
    }
    const batch = await DeliveryBatchModel.findOne(batchQuery);
    if (batch) {
      batchId = batch.batchId;
    }
  }

  let deliveryRequest = await DeliveryRequestModel.findOne({ orderId: request._id, type });
  try {
    if (!deliveryRequest) {
      deliveryRequest = await DeliveryRequestModel.create({
        orderId: request._id,
        tailorId: tailor._id,
        customerId: request.customerId,
        type,
        deliveryType,
        deliveryRound,
        roundAt,
        assignedArea,
        batchId,
        assignedDeliveryPartnerId: assignedBoy?._id || undefined,
        assignedDeliveryBoyId: assignedBoy?._id || undefined,
        taskStatus,
        shift: deliveryRound === "ONE_PM" ? "morning" : "evening",
        estimatedEarnings,
        pickupAddress,
        dropAddress,
        customerName: customer?.name,
        customerPhone: customer?.phone,
        tailorName: tailor.shopName,
        tailorPhone: tailorUser?.phone,
        clothType: deliveryClothType,
        workType: deliveryWorkType,
        itemCount,
        paymentMethod: request.paymentMethod,
        paymentStatus: request.paymentStatus,
        totalAmount: request.totalAmount,
        cashCollectionRequired,
        cashCollected: false,
        sampleProvided,
        sampleMedia,
        acceptedAt: assignedBoy ? new Date() : undefined,
        deadlineAt: assignedBoy ? new Date(Date.now() + 12 * 60 * 60 * 1000) : undefined
      });
    } else {
      deliveryRequest = await DeliveryRequestModel.findByIdAndUpdate(
        deliveryRequest._id,
        {
          deliveryType,
          deliveryRound,
          roundAt,
          assignedArea,
          batchId,
          assignedDeliveryPartnerId: assignedBoy?._id || undefined,
          assignedDeliveryBoyId: assignedBoy?._id || undefined,
          taskStatus,
          shift: deliveryRound === "ONE_PM" ? "morning" : "evening",
          estimatedEarnings,
          paymentMethod: request.paymentMethod,
          paymentStatus: request.paymentStatus,
          totalAmount: request.totalAmount,
          cashCollectionRequired,
          itemCount,
          sampleProvided,
          sampleMedia,
          acceptedAt: assignedBoy ? new Date() : undefined,
          deadlineAt: assignedBoy ? new Date(Date.now() + 12 * 60 * 60 * 1000) : undefined
        },
        { returnDocument: "after" }
      );
    }
  } catch (error) {
    const raced = await DeliveryRequestModel.findOne({ orderId: request._id, type });
    if (raced) deliveryRequest = raced;
    else throw error;
  }
  if (!deliveryRequest) return null;

  if (assignedBoy) {
    const batchQuery: Record<string, any> = {
      deliveryPartnerId: assignedBoy._id,
      deliveryType,
      deliveryRound,
      roundAt,
      status: "active"
    };
    if (enableAreaFiltering) {
      batchQuery.area = assignedArea;
    }
    const batch = await DeliveryBatchModel.findOne(batchQuery);
    if (batch) {
      await DeliveryBatchModel.findByIdAndUpdate(batch._id, {
        $addToSet: { tasks: deliveryRequest._id },
        $inc: { estimatedEarnings }
      });
    } else {
      await DeliveryBatchModel.create({
        batchId,
        deliveryPartnerId: assignedBoy._id,
        deliveryType,
        deliveryRound,
        roundAt,
        shift: deliveryRound === "ONE_PM" ? "morning" : "evening",
        area: enableAreaFiltering ? assignedArea : "All Areas",
        tasks: [deliveryRequest._id],
        estimatedEarnings,
        status: "active"
      });
    }
    await TailoringRequestModel.findByIdAndUpdate(request._id, {
      orderStatus: type === "customer_to_tailor" ? "pickup_started" : "out_for_delivery",
      deliveryType,
      deliveryRound,
      batchId,
      assignedDeliveryBoyId: assignedBoy._id
    });
    await refreshBatchRoutePositions(batchId);
  } else {
    await TailoringRequestModel.findByIdAndUpdate(request._id, {
      deliveryType,
      deliveryRound,
      batchId
    });
  }

  const notificationClaim = await DeliveryRequestModel.findOneAndUpdate(
    { _id: deliveryRequest._id, notificationSentAt: { $exists: false } },
    { notificationSentAt: new Date() },
    { returnDocument: "after" }
  );
  if (notificationClaim) {
    const deliveryPayload = notificationClaim.toJSON();
    emitDeliveryEvent({ type: "DELIVERY_REQUEST_CREATED", requestId: notificationClaim._id });

    if (assignedBoy) {
      emitToDeliveryPartner(assignedBoy._id, "delivery:task_assigned", deliveryPayload);
      emitToCustomer(deliveryRequest.customerId, "customer:delivery_status_updated", {
        requestId: deliveryRequest._id,
        tailoringRequestId: deliveryRequest.orderId,
        status: type === "customer_to_tailor" ? "PICKUP_STARTED" : "OUT_FOR_DELIVERY",
        deliveryRequest: deliveryPayload
      });
      await sendPushToUsers([deliveryRequest.customerId], {
        title: type === "customer_to_tailor" ? "Pickup started" : "Out for delivery",
        body: type === "customer_to_tailor" ? "A delivery partner is heading to pick up your clothes." : "Your stitched clothes are on the way.",
        data: {
          type: "DELIVERY_REQUEST_ACCEPTED",
          requestId: deliveryRequest._id,
          tailoringRequestId: deliveryRequest.orderId,
          screen: "trackOrder"
        },
        channelId: "customer-orders-v2",
        categoryId: "DARJI_ORDER",
        sound: "ding.mp3",
        actions: ["View Order"]
      });
      await sendNewOrderScheduledNotification(assignedBoy, notificationClaim);

      const assignedTailor = await TailorModel.findById(deliveryRequest.tailorId).select("userId");
      if (type === "customer_to_tailor" && assignedTailor?.userId) {
        await sendPushToUsers([assignedTailor.userId], {
          title: "Pickup partner assigned",
          body: "A delivery partner has accepted the customer pickup task.",
          data: { type: "PICKUP_PARTNER_ASSIGNED", taskId: deliveryRequest._id, orderId: deliveryRequest.orderId, screen: "orderDetails" },
          channelId: "tailor-pickup-updates-v2",
          categoryId: "DARJI_ORDER",
          sound: "ding.mp3",
          actions: ["View Order"]
        });
      }
    } else {
      emitToDeliveryPartners("delivery:task_created", deliveryPayload);
      const availablePartnersQuery: Record<string, any> = {
        isAvailable: true,
        verificationStatus: "VERIFIED",
        deliveryType
      };
      if (enableAreaFiltering && assignedArea !== "unassigned") {
        availablePartnersQuery.assignedArea = assignedArea;
      }
      const availablePartners = await DeliveryPartnerModel.find(availablePartnersQuery).select("userId");
      await Promise.all(availablePartners.map((partner) => sendPickupAssignedNotification({
        userId: partner.userId,
        title: type === "customer_to_tailor" ? "New Pickup Request" : "New Delivery Request",
        body: `${deliveryClothType}: ${pickupAddress} to ${dropAddress}. ${request.paymentMethod === "COD" ? "COD on final delivery." : "Paid online."} Earnings Rs.${estimatedEarnings.toFixed(0)}.`,
        data: {
          type: "PICKUP_ASSIGNED",
          taskType: type,
          taskId: notificationClaim._id,
          pickupId: notificationClaim._id,
          orderId: request._id,
          screen: "pickupDetails"
        }
      })));
    }
  }

  return deliveryRequest;
}

async function finalizeTailoringRequestConfirmation(
  requestId: string,
  quoteId: string,
  paymentMethod: "ONLINE" | "COD" | "UPI",
  paymentStatus: "PENDING" | "PAID",
  breakdown?: { deliveryFee: number; platformFee: number; homeMeasurementFee: number; totalAmount: number; additionalItems?: unknown[]; couponCode?: string; discountAmount?: number }
) {
  const request = await TailoringRequestModel.findById(requestId);
  if (!request) throw new AppError(404, "Tailoring request not found");
  if (request.status === "CANCELLED") throw new AppError(409, "Cancelled requests cannot be confirmed");

  const quote = await TailorQuoteModel.findOne({ _id: quoteId, requestId: request.id });
  if (!quote) throw new AppError(404, "Quote not found");
  const itemCount = requestItemCount(request);

  await TailorQuoteModel.updateMany({ requestId: request.id, _id: { $ne: quote.id } }, { status: "REJECTED" });
  await TailorQuoteModel.findByIdAndUpdate(quote.id, { status: "ACCEPTED" });

  const updatedRequest = await TailoringRequestModel.findByIdAndUpdate(
    request.id,
    {
      status: "TAILOR_SELECTED",
      workStatus: "ACCEPTED",
      selectedQuoteId: quote.id,
      paymentMethod,
      paymentStatus,
      quoteAmount: Number(quote.price),
      deliveryFee: breakdown?.deliveryFee ?? request.deliveryFee ?? 0,
      platformFee: breakdown?.platformFee ?? request.platformFee ?? 0,
      homeMeasurementFee: breakdown?.homeMeasurementFee ?? request.homeMeasurementFee ?? 0,
      couponCode: breakdown?.couponCode ?? request.couponCode,
      discountAmount: breakdown?.discountAmount ?? request.discountAmount ?? 0,
      itemCount,
      ...(breakdown?.additionalItems ? { additionalItems: breakdown.additionalItems } : {}),
      totalAmount: breakdown?.totalAmount ?? request.totalAmount ?? quote.price,
      orderStatus: "tailor_accepted",
      confirmedAt: new Date()
    },
    { returnDocument: "after" }
  );
  if (!updatedRequest) throw new AppError(404, "Tailoring request not found");

  emitTailoringEvent({ type: "QUOTE_ACCEPTED", requestId: request.id, quoteId: quote.id, tailorId: quote.tailorId });
  emitToTailors("tailoring:request_closed", { requestId: request.id, acceptedTailorId: quote.tailorId });
  emitToTailor(quote.tailorId, "tailoring:quote_accepted", {
    requestId: request.id,
    quoteId: quote.id,
    request: await hydrateTailoringRequest(updatedRequest)
  });
  emitToCustomer(request.customerId, "customer:order_status_updated", {
    requestId: request.id,
    status: "TAILOR_ACCEPTED",
    request: await hydrateTailoringRequest(updatedRequest)
  });

  const acceptedTailor = await hydrateTailorQuote(await TailorQuoteModel.findById(quote.id));
  const acceptedTailorProfile = await TailorModel.findById(quote.tailorId).select("userId");
  if (acceptedTailorProfile?.userId) {
    await sendOrderConfirmedNotification({
      userId: acceptedTailorProfile.userId,
      title: "Quote accepted",
      body: `The customer confirmed your quote for ${requestItemCount(request) === 1 ? request.clothType : `${requestItemCount(request)} clothing items`}.`,
      data: {
        type: "ORDER_CONFIRMED",
        requestId: request.id,
        orderId: request.id,
        quoteId: quote.id,
        screen: "requestDetails"
      }
    });
  }
  await sendPushToUsers([request.customerId], {
    title: paymentStatus === "PAID" ? "Payment received" : "Order confirmed",
    body: `Your order has been confirmed with ${(acceptedTailor as { tailor?: { shopName?: string } } | null)?.tailor?.shopName ?? "Darzi Tailor"}.`,
    data: {
      type: paymentStatus === "PAID" ? "PAYMENT_SUCCESS" : "TAILOR_ACCEPTED",
      requestId: request.id,
      quoteId: quote.id,
      screen: "trackOrder"
    },
    channelId: "customer-orders-v2",
    categoryId: "DARJI_ORDER",
    sound: "ding.mp3",
    actions: ["View Order"]
  });

  const deliveryRequest = await createDeliveryRequestForTailoringRequest(request.id, "customer_to_tailor", quote.tailorId);
  return {
    request: await hydrateTailoringRequest(updatedRequest),
    quote: acceptedTailor,
    deliveryRequest
  };
}

async function cancelTailoringRequestAndTasks(requestId: string, reason?: string) {
  const request = await TailoringRequestModel.findById(requestId);
  if (!request) throw new AppError(404, "Tailoring request not found");
  if (request.status === "CANCELLED") return request;
  if (["received_by_tailor", "ready_for_delivery", "out_for_delivery", "completed"].includes(String(request.orderStatus ?? ""))) {
    throw new AppError(409, "This order can no longer be cancelled after tailor handover");
  }

  const pickedUp = ["pickup_started", "picked_up_from_customer"].includes(String(request.orderStatus ?? ""));
  const cancellationFee = pickedUp ? Number(request.deliveryFee ?? 0) + 50 : 0;

  const updated = await TailoringRequestModel.findByIdAndUpdate(
    request.id,
    {
      status: "CANCELLED",
      orderStatus: "cancelled",
      cancelledAt: new Date(),
      cancellationFee,
      cancellationReason: reason
    },
    { returnDocument: "after" }
  );
  await TailorQuoteModel.updateMany({ requestId: request.id, status: { $in: ["RESERVED", "ACCEPTED"] } }, { status: "REJECTED" });
  const tasks = await DeliveryRequestModel.find({ orderId: request.id, taskStatus: { $in: ["pending", "accepted", "picked_up"] } });
  await DeliveryRequestModel.updateMany({ orderId: request.id, taskStatus: { $in: ["pending", "accepted", "picked_up"] } }, { taskStatus: "cancelled" });

  emitToCustomer(request.customerId, "customer:order_status_updated", { requestId: request.id, status: "CANCELLED" });
  const acceptedQuote = await findSelectedQuote(request.id, request.selectedQuoteId);
  if (acceptedQuote?.tailorId) {
    emitToTailor(acceptedQuote.tailorId, "tailoring:order_cancelled", { orderId: request.id, requestId: request.id, status: "cancelled" });
    emitToTailor(acceptedQuote.tailorId, "tailoring:delivery_status_updated", { orderId: request.id, status: "cancelled" });
    const tailor = await TailorModel.findById(acceptedQuote.tailorId).select("userId");
    if (tailor?.userId) {
      await sendPushToUsers([tailor.userId], {
        title: "Order cancelled",
        body: `${requestItemCount(request) === 1 ? request.clothType : `${requestItemCount(request)} clothing items`} order ${request.id.slice(0, 8).toUpperCase()} has been cancelled by the customer.`,
        data: { type: "ORDER_CANCELLED", requestId: request.id, orderId: request.id, screen: "orderDetails" },
        channelId: "tailor-new-requests-v2",
        categoryId: "TAILOR_QUOTE_ACCEPTED",
        sound: "ding.mp3",
        actions: ["View Details"]
      });
    }
  }
  emitToDeliveryPartners("delivery:task_cancelled", { orderId: request.id, taskIds: tasks.map((task) => task.id) });
  const assignedPartnerIds = [...new Set(tasks.map((task) => task.assignedDeliveryPartnerId).filter((id): id is string => typeof id === "string" && id.length > 0))];
  if (assignedPartnerIds.length) {
    const assignedPartners = await DeliveryPartnerModel.find({ _id: { $in: assignedPartnerIds } }).select("userId");
    const userIds = assignedPartners.map((partner) => partner.userId).filter(Boolean);
    if (userIds.length) {
      await sendPushToUsers(userIds, {
        title: "Delivery cancelled",
        body: `${requestItemCount(request) === 1 ? request.clothType : `${requestItemCount(request)} clothing items`} pickup for order ${request.id.slice(0, 8).toUpperCase()} has been cancelled.`,
        data: { type: "DELIVERY_CANCELLED", requestId: request.id, orderId: request.id, screen: "pickupDetails" },
        channelId: "delivery-updates-v2",
        categoryId: "DELIVERY_PICKUP_REQUEST",
        sound: "ding.mp3",
        actions: ["View Details"]
      });
    }
  }
  return updated;
}

export async function listDeliveryRequestsController(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const partner = req.user!.role === "DELIVERY_PARTNER" ? await DeliveryPartnerModel.findOne({ userId: req.user!.id }) : null;
  if (req.user!.role === "DELIVERY_PARTNER") {
    if (!partner) throw new AppError(404, "Delivery partner profile not found");
    if (partner.verificationStatus !== "VERIFIED") throw new AppError(403, "Complete admin verification to access delivery jobs");
  }
  const where: Record<string, unknown> = {};

  if (req.user!.role === "DELIVERY_PARTNER" && partner) {
    const areaFilteringSetting = await SettingModel.findOne({ key: "enable_area_filtering" });
    const enableAreaFiltering = areaFilteringSetting?.value === true;

    where.deliveryType = partner.deliveryType;
    where.retryStatus = { $ne: "ACTION_REQUIRED" };
    where.$or = [
      enableAreaFiltering
        ? { taskStatus: "pending", assignedArea: { $in: [partner.assignedArea, "unassigned"] } }
        : { taskStatus: "pending" },
      { assignedDeliveryPartnerId: partner._id }
    ];
  } else if (status === "pending" || status === "OPEN") {
    where.taskStatus = "pending";
  } else if (status) {
    where.taskStatus = status.toLowerCase();
  }

  const requests = await DeliveryRequestModel.find(where).sort({ retryCount: -1, nextScheduledBatch: 1, createdAt: -1 }).limit(100);
  res.json({ data: requests });
}

export async function getDeliveryRequestController(req: Request, res: Response) {
  if (req.user!.role === "DELIVERY_PARTNER") {
    const partner = await DeliveryPartnerModel.findOne({ userId: req.user!.id }).select("verificationStatus");
    if (!partner) throw new AppError(404, "Delivery partner profile not found");
    if (partner.verificationStatus !== "VERIFIED") throw new AppError(403, "Complete admin verification to access delivery jobs");
  }
  const request = await DeliveryRequestModel.findById(String(req.params.id));
  if (!request) throw new AppError(404, "Delivery request not found");
  res.json({ data: request });
}

export async function watchDeliveryRequestsController(req: Request, res: Response) {
  const parsedAfter = Number(req.query.after);
  const afterId = Number.isFinite(parsedAfter) ? parsedAfter : latestDeliveryEventId();
  const partner = req.user!.role === "DELIVERY_PARTNER" ? await DeliveryPartnerModel.findOne({ userId: req.user!.id }) : null;
  if (req.user!.role === "DELIVERY_PARTNER") {
    if (!partner) throw new AppError(404, "Delivery partner profile not found");
    if (partner.verificationStatus !== "VERIFIED") throw new AppError(403, "Complete admin verification to access delivery jobs");
  }
  const events = await waitForDeliveryEvents(afterId, partner?.id, 5 * 60 * 1000);
  const cursor = events.at(-1)?.id ?? latestDeliveryEventId();

  res.setHeader("Cache-Control", "no-store");
  res.json({ data: { cursor, events } });
}

export async function acceptDeliveryRequestController(req: Request, res: Response) {
  const partner = await DeliveryPartnerModel.findOne({ userId: req.user!.id });
  if (!partner) throw new AppError(404, "Delivery partner profile not found");
  if (partner.verificationStatus !== "VERIFIED") throw new AppError(403, "Complete admin verification to accept delivery jobs");
  if (!partner.isAvailable) throw new AppError(400, "Go online before accepting delivery jobs");

  const deadlineAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
  let request = await DeliveryRequestModel.findOneAndUpdate(
    { _id: String(req.params.id), taskStatus: "pending", assignedDeliveryPartnerId: { $exists: false }, retryStatus: { $ne: "ACTION_REQUIRED" } },
    { taskStatus: "accepted", retryStatus: "ACTIVE", assignedDeliveryPartnerId: partner.id, assignedDeliveryBoyId: partner.id, acceptedAt: new Date(), deadlineAt },
    { returnDocument: "after" }
  );
  if (!request) throw new AppError(409, "Delivery request is no longer available");

  const batch = await DeliveryBatchModel.findOneAndUpdate(
    { deliveryPartnerId: partner.id, deliveryType: partner.deliveryType, deliveryRound: request.deliveryRound, roundAt: request.roundAt, status: "active" },
    { 
      $setOnInsert: { 
        batchId: randomUUID(),
        deliveryPartnerId: partner.id, 
        deliveryType: partner.deliveryType, 
        deliveryRound: request.deliveryRound, 
        roundAt: request.roundAt, 
        shift: request.shift, 
        area: request.assignedArea || "All Areas",
        estimatedEarnings: 0
      }, 
      $addToSet: { tasks: request.id },
      $inc: { estimatedEarnings: request.estimatedEarnings || 0 }
    },
    { upsert: true, returnDocument: "after" }
  );
  if (batch) {
    request = await DeliveryRequestModel.findByIdAndUpdate(request.id, { batchId: batch.batchId }, { returnDocument: "after" }) ?? request;
    await refreshBatchRoutePositions(batch.batchId);
    request = await DeliveryRequestModel.findById(request.id) ?? request;
  }

  emitDeliveryEvent({ type: "DELIVERY_REQUEST_ACCEPTED", requestId: request.id, deliveryPartnerId: partner.id });
  emitToDeliveryPartners("delivery:task_accepted", { taskId: request.id, deliveryPartnerId: partner.id });
  emitToDeliveryPartner(partner.id, "delivery:task_assigned", request.toJSON());
  await TailoringRequestModel.findByIdAndUpdate(request.orderId, { orderStatus: request.type === "customer_to_tailor" ? "pickup_started" : "out_for_delivery" });
  emitToCustomer(request.customerId, "customer:delivery_status_updated", {
    requestId: request.id,
    tailoringRequestId: request.orderId,
    status: request.type === "customer_to_tailor" ? "PICKUP_STARTED" : "OUT_FOR_DELIVERY",
    deliveryRequest: request.toJSON()
  });
  await sendPushToUsers([request.customerId], {
    title: request.type === "customer_to_tailor" ? "Pickup started" : "Out for delivery",
    body: request.type === "customer_to_tailor" ? "A delivery partner is heading to pick up your clothes." : "Your stitched clothes are on the way.",
    data: {
      type: "DELIVERY_REQUEST_ACCEPTED",
      requestId: request.id,
      tailoringRequestId: request.orderId,
      screen: "trackOrder"
    },
    channelId: "customer-orders-v2",
    categoryId: "DARJI_ORDER",
    sound: "ding.mp3",
    actions: ["View Order"]
  });
  await sendNewOrderScheduledNotification(partner, request);
  const assignedTailor = await TailorModel.findById(request.tailorId).select("userId");
  if (request.type === "customer_to_tailor" && assignedTailor?.userId) {
    await sendPushToUsers([assignedTailor.userId], {
      title: "Pickup partner assigned",
      body: "A delivery partner has accepted the customer pickup task.",
      data: { type: "PICKUP_PARTNER_ASSIGNED", taskId: request.id, orderId: request.orderId, screen: "orderDetails" },
      channelId: "tailor-pickup-updates-v2",
      categoryId: "DARJI_ORDER",
      sound: "ding.mp3",
      actions: ["View Order"]
    });
  }
  res.json({ data: request });
}

export async function failDeliveryTaskController(req: Request, res: Response) {
  const input = failDeliveryTaskSchema.parse(req.body);
  const partner = await DeliveryPartnerModel.findOne({ userId: req.user!.id });
  if (!partner && req.user!.role !== "ADMIN") throw new AppError(404, "Delivery partner profile not found");
  if (partner?.verificationStatus !== "VERIFIED") throw new AppError(403, "Complete admin verification to update delivery jobs");

  const ownerFilter = req.user!.role === "ADMIN" ? {} : { assignedDeliveryPartnerId: partner!.id };
  const task = await DeliveryRequestModel.findOne({
    _id: String(req.params.id),
    ...ownerFilter,
    taskStatus: { $in: ["accepted", "picked_up"] }
  });
  if (!task) throw new AppError(409, "Only active delivery tasks can be marked failed");

  const failedAt = new Date();
  const retryPlan = retryBatchForReason(input.reason, failedAt);
  const retryCount = Number(task.retryCount ?? 0) + 1;
  const reachedMaxRetries = retryCount >= 3 && retryPlan.action === "retry_scheduled";
  const action = reachedMaxRetries ? "admin_review" : retryPlan.action;
  const isCancelled = action === "cancelled";
  const needsAdmin = action === "admin_review";
  const roundAt = action === "retry_scheduled" ? retryPlan.roundAt : undefined;
  const deliveryRound = action === "retry_scheduled" ? retryPlan.deliveryRound : undefined;

  if (task.batchId) {
    await DeliveryBatchModel.updateOne({ batchId: task.batchId }, { $pull: { tasks: task.id } });
  }

  const updated = await DeliveryRequestModel.findByIdAndUpdate(
    task.id,
    {
      $set: {
        taskStatus: isCancelled ? "cancelled" : "pending",
        retryStatus: isCancelled ? "CANCELLED" : needsAdmin ? "ACTION_REQUIRED" : "PENDING_RETRY",
        retryCount,
        lastFailureReason: input.reason,
        lastFailureAt: failedAt,
        nextScheduledBatch: roundAt,
        nextDeliveryRound: deliveryRound,
        ...(deliveryRound ? { deliveryRound, shift: deliveryRound === DeliveryRound.ONE_PM ? "morning" : "evening" } : {}),
        ...(roundAt ? { roundAt, ...etaWindowForRound(roundAt), ...routePositionFields() } : {})
      },
      $unset: {
        assignedDeliveryPartnerId: "",
        assignedDeliveryBoyId: "",
        batchId: "",
        deadlineAt: "",
        acceptedAt: "",
        pickupOtpVerifiedAt: "",
        dropOtpVerifiedAt: ""
      },
      $push: {
        failureHistory: {
          reason: input.reason,
          note: input.note,
          failedAt,
          action,
          nextScheduledBatch: roundAt,
          deliveryRound,
          actorId: req.user!.id
        }
      }
    },
    { returnDocument: "after" }
  );
  if (!updated) throw new AppError(404, "Delivery request not found");

  const orderStatus = isCancelled ? "cancelled" : needsAdmin ? "delivery_issue" : "delivery_retry_scheduled";
  await TailoringRequestModel.findByIdAndUpdate(updated.orderId, { orderStatus });
  if (partner) emitToDeliveryPartner(partner.id, "delivery:task_updated", updated.toJSON());
  emitToAdmins("delivery:retry_updated", { task: updated.toJSON(), action });
  emitToCustomer(updated.customerId, "customer:delivery_status_updated", {
    taskId: updated.id,
    orderId: updated.orderId,
    tailoringRequestId: updated.orderId,
    status: orderStatus,
    deliveryTask: updated.toJSON()
  });

  await sendPushToUsers([updated.customerId], {
    title: isCancelled ? "Delivery cancelled" : needsAdmin ? "Delivery needs attention" : "Delivery rescheduled",
    body: isCancelled
      ? "Your delivery was cancelled as requested."
      : needsAdmin
        ? "We could not complete the delivery. Darji support will review it."
        : `We will try again in the ${deliveryRound === DeliveryRound.ONE_PM ? "1 PM" : "6 PM"} delivery batch.`,
    data: { type: "DELIVERY_RETRY_UPDATED", taskId: updated.id, orderId: updated.orderId, screen: "trackOrder" },
    channelId: "customer-orders-v2",
    categoryId: "DARJI_ORDER",
    sound: "ding.mp3"
  });

  res.json({ data: updated });
}

export async function listDeliveryRetriesController(_req: Request, res: Response) {
  const tasks = await DeliveryRequestModel.find({
    retryStatus: { $in: ["PENDING_RETRY", "ACTION_REQUIRED"] },
    taskStatus: { $ne: "delivered" }
  }).sort({ retryStatus: 1, retryCount: -1, nextScheduledBatch: 1, lastFailureAt: -1 }).limit(100);
  res.json({ data: tasks });
}

export async function retryDeliveryTaskNowController(req: Request, res: Response) {
  const input = adminRetryNowSchema.parse(req.body);
  const now = new Date();
  const fallback = input.deliveryRound ? nextSpecificDeliveryRound(input.deliveryRound, now) : getDeliveryRoundForTime(now, defaultDeliveryRounds);
  const roundAt = input.roundAt ?? fallback.roundAt;
  const deliveryRound = input.deliveryRound ?? fallback.deliveryRound;
  const task = await DeliveryRequestModel.findByIdAndUpdate(
    String(req.params.id),
    {
      $set: {
        taskStatus: "pending",
        retryStatus: "PENDING_RETRY",
        nextScheduledBatch: roundAt,
        nextDeliveryRound: deliveryRound,
        deliveryRound,
        roundAt,
        shift: deliveryRound === DeliveryRound.ONE_PM ? "morning" : "evening",
        ...etaWindowForRound(roundAt),
        ...routePositionFields()
      },
      $unset: {
        assignedDeliveryPartnerId: "",
        assignedDeliveryBoyId: "",
        batchId: "",
        deadlineAt: "",
        acceptedAt: "",
        pickupOtpVerifiedAt: "",
        dropOtpVerifiedAt: ""
      },
      $push: {
        failureHistory: {
          reason: "Admin retry",
          failedAt: now,
          action: "retry_now",
          nextScheduledBatch: roundAt,
          deliveryRound,
          actorId: req.user!.id
        }
      }
    },
    { returnDocument: "after" }
  );
  if (!task) throw new AppError(404, "Delivery request not found");
  await TailoringRequestModel.findByIdAndUpdate(task.orderId, { orderStatus: "delivery_retry_scheduled" });
  emitToAdmins("delivery:retry_updated", { task: task.toJSON(), action: "retry_now" });
  emitToDeliveryPartners("delivery:retry_available", task.toJSON());
  res.json({ data: task });
}

export async function resolveDeliveryRetryController(req: Request, res: Response) {
  const task = await DeliveryRequestModel.findByIdAndUpdate(
    String(req.params.id),
    {
      $set: { retryStatus: "RESOLVED", taskStatus: "pending" },
      $push: {
        failureHistory: {
          reason: "Admin resolved",
          failedAt: new Date(),
          action: "resolved",
          actorId: req.user!.id
        }
      }
    },
    { returnDocument: "after" }
  );
  if (!task) throw new AppError(404, "Delivery request not found");
  emitToAdmins("delivery:retry_updated", { task: task.toJSON(), action: "resolved" });
  res.json({ data: task });
}

export async function cancelDeliveryRetryController(req: Request, res: Response) {
  const task = await DeliveryRequestModel.findByIdAndUpdate(
    String(req.params.id),
    {
      $set: { retryStatus: "CANCELLED", taskStatus: "cancelled", lastFailureReason: "Customer cancelled", lastFailureAt: new Date() },
      $push: {
        failureHistory: {
          reason: "Admin cancelled",
          failedAt: new Date(),
          action: "cancelled",
          actorId: req.user!.id
        }
      }
    },
    { returnDocument: "after" }
  );
  if (!task) throw new AppError(404, "Delivery request not found");
  await TailoringRequestModel.findByIdAndUpdate(task.orderId, { orderStatus: "cancelled" });
  emitToAdmins("delivery:retry_updated", { task: task.toJSON(), action: "cancelled" });
  emitToCustomer(task.customerId, "customer:delivery_status_updated", { taskId: task.id, orderId: task.orderId, tailoringRequestId: task.orderId, status: "cancelled", deliveryTask: task.toJSON() });
  res.json({ data: task });
}

export async function updateDeliveryTaskStatusController(req: Request, res: Response) {
  const input = updateDeliveryTaskSchema.parse(req.body);
  const partner = await DeliveryPartnerModel.findOne({ userId: req.user!.id });
  if (!partner) throw new AppError(404, "Delivery partner profile not found");
  if (partner.verificationStatus !== "VERIFIED") throw new AppError(403, "Complete admin verification to update delivery jobs");

  const expectedStatus = input.status === "picked_up" ? "accepted" : "picked_up";
  const existingTask = await DeliveryRequestModel.findOne({
    _id: String(req.params.id),
    assignedDeliveryPartnerId: partner.id,
    taskStatus: expectedStatus
  });
  if (!existingTask) throw new AppError(409, `Task must be ${expectedStatus} before it can be ${input.status}`);
  if (input.status === "picked_up") {
    if (!existingTask.pickupOtpVerifiedAt) throw new AppError(409, "Verify the pickup OTP first");
    if (existingTask.type === "customer_to_tailor") {
      const requiredPhotos = Math.max(1, Number(existingTask.itemCount ?? 1));
      const clothPhotoCount = existingTask.clothPhotos?.length ?? 0;
      if (clothPhotoCount < requiredPhotos) {
        throw new AppError(409, `Upload pickup photo for item ${clothPhotoCount + 1} of ${requiredPhotos} first`);
      }
      if (existingTask.sampleProvided && !(existingTask.samplePhotos?.length ?? 0)) throw new AppError(409, "Upload sample photos first");
    }
  } else {
    if (!existingTask.dropOtpVerifiedAt) throw new AppError(409, "Verify the delivery OTP first");
    if (existingTask.type === "tailor_to_customer") {
      const requiredPhotos = Math.max(1, Number(existingTask.itemCount ?? 1));
      const deliveryPhotoCount = existingTask.deliveryPhotos?.length ?? 0;
      if (deliveryPhotoCount < requiredPhotos) {
        throw new AppError(409, `Upload final delivery photo for item ${deliveryPhotoCount + 1} of ${requiredPhotos} first`);
      }
    }
    if (existingTask.type === "tailor_to_customer" && existingTask.paymentMethod === "COD" && existingTask.cashCollectionRequired && !existingTask.cashCollected) {
      throw new AppError(409, "Confirm COD cash collection before completing delivery");
    }
  }

  const task = await DeliveryRequestModel.findOneAndUpdate(
    { _id: String(req.params.id), assignedDeliveryPartnerId: partner.id, taskStatus: expectedStatus },
    {
      taskStatus: input.status,
      ...(input.status === "picked_up" ? { pickedUpAt: new Date() } : { deliveredAt: new Date() })
    },
    { returnDocument: "after" }
  );
  if (!task) throw new AppError(409, `Task must be ${expectedStatus} before it can be ${input.status}`);

  const orderStatus = input.status === "picked_up"
    ? (task.type === "customer_to_tailor" ? "picked_up_from_customer" : "out_for_delivery")
    : (task.type === "customer_to_tailor" ? "received_by_tailor" : "completed");
  await TailoringRequestModel.findByIdAndUpdate(task.orderId, { orderStatus });
  if (input.status === "delivered") {
    await creditOrderEarning({
      userId: partner.userId,
      userType: "DELIVERY_PARTNER",
      orderId: task.id,
      amount: Number(task.estimatedEarnings ?? 0),
      remarks: `Delivery earning for ${task.taskId ?? task.id}`,
      createdBy: "system"
    });

    if (task.type === "tailor_to_customer") {
      const acceptedQuote = await findSelectedQuote(task.orderId);
      const tailorProfile = acceptedQuote ? await TailorModel.findById(acceptedQuote.tailorId).select("userId") : null;
      if (tailorProfile?.userId && acceptedQuote) {
        await creditOrderEarning({
          userId: tailorProfile.userId,
          userType: "TAILOR",
          orderId: task.orderId,
          amount: Number(acceptedQuote.price ?? 0),
          remarks: `Tailor earning for order ${task.orderId.slice(0, 8).toUpperCase()}`,
          createdBy: "system"
        });
      }
    }
  }
  emitToDeliveryPartner(partner.id, "delivery:task_updated", task.toJSON());
  emitToCustomer(task.customerId, "customer:delivery_status_updated", { taskId: task.id, orderId: task.orderId, tailoringRequestId: task.orderId, status: orderStatus, deliveryTask: task.toJSON() });
  if (task.tailorId) {
    emitToTailor(task.tailorId, "tailoring:delivery_status_updated", { taskId: task.id, orderId: task.orderId, status: orderStatus, deliveryTask: task.toJSON() });
  }

  if (input.status === "picked_up") {
    await sendPushToUsers([task.customerId], {
      title: task.type === "customer_to_tailor" ? "Pickup completed" : "Out for delivery",
      body: task.type === "customer_to_tailor" ? "Your clothes have been collected." : "Your stitched clothes are on the way.",
      data: {
        type: task.type === "customer_to_tailor" ? "PICKUP_COMPLETED" : "OUT_FOR_DELIVERY",
        taskId: task.id,
        orderId: task.orderId,
        screen: "trackOrder"
      },
      channelId: "customer-orders-v2",
      categoryId: "DARJI_ORDER",
      sound: "ding.mp3"
    });
    if (task.type === "customer_to_tailor") {
      const tailor = await TailorModel.findById(task.tailorId).select("userId");
      if (tailor?.userId) {
        await sendPushToUsers([tailor.userId], {
          title: "Pickup partner arriving",
          body: "The customer clothes have been collected and are heading to your shop.",
          data: { type: "PICKUP_IN_TRANSIT", taskId: task.id, orderId: task.orderId, screen: "orderDetails" },
          channelId: "tailor-pickup-updates-v2",
          categoryId: "DARJI_ORDER",
          sound: "ding.mp3",
          actions: ["View Order"]
        });
      }
    }
  } else {
    const tailor = await TailorModel.findById(task.tailorId).select("userId");
    if (task.type === "customer_to_tailor") {
      if (tailor?.userId) {
        await sendPushToUsers([tailor.userId], {
          title: "Pickup completed",
          body: "The customer package has reached your shop.",
          channelId: "tailor-pickup-updates-v2",
          categoryId: "DARJI_ORDER",
          sound: "ding.mp3",
          data: { type: "PICKUP_COMPLETED", taskId: task.id, orderId: task.orderId, screen: "orderDetails" }
        });
      }
    } else {
      await sendOrderCompletedNotification({
        userId: task.customerId,
        title: "Order delivered",
        body: "Your stitched order has been delivered.",
        data: { type: "ORDER_COMPLETED", taskId: task.id, orderId: task.orderId, screen: "orderDetails" }
      });
    }
  }
  res.json({ data: task });
}

export async function verifyDeliveryTaskOtpController(req: Request, res: Response) {
  const input = deliveryTaskOtpSchema.parse(req.body);
  const partner = await DeliveryPartnerModel.findOne({ userId: req.user!.id });
  if (!partner) throw new AppError(404, "Delivery partner profile not found");
  if (partner.verificationStatus !== "VERIFIED") throw new AppError(403, "Complete admin verification to update delivery jobs");
  const expectedStatus = input.stage === "pickup" ? "accepted" : "picked_up";
  const task = await DeliveryRequestModel.findOne({
    _id: String(req.params.id),
    assignedDeliveryPartnerId: partner.id,
    taskStatus: expectedStatus
  });
  if (!task) throw new AppError(409, `${input.stage === "pickup" ? "Pickup" : "Delivery"} OTP is not available at this stage`);
  const expectedOtp = taskOtp(task.id, input.stage);
  if (!otpMatches(input.otp, expectedOtp)) throw new AppError(400, "Incorrect OTP. Ask the recipient to check and try again.");

  const timestampField = input.stage === "pickup" ? "pickupOtpVerifiedAt" : "dropOtpVerifiedAt";
  const updated = await DeliveryRequestModel.findByIdAndUpdate(task.id, { [timestampField]: new Date() }, { returnDocument: "after" });
  if (updated) emitToDeliveryPartner(partner.id, "delivery:task_updated", updated.toJSON());
  if (updated) {
    const realtimeStatus =
      updated.type === "customer_to_tailor" && input.stage === "drop"
        ? "received_by_tailor"
        : updated.type === "tailor_to_customer" && input.stage === "pickup"
          ? "ready_for_delivery"
          : undefined;
    if (realtimeStatus) {
      await TailoringRequestModel.findByIdAndUpdate(updated.orderId, { orderStatus: realtimeStatus });
      emitToCustomer(updated.customerId, "customer:delivery_status_updated", {
        taskId: updated.id,
        orderId: updated.orderId,
        tailoringRequestId: updated.orderId,
        status: realtimeStatus,
        deliveryTask: updated.toJSON()
      });
      if (updated.tailorId) {
        emitToTailor(updated.tailorId, "tailoring:delivery_status_updated", {
          taskId: updated.id,
          orderId: updated.orderId,
          status: realtimeStatus,
          deliveryTask: updated.toJSON()
        });
      }
    }
    await sendOtpNotification({
      userId: updated.customerId,
      title: input.stage === "pickup" ? "Pickup OTP verified" : "Delivery OTP verified",
      body: input.stage === "pickup" ? "Your clothes handoff was verified successfully." : "Your delivery handoff was verified successfully.",
      data: { type: "OTP_VERIFICATION", taskId: updated.id, orderId: updated.orderId, screen: "trackOrder" }
    });
  }
  res.json({ data: updated });
}

export async function saveDeliveryTaskPhotosController(req: Request, res: Response) {
  const input = deliveryTaskPhotosSchema.parse(req.body);
  const partner = await DeliveryPartnerModel.findOne({ userId: req.user!.id });
  if (!partner) throw new AppError(404, "Delivery partner profile not found");
  if (partner.verificationStatus !== "VERIFIED") throw new AppError(403, "Complete admin verification to update delivery jobs");
  const task = await DeliveryRequestModel.findOne({
    _id: String(req.params.id),
    assignedDeliveryPartnerId: partner.id
  });
  if (!task) throw new AppError(404, "Delivery request not found");
  if (input.kind === "delivery") {
    if (task.taskStatus !== "picked_up") throw new AppError(409, "Final delivery photos can only be added before marking delivered");
    if (task.type !== "tailor_to_customer") throw new AppError(400, "Final delivery photos are only required for customer delivery");
    if (!task.dropOtpVerifiedAt) throw new AppError(409, "Verify the delivery OTP before uploading photos");
  } else {
    if (task.taskStatus !== "accepted") throw new AppError(409, "Pickup photos can only be added before pickup");
    if (task.type !== "customer_to_tailor") throw new AppError(400, "Pickup photos are not required for tailor collection");
    if (!task.pickupOtpVerifiedAt) throw new AppError(409, "Verify the pickup OTP before uploading photos");
  }
  if (input.kind === "sample") {
    if (!task.sampleProvided) throw new AppError(400, "Sample photos are not required for this order");
    if (!(task.clothPhotos?.length ?? 0)) throw new AppError(409, "Upload cloth photos before sample photos");
  }

  const field = input.kind === "cloth" ? "clothPhotos" : input.kind === "sample" ? "samplePhotos" : "deliveryPhotos";
  const updated = await DeliveryRequestModel.findByIdAndUpdate(task.id, { [field]: input.photos }, { returnDocument: "after" });
  if (updated) emitToDeliveryPartner(partner.id, "delivery:task_updated", updated.toJSON());
  res.json({ data: updated });
}

export async function confirmDeliveryCashCollectionController(req: Request, res: Response) {
  const input = cashCollectionSchema.parse(req.body);
  const partner = await DeliveryPartnerModel.findOne({ userId: req.user!.id });
  if (!partner) throw new AppError(404, "Delivery partner profile not found");
  if (partner.verificationStatus !== "VERIFIED") throw new AppError(403, "Complete admin verification to update delivery jobs");

  const task = await DeliveryRequestModel.findOne({
    _id: String(req.params.id),
    assignedDeliveryPartnerId: partner.id,
    type: "tailor_to_customer",
    paymentMethod: "COD",
    taskStatus: "picked_up"
  });
  if (!task) throw new AppError(409, "COD collection is only available on final customer delivery");
  if (!task.dropOtpVerifiedAt) throw new AppError(409, "Verify the final delivery OTP before confirming cash collection");
  if (!input.collected) throw new AppError(400, "Cash collection confirmation was not provided");

  const updated = await DeliveryRequestModel.findByIdAndUpdate(
    task.id,
    { cashCollected: true, cashCollectedAt: new Date(), paymentStatus: "PAID" },
    { returnDocument: "after" }
  );
  await TailoringRequestModel.findByIdAndUpdate(task.orderId, { paymentStatus: "PAID" });
  await PaymentModel.findOneAndUpdate({ orderId: task.orderId, method: "COD" }, { status: "PAID" }, { sort: { createdAt: -1 } });
  
  // Log transaction
  await TransactionModel.create({
    userId: task.customerId,
    entityType: "CUSTOMER",
    type: "CREDIT",
    category: "COD",
    amount: task.totalAmount || 0, // Fallback if 0
    orderId: task.orderId,
    note: `Cash collected by delivery partner ${partner.userId}`
  });

  if (updated) emitToDeliveryPartner(partner.id, "delivery:task_updated", updated.toJSON());
  res.json({ data: updated });
}

export async function getDeliveryTaskOtpsController(req: Request, res: Response) {
  const orderId = String(req.params.orderId);
  const tasks = await DeliveryRequestModel.find({ orderId, taskStatus: { $in: ["pending", "accepted", "picked_up"] } }).sort({ createdAt: 1 });
  let tailorId: string | undefined;
  if (req.user!.role === "TAILOR") tailorId = (await TailorModel.findOne({ userId: req.user!.id }).select("_id"))?.id;

  const visible = tasks.flatMap((task) => {
    const isCustomer = req.user!.role === "CUSTOMER" && task.customerId === req.user!.id;
    const isTailor = req.user!.role === "TAILOR" && task.tailorId === tailorId;
    if (!isCustomer && !isTailor && req.user!.role !== "ADMIN") return [];
    const stage = isCustomer
      ? (task.type === "customer_to_tailor" ? "pickup" : "drop")
      : (task.type === "customer_to_tailor" ? "drop" : "pickup");
    return [{
      taskId: task.id,
      orderId: task.orderId,
      type: task.type,
      stage,
      otp: taskOtp(task.id, stage),
      verified: stage === "pickup" ? Boolean(task.pickupOtpVerifiedAt) : Boolean(task.dropOtpVerifiedAt),
      taskStatus: task.taskStatus,
      retryStatus: task.retryStatus,
      retryCount: task.retryCount,
      lastFailureReason: task.lastFailureReason,
      deliveryRound: task.deliveryRound,
      roundAt: task.roundAt,
      nextScheduledBatch: task.nextScheduledBatch,
      etaWindowStart: task.etaWindowStart,
      etaWindowEnd: task.etaWindowEnd,
      routePosition: task.routePosition,
      routeTotal: task.routeTotal
    }];
  });
  res.json({ data: visible });
}

function assertCloudinaryConfigured() {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new AppError(503, "Cloudinary is not configured on the backend");
  }
}

function fileKind(file: Express.Multer.File) {
  if (file.mimetype.startsWith("image/")) return "image" as const;
  if (file.mimetype.startsWith("video/")) return "video" as const;
  throw new AppError(400, "Only image and video uploads are allowed");
}

function validateFile(file: Express.Multer.File) {
  const kind = fileKind(file);
  const limit = kind === "image" ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;

  if (file.size > limit) {
    const maxMb = kind === "image" ? 5 : 50;
    throw new AppError(400, `${kind === "image" ? "Photos" : "Videos"} must be ${maxMb} MB or smaller`);
  }

  return kind;
}

async function uploadBuffer(file: Express.Multer.File, resourceType: "image" | "video") {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "darzi/tailoring-requests",
        resource_type: resourceType,
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

export async function uploadTailoringMediaController(req: Request, res: Response) {
  assertCloudinaryConfigured();

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw new AppError(400, "Attach at least one photo or video");
  if (files.length > MAX_FILES) throw new AppError(400, `Upload up to ${MAX_FILES} files at a time`);

  const uploaded = await Promise.all(
    files.map(async (file) => {
      const resourceType = validateFile(file);
      const result = await uploadBuffer(file, resourceType);
      return {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType,
        bytes: result.bytes,
        format: result.format,
        originalName: file.originalname
      };
    })
  );

  res.status(201).json({ data: uploaded });
}

export async function uploadTailoringAuditMediaController(req: Request, res: Response) {
  assertCloudinaryConfigured();
  const input = auditMediaSchema.parse(req.body);
  const request = await TailoringRequestModel.findById(String(req.params.id));
  if (!request) throw new AppError(404, "Tailoring request not found");

  const tailor = req.user!.role === "TAILOR" ? await TailorModel.findOne({ userId: req.user!.id }) : null;
  if (req.user!.role === "TAILOR") {
    const acceptedQuote = await TailorQuoteModel.findOne({ requestId: request.id, tailorId: tailor?.id ?? "__none__", status: "ACCEPTED" });
    if (!acceptedQuote) throw new AppError(403, "Only the accepted tailor can upload order photos");
  }

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw new AppError(400, "Attach at least one photo");
  const maxFiles = requestItemCount(request);
  const requestJson = request.toJSON() as { receivedMedia?: unknown[]; stitchedMedia?: unknown[] };
  const currentMedia = (input.stage === "RECEIVED" ? requestJson.receivedMedia : requestJson.stitchedMedia) ?? [];
  if (currentMedia.length + files.length > maxFiles) {
    throw new AppError(400, input.stage === "RECEIVED" ? `Upload one received-clothes photo per item (${maxFiles} total)` : `Upload one stitched-clothes photo per item (${maxFiles} total)`);
  }

  const uploaded = await Promise.all(
    files.map(async (file) => {
      if (fileKind(file) !== "image") throw new AppError(400, "Only photos are allowed for order proof");
      if (file.size > IMAGE_MAX_BYTES) throw new AppError(400, "Photos must be 5 MB or smaller");
      const result = await uploadBuffer(file, "image");
      return {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: "image" as const,
        bytes: result.bytes,
        format: result.format,
        originalName: file.originalname
      };
    })
  );

  const field = input.stage === "RECEIVED" ? "receivedMedia" : "stitchedMedia";
  const updatedRequest = await TailoringRequestModel.findByIdAndUpdate(request.id, { [field]: [...currentMedia, ...uploaded] }, { returnDocument: "after" });
  res.status(201).json({ data: await hydrateTailoringRequest(updatedRequest, req.user!.role === "TAILOR" ? req.user!.id : undefined) });
}

export async function updateTailoringWorkStatusController(req: Request, res: Response) {
  const input = updateTailoringWorkStatusSchema.parse(req.body);
  const request = await TailoringRequestModel.findById(String(req.params.id));
  if (!request) throw new AppError(404, "Tailoring request not found");
  if (request.status !== "TAILOR_SELECTED") throw new AppError(400, "Only accepted quote requests can be updated");

  const tailor = req.user!.role === "TAILOR" ? await TailorModel.findOne({ userId: req.user!.id }) : null;
  if (req.user!.role === "TAILOR") {
    const acceptedQuote = await TailorQuoteModel.findOne({ requestId: request.id, tailorId: tailor?.id ?? "__none__", status: "ACCEPTED" });
    if (!acceptedQuote) throw new AppError(403, "Only the accepted tailor can update this order");
  }

  const requiredPhotos = requestItemCount(request);
  const receivedPhotoCount = request.receivedMedia?.length ?? 0;
  const stitchedPhotoCount = request.stitchedMedia?.length ?? 0;
  if (input.status === "WORKING" && receivedPhotoCount < requiredPhotos) {
    throw new AppError(409, `Upload received-clothes photo for item ${receivedPhotoCount + 1} of ${requiredPhotos} first`);
  }
  if (input.status === "READY") {
    if (receivedPhotoCount < requiredPhotos) throw new AppError(409, `Upload received-clothes photo for item ${receivedPhotoCount + 1} of ${requiredPhotos} first`);
    if (stitchedPhotoCount < requiredPhotos) throw new AppError(409, `Upload stitched-clothes photo for item ${stitchedPhotoCount + 1} of ${requiredPhotos} first`);
  }

  const updatedRequest = await TailoringRequestModel.findByIdAndUpdate(request.id, { workStatus: input.status }, { returnDocument: "after" });
  const acceptedQuote = await TailorQuoteModel.findOne({ requestId: request.id, status: "ACCEPTED" });
  if (updatedRequest) {
    const status = input.status === "READY" ? "READY_FOR_DELIVERY" : "STITCHING_STARTED";
    emitToCustomer(updatedRequest.customerId, "customer:order_status_updated", {
      requestId: updatedRequest.id,
      status,
      request: await hydrateTailoringRequest(updatedRequest)
    });
    if (acceptedQuote?.tailorId) emitToTailor(acceptedQuote.tailorId, "tailoring:work_status_updated", { requestId: updatedRequest.id, status, request: await hydrateTailoringRequest(updatedRequest) });
    await sendPushToUsers([updatedRequest.customerId], {
      title: input.status === "READY" ? "Order ready" : "Stitching started",
      body: input.status === "READY" ? "Your order is ready for delivery." : "The tailor has started working on your order.",
      data: {
        type: "TAILORING_WORK_STATUS",
        requestId: updatedRequest.id,
        status,
        screen: "trackOrder"
      },
      channelId: "customer-orders-v2",
      categoryId: "DARJI_ORDER",
      sound: "ding.mp3",
      actions: ["View Order"]
    });
  }
  if (input.status === "READY") {
    await TailoringRequestModel.findByIdAndUpdate(request.id, { orderStatus: "ready_for_delivery" });
    await createDeliveryRequestForTailoringRequest(request.id, "tailor_to_customer");
  }
  res.json({ data: await hydrateTailoringRequest(updatedRequest, req.user!.role === "TAILOR" ? req.user!.id : undefined) });
}

export async function createTailoringRequestController(req: Request, res: Response) {
  const input = createTailoringRequestSchema.parse(req.body);
  const items = input.items?.length ? input.items : [{
    description: input.description,
    gender: input.gender,
    clothType: input.clothType,
    workType: input.workType,
    measurement: input.measurement,
    measurementNotes: input.measurementNotes,
    homeMeasurementBooked: input.homeMeasurementBooked,
    sampleProvided: input.sampleProvided,
    media: input.media,
    sampleMedia: input.sampleMedia
  }];
  const primary = items[0];
  const request = await TailoringRequestModel.create({
    ...input,
    description: primary.description,
    gender: primary.gender,
    clothType: primary.clothType,
    workType: primary.workType,
    measurement: primary.measurement,
    measurementNotes: primary.measurementNotes,
    homeMeasurementBooked: primary.homeMeasurementBooked,
    sampleProvided: primary.sampleProvided,
    media: primary.media,
    sampleMedia: primary.sampleMedia,
    items,
    itemCount: items.length,
    customerId: req.user!.id
  });

  emitTailoringEvent({ type: "REQUEST_CREATED", requestId: request.id });
  const availableTailors = await TailorModel.find({ isAvailable: true, verificationStatus: "VERIFIED" }).select("userId");
  for (const tailor of availableTailors) emitToTailor(tailor.id, "tailoring:request_created", request.toJSON());
  await Promise.all(
    availableTailors.map((tailor) => sendNewRequestNotification({
      userId: tailor.userId,
      title: "New customer order",
      body: `${requestClothingLabel(request)}. Open the request to send a quote.`,
      data: {
        type: "NEW_REQUEST",
        requestId: request.id,
        screen: "requestDetails"
      }
    }))
  );
  res.status(201).json({ data: request });
}

export async function watchTailoringRequestsController(req: Request, res: Response) {
  const parsedAfter = Number(req.query.after);
  const afterId = Number.isFinite(parsedAfter) ? parsedAfter : latestTailoringEventId();
  const tailor = req.user!.role === "TAILOR" ? await TailorModel.findOne({ userId: req.user!.id }) : null;
  const events = await waitForTailoringEvents(afterId, tailor?.id, 5 * 60 * 1000);
  const cursor = events.at(-1)?.id ?? latestTailoringEventId();

  res.setHeader("Cache-Control", "no-store");
  res.json({ data: { cursor, events } });
}

export async function listTailoringRequestsController(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const where: Record<string, unknown> = {};

  if (req.user!.role === "CUSTOMER") {
    where.customerId = req.user!.id;
  } else if (status) {
    where.status = status;
  } else if (req.user!.role === "TAILOR") {
    where.status = "QUOTE_REQUESTED";
  }

  const requests = await TailoringRequestModel.find(where).sort({ createdAt: -1 }).limit(100);
  res.json({ data: await Promise.all(requests.map((request) => hydrateTailoringRequest(request, req.user!.role === "TAILOR" ? req.user!.id : undefined))) });
}

export async function getTailoringRequestController(req: Request, res: Response) {
  const request = await TailoringRequestModel.findById(String(req.params.id));
  if (!request) throw new AppError(404, "Tailoring request not found");
  if (req.user!.role === "CUSTOMER" && request.customerId !== req.user!.id) throw new AppError(403, "Forbidden");
  res.json({ data: await hydrateTailoringRequest(request, req.user!.role === "TAILOR" ? req.user!.id : undefined) });
}

export async function createTailorQuoteController(req: Request, res: Response) {
  const input = createTailorQuoteSchema.parse(req.body);
  const request = await TailoringRequestModel.findById(String(req.params.id));
  if (!request) throw new AppError(404, "Tailoring request not found");
  if (request.status !== "QUOTE_REQUESTED") throw new AppError(400, "This request is not accepting quotes");

  const window = urgencyWindow(request.urgency);
  if (window.mode === "hours") {
    if (!input.estimatedHours || input.estimatedHours < window.min || input.estimatedHours > window.max) {
      throw new AppError(400, `Instant delivery quotes must be between ${window.min} and ${window.max} hours`);
    }
    if (input.estimatedDays !== 1) {
      throw new AppError(400, "Instant delivery quotes should keep the day value at 1 and use hours for ETA");
    }
  } else if (input.estimatedDays < window.min || input.estimatedDays > window.max) {
    throw new AppError(400, `This urgency allows only ${window.min}${window.min === window.max ? "" : `-${window.max}`} day quote(s)`);
  }

  const tailor = await TailorModel.findOneAndUpdate(
    { userId: req.user!.id },
    { $setOnInsert: { userId: req.user!.id, shopName: "Darji Tailor", specialization: [] } },
    { upsert: true, returnDocument: "after" }
  );

  const quote = await TailorQuoteModel.findOneAndUpdate(
    { requestId: request.id, tailorId: tailor.id },
    {
      requestId: request.id,
      tailorId: tailor.id,
      price: input.price,
      estimatedDays: input.estimatedDays,
      estimatedHours: input.estimatedHours,
      message: input.message,
      status: "SUBMITTED"
    },
    { upsert: true, returnDocument: "after" }
  );

  await sendQuoteReceivedNotification({
    userId: request.customerId,
    title: "New quote received",
    body: `${tailor.shopName} quoted Rs.${input.price} with an estimate of ${quoteEtaLabel(input)}.`,
    data: { type: "QUOTE_RECEIVED", requestId: request.id, orderId: request.id, screen: "orderDetails" }
  });

  res.status(201).json({ data: quote });
}

export async function listTailorQuotesController(req: Request, res: Response) {
  const request = await TailoringRequestModel.findById(String(req.params.id));
  if (!request) throw new AppError(404, "Tailoring request not found");
  if (req.user!.role === "CUSTOMER" && request.customerId !== req.user!.id) throw new AppError(403, "Forbidden");

  const where: Record<string, unknown> = { requestId: request.id };
  if (req.user!.role === "TAILOR") {
    const tailor = await TailorModel.findOne({ userId: req.user!.id });
    where.tailorId = tailor?.id ?? "__none__";
  }

  const quotes = await TailorQuoteModel.find(where).sort({ price: 1, createdAt: 1 });
  res.json({ data: await Promise.all(quotes.map((quote) => hydrateTailorQuote(quote))) });
}

export async function startTailoringCheckoutController(req: Request, res: Response) {
  const input = checkoutTailoringRequestSchema.parse(req.body);
  const request = await TailoringRequestModel.findById(String(req.params.id));
  if (!request) throw new AppError(404, "Tailoring request not found");
  if (req.user!.role === "CUSTOMER" && request.customerId !== req.user!.id) throw new AppError(403, "Forbidden");
  if (request.status === "CANCELLED") throw new AppError(409, "Cancelled requests cannot be confirmed");
  if (request.status === "TAILOR_SELECTED") throw new AppError(409, "This request is already confirmed");

  const quote = await TailorQuoteModel.findOne({ _id: input.quoteId, requestId: request.id });
  if (!quote) throw new AppError(404, "Quote not found");
  const itemCount = requestItemCount(request);
  const tailoringSubtotal = Number(quote.price);
  const subtotalBeforeDiscount = tailoringSubtotal + input.deliveryFee + input.platformFee + input.homeMeasurementFee;
  let discountAmount = 0;
  let couponCode: string | undefined;
  if (input.couponCode) {
    const coupon = await CouponModel.findOne({ code: input.couponCode.toUpperCase() });
    if (!coupon || !coupon.isActive || (coupon.expiresAt && coupon.expiresAt <= new Date())) {
      throw new AppError(400, "Coupon is invalid or expired");
    }
    if (subtotalBeforeDiscount < Number(coupon.minOrderValue ?? 0)) {
      throw new AppError(400, `Coupon requires minimum cart value of ₹${Number(coupon.minOrderValue ?? 0).toFixed(0)}`);
    }
    discountAmount = coupon.discountType === "PERCENTAGE"
      ? (subtotalBeforeDiscount * Number(coupon.discountValue ?? 0)) / 100
      : Number(coupon.discountValue ?? 0);
    if (coupon.maxDiscount != null) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
    discountAmount = Math.min(Math.max(0, Number(discountAmount.toFixed(2))), subtotalBeforeDiscount);
    couponCode = coupon.code;
  }
  const payableAmount = Number(Math.max(subtotalBeforeDiscount - discountAmount, 0).toFixed(2));
  if (Math.abs(input.totalAmount - payableAmount) > 1) throw new AppError(400, "Checkout total changed. Refresh cart and try again.");

  await TailorQuoteModel.updateMany({ requestId: request.id, _id: { $ne: quote.id }, status: "RESERVED" }, { status: "SUBMITTED" });
  await TailorQuoteModel.findByIdAndUpdate(quote.id, { status: input.paymentMethod === "COD" ? "ACCEPTED" : "RESERVED" });

  await TailoringRequestModel.findByIdAndUpdate(request.id, {
    status: input.paymentMethod === "COD" ? "TAILOR_SELECTED" : "PAYMENT_PENDING",
    selectedQuoteId: quote.id,
    paymentMethod: input.paymentMethod,
    paymentStatus: "PENDING",
    quoteAmount: tailoringSubtotal,
    deliveryFee: input.deliveryFee,
    platformFee: input.platformFee,
    homeMeasurementFee: input.homeMeasurementFee,
    couponCode,
    discountAmount,
    itemCount,
    additionalItems: input.additionalItems,
    totalAmount: payableAmount,
    orderStatus: input.paymentMethod === "COD" ? "tailor_accepted" : "payment_pending"
  });

  if (input.paymentMethod === "COD") {
    await PaymentModel.create({ orderId: request.id, method: "COD", amount: payableAmount, status: "PENDING" });
    res.json({ data: { mode: "cod", ...(await finalizeTailoringRequestConfirmation(request.id, quote.id, "COD", "PENDING", {
      deliveryFee: input.deliveryFee,
      platformFee: input.platformFee,
      homeMeasurementFee: input.homeMeasurementFee,
      additionalItems: input.additionalItems,
      couponCode,
      discountAmount,
      totalAmount: payableAmount
    })) } });
    return;
  }

  const razorpayOrder = await createRazorpayOrder({
    amount: payableAmount,
    receipt: `darzi-${request.id.slice(0, 12)}`,
    notes: {
      requestId: request.id,
      quoteId: quote.id,
      paymentMethod: input.paymentMethod
    }
  });
  await PaymentModel.create({ orderId: request.id, method: input.paymentMethod, amount: payableAmount, status: "PENDING", providerRef: razorpayOrder.id });

  const customer = await UserModel.findById(request.customerId).select("name phone");
  res.json({
    data: {
      mode: "online",
      request: await hydrateTailoringRequest(await TailoringRequestModel.findById(request.id)),
      quote: await hydrateTailorQuote(quote),
      razorpay: {
        keyId: env.RAZORPAY_KEY_ID,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "Darji",
        description: requestItemCount(request) === 1 ? `${request.workType} - ${request.clothType}` : `${requestItemCount(request)} clothing items`,
        prefill: {
          name: customer?.name ?? "Darji Customer",
          contact: customer?.phone ?? ""
        }
      }
    }
  });
}

export async function verifyTailoringCheckoutController(req: Request, res: Response) {
  const input = verifyCheckoutSchema.parse(req.body);
  const request = await TailoringRequestModel.findById(String(req.params.id));
  if (!request) throw new AppError(404, "Tailoring request not found");
  if (req.user!.role === "CUSTOMER" && request.customerId !== req.user!.id) throw new AppError(403, "Forbidden");
  if (!request.selectedQuoteId) throw new AppError(409, "No quote is reserved for this request");
  if (!request.paymentMethod || request.paymentMethod === "COD") throw new AppError(409, "This request is not waiting for online payment");

  assertRazorpayConfigured();
  const expectedSignature = createHmac("sha256", env.RAZORPAY_KEY_SECRET!).update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`).digest("hex");
  if (!otpMatches(input.razorpay_signature, expectedSignature)) {
    throw new AppError(400, "Payment signature verification failed");
  }

  const payment = await PaymentModel.findOne({
    orderId: request.id,
    method: request.paymentMethod,
    providerRef: input.razorpay_order_id,
    status: "PENDING"
  }).sort({ createdAt: -1 });
  if (!payment) throw new AppError(404, "Pending payment record not found");

  await PaymentModel.findByIdAndUpdate(payment.id, { status: "PAID" });
  res.json({
    data: await finalizeTailoringRequestConfirmation(
      request.id,
      request.selectedQuoteId,
      request.paymentMethod as "ONLINE" | "UPI",
      "PAID",
      {
        deliveryFee: Number(request.deliveryFee ?? 0),
        platformFee: Number(request.platformFee ?? 0),
        homeMeasurementFee: Number(request.homeMeasurementFee ?? 0),
        additionalItems: Array.isArray(request.additionalItems) ? request.additionalItems : [],
        couponCode: request.couponCode ?? undefined,
        discountAmount: Number(request.discountAmount ?? 0),
        totalAmount: Number(request.totalAmount ?? payment.amount)
      }
    )
  });
}

export async function cancelTailoringRequestController(req: Request, res: Response) {
  const input = cancelTailoringRequestSchema.parse(req.body);
  const request = await TailoringRequestModel.findById(String(req.params.id));
  if (!request) throw new AppError(404, "Tailoring request not found");
  if (req.user!.role === "CUSTOMER" && request.customerId !== req.user!.id) throw new AppError(403, "Forbidden");

  const updated = await cancelTailoringRequestAndTasks(request.id, input.reason);
  res.json({ data: await hydrateTailoringRequest(updated) });
}

export async function selectTailorQuoteController(req: Request, res: Response) {
  const request = await TailoringRequestModel.findById(String(req.params.id));
  if (!request) throw new AppError(404, "Tailoring request not found");
  if (req.user!.role === "CUSTOMER" && request.customerId !== req.user!.id) throw new AppError(403, "Forbidden");
  if (request.status !== "QUOTE_REQUESTED" && request.status !== "PAYMENT_PENDING") throw new AppError(400, "This request is already closed");

  const quote = await TailorQuoteModel.findOne({ _id: String(req.params.quoteId), requestId: request.id });
  if (!quote) throw new AppError(404, "Quote not found");

  await TailorQuoteModel.updateMany({ requestId: request.id, _id: { $ne: quote.id }, status: "RESERVED" }, { status: "SUBMITTED" });
  await TailorQuoteModel.findByIdAndUpdate(quote.id, { status: "RESERVED" });
  const updatedRequest = await TailoringRequestModel.findByIdAndUpdate(
    request.id,
    { status: "PAYMENT_PENDING", selectedQuoteId: quote.id, paymentStatus: "PENDING", orderStatus: "payment_pending" },
    { returnDocument: "after" }
  );
  res.json({ data: { request: await hydrateTailoringRequest(updatedRequest), quote: await hydrateTailorQuote(await TailorQuoteModel.findById(quote.id)) } });
}
