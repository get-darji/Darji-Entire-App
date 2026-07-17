import { randomUUID } from "node:crypto";
import { DeliveryBatchModel, DeliveryPartnerModel, DeliveryRequestModel, DeliveryType, OrderModel, SettingModel, TailoringRequestModel, TailorModel, UserModel } from "../models.js";
import { emitToCustomer, emitToDeliveryPartner } from "./socket.service.js";
import { sendPushToUsers } from "./push.service.js";
import { sendDeliveryBatchReadyNotification } from "./notificationService.js";

export type DeliveryServiceLevel = "STANDARD" | "EXPRESS" | "INSTANT";
type BatchTime = { name: string; time: string };
type BatchSettings = { pickupTimes: BatchTime[]; dropTimes: BatchTime[]; lockMinutes: number; maxOrdersPerBatch: number };

const FIXED_BATCH_TIMES: BatchTime[] = [{ name: "ONE_PM", time: "13:00" }, { name: "SIX_PM", time: "18:00" }];
const DEFAULT_SETTINGS: BatchSettings = {
  pickupTimes: FIXED_BATCH_TIMES,
  dropTimes: FIXED_BATCH_TIMES,
  lockMinutes: 45,
  maxOrdersPerBatch: 10
};

export function deliveryServiceLevel(urgency?: string): DeliveryServiceLevel {
  const value = String(urgency ?? "").toLowerCase();
  if (value.includes("instant")) return "INSTANT";
  if (value.includes("express") || value.includes("urgent")) return "EXPRESS";
  return "STANDARD";
}

function istParts(date: Date) {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false
  })
    .formatToParts(date)
    .reduce<Record<string, number>>((result, part) => ({ ...result, [part.type]: Number(part.value) }), {});
  if (values.hour === 24) values.hour = 0;
  return values;
}

function istDate(year: number, month: number, day: number, hour: number, minute: number) {
  return new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`);
}

function nextIstDay(parts: Record<string, number>) {
  const anchor = istDate(parts.year, parts.month, parts.day, 12, 0);
  return istParts(new Date(anchor.getTime() + 24 * 60 * 60 * 1000));
}

function validTimes(value: unknown, fallback: BatchTime[]) {
  if (!Array.isArray(value)) return fallback;
  const times = value
    .filter((item): item is BatchTime => Boolean(item) && typeof item === "object" && typeof (item as BatchTime).name === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test((item as BatchTime).time))
    .sort((a, b) => a.time.localeCompare(b.time));
  return times.length ? times : fallback;
}

export async function getBatchSettings(): Promise<BatchSettings> {
  const record = await SettingModel.findOne({ key: "delivery_batch_settings" });
  const value = record?.value as Partial<BatchSettings> | undefined;
  return {
    pickupTimes: DEFAULT_SETTINGS.pickupTimes,
    dropTimes: DEFAULT_SETTINGS.dropTimes,
    lockMinutes: Math.max(45, Number(value?.lockMinutes) || DEFAULT_SETTINGS.lockMinutes),
    maxOrdersPerBatch: Math.max(1, Number(value?.maxOrdersPerBatch) || DEFAULT_SETTINGS.maxOrdersPerBatch)
  };
}

async function createBatchForSlot(
  deliveryType: DeliveryType,
  serviceLevel: Exclude<DeliveryServiceLevel, "INSTANT">,
  deliveryRound: string,
  roundAt: Date,
  lockAt: Date,
  area: string,
  taskId: string,
  estimatedEarnings: number,
  totalDistance: number
) {
  return DeliveryBatchModel.create({
    batchId: randomUUID(),
    deliveryType,
    serviceLevel,
    deliveryRound,
    roundAt,
    lockAt,
    shift: batchShift(deliveryRound),
    area,
    tasks: [taskId],
    ordersCount: 1,
    estimatedEarnings,
    totalDistance,
    status: "scheduled"
  });
}

export async function nextOpenBatchSlot(deliveryType: DeliveryType, from = new Date()) {
  const settings = await getBatchSettings();
  const times = deliveryType === DeliveryType.PICKUP ? settings.pickupTimes : settings.dropTimes;
  let day = istParts(from);

  for (let offset = 0; offset < 8; offset += 1) {
    for (const entry of times) {
      const [hour, minute] = entry.time.split(":").map(Number);
      const roundAt = istDate(day.year, day.month, day.day, hour, minute);
      const lockAt = new Date(roundAt.getTime() - settings.lockMinutes * 60 * 1000);
      if (roundAt > from) return { deliveryRound: entry.name, roundAt, lockAt };
    }
    day = nextIstDay(day);
  }

  throw new Error("Could not find an open delivery batch slot");
}

function batchShift(round: string) {
  return round === "ONE_PM" ? "morning" : "evening";
}

function point(value: unknown): { lat: number; lng: number } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const lat = Number(source.lat ?? source.latitude);
  const lng = Number(source.lng ?? source.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
}

function distance(a?: { lat: number; lng: number }, b?: { lat: number; lng: number }) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.hypot(a.lat - b.lat, a.lng - b.lng);
}

function routeOrder(tasks: any[]) {
  const remaining = [...tasks].sort((a, b) => String(a.pickupAddress).localeCompare(String(b.pickupAddress)));
  const ordered: any[] = [];
  let cursor: { lat: number; lng: number } | undefined;

  while (remaining.length) {
    let index = 0;
    if (cursor) {
      let best = Number.POSITIVE_INFINITY;
      remaining.forEach((task, candidate) => {
        const candidateDistance = distance(cursor, point(task.pickupLocation));
        if (candidateDistance < best) {
          best = candidateDistance;
          index = candidate;
        }
      });
    }
    const [next] = remaining.splice(index, 1);
    ordered.push(next);
    cursor = point(next.dropLocation) ?? point(next.pickupLocation) ?? cursor;
  }

  return ordered;
}

async function refreshRoutePositions(batchId?: string) {
  if (!batchId) return;
  const tasks = await DeliveryRequestModel.find({ batchId, taskStatus: { $ne: "cancelled" } }).sort({ roundAt: 1, acceptedAt: 1, createdAt: 1 });
  const ordered = routeOrder(tasks);
  await Promise.all(
    ordered.map((task, index) =>
      DeliveryRequestModel.findByIdAndUpdate(task.id, {
        routePosition: index + 1,
        routeTotal: ordered.length,
        etaWindowStart: new Date(tasks[0]?.roundAt ? new Date(tasks[0].roundAt).getTime() + index * 20 * 60 * 1000 : Date.now() + index * 20 * 60 * 1000),
        etaWindowEnd: new Date(tasks[0]?.roundAt ? new Date(tasks[0].roundAt).getTime() + (index + 1) * 20 * 60 * 1000 : Date.now() + (index + 1) * 20 * 60 * 1000)
      })
    )
  );
}

async function recalculateBatchTotals(batchId?: string) {
  if (!batchId) return null;
  const tasks = await DeliveryRequestModel.find({ batchId, taskStatus: { $ne: "cancelled" } });
  const estimatedEarnings = tasks.reduce((sum, task) => sum + Number(task.estimatedEarnings ?? 0), 0);
  const totalDistance = tasks.reduce((sum, task) => sum + Number(task.estimatedDistanceKm ?? 0), 0);
  const allCompleted = tasks.length > 0 && tasks.every((task) => ["delivered", "completed"].includes(String(task.taskStatus)));
  return DeliveryBatchModel.findOneAndUpdate(
    { batchId },
    {
      $set: {
        tasks: tasks.map((task) => task.id),
        ordersCount: tasks.length,
        estimatedEarnings,
        totalDistance,
        ...(allCompleted ? { status: "completed" } : {})
      }
    },
    { returnDocument: "after" }
  );
}

async function notifyBatchAssignment(partner: any, task: any) {
  const payload = task.toJSON();
  emitToDeliveryPartner(partner.id, "delivery:task_assigned", payload);
  emitToCustomer(task.customerId, "customer:delivery_status_updated", {
    requestId: task.id,
    tailoringRequestId: task.orderId,
    status: task.type === "customer_to_tailor" ? "PICKUP_STARTED" : "OUT_FOR_DELIVERY",
    deliveryRequest: payload
  });
  await sendPushToUsers([partner.userId], {
    title: "Batch ready",
    body: `A locked ${task.deliveryType === "DROP" ? "drop" : "pickup"} batch is ready for your route.`,
    data: { type: "DELIVERY_BATCH_ASSIGNED", taskId: task.id, orderId: task.orderId, screen: "activeOrder" },
    channelId: "delivery-orders-v2",
    categoryId: "DARJI_ORDER",
    sound: "ding.mp3",
    actions: ["View Order"]
  });
}

async function notifyScheduledBatch(batch: any, now = new Date()) {
  const nextStatus = String(batch.status) === "active" ? "active" : "locked";
  const claimed = await DeliveryBatchModel.findOneAndUpdate(
    { _id: batch.id, status: { $in: ["scheduled", "locked", "active"] } },
    { status: nextStatus, lockedAt: batch.lockedAt ?? now, routeOptimizedAt: now },
    { returnDocument: "after" }
  );
  if (!claimed) return null;

  const tasks = await DeliveryRequestModel.find({ batchId: claimed.batchId, taskStatus: "pending" });
  const ordered = routeOrder(tasks);
  await Promise.all(
    ordered.map((task, index) =>
      DeliveryRequestModel.findByIdAndUpdate(task.id, {
        routePosition: index + 1,
        routeTotal: ordered.length,
        etaWindowStart: new Date(claimed.roundAt.getTime() + index * 20 * 60 * 1000),
        etaWindowEnd: new Date(claimed.roundAt.getTime() + (index + 1) * 20 * 60 * 1000)
      })
      )
  );
  const eligiblePartners = await DeliveryPartnerModel.find({
    deliveryType: claimed.deliveryType,
    isAvailable: true,
    verificationStatus: "VERIFIED",
    ...(claimed.area !== "unassigned" ? { assignedArea: claimed.area } : {})
  }).select("userId assignedArea").sort({ updatedAt: 1 });

  const representativeTask = ordered[0];
  if (!representativeTask) {
    return { batch: await DeliveryBatchModel.findById(claimed.id), notifiedPartners: 0, notifiedTasks: 0 };
  }

  const representativePayload = {
    ...(typeof representativeTask.toJSON === "function" ? representativeTask.toJSON() : representativeTask),
    batchId: claimed.batchId,
    deliveryRound: claimed.deliveryRound,
    roundAt: claimed.roundAt,
    shift: claimed.shift,
    assignedArea: claimed.area
  };

  await Promise.all(
    eligiblePartners.map(async (partner) => {
      emitToDeliveryPartner(partner.id, "delivery:task_created", representativePayload);
      await sendDeliveryBatchReadyNotification({
        userId: partner.userId,
        title: `${claimed.deliveryRound === "ONE_PM" ? "1 PM" : "6 PM"} ${String(claimed.deliveryType).toLowerCase()} batch ready`,
        body: `${tasks.length} requests | Rs ${Number(claimed.estimatedEarnings ?? 0).toFixed(0)} earnings | Tap to accept or view details.`,
        data: {
          type: "DELIVERY_BATCH_READY",
          taskId: representativeTask.id,
          orderId: representativeTask.orderId,
          requestId: representativeTask.id,
          batchId: claimed.batchId,
          screen: "pickupDetails"
        }
      });
    })
  );

  await DeliveryRequestModel.updateMany(
    { batchId: claimed.batchId, taskStatus: "pending" },
    { $set: { notificationSentAt: now } }
  );

  return { batch: await DeliveryBatchModel.findById(claimed.id), notifiedPartners: eligiblePartners.length, notifiedTasks: tasks.length };
}

async function notifyInstantAssignment(partner: any, task: any) {
  const payload = task.toJSON();
  emitToDeliveryPartner(partner.id, "delivery:task_assigned", payload);
  emitToCustomer(task.customerId, "customer:delivery_status_updated", {
    requestId: task.id,
    tailoringRequestId: task.orderId,
    status: task.type === "customer_to_tailor" ? "PICKUP_STARTED" : "OUT_FOR_DELIVERY",
    deliveryRequest: payload
  });
  await sendPushToUsers([partner.userId], {
    title: task.type === "customer_to_tailor" ? "Pickup assigned" : "Delivery assigned",
    body: task.type === "customer_to_tailor" ? "You have a new pickup request." : "You have a new delivery request.",
    data: { type: "DELIVERY_TASK_ASSIGNED", taskId: task.id, orderId: task.orderId, screen: "activeOrder" },
    channelId: "delivery-orders-v2",
    categoryId: "DARJI_ORDER",
    sound: "ding.mp3",
    actions: ["View Order"]
  });
  await sendPushToUsers([task.customerId], {
    title: task.type === "customer_to_tailor" ? "Pickup started" : "Out for delivery",
    body: task.type === "customer_to_tailor" ? "A delivery partner is heading to pick up your clothes." : "Your stitched clothes are on the way.",
    data: {
      type: "DELIVERY_REQUEST_ACCEPTED",
      requestId: task.id,
      tailoringRequestId: task.orderId,
      screen: "trackOrder"
    },
    channelId: "customer-orders-v2",
    categoryId: "DARJI_ORDER",
    sound: "ding.mp3",
    actions: ["View Order"]
  });
}

async function claimInstantTask(task: any, partner: any, now = new Date()) {
  const accepted = await DeliveryRequestModel.findOneAndUpdate(
    { _id: task.id, taskStatus: "pending", serviceLevel: "INSTANT" },
    {
      $set: {
        assignedDeliveryPartnerId: partner.id,
        assignedDeliveryBoyId: partner.id,
        taskStatus: "accepted",
        acceptedAt: now,
        deadlineAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        notificationSentAt: now
      },
      $unset: {
        batchId: 1,
        routePosition: 1,
        routeTotal: 1,
        etaWindowStart: 1,
        etaWindowEnd: 1
      }
    },
    { returnDocument: "after" }
  );
  if (!accepted) return null;

  await TailoringRequestModel.findByIdAndUpdate(task.orderId, {
    deliveryType: task.deliveryType,
    assignedDeliveryBoyId: partner.id,
    ...(task.type === "customer_to_tailor" ? { orderStatus: "pickup_started" } : { orderStatus: "out_for_delivery" })
  });

  await notifyInstantAssignment(partner, accepted);
  return accepted;
}

async function claimLockedBatchTask(task: any, partner: any, now = new Date()) {
  if (!task.batchId) return null;
  const batch = await DeliveryBatchModel.findOne({ batchId: task.batchId });
  if (!batch || !["locked", "active"].includes(String(batch.status))) return null;

  const batchTasks = await DeliveryRequestModel.find({
    batchId: batch.batchId,
    taskStatus: "pending",
    retryStatus: { $ne: "ACTION_REQUIRED" }
  }).sort({ routePosition: 1, createdAt: 1 });
  if (!batchTasks.length) return null;

  await DeliveryRequestModel.updateMany(
    { _id: { $in: batchTasks.map((item) => item.id) }, taskStatus: "pending" },
    {
      $set: {
        assignedDeliveryPartnerId: partner.id,
        assignedDeliveryBoyId: partner.id,
        taskStatus: "accepted",
        acceptedAt: now,
        deadlineAt: new Date((batch.roundAt?.getTime?.() ?? now.getTime()) + 2 * 60 * 60 * 1000),
        notificationSentAt: now
      },
      $unset: {
        batchId: 1,
        routePosition: 1,
        routeTotal: 1,
        etaWindowStart: 1,
        etaWindowEnd: 1
      }
    }
  );

  await DeliveryBatchModel.findByIdAndUpdate(batch.id, {
    deliveryPartnerId: partner.id,
    routeOptimizedAt: batch.routeOptimizedAt ?? now
  });

  await refreshRoutePositions(task.batchId);
  const acceptedTasks = await DeliveryRequestModel.find({ _id: { $in: batchTasks.map((item) => item.id) } }).sort({ routePosition: 1, createdAt: 1 });
  await Promise.all(
    acceptedTasks.map((acceptedTask) =>
      TailoringRequestModel.findByIdAndUpdate(acceptedTask.orderId, {
        deliveryType: acceptedTask.deliveryType,
        batchId: acceptedTask.batchId,
        assignedDeliveryBoyId: partner.id,
        ...(acceptedTask.type === "customer_to_tailor" ? { orderStatus: "pickup_started" } : { orderStatus: "out_for_delivery" })
      })
    )
  );

  for (const acceptedTask of acceptedTasks) {
    const payload = acceptedTask.toJSON();
    emitToDeliveryPartner(partner.id, "delivery:task_assigned", payload);
    emitToCustomer(acceptedTask.customerId, "customer:delivery_status_updated", {
      requestId: acceptedTask.id,
      tailoringRequestId: acceptedTask.orderId,
      status: acceptedTask.type === "customer_to_tailor" ? "PICKUP_STARTED" : "OUT_FOR_DELIVERY",
      deliveryRequest: payload
    });
  }
  return acceptedTasks.find((acceptedTask) => String(acceptedTask.id) === String(task.id)) ?? acceptedTasks[0] ?? null;
}

export async function addTaskToSilentBatch(task: any, level: Exclude<DeliveryServiceLevel, "INSTANT">) {
  const slot = await nextOpenBatchSlot(task.deliveryType);
  const area = task.assignedArea || "unassigned";
  const batchQuery = {
    deliveryType: task.deliveryType,
    deliveryRound: slot.deliveryRound,
    roundAt: slot.roundAt,
    status: { $nin: ["completed", "cancelled"] }
  } as Record<string, any>;
  let batch: any = await DeliveryBatchModel.findOne(batchQuery).sort({ createdAt: 1 });

  if (!batch) {
    try {
      batch = await createBatchForSlot(
        task.deliveryType,
        level,
        slot.deliveryRound,
        slot.roundAt,
        slot.lockAt,
        area,
        task.id,
        Number(task.estimatedEarnings ?? 0),
        Number(task.estimatedDistanceKm ?? 0)
      );
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? (error as { code?: number }).code : undefined;
      if (code !== 11000) throw error;
      batch = await DeliveryBatchModel.findOne(batchQuery).sort({ createdAt: 1 });
      if (!batch) throw error;
    }
  }

  if (batch) {
    await DeliveryBatchModel.findByIdAndUpdate(batch.id, {
      $addToSet: { tasks: task.id }
    });
    batch = await recalculateBatchTotals(batch.batchId);
  }
  if (!batch) throw new Error("Could not create delivery batch");

  await DeliveryRequestModel.findByIdAndUpdate(task.id, {
    serviceLevel: level,
    deliveryRound: slot.deliveryRound,
    roundAt: slot.roundAt,
    batchId: batch.batchId,
    taskStatus: "pending",
    $unset: {
      assignedDeliveryPartnerId: 1,
      assignedDeliveryBoyId: 1,
      acceptedAt: 1,
      notificationSentAt: 1,
      deadlineAt: 1,
      routePosition: 1,
      routeTotal: 1,
      etaWindowStart: 1,
      etaWindowEnd: 1
    }
  });
  batch = await recalculateBatchTotals(batch.batchId) ?? batch;
  await Promise.all([
    OrderModel.findByIdAndUpdate(task.orderId, {
      deliveryType: task.deliveryType,
      deliveryRound: slot.deliveryRound,
      batchId: batch.batchId
    }),
    TailoringRequestModel.findByIdAndUpdate(task.orderId, {
      deliveryType: task.deliveryType,
      deliveryRound: slot.deliveryRound,
      batchId: batch.batchId
    })
  ]);
  return batch;
}

export async function assignPendingTasksToPartner(partner: any) {
  if (!partner?.isAvailable || partner.verificationStatus !== "VERIFIED") return;

  const areaFilteringSetting = await SettingModel.findOne({ key: "enable_area_filtering" });
  const enableAreaFiltering = areaFilteringSetting?.value === true;
  if (enableAreaFiltering && partner.assignedArea === "unassigned") return;

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
    if (String(task.serviceLevel) === "INSTANT") {
      const claimed = await claimInstantTask(task, partner);
      if (claimed) continue;
      continue;
    }

    if (!task.batchId) continue;
    const batch = await DeliveryBatchModel.findOne({ batchId: task.batchId });
    if (!batch || !["locked", "active"].includes(String(batch.status))) continue;
    if (enableAreaFiltering && batch.area !== partner.assignedArea && batch.area !== "unassigned" && batch.area !== "All Areas") continue;
    if (batch.deliveryPartnerId && String(batch.deliveryPartnerId) !== String(partner._id)) continue;

    const claimed = await claimLockedBatchTask(task, partner);
    if (!claimed) continue;
  }
}

export async function lockAndDispatchDueBatches(now = new Date()) {
  await ensureDeliveryBatchesFromRequests();

  const completedCandidates = await DeliveryBatchModel.find({ status: { $nin: ["completed", "cancelled"] } });
  for (const batch of completedCandidates) {
    const tasks = await DeliveryRequestModel.find({ batchId: batch.batchId, taskStatus: { $ne: "cancelled" } }).select("taskStatus");
    if (tasks.length && tasks.every((task) => task.taskStatus === "delivered")) {
      await DeliveryBatchModel.updateOne({ _id: batch.id }, { status: "completed" });
    }
  }

  const batchesToNotify = await DeliveryBatchModel.find({ status: "scheduled", lockAt: { $lte: now }, roundAt: { $gt: now } });
  for (const batch of batchesToNotify) {
    await notifyScheduledBatch(batch, now);
  }

  await DeliveryBatchModel.updateMany(
    { status: { $in: ["scheduled", "locked"] }, roundAt: { $lte: now } },
    { status: "active", lockedAt: now }
  );
}

export async function notifyScheduledBatchNow(batchId: string, now = new Date()) {
  const batch = await DeliveryBatchModel.findOne({ batchId, status: { $in: ["scheduled", "locked", "active"] } });
  if (!batch) throw new Error("Upcoming batch not found");
  const result = await notifyScheduledBatch(batch, now);
  if (!result) throw new Error("Could not notify batch");
  return result;
}

export async function assignBatchToPartnerFromTask(taskId: string, partner: any, now = new Date()) {
  const task = await DeliveryRequestModel.findById(taskId);
  if (!task) return null;
  if (String(task.serviceLevel) === "INSTANT") return claimInstantTask(task, partner, now);
  return claimLockedBatchTask(task, partner, now);
}

export async function activateDueBatches(now = new Date()) {
  await DeliveryBatchModel.updateMany(
    { status: { $in: ["scheduled", "locked"] }, roundAt: { $lte: now } },
    { status: "active", lockedAt: now }
  );
}

export async function completeFinishedBatches() {
  const candidates = await DeliveryBatchModel.find({ status: { $nin: ["completed", "cancelled"] } });
  for (const batch of candidates) {
    const tasks = await DeliveryRequestModel.find({ batchId: batch.batchId, taskStatus: { $ne: "cancelled" } }).select("taskStatus");
    if (tasks.length && tasks.every((task) => task.taskStatus === "delivered")) {
      await DeliveryBatchModel.updateOne({ _id: batch.id }, { status: "completed" });
    }
  }
}

export async function ensureDeliveryBatchesFromRequests() {
  const settings = await getBatchSettings();
  const requests = await DeliveryRequestModel.find({
    deliveryType: { $in: [DeliveryType.PICKUP, DeliveryType.DROP] },
    serviceLevel: { $in: ["STANDARD", "EXPRESS"] },
    taskStatus: { $ne: "cancelled" }
  }).sort({ roundAt: 1, createdAt: 1 });

  const grouped = new Map<string, any[]>();
  for (const request of requests) {
    if (!request.roundAt || !request.deliveryRound) continue;
    const key = [
      String(request.deliveryType ?? ""),
      String(request.deliveryRound ?? ""),
      new Date(request.roundAt).toISOString()
    ].join("|");
    const list = grouped.get(key) ?? [];
    list.push(request);
    grouped.set(key, list);
  }

  for (const group of grouped.values()) {
    if (!group.length) continue;
    const first = group[0];
    const area = String(first.assignedArea ?? "unassigned");
    const roundAt = new Date(first.roundAt);
    const lockAt = new Date(roundAt.getTime() - settings.lockMinutes * 60 * 1000);
    const status = group.every((request) => ["delivered", "completed"].includes(String(request.taskStatus))) ? "completed" : (roundAt <= new Date() ? "active" : "scheduled");
    const estimatedEarnings = group.reduce((sum, request) => sum + Number(request.estimatedEarnings ?? 0), 0);
    const totalDistance = group.reduce((sum, request) => sum + Number(request.estimatedDistanceKm ?? 0), 0);
    const existingBatch = await DeliveryBatchModel.findOne({
      deliveryType: first.deliveryType,
      deliveryRound: first.deliveryRound,
      roundAt,
      status: { $ne: "cancelled" }
    }).sort({ createdAt: 1 });

    if (existingBatch) {
      const existingTaskIds = new Set((existingBatch.tasks ?? []).map((taskId: string) => String(taskId)));
      const missingRequests = group.filter((request) => !existingTaskIds.has(String(request.id)));
      if (missingRequests.length) {
        await DeliveryBatchModel.updateOne(
          { _id: existingBatch._id },
          {
            $addToSet: { tasks: { $each: missingRequests.map((request) => request.id) } }
          }
        );
      }
      await recalculateBatchTotals(existingBatch.batchId);
      await DeliveryRequestModel.updateMany(
        { _id: { $in: group.map((request) => request.id) } },
        {
          $set: {
            batchId: existingBatch.batchId,
            deliveryRound: first.deliveryRound,
            roundAt,
            assignedArea: area,
            serviceLevel: first.serviceLevel ?? "STANDARD"
          }
        }
      );
      await Promise.all([
        OrderModel.updateMany(
          { _id: { $in: group.map((request) => request.orderId).filter(Boolean) } },
          { $set: { deliveryType: first.deliveryType, deliveryRound: first.deliveryRound, batchId: existingBatch.batchId } }
        ),
        TailoringRequestModel.updateMany(
          { _id: { $in: group.map((request) => request.orderId).filter(Boolean) } },
          { $set: { deliveryType: first.deliveryType, deliveryRound: first.deliveryRound, batchId: existingBatch.batchId } }
        )
      ]);
      continue;
    }

    const batch = await DeliveryBatchModel.create({
      batchId: randomUUID(),
      deliveryType: first.deliveryType,
      serviceLevel: first.serviceLevel ?? "STANDARD",
      deliveryRound: first.deliveryRound,
      roundAt,
      lockAt,
      shift: first.shift ?? batchShift(first.deliveryRound),
      area,
      slotIndex: 1,
      tasks: group.map((request) => request.id),
      ordersCount: group.length,
      estimatedEarnings,
      totalDistance,
      status
    });

    await DeliveryRequestModel.updateMany(
      { _id: { $in: group.map((request) => request.id) } },
      {
        $set: {
          batchId: batch.batchId,
          deliveryRound: first.deliveryRound,
          roundAt,
          assignedArea: area,
          serviceLevel: first.serviceLevel ?? "STANDARD"
        }
      }
    );
    await Promise.all([
      OrderModel.updateMany(
        { _id: { $in: group.map((request) => request.orderId).filter(Boolean) } },
        { $set: { deliveryType: first.deliveryType, deliveryRound: first.deliveryRound, batchId: batch.batchId } }
      ),
      TailoringRequestModel.updateMany(
        { _id: { $in: group.map((request) => request.orderId).filter(Boolean) } },
        { $set: { deliveryType: first.deliveryType, deliveryRound: first.deliveryRound, batchId: batch.batchId } }
      )
    ]);
  }
}

