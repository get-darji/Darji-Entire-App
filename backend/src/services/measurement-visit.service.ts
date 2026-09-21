import { createHmac, timingSafeEqual } from "node:crypto";
import { MeasurementVisitModel, TailorModel, TailoringRequestModel, TailorQuoteModel, UserModel } from "../models.js";
import { env } from "../env.js";
import { sendPushToUsers } from "./push.service.js";
import { emitToAdmins, emitToCustomer, emitToTailor } from "./socket.service.js";
import { upsertOperationalAlert, resolveOperationalAlert } from "./operational-alert.service.js";
import { extractTailorShopPoint, geocodeAddress, pointFrom, roadDistanceMeters } from "./delivery-pricing.service.js";

const DEFAULT_VISIT_PAYOUT = 30;
const MEASUREMENT_VISIT_BASE_PAYOUT = 30;
const MEASUREMENT_VISIT_PER_KM = 10;

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
  const scheduled = new Date(now);
  scheduled.setDate(now.getDate() + 1);
  scheduled.setHours(8, 0, 0, 0);
  return scheduled;
}

function selectedMeasurementSlot(request: any) {
  const rootSlot = typeof request?.preferredMeasurementSlot === "string" ? request.preferredMeasurementSlot.trim() : "";
  if (rootSlot) return rootSlot;
  const item = Array.isArray(request?.items)
    ? request.items.find((candidate: any) => candidate?.homeMeasurementBooked && typeof candidate.preferredMeasurementSlot === "string" && candidate.preferredMeasurementSlot.trim())
    : undefined;
  return typeof item?.preferredMeasurementSlot === "string" ? item.preferredMeasurementSlot.trim() : "";
}

function tailorShopAddress(tailor: Record<string, unknown> | null | undefined) {
  if (!tailor) return "";
  const verification = tailor.verification as Record<string, any> | undefined;
  const verificationDraft = tailor.verificationDraft as Record<string, any> | undefined;
  const verifiedShopAddress = verification?.shop?.shopAddress
    || (verification?.shop ? [verification.shop.shopAddressLine, verification.shop.shopArea, verification.shop.shopCity, verification.shop.shopState, verification.shop.shopPincode].filter(Boolean).join(", ") : undefined);
  const draftShopAddress = verificationDraft?.shop?.shopAddress
    || (verificationDraft?.shop ? [verificationDraft.shop.shopAddressLine, verificationDraft.shop.shopArea, verificationDraft.shop.shopCity, verificationDraft.shop.shopState, verificationDraft.shop.shopPincode].filter(Boolean).join(", ") : undefined);
  return String(verifiedShopAddress || draftShopAddress || "");
}

export function measurementVisitPayout(distanceMeters?: number | null) {
  const km = Math.max(0, Number(distanceMeters) || 0) / 1000;
  return Math.round(MEASUREMENT_VISIT_BASE_PAYOUT + km * MEASUREMENT_VISIT_PER_KM);
}

function measurementDistanceLabel(distanceMeters?: number | null) {
  const meters = Number(distanceMeters ?? 0);
  if (!Number.isFinite(meters) || meters <= 0) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km >= 10 ? km.toFixed(0) : km.toFixed(1)} km`;
}

export async function measurementVisitPayoutForTailor(
  visit: { pickupAddress?: string | null; pickupLocation?: unknown },
  tailor: Record<string, unknown> | null | undefined
) {
  const [customerPoint, tailorPoint] = await Promise.all([
    pointFrom(visit.pickupLocation) ?? geocodeAddress(visit.pickupAddress),
    extractTailorShopPoint(tailor) ?? geocodeAddress(tailorShopAddress(tailor))
  ]);
  const distanceMeters = customerPoint && tailorPoint ? await roadDistanceMeters(customerPoint, tailorPoint) : 0;
  return {
    measurementDistanceMeters: Math.round(distanceMeters),
    visitPayout: measurementVisitPayout(distanceMeters)
  };
}

function withMeasurementPayout(visit: any, payout: { visitPayout: number; measurementDistanceMeters: number }) {
  const data = typeof visit?.toJSON === "function" ? visit.toJSON() : { ...visit };
  return {
    ...data,
    visitPayout: payout.visitPayout,
    measurementDistanceMeters: payout.measurementDistanceMeters
  };
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
    TailorModel.findById(quote.tailorId).select("userId isAvailable measurementPartner tailorRoles verification verificationDraft shopName")
  ]);

  const stitchingTailorCanMeasure = Boolean(
    stitchingTailor?.isAvailable
      && stitchingTailor.measurementPartner?.isEnabled
      && Array.isArray(stitchingTailor.tailorRoles)
      && stitchingTailor.tailorRoles.includes("MEASUREMENT_PARTNER")
  );

  const preferredSlot = selectedMeasurementSlot(request);
  const calculatedPayout = await measurementVisitPayoutForTailor(
    { pickupAddress: request.pickupAddress, pickupLocation: request.pickupLocation },
    stitchingTailor?.toJSON() as Record<string, unknown> | undefined
  );
  const visit = await MeasurementVisitModel.findOneAndUpdate(
    { requestId: request.id },
    {
      $setOnInsert: {
        requestId: request.id,
        customerId: request.customerId,
        stitchingTailorId: quote.tailorId,
        ...(stitchingTailorCanMeasure ? { offeredTailorId: quote.tailorId } : {}),
        status: stitchingTailorCanMeasure ? "OFFERED_TO_STITCHING_TAILOR" : "POOL",
        scheduledAt: resolveScheduledAt(preferredSlot),
        preferredMeasurementSlot: preferredSlot,
        visitPayout: calculatedPayout.visitPayout,
        measurementDistanceMeters: calculatedPayout.measurementDistanceMeters,
        customerName: customer?.name ?? "Customer",
        customerPhone: customer?.phone ?? "",
        pickupAddress: request.pickupAddress,
        pickupLocation: request.pickupLocation,
        garmentSummary: itemSummary(request)
      }
    },
    { upsert: true, returnDocument: "after" }
  );

  if (stitchingTailor?.userId && stitchingTailorCanMeasure) {
    const distanceLabel = measurementDistanceLabel(visit.measurementDistanceMeters);
    await sendPushToUsers([stitchingTailor.userId], {
      title: "Measurement visit requested",
      body: `${customer?.name ?? "Customer"} needs an at-home measurement visit (${preferredSlot || "slot specified"}).${distanceLabel ? ` ${distanceLabel} away.` : ""} Payout Rs ${Number(visit.visitPayout ?? DEFAULT_VISIT_PAYOUT).toFixed(0)}.`,
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
        measurementDistanceMeters: String(Number(visit.measurementDistanceMeters ?? 0)),
        screen: "measurementVisits"
      },
      channelId: "darji-incoming-orders-v4",
      categoryId: "TAILOR_MEASUREMENT_VISIT",
      sound: "requests.mp3",
      targetApps: ["tailor"]
    });
    emitToTailor(quote.tailorId, "measurement:visit_offered", { visit: visit.toJSON() });
  } else {
    await moveMeasurementVisitToPool(visit.id, undefined, "stitching_tailor_measurement_disabled");
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
  }).select("userId verification verificationDraft shopName");
  await Promise.all(partnerTailors.map(async (tailor) => {
    if (!tailor.userId) return;
    const payout = await measurementVisitPayoutForTailor(visit, tailor.toJSON() as Record<string, unknown>);
    const distanceLabel = measurementDistanceLabel(payout.measurementDistanceMeters);
    await sendPushToUsers([tailor.userId], {
      title: "Measurement visit available",
      body: `${visit.customerName ?? "Customer"} needs measurements at home.${distanceLabel ? ` ${distanceLabel} away.` : ""} Payout Rs ${payout.visitPayout.toFixed(0)}.`,
      data: {
        type: "MEASUREMENT_VISIT_POOL",
        visitId: visit.id,
        requestId: visit.requestId,
        preferredMeasurementSlot: visit.preferredMeasurementSlot ?? "",
        slot: visit.preferredMeasurementSlot ?? "",
        pickupAddress: visit.pickupAddress ?? "",
        customerName: visit.customerName ?? "Customer",
        garmentSummary: visit.garmentSummary ?? "Home measurement",
        visitPayout: String(payout.visitPayout.toFixed(0)),
        measurementDistanceMeters: String(payout.measurementDistanceMeters),
        screen: "measurementVisits"
      },
      channelId: "darji-incoming-orders-v4",
      categoryId: "TAILOR_MEASUREMENT_VISIT",
      sound: "requests.mp3",
      targetApps: ["tailor"]
    });
    emitToTailor(tailor.id, "measurement:visit_pool", { visit: withMeasurementPayout(visit, payout) });
  }));
  emitToAdmins("measurement:visit_pool", { visit: visit.toJSON() });
  return visit;
}

export async function assignMeasurementVisit(visitId: string, tailorId: string, actorId?: string) {
  const tailor = await TailorModel.findOne({
    $or: [{ _id: tailorId }, { userId: tailorId }, { darjiTailorId: tailorId }]
  }).select("userId verificationStatus darjiTailorId verification verificationDraft shopName");
  if (!tailor) throw new Error("Tailor profile not found");
  const canonicalTailorId = tailor.id;
  const existingVisit = await MeasurementVisitModel.findById(visitId);
  const calculatedPayout = existingVisit
    ? await measurementVisitPayoutForTailor(existingVisit, tailor.toJSON() as Record<string, unknown>)
    : { visitPayout: DEFAULT_VISIT_PAYOUT, measurementDistanceMeters: 0 };
  const visit = await MeasurementVisitModel.findOneAndUpdate(
    { _id: visitId, status: { $in: ["OFFERED_TO_STITCHING_TAILOR", "POOL", "ACCEPTED", "IN_PROGRESS"] } },
    {
      $set: {
        assignedTailorId: canonicalTailorId,
        offeredTailorId: canonicalTailorId,
        status: "ACCEPTED",
        acceptedAt: new Date(),
        visitPayout: calculatedPayout.visitPayout,
        measurementDistanceMeters: calculatedPayout.measurementDistanceMeters
      }
    },
    { returnDocument: "after" }
  );
  if (!visit) return null;
  await resolveOperationalAlert(`MEASUREMENT_VISIT_UNASSIGNED:${visit.id}`, actorId);
  // A tailor who just accepted the visit already has the success response and
  // socket update. Sending the assignment push back to that same user creates
  // a second incoming-style alert. Keep the push only for admin/system assignment.
  if (tailor.userId && actorId !== tailor.userId) {
    const distanceLabel = measurementDistanceLabel(visit.measurementDistanceMeters);
    await sendPushToUsers([tailor.userId], {
      title: "Measurement visit assigned",
      body: `${visit.customerName ?? "Customer"} visit is assigned to you for ${visit.preferredMeasurementSlot || "the selected time slot"}.${distanceLabel ? ` Distance: ${distanceLabel}.` : ""}`,
      data: {
        // Keep assignment confirmations on the normal notification path in
        // older APKs whose native fallback treats MEASUREMENT_VISIT as urgent.
        type: "MEASUREMENT_ASSIGNED",
        visitId: visit.id,
        requestId: visit.requestId,
        preferredMeasurementSlot: visit.preferredMeasurementSlot ?? "",
        slot: visit.preferredMeasurementSlot ?? "",
        pickupAddress: visit.pickupAddress ?? "",
        customerName: visit.customerName ?? "Customer",
        garmentSummary: visit.garmentSummary ?? "Home measurement",
        visitPayout: String(Number(visit.visitPayout ?? DEFAULT_VISIT_PAYOUT).toFixed(0)),
        measurementDistanceMeters: String(Number(visit.measurementDistanceMeters ?? 0)),
        screen: "measurementVisits"
      },
      channelId: "tailor-pickup-updates-v2",
      categoryId: "DARJI_ORDER",
      sound: "ding.mp3",
      targetApps: ["tailor"]
    });
  }
  emitToTailor(canonicalTailorId, "measurement:visit_assigned", { visit: visit.toJSON() });
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
