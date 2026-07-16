import { randomUUID } from "node:crypto";
import { DeliveryBatchModel, DeliveryPartnerModel, DeliveryRequestModel, DeliveryType, SettingModel, TailoringRequestModel, TailorModel, UserModel } from "../models.js";
import { emitToCustomer, emitToDeliveryPartner } from "./socket.service.js";
import { sendPushToUsers } from "./push.service.js";

export type DeliveryServiceLevel = "STANDARD" | "EXPRESS" | "INSTANT";
type BatchTime = { name: string; time: string };
type BatchSettings = { pickupTimes: BatchTime[]; dropTimes: BatchTime[]; lockMinutes: number };

const DEFAULT_SETTINGS: BatchSettings = {
  pickupTimes: [{ name: "ONE_PM", time: "13:00" }, { name: "SIX_PM", time: "18:00" }],
  dropTimes: [{ name: "ONE_PM", time: "13:00" }, { name: "SIX_PM", time: "18:00" }],
  lockMinutes: 45
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
    pickupTimes: validTimes(value?.pickupTimes, DEFAULT_SETTINGS.pickupTimes),
    dropTimes: validTimes(value?.dropTimes, DEFAULT_SETTINGS.dropTimes),
    lockMinutes: Math.min(60, Math.max(45, Number(value?.lockMinutes) || DEFAULT_SETTINGS.lockMinutes))
  };
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
      if (lockAt > from) return { deliveryRound: entry.name, roundAt, lockAt };
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

  const accepted = await DeliveryRequestModel.findOneAndUpdate(
    { _id: task.id, taskStatus: "pending" },
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
    },
    { returnDocument: "after" }
  );
  if (!accepted) return null;

  await DeliveryBatchModel.findByIdAndUpdate(batch.id, {
    deliveryPartnerId: partner.id,
    status: "active",
    routeOptimizedAt: batch.routeOptimizedAt ?? now
  });

  await refreshRoutePositions(task.batchId);
  const routedTask = (await DeliveryRequestModel.findById(accepted.id)) ?? accepted;
  await TailoringRequestModel.findByIdAndUpdate(task.orderId, {
    deliveryType: task.deliveryType,
    batchId: task.batchId,
    assignedDeliveryBoyId: partner.id,
    ...(task.type === "customer_to_tailor" ? { orderStatus: "pickup_started" } : { orderStatus: "out_for_delivery" })
  });

  await notifyBatchAssignment(partner, routedTask);
  return routedTask;
}

export async function addTaskToSilentBatch(task: any, level: Exclude<DeliveryServiceLevel, "INSTANT">) {
  const slot = await nextOpenBatchSlot(task.deliveryType);
  const area = task.assignedArea || "unassigned";
  const batch = await DeliveryBatchModel.findOneAndUpdate(
    { deliveryType: task.deliveryType, serviceLevel: level, deliveryRound: slot.deliveryRound, roundAt: slot.roundAt, area, status: "scheduled" },
    {
      $setOnInsert: {
        batchId: randomUUID(),
        deliveryType: task.deliveryType,
        serviceLevel: level,
        deliveryRound: slot.deliveryRound,
        roundAt: slot.roundAt,
        lockAt: slot.lockAt,
        shift: batchShift(slot.deliveryRound),
        area,
        tasks: [],
        status: "scheduled"
      },
      $addToSet: { tasks: task.id },
      $inc: { estimatedEarnings: Number(task.estimatedEarnings ?? 0) }
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
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
  const batches = await DeliveryBatchModel.find({ status: "scheduled", lockAt: { $lte: now } });
  for (const batch of batches) {
    const claimed = await DeliveryBatchModel.findOneAndUpdate({ _id: batch.id, status: "scheduled" }, { status: "locked", lockedAt: now }, { returnDocument: "after" });
    if (!claimed) continue;

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

    const partner = await DeliveryPartnerModel.findOne({
      deliveryType: claimed.deliveryType,
      isAvailable: true,
      verificationStatus: "VERIFIED",
      ...(claimed.area !== "unassigned" ? { assignedArea: claimed.area } : {})
    }).sort({ updatedAt: 1 });

    if (!partner) continue;

    await DeliveryBatchModel.findByIdAndUpdate(claimed.id, { deliveryPartnerId: partner.id, status: "active", routeOptimizedAt: now });
    for (const task of ordered) {
      const assigned = await DeliveryRequestModel.findByIdAndUpdate(
        task.id,
        {
          assignedDeliveryPartnerId: partner.id,
          assignedDeliveryBoyId: partner.id,
          taskStatus: "accepted",
          acceptedAt: now,
          deadlineAt: new Date(claimed.roundAt.getTime() + 2 * 60 * 60 * 1000),
          notificationSentAt: now
        },
        { returnDocument: "after" }
      );
      if (assigned) {
        await TailoringRequestModel.findByIdAndUpdate(task.orderId, {
          deliveryType: task.deliveryType,
          batchId: claimed.batchId,
          assignedDeliveryBoyId: partner.id,
          ...(task.type === "customer_to_tailor" ? { orderStatus: "pickup_started" } : { orderStatus: "out_for_delivery" })
        });
        await notifyBatchAssignment(partner, assigned);
      }
    }
  }
}
