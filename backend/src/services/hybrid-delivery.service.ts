import { randomUUID } from "node:crypto";
import { DeliveryBatchModel, DeliveryPartnerModel, DeliveryRequestModel, DeliveryType, OrderModel, SettingModel, TailoringRequestModel, TailorModel, UserModel } from "../models.js";
import { emitToCustomer, emitToDeliveryPartner } from "./socket.service.js";
import { sendPushToUsers } from "./push.service.js";
import { sendDeliveryBatchReadyNotification } from "./notificationService.js";
import { batchDeliveryPayout, pointFrom, roadDistanceMatrix } from "./delivery-pricing.service.js";

export type DeliveryServiceLevel = "STANDARD" | "EXPRESS" | "INSTANT";
type BatchTime = { name: string; time: string };
type BatchSettings = { pickupTimes: BatchTime[]; dropTimes: BatchTime[]; lockMinutes: number; maxOrdersPerBatch: number };
type BatchClaimResult = { request: any; acceptedTasks?: any[] };
let deliveryBatchIndexesReady: Promise<void> | undefined;

const FIXED_BATCH_TIMES: BatchTime[] = [{ name: "ONE_PM", time: "13:00" }, { name: "SIX_PM", time: "18:00" }];
const DEFAULT_SETTINGS: BatchSettings = {
  pickupTimes: FIXED_BATCH_TIMES,
  dropTimes: FIXED_BATCH_TIMES,
  lockMinutes: 60,
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
  slotIndex: number,
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
    slotIndex,
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

async function ensureDeliveryBatchIndexes() {
  if (!deliveryBatchIndexesReady) {
    deliveryBatchIndexesReady = (async () => {
      try {
        await DeliveryBatchModel.collection.dropIndex("deliveryType_1_deliveryRound_1_roundAt_1");
      } catch (error) {
        const codeName = typeof error === "object" && error && "codeName" in error ? (error as { codeName?: string }).codeName : undefined;
        if (codeName !== "IndexNotFound") throw error;
      }
      await DeliveryBatchModel.collection.createIndex(
        { deliveryRound: 1, roundAt: 1, slotIndex: 1 },
        { unique: true, name: "deliveryRound_1_roundAt_1_slotIndex_1" }
      );
    })();
  }
  return deliveryBatchIndexesReady;
}

function matrixDistance(matrix: Array<Array<{ distance: number; duration: number }>>, from: number, to: number) {
  return Number(matrix[from]?.[to]?.distance ?? Number.POSITIVE_INFINITY);
}

async function routeOrder(tasks: any[], startLocation?: unknown) {
  const points = [
    pointFrom(startLocation),
    ...tasks.flatMap((task) => [pointFrom(task.pickupLocation), pointFrom(task.dropLocation)])
  ];
  const usablePoints = points.every(Boolean);
  const matrix = usablePoints ? await roadDistanceMatrix(points as Array<{ lat: number; lng: number }>) : [];
  const remaining = [...tasks].sort((a, b) => String(a.pickupAddress).localeCompare(String(b.pickupAddress)));
  const ordered: any[] = [];
  let cursorIndex = usablePoints && pointFrom(startLocation) ? 0 : undefined;
  let cursorPoint: { lat: number; lng: number } | undefined = pointFrom(startLocation);

  while (remaining.length) {
    let index = 0;
    if (usablePoints && cursorIndex != null) {
      let best = Number.POSITIVE_INFINITY;
      remaining.forEach((task, candidate) => {
        const originalIndex = tasks.findIndex((item) => String(item.id) === String(task.id));
        const pickupIndex = 1 + originalIndex * 2;
        const candidateDistance = matrixDistance(matrix, cursorIndex!, pickupIndex);
        if (candidateDistance < best) {
          best = candidateDistance;
          index = candidate;
        }
      });
    } else if (cursorPoint) {
      let best = Number.POSITIVE_INFINITY;
      remaining.forEach((task, candidate) => {
        const taskPoint = pointFrom(task.pickupLocation);
        const candidateDistance = !taskPoint ? Number.POSITIVE_INFINITY : Math.hypot(cursorPoint!.lat - taskPoint.lat, cursorPoint!.lng - taskPoint.lng);
        if (candidateDistance < best) {
          best = candidateDistance;
          index = candidate;
        }
      });
    }
    const [next] = remaining.splice(index, 1);
    ordered.push(next);
    if (usablePoints) {
      const originalIndex = tasks.findIndex((item) => String(item.id) === String(next.id));
      cursorIndex = 1 + originalIndex * 2 + 1;
    }
    cursorPoint = pointFrom(next.dropLocation) ?? pointFrom(next.pickupLocation) ?? cursorPoint;
  }

  return { ordered, matrix, usablePoints };
}

async function calculateOptimizedBatch(tasks: any[], startLocation?: unknown) {
  const { ordered, matrix, usablePoints } = await routeOrder(tasks, startLocation);
  let payableDistance = 0;
  let totalDistance = 0;
  let durationSeconds = 0;
  if (usablePoints) {
    for (let index = 0; index < ordered.length; index += 1) {
      const task = ordered[index];
      const originalIndex = tasks.findIndex((item) => String(item.id) === String(task.id));
      const pickupIndex = 1 + originalIndex * 2;
      const dropIndex = pickupIndex + 1;
      if (index > 0) {
        const previous = ordered[index - 1];
        const previousOriginalIndex = tasks.findIndex((item) => String(item.id) === String(previous.id));
        const previousDropIndex = 1 + previousOriginalIndex * 2 + 1;
        payableDistance += matrixDistance(matrix, previousDropIndex, pickupIndex);
        durationSeconds += Number(matrix[previousDropIndex]?.[pickupIndex]?.duration ?? 0);
      }
      payableDistance += matrixDistance(matrix, pickupIndex, dropIndex);
      durationSeconds += Number(matrix[pickupIndex]?.[dropIndex]?.duration ?? 0);
    }
    if (pointFrom(startLocation) && ordered.length) {
      const firstOriginalIndex = tasks.findIndex((item) => String(item.id) === String(ordered[0].id));
      totalDistance += matrixDistance(matrix, 0, 1 + firstOriginalIndex * 2);
    }
    totalDistance += payableDistance;
  } else {
    payableDistance = tasks.reduce((sum, task) => sum + Number(task.distanceMeters ?? 0), 0);
    totalDistance = payableDistance;
  }
  const completedJobs = tasks.filter((task) => ["delivered", "completed"].includes(String(task.taskStatus))).length || tasks.length;
  const estimatedPayout = batchDeliveryPayout(payableDistance, completedJobs);
  return { ordered, payableDistance, totalDistance, durationSeconds, estimatedPayout };
}

async function refreshRoutePositions(batchId?: string) {
  if (!batchId) return;
  const tasks = await DeliveryRequestModel.find({ batchId, taskStatus: { $ne: "cancelled" } }).sort({ roundAt: 1, acceptedAt: 1, createdAt: 1 });
  const batch = await DeliveryBatchModel.findOne({ batchId });
  const optimized = await calculateOptimizedBatch(tasks, batch?.riderStartLocation);
  await Promise.all(
    optimized.ordered.map((task, index) =>
      DeliveryRequestModel.findByIdAndUpdate(task.id, {
        routePosition: index + 1,
        routeTotal: optimized.ordered.length,
        etaWindowStart: new Date(tasks[0]?.roundAt ? new Date(tasks[0].roundAt).getTime() + index * 20 * 60 * 1000 : Date.now() + index * 20 * 60 * 1000),
        etaWindowEnd: new Date(tasks[0]?.roundAt ? new Date(tasks[0].roundAt).getTime() + (index + 1) * 20 * 60 * 1000 : Date.now() + (index + 1) * 20 * 60 * 1000)
      })
    )
  );
  await DeliveryBatchModel.findOneAndUpdate({ batchId }, {
    deliveryJobIds: optimized.ordered.map((task) => task.id),
    optimizedStops: optimized.ordered.map((task, index) => ({
      taskId: task.id,
      orderId: task.orderId,
      stop: index + 1,
      type: task.deliveryType,
      jobType: task.type,
      pickupAddress: task.pickupAddress,
      dropAddress: task.dropAddress
    })),
    optimizationTotalDistanceMeters: Math.round(optimized.totalDistance),
    payableOptimizedDistanceMeters: Math.round(optimized.payableDistance),
    estimatedDurationSeconds: Math.round(optimized.durationSeconds),
    estimatedPayout: optimized.estimatedPayout,
    estimatedEarnings: optimized.estimatedPayout,
    totalDistance: Number((optimized.payableDistance / 1000).toFixed(2))
  });
}

async function recalculateBatchTotals(batchId?: string) {
  if (!batchId) return null;
  const tasks = await DeliveryRequestModel.find({ batchId, taskStatus: { $ne: "cancelled" } });
  const batch = await DeliveryBatchModel.findOne({ batchId });
  const optimized = await calculateOptimizedBatch(tasks, batch?.riderStartLocation);
  const allCompleted = tasks.length > 0 && tasks.every((task) => ["delivered", "completed"].includes(String(task.taskStatus)));
  return DeliveryBatchModel.findOneAndUpdate(
    { batchId },
    {
      $set: {
        tasks: tasks.map((task) => task.id),
        deliveryJobIds: optimized.ordered.map((task) => task.id),
        optimizedStops: optimized.ordered.map((task, index) => ({ taskId: task.id, orderId: task.orderId, stop: index + 1, type: task.deliveryType, jobType: task.type, pickupAddress: task.pickupAddress, dropAddress: task.dropAddress })),
        ordersCount: tasks.length,
        estimatedEarnings: optimized.estimatedPayout,
        estimatedPayout: optimized.estimatedPayout,
        finalPayout: allCompleted ? optimized.estimatedPayout : undefined,
        optimizationTotalDistanceMeters: Math.round(optimized.totalDistance),
        payableOptimizedDistanceMeters: Math.round(optimized.payableDistance),
        estimatedDurationSeconds: Math.round(optimized.durationSeconds),
        totalDistance: Number((optimized.payableDistance / 1000).toFixed(2)),
        ...(allCompleted ? { status: "completed", finalPayout: optimized.estimatedPayout } : {})
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
    body: "A locked delivery batch is ready for your route.",
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

  await DeliveryRequestModel.updateMany(
    { batchId: claimed.batchId, taskStatus: "pending" },
    { $set: { notificationSentAt: now } }
  );

  const pendingTasks = await DeliveryRequestModel.find({ batchId: claimed.batchId, taskStatus: "pending" });
  const optimized = await calculateOptimizedBatch(pendingTasks, claimed.riderStartLocation);
  await Promise.all(
    optimized.ordered.map((task, index) =>
      DeliveryRequestModel.findByIdAndUpdate(task.id, {
        routePosition: index + 1,
        routeTotal: optimized.ordered.length,
        etaWindowStart: new Date(claimed.roundAt.getTime() + index * 20 * 60 * 1000),
        etaWindowEnd: new Date(claimed.roundAt.getTime() + (index + 1) * 20 * 60 * 1000)
      })
      )
  );
  await DeliveryBatchModel.findOneAndUpdate({ batchId: claimed.batchId }, {
    deliveryJobIds: optimized.ordered.map((task) => task.id),
    optimizedStops: optimized.ordered.map((task, index) => ({ taskId: task.id, orderId: task.orderId, stop: index + 1, type: task.deliveryType, jobType: task.type, pickupAddress: task.pickupAddress, dropAddress: task.dropAddress })),
    payableOptimizedDistanceMeters: Math.round(optimized.payableDistance),
    optimizationTotalDistanceMeters: Math.round(optimized.totalDistance),
    estimatedDurationSeconds: Math.round(optimized.durationSeconds),
    estimatedPayout: optimized.estimatedPayout,
    estimatedEarnings: optimized.estimatedPayout,
    totalDistance: Number((optimized.payableDistance / 1000).toFixed(2))
  });
  const eligiblePartners = claimed.deliveryPartnerId
    ? await DeliveryPartnerModel.find({ _id: claimed.deliveryPartnerId }).select("userId assignedArea")
    : await DeliveryPartnerModel.find({
        isAvailable: true,
        verificationStatus: "VERIFIED",
        ...(claimed.area !== "unassigned" ? { assignedArea: claimed.area } : {})
      }).select("userId assignedArea").sort({ updatedAt: 1 });

  const batchTasksForOffer = await DeliveryRequestModel.find({ batchId: claimed.batchId, taskStatus: { $ne: "cancelled" } }).sort({ routePosition: 1, createdAt: 1 });
  const representativeTask = batchTasksForOffer.find((task) => task.taskStatus === "pending") ?? batchTasksForOffer[0];
  if (!representativeTask) {
    return { batch: await DeliveryBatchModel.findById(claimed.id), notifiedPartners: 0, notifiedTasks: 0 };
  }

  const batchOrdersCount = batchTasksForOffer.length;
  const batchEstimatedEarnings = batchTasksForOffer.reduce((sum, task) => sum + Number(task.estimatedEarnings ?? 0), 0);
  const batchPayableDistanceMeters = Math.round(optimized.payableDistance);
  const batchEstimatedDurationSeconds = Math.round(optimized.durationSeconds);
  const effectiveBatchEarnings = Number(optimized.estimatedPayout || batchEstimatedEarnings);
  const batchTasks = batchTasksForOffer.map((task) => ({
    ...(typeof task.toJSON === "function" ? task.toJSON() : task),
    batchId: claimed.batchId,
    deliveryRound: claimed.deliveryRound,
    roundAt: claimed.roundAt,
    shift: claimed.shift,
    assignedArea: claimed.area,
    batchOrdersCount,
    batchEstimatedEarnings: effectiveBatchEarnings,
    batchPayableDistanceMeters,
    batchEstimatedDurationSeconds,
    batchArea: claimed.area
  }));

  const representativePayload = {
    ...(typeof representativeTask.toJSON === "function" ? representativeTask.toJSON() : representativeTask),
    batchId: claimed.batchId,
    deliveryRound: claimed.deliveryRound,
    roundAt: claimed.roundAt,
    shift: claimed.shift,
    assignedArea: claimed.area,
    notificationSentAt: now,
    batchOrdersCount,
    batchEstimatedEarnings: effectiveBatchEarnings,
    batchPayableDistanceMeters,
    batchEstimatedDurationSeconds,
    batchArea: claimed.area,
    batchTasks
  };

  await Promise.all(
    eligiblePartners.map(async (partner) => {
      emitToDeliveryPartner(partner.id, "delivery:task_created", representativePayload);
      await sendDeliveryBatchReadyNotification({
        userId: partner.userId,
        title: `${claimed.deliveryRound === "ONE_PM" ? "1 PM" : "6 PM"} batch ready`,
        body: `${batchOrdersCount} jobs | Rs ${effectiveBatchEarnings.toFixed(0)} earnings | Tap to accept or view details.`,
        data: {
          type: "INCOMING_DELIVERY_BATCH_REQUEST",
          event: "delivery:task_created",
          taskId: representativeTask.id,
          orderId: representativeTask.orderId,
          requestId: representativeTask.id,
          batchId: claimed.batchId,
          deliveryType: claimed.deliveryType,
          serviceLevel: representativeTask.serviceLevel ?? "STANDARD",
          requestKind: "BATCH",
          pickupAddress: claimed.area,
          dropAddress: "Optimized mixed route",
          expectedEarnings: `Rs ${effectiveBatchEarnings.toFixed(0)}`,
          screen: "pickupDetails"
        },
        sound: "requests.mp3"
      });
    })
  );

  return { batch: await DeliveryBatchModel.findById(claimed.id), notifiedPartners: eligiblePartners.length, notifiedTasks: pendingTasks.length };
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

async function claimInstantTask(task: any, partner: any, now = new Date()): Promise<BatchClaimResult | null> {
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
  return { request: accepted, acceptedTasks: [accepted] };
}

async function claimLockedBatchTask(task: any, partner: any, now = new Date()): Promise<BatchClaimResult | null> {
  if (!task.batchId) return null;
  if (!task.notificationSentAt) return null;
  const batch = await DeliveryBatchModel.findOne({ batchId: task.batchId });
  if (!batch || !["locked", "active"].includes(String(batch.status))) return null;

  const batchTasks = await DeliveryRequestModel.find({
    batchId: batch.batchId,
    taskStatus: "pending",
    retryStatus: { $ne: "ACTION_REQUIRED" },
    notificationSentAt: { $exists: true }
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
        routePosition: 1,
        routeTotal: 1,
        etaWindowStart: 1,
        etaWindowEnd: 1
      }
    }
  );

  await DeliveryBatchModel.findByIdAndUpdate(batch.id, {
    deliveryPartnerId: partner.id,
    riderStartLocation: pointFrom(partner.currentLocation) ?? pointFrom(partner.partnerLocation),
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
  return {
    request: acceptedTasks.find((acceptedTask) => String(acceptedTask.id) === String(task.id)) ?? acceptedTasks[0] ?? null,
    acceptedTasks
  };
}

export async function addTaskToSilentBatch(task: any, level: Exclude<DeliveryServiceLevel, "INSTANT">) {
  await ensureDeliveryBatchIndexes();
  const slot = await nextOpenBatchSlot(task.deliveryType);
  const area = task.assignedArea || "unassigned";
  const batchQuery = {
    deliveryRound: slot.deliveryRound,
    roundAt: slot.roundAt,
    deliveryPartnerId: { $exists: false },
    status: { $in: ["scheduled", "locked"] }
  } as Record<string, any>;
  let batch: any = await DeliveryBatchModel.findOne(batchQuery).sort({ createdAt: 1 });

  if (!batch) {
    const existingSlotCount = await DeliveryBatchModel.countDocuments({
      deliveryRound: slot.deliveryRound,
      roundAt: slot.roundAt,
      status: { $ne: "cancelled" }
    });
    const slotIndex = existingSlotCount + 1;
    try {
      batch = await createBatchForSlot(
        task.deliveryType,
        level,
        slot.deliveryRound,
        slot.roundAt,
        slot.lockAt,
        area,
        slotIndex,
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
  const now = new Date();
  const batchLockAt = batch.lockAt ? new Date(batch.lockAt) : undefined;
  const batchRoundAt = batch.roundAt ? new Date(batch.roundAt) : undefined;
  const shouldNotifyImmediately =
    !batch.deliveryPartnerId &&
    batchLockAt &&
    batchRoundAt &&
    batchLockAt <= now &&
    batchRoundAt > now;
  if (shouldNotifyImmediately) {
    await notifyScheduledBatch(batch, now);
  }
  return batch;
}

export async function assignPendingTasksToPartner(partner: any) {
  if (!partner?.isAvailable || partner.verificationStatus !== "VERIFIED") return;

  const areaFilteringSetting = await SettingModel.findOne({ key: "enable_area_filtering" });
  const enableAreaFiltering = areaFilteringSetting?.value === true;
  if (enableAreaFiltering && partner.assignedArea === "unassigned") return;

  const pendingTasksQuery: Record<string, any> = {
    serviceLevel: "INSTANT",
    taskStatus: "pending",
    retryStatus: { $ne: "ACTION_REQUIRED" }
  };
  if (enableAreaFiltering) {
    pendingTasksQuery.$or = [{ assignedArea: partner.assignedArea }, { assignedArea: "unassigned" }];
  }

  const pendingTasks = await DeliveryRequestModel.find(pendingTasksQuery).sort({ retryCount: -1, nextScheduledBatch: 1, createdAt: 1 });
  if (!pendingTasks.length) return;

  for (const task of pendingTasks) {
    emitToDeliveryPartner(partner.id, "delivery:task_created", task.toJSON());
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
  await ensureDeliveryBatchIndexes();
  const settings = await getBatchSettings();
  const requests = await DeliveryRequestModel.find({
    deliveryType: { $in: [DeliveryType.PICKUP, DeliveryType.DROP] },
    serviceLevel: { $in: ["STANDARD", "EXPRESS"] },
    taskStatus: { $ne: "cancelled" }
  }).sort({ roundAt: 1, createdAt: 1 });

  const grouped = new Map<string, any[]>();
  for (const request of requests) {
    if (!request.roundAt || !request.deliveryRound) continue;
    const key = request.batchId ? `batch|${request.batchId}` : [
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
    const existingBatch = first.batchId
      ? await DeliveryBatchModel.findOne({ batchId: first.batchId, status: { $ne: "cancelled" } }).sort({ createdAt: 1 })
      : await DeliveryBatchModel.findOne({
          deliveryType: first.deliveryType,
          deliveryRound: first.deliveryRound,
          roundAt,
          deliveryPartnerId: { $exists: false },
          status: { $in: ["scheduled", "locked"] }
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

    const existingSlotCount = await DeliveryBatchModel.countDocuments({
      deliveryType: first.deliveryType,
      deliveryRound: first.deliveryRound,
      roundAt,
      status: { $ne: "cancelled" }
    });

    const batch = await DeliveryBatchModel.create({
      batchId: randomUUID(),
      deliveryType: first.deliveryType,
      serviceLevel: first.serviceLevel ?? "STANDARD",
      deliveryRound: first.deliveryRound,
      roundAt,
      lockAt,
      shift: first.shift ?? batchShift(first.deliveryRound),
      area,
      slotIndex: existingSlotCount + 1,
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

