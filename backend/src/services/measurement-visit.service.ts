import { createHmac, timingSafeEqual } from "node:crypto";
import { MeasurementVisitModel, TailorModel, TailoringRequestModel, TailorQuoteModel, UserModel } from "../models.js";
import { env } from "../env.js";
import { sendPushToUsers } from "./push.service.js";
import { emitToAdmins, emitToCustomer, emitToTailor, emitToTailors } from "./socket.service.js";
import { upsertOperationalAlert, resolveOperationalAlert } from "./operational-alert.service.js";

const DEFAULT_VISIT_PAYOUT = 75;

function hasHomeMeasurement(request: any) {
  if (request.homeMeasurementBooked) return true;
  return Array.isArray(request.items) && request.items.some((item: { homeMeasurementBooked?: boolean } | null | undefined) => item?.homeMeasurementBooked);
}

function itemSummary(request: any) {
  const count = Array.isArray(request.items) && request.items.length ? request.items.length : Number(request.itemCount ?? 1);
  if (count > 1) return `${count} clothing items`;
  return [request.workType, request.clothType].filter(Boolean).join(" - ") || "Tailoring order";
}

function defaultScheduledAt() {
  const now = new Date();
  return new Date(now.getTime() + 2 * 60 * 60 * 1000);
}

function selectedMeasurementSlot(request: any) {
  const rootSlot = typeof request?.preferredMeasurementSlot === "string" ? request.preferredMeasurementSlot.trim() : "";
  if (rootSlot) return rootSlot;
  const item = Array.isArray(request?.items)
    ? request.items.find((candidate: any) => candidate?.homeMeasurementBooked && typeof candidate.preferredMeasurementSlot === "string" && candidate.preferredMeasurementSlot.trim())
    : undefined;
  return typeof item?.preferredMeasurementSlot === "string" ? item.preferredMeasurementSlot.trim() : "";
}

function resolveScheduledAt(slot?: string) {
  const now = new Date();
  if (!slot) return defaultScheduledAt();

  const match = slot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  let hour = 12;
  let minute = 0;
  if (match) {
    hour = parseInt(match[1], 10);
    minute = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
  }

  const scheduled = new Date(now);
  scheduled.setDate(now.getDate() + 1);
  scheduled.setHours(hour, minute, 0, 0);
  return scheduled;
}

export function measurementVisitOtp(visitId: string) {
  const digest = createHmac("sha256", env.JWT_ACCESS_SECRET).update(`measurement:${visitId}`).digest();
  return String(digest.readUInt32BE(0) % 10000).padStart(4, "0");
}

export function measurementOtpMatches(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function createMeasurementVisitForConfirmedRequest(requestId: string, quoteId: string) {
  const [request, quote] = await Promise.all([
    TailoringRequestModel.findById(requestId),
    TailorQuoteModel.findById(quoteId)
  ]);
  if (!request || !quote || !hasHomeMeasurement(request)) return null;

  const [customer, stitchingTailor] = await Promise.all([
    UserModel.findById(request.customerId).select("name phone"),
    TailorModel.findById(quote.tailorId).select("userId isAvailable measurementPartner")
  ]);

  const preferredSlot = selectedMeasurementSlot(request);
  const visit = await MeasurementVisitModel.findOneAndUpdate(
    { requestId: request.id },
    {
      $setOnInsert: {
        requestId: request.id,
        customerId: request.customerId,
        stitchingTailorId: quote.tailorId,
        offeredTailorId: quote.tailorId,
        status: "OFFERED_TO_STITCHING_TAILOR",
        scheduledAt: resolveScheduledAt(preferredSlot),
        preferredMeasurementSlot: preferredSlot,
        visitPayout: Number(stitchingTailor?.measurementPartner?.visitPayout ?? DEFAULT_VISIT_PAYOUT),
        customerName: customer?.name ?? "Customer",
        customerPhone: customer?.phone ?? "",
        pickupAddress: request.pickupAddress,
        garmentSummary: itemSummary(request)
      }
    },
    { upsert: true, returnDocument: "after" }
  );

  if (stitchingTailor?.userId && stitchingTailor.isAvailable) {
    await sendPushToUsers([stitchingTailor.userId], {
      title: "Measurement visit requested",
      body: `${customer?.name ?? "Customer"} needs an at-home measurement visit (${preferredSlot || "slot specified"}). Payout Rs ${Number(visit.visitPayout ?? DEFAULT_VISIT_PAYOUT).toFixed(0)}.`,
      data: {
        type: "MEASUREMENT_VISIT_OFFERED",
        visitId: visit.id,
        requestId: request.id,
        preferredMeasurementSlot: preferredSlot,
        slot: preferredSlot,
        pickupAddress: request.pickupAddress,
        customerName: customer?.name ?? "Customer",
        garmentSummary: itemSummary(request),
        visitPayout: String(Number(visit.visitPayout ?? DEFAULT_VISIT_PAYOUT).toFixed(0)),
        screen: "measurementVisits"
      },
      channelId: "darji-incoming-orders-v4",
      categoryId: "TAILOR_MEASUREMENT_VISIT",
      sound: "requests.mp3",
      targetApps: ["tailor"]
    });
    emitToTailor(quote.tailorId, "measurement:visit_offered", { visit: visit.toJSON() });
  }
  emitToAdmins("measurement:visit_created", { visit: visit.toJSON() });
  return visit;
}

export async function moveMeasurementVisitToPool(visitId: string, tailorId?: string, reason = "declined") {
  const visit = await MeasurementVisitModel.findByIdAndUpdate(
    visitId,
    {
      $set: { status: "POOL", poolOpenedAt: new Date() },
      $unset: { offeredTailorId: "", assignedTailorId: "", acceptedAt: "" },
      ...(tailorId ? { $addToSet: { declinedTailorIds: tailorId } } : {})
    },
    { returnDocument: "after" }
  );
  if (!visit) return null;

  await upsertOperationalAlert({
    type: "MEASUREMENT_VISIT_UNASSIGNED",
    severity: "WARNING",
    title: "Measurement visit unassigned",
    message: `${visit.garmentSummary ?? "Measurement visit"} is waiting for a measurement partner.`,
    dedupeKey: `MEASUREMENT_VISIT_UNASSIGNED:${visit.id}`,
    entityType: "measurement_visit",
    entityId: visit.id,
    customerId: visit.customerId,
    customerName: visit.customerName ?? undefined,
    customerPhone: visit.customerPhone ?? undefined,
    metadata: { requestId: visit.requestId, reason },
    sendEmail: true
  });

  const partnerTailors = await TailorModel.find({
    verificationStatus: "VERIFIED",
    isAvailable: true,
    "measurementPartner.isEnabled": true,
    tailorRoles: "MEASUREMENT_PARTNER",
    _id: { $nin: visit.declinedTailorIds ?? [] }
  }).select("userId");
  const userIds = partnerTailors.map((tailor) => tailor.userId).filter((id): id is string => typeof id === "string" && id.length > 0);
  if (userIds.length) {
    await sendPushToUsers(userIds, {
      title: "Measurement visit available",
      body: `${visit.customerName ?? "Customer"} needs measurements at home. Payout Rs ${Number(visit.visitPayout ?? DEFAULT_VISIT_PAYOUT).toFixed(0)}.`,
      data: {
        type: "MEASUREMENT_VISIT_POOL",
        visitId: visit.id,
        requestId: visit.requestId,
        preferredMeasurementSlot: visit.preferredMeasurementSlot ?? "",
        slot: visit.preferredMeasurementSlot ?? "",
        pickupAddress: visit.pickupAddress ?? "",
        customerName: visit.customerName ?? "Customer",
        garmentSummary: visit.garmentSummary ?? "Home measurement",
        visitPayout: String(Number(visit.visitPayout ?? DEFAULT_VISIT_PAYOUT).toFixed(0)),
        screen: "measurementVisits"
      },
      channelId: "darji-incoming-orders-v4",
      categoryId: "TAILOR_MEASUREMENT_VISIT",
      sound: "requests.mp3",
      targetApps: ["tailor"]
    });
  }
  emitToTailors("measurement:visit_pool", { visit: visit.toJSON() });
  emitToAdmins("measurement:visit_pool", { visit: visit.toJSON() });
  return visit;
}

export async function assignMeasurementVisit(visitId: string, tailorId: string, actorId?: string) {
  const tailor = await TailorModel.findById(tailorId).select("userId verificationStatus");
  if (!tailor) throw new Error("Tailor profile not found");
  const visit = await MeasurementVisitModel.findOneAndUpdate(
    { _id: visitId, status: { $in: ["OFFERED_TO_STITCHING_TAILOR", "POOL", "ACCEPTED", "IN_PROGRESS"] } },
    {
      $set: {
        assignedTailorId: tailorId,
        offeredTailorId: tailorId,
        status: "ACCEPTED",
        acceptedAt: new Date()
      }
    },
    { returnDocument: "after" }
  );
  if (!visit) return null;
  await resolveOperationalAlert(`MEASUREMENT_VISIT_UNASSIGNED:${visit.id}`, actorId);
  if (tailor.userId) {
    await sendPushToUsers([tailor.userId], {
      title: "Measurement visit assigned",
      body: `${visit.customerName ?? "Customer"} visit is assigned to you.`,
      data: { type: "MEASUREMENT_VISIT_ASSIGNED", visitId: visit.id, requestId: visit.requestId, screen: "measurementVisits" },
      channelId: "tailor-pickup-updates-v2",
      categoryId: "DARJI_ORDER",
      sound: "ding.mp3",
      targetApps: ["tailor"]
    });
  }
  emitToTailor(tailorId, "measurement:visit_assigned", { visit: visit.toJSON() });
  emitToAdmins("measurement:visit_assigned", { visit: visit.toJSON() });
  return visit;
}

export async function submitMeasurementVisit(visitId: string, tailorId: string, input: {
  otp: string;
  measurement?: { label?: string; fields?: Record<string, string | number>; imageUrl?: string };
  itemMeasurements?: Array<{ itemId: string; label?: string; fields?: Record<string, string | number>; notes?: string }>;
  fitPreferences?: string[];
  notes?: string;
  specialInstructions?: string;
  voiceNotes?: unknown[];
  photos?: unknown[];
}) {
  const visit = await MeasurementVisitModel.findOne({ _id: visitId, assignedTailorId: tailorId });
  if (!visit) throw new Error("Measurement visit not found");
  if (!["ACCEPTED", "IN_PROGRESS"].includes(String(visit.status))) throw new Error("This measurement visit cannot be submitted");
  if (!measurementOtpMatches(input.otp, measurementVisitOtp(visit.id))) throw new Error("Invalid customer OTP");

  const updated = await MeasurementVisitModel.findByIdAndUpdate(
    visit.id,
    {
      $set: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        otpVerifiedAt: new Date(),
        submission: {
          measurement: input.measurement,
          itemMeasurements: input.itemMeasurements ?? [],
          fitPreferences: input.fitPreferences ?? [],
          notes: input.notes,
          specialInstructions: input.specialInstructions,
          voiceNotes: input.voiceNotes ?? [],
          photos: input.photos ?? []
        }
      }
    },
    { returnDocument: "after" }
  );
  if (!updated) return null;

  const request = await TailoringRequestModel.findById(updated.requestId);
  if (request) {
    const itemMeasurements = input.itemMeasurements ?? [];
    const fallbackMeasurement = itemMeasurements[0];
    const rootMeasurement = input.measurement ?? (fallbackMeasurement
      ? {
          label: fallbackMeasurement.label,
          fields: fallbackMeasurement.fields
        }
      : undefined);
    const rootNotes = [...new Set([input.notes, input.specialInstructions].filter(Boolean))].join("\n");
    request.set("orderStatus", "tailor_accepted");
    if (rootMeasurement) request.set("measurement", rootMeasurement);
    if (rootNotes) request.set("measurementNotes", rootNotes);

    if (Array.isArray(request.items) && request.items.length && itemMeasurements.length) {
      itemMeasurements.forEach((entry) => {
        const item = request.items.find((candidate) => String(candidate._id) === entry.itemId);
        if (!item) return;
        item.set("measurement", { label: entry.label ?? "Home Visit", fields: entry.fields ?? {} });
        if (entry.notes) item.set("measurementNotes", entry.notes);
      });
      request.markModified("items");
    }
    await request.save();
  }
  const stitchingTailor = await TailorModel.findById(updated.stitchingTailorId).select("userId");
  if (stitchingTailor?.userId) {
    await sendPushToUsers([stitchingTailor.userId], {
      title: "Measurements submitted",
      body: `${updated.customerName ?? "Customer"} measurements are ready in the order.`,
      data: { type: "MEASUREMENT_SUBMITTED", visitId: updated.id, requestId: updated.requestId, screen: "orderDetails" },
      channelId: "tailor-pickup-updates-v2",
      categoryId: "DARJI_ORDER",
      sound: "ding.mp3",
      targetApps: ["tailor"]
    });
    emitToTailor(updated.stitchingTailorId, "measurement:submitted", { visit: updated.toJSON(), request: request?.toJSON() });
  }
  emitToCustomer(updated.customerId, "customer:order_status_updated", { requestId: updated.requestId, status: "MEASUREMENT_SUBMITTED" });
  emitToAdmins("measurement:submitted", { visit: updated.toJSON() });
  await resolveOperationalAlert(`MEASUREMENT_VISIT_UNASSIGNED:${updated.id}`);
  return updated;
}
