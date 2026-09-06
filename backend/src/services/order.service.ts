import { allowedOrderStatusTransitions, createOrderSchema, updateOrderStatusSchema, getPlatformFee, getSmallOrderFee } from "@darzi/shared";
import {
  AddressModel,
  DeliveryBatchModel,
  DeliveryRequestModel,
  DeliveryType,
  DeliveryPartnerModel,
  OrderModel,
  PaymentModel,
  ReviewModel,
  ServiceCategoryModel,
  ServiceModel,
  TailorModel,
  TailoringRequestModel,
  UserModel
} from "../models.js";
import { AppError } from "../middleware/error.js";
import { notifyUser, orderStatusMessage } from "./notification.service.js";
import { creditOrderEarning } from "./wallet.service.js";
import { addTaskToSilentBatch, nextOpenBatchSlot } from "./hybrid-delivery.service.js";
import { randomUUID } from "crypto";
import { reserveCouponUsage, validateCoupon } from "./coupon.service.js";

type JsonDoc = { toJSON: () => Record<string, unknown> };

function generateOrderNumber() {
  return `DRZ-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function json<T extends { toJSON?: () => unknown } | null | undefined>(doc: T) {
  if (!doc) return null;
  return typeof doc.toJSON === "function" ? doc.toJSON() : doc;
}

async function partnerWithUser(model: { findById: (id: string) => Promise<(JsonDoc & { userId: string }) | null> }, id?: string) {
  if (!id) return null;
  const profile = await model.findById(id);
  if (!profile) return null;
  const user = await UserModel.findById(profile.userId).select("name phone role");
  return { ...profile.toJSON(), user: json(user) };
}

async function assignExistingDeliveryTask(orderId: string, partnerId: string | undefined, mode: "pickup" | "delivery" | undefined) {
  if (!partnerId) return;
  const type = mode === "delivery" ? "tailor_to_customer" : "customer_to_tailor";
  const task = await DeliveryRequestModel.findOne({ orderId, type, taskStatus: { $in: ["pending", "accepted"] } });
  if (!task) return;

  const now = new Date();
  if (String(task.serviceLevel) === "INSTANT") {
    await DeliveryRequestModel.findByIdAndUpdate(task.id, {
      assignedDeliveryPartnerId: partnerId,
      assignedDeliveryBoyId: partnerId,
      taskStatus: "accepted",
      acceptedAt: now,
      deadlineAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      notificationSentAt: now
    });
    return;
  }

  const partner = await DeliveryPartnerModel.findById(partnerId);
  const acceptedAt = new Date();
  const batchQuery = {
    deliveryPartnerId: partnerId,
    deliveryType: task.deliveryType || partner?.deliveryType,
    deliveryRound: task.deliveryRound,
    roundAt: task.roundAt,
    status: "active" as const
  };
  let batch = await DeliveryBatchModel.findOne(batchQuery);
  if (batch) {
    if (!Array.isArray(batch.tasks) || !batch.tasks.includes(task.id)) {
      await DeliveryBatchModel.updateOne({ _id: batch._id }, { $addToSet: { tasks: task.id }, $inc: { estimatedEarnings: task.estimatedEarnings || 0 } });
    }
  } else {
    batch = await DeliveryBatchModel.create({
      batchId: randomUUID(),
      deliveryPartnerId: partnerId,
      deliveryType: task.deliveryType || partner?.deliveryType,
      deliveryRound: task.deliveryRound,
      roundAt: task.roundAt,
      shift: task.shift || (task.deliveryRound === "ONE_PM" ? "morning" : "evening"),
      area: task.assignedArea || partner?.assignedArea || "All Areas",
      tasks: [task.id],
      estimatedEarnings: task.estimatedEarnings || 0,
      status: "active"
    });
  }

  if (task.batchId && batch?.batchId && task.batchId !== batch.batchId) {
    await DeliveryBatchModel.updateOne({ batchId: task.batchId }, { $pull: { tasks: task.id } });
  }

  await DeliveryRequestModel.findByIdAndUpdate(
    task.id,
    {
      assignedDeliveryPartnerId: partnerId,
      assignedDeliveryBoyId: partnerId,
      batchId: batch?.batchId || task.batchId,
      taskStatus: "accepted",
      retryStatus: "ACTIVE",
      acceptedAt,
      deadlineAt: new Date(acceptedAt.getTime() + 12 * 60 * 60 * 1000)
    },
    { returnDocument: "after" }
  );
}

export async function hydrateOrder(orderInput: unknown) {
  const order = typeof (orderInput as { toJSON?: unknown })?.toJSON === "function" ? (orderInput as { toJSON: () => Record<string, unknown> }).toJSON() : (orderInput as Record<string, unknown>);
  if (!order) return null;

  const orderId = String(order.id ?? order._id);
  const [address, customer, tailor, pickupPartner, deliveryPartner, payments, reviews] = await Promise.all([
    AddressModel.findById(order.addressId),
    UserModel.findById(order.customerId).select("name phone role"),
    partnerWithUser(TailorModel, order.tailorId as string | undefined),
    partnerWithUser(DeliveryPartnerModel, order.pickupPartnerId as string | undefined),
    partnerWithUser(DeliveryPartnerModel, order.deliveryPartnerId as string | undefined),
    PaymentModel.find({ orderId }).sort({ createdAt: -1 }),
    ReviewModel.find({ orderId }).sort({ createdAt: -1 })
  ]);

  const reviewByKind = new Map(reviews.map((review) => [String(review.kind), review]));
  const tailorReview = reviewByKind.get("tailor");
  const deliveryReview = reviewByKind.get("delivery");

  const items = await Promise.all(
    ((order.items as Array<Record<string, unknown>> | undefined) ?? []).map(async (item) => {
      const service = await ServiceModel.findById(item.serviceId);
      const category = service ? await ServiceCategoryModel.findById(service.categoryId) : null;
      return {
        ...item,
        id: item.id ?? item._id,
        service: service ? { ...service.toJSON(), category: json(category) } : null
      };
    })
  );

  return {
    ...order,
    address: json(address),
    customer: json(customer),
    tailor,
    pickupPartner,
    deliveryPartner,
    items,
    payments: payments.map((payment) => json(payment)),
    tailorRating: tailorReview?.rating,
    tailorReview: tailorReview?.comment,
    tailorRatingSubmittedAt: tailorReview?.createdAt,
    deliveryRating: deliveryReview?.rating,
    deliveryReview: deliveryReview?.comment,
    deliveryRatingSubmittedAt: deliveryReview?.createdAt
  };
}

async function hydrateOrders(orderInputs: unknown[]) {
  const orders = orderInputs.map((input) => typeof (input as { toJSON?: unknown })?.toJSON === "function"
    ? (input as { toJSON: () => Record<string, unknown> }).toJSON()
    : input as Record<string, unknown>);
  if (!orders.length) return [];
  const ids = (key: string) => [...new Set(orders.map((order) => String(order[key] ?? "")).filter(Boolean))];
  const orderIds = orders.map((order) => String(order.id ?? order._id));
  const serviceIds = [...new Set(orders.flatMap((order) => ((order.items as Array<Record<string, unknown>> | undefined) ?? []).map((item) => String(item.serviceId ?? ""))).filter(Boolean))];

  const [addresses, customers, tailors, partners, payments, reviews, services] = await Promise.all([
    AddressModel.find({ _id: { $in: ids("addressId") } }),
    UserModel.find({ _id: { $in: ids("customerId") } }).select("name phone role"),
    TailorModel.find({ _id: { $in: ids("tailorId") } }),
    DeliveryPartnerModel.find({ _id: { $in: [...ids("pickupPartnerId"), ...ids("deliveryPartnerId")] } }),
    PaymentModel.find({ orderId: { $in: orderIds } }).sort({ createdAt: -1 }),
    ReviewModel.find({ orderId: { $in: orderIds } }).sort({ createdAt: -1 }),
    ServiceModel.find({ _id: { $in: serviceIds } })
  ]);
  const profileUserIds = [...new Set([...tailors, ...partners].map((profile) => String(profile.userId ?? "")).filter(Boolean))];
  const categoryIds = [...new Set(services.map((service) => String(service.categoryId ?? "")).filter(Boolean))];
  const [profileUsers, categories] = await Promise.all([
    UserModel.find({ _id: { $in: profileUserIds } }).select("name phone role"),
    ServiceCategoryModel.find({ _id: { $in: categoryIds } })
  ]);

  const mapById = (items: any[]) => new Map(items.map((item) => [String(item.id ?? item._id), item]));
  const addressMap = mapById(addresses);
  const customerMap = mapById(customers);
  const tailorMap = mapById(tailors);
  const partnerMap = mapById(partners);
  const profileUserMap = mapById(profileUsers);
  const serviceMap = mapById(services);
  const categoryMap = mapById(categories);
  const paymentsByOrder = new Map<string, any[]>();
  payments.forEach((payment) => paymentsByOrder.set(String(payment.orderId), [...(paymentsByOrder.get(String(payment.orderId)) ?? []), payment]));
  const reviewsByOrder = new Map<string, Map<string, any>>();
  reviews.forEach((review) => {
    const byKind = reviewsByOrder.get(String(review.orderId)) ?? new Map<string, any>();
    if (!byKind.has(String(review.kind))) byKind.set(String(review.kind), review);
    reviewsByOrder.set(String(review.orderId), byKind);
  });
  const partnerJson = (profile: any) => profile ? { ...profile.toJSON(), user: json(profileUserMap.get(String(profile.userId))) } : null;

  return orders.map((order) => {
    const orderId = String(order.id ?? order._id);
    const byKind = reviewsByOrder.get(orderId) ?? new Map<string, any>();
    const tailorReview = byKind.get("tailor");
    const deliveryReview = byKind.get("delivery");
    return {
      ...order,
      address: json(addressMap.get(String(order.addressId ?? ""))),
      customer: json(customerMap.get(String(order.customerId ?? ""))),
      tailor: partnerJson(tailorMap.get(String(order.tailorId ?? ""))),
      pickupPartner: partnerJson(partnerMap.get(String(order.pickupPartnerId ?? ""))),
      deliveryPartner: partnerJson(partnerMap.get(String(order.deliveryPartnerId ?? ""))),
      items: ((order.items as Array<Record<string, unknown>> | undefined) ?? []).map((item) => {
        const service = serviceMap.get(String(item.serviceId ?? ""));
        return { ...item, id: item.id ?? item._id, service: service ? { ...service.toJSON(), category: json(categoryMap.get(String(service.categoryId))) } : null };
      }),
      payments: (paymentsByOrder.get(orderId) ?? []).map((payment) => json(payment)),
      tailorRating: tailorReview?.rating,
      tailorReview: tailorReview?.comment,
      tailorRatingSubmittedAt: tailorReview?.createdAt,
      deliveryRating: deliveryReview?.rating,
      deliveryReview: deliveryReview?.comment,
      deliveryRatingSubmittedAt: deliveryReview?.createdAt
    };
  });
}

export const orderInclude = {};

export async function createOrder(customerId: string, payload: unknown) {
  const input = createOrderSchema.parse(payload);
  const address = await AddressModel.findOne({ _id: input.addressId, userId: customerId });
  if (!address) {
    throw new AppError(404, "Address not found");
  }
  const customer = await UserModel.findById(customerId).select("name phone");

  const services = await ServiceModel.find({ _id: { $in: input.items.map((item) => item.serviceId) }, isActive: true });
  const serviceMap = new Map(services.map((service) => [service.id, service]));

  const subtotal = input.items.reduce((sum, item) => {
    const service = serviceMap.get(item.serviceId);
    if (!service) {
      throw new AppError(400, `Invalid service: ${item.serviceId}`);
    }
    return sum + Number(service.price) * item.quantity;
  }, 0);

  const platformFee = getPlatformFee(subtotal);
  const smallOrderFee = getSmallOrderFee(subtotal);

  let discount = 0;
  let couponId: string | undefined;
  if (input.couponCode) {
    const validated = await validateCoupon(input.couponCode, subtotal, customerId);
    couponId = validated.coupon.id;
    discount = validated.discount;
  }

  const totalAmount = Math.max(subtotal + platformFee + smallOrderFee - discount, 0);

  const orderId = randomUUID();
  if (couponId) await reserveCouponUsage(couponId, customerId, orderId);
  const order = await OrderModel.create({
    _id: orderId,
    orderNumber: generateOrderNumber(),
    customerId,
    addressId: input.addressId,
    paymentMethod: input.paymentMethod,
    paymentStatus: "PENDING",
    subtotal,
    platformFee,
    smallOrderFee,
    discount,
    couponCode: input.couponCode?.toUpperCase(),
    totalAmount,
    pickupScheduledAt: new Date(input.pickupScheduledAt),
    instructions: input.instructions,
    items: input.items.map((item) => {
      const service = serviceMap.get(item.serviceId)!;
      return {
        serviceId: service.id,
        quantity: item.quantity,
        price: service.price,
        referenceImageUrl: item.referenceImageUrl,
        instructions: item.instructions,
        measurement: item.measurement
      };
    })
  });

  await PaymentModel.create({ orderId: order.id, method: input.paymentMethod, amount: totalAmount, status: "PENDING" });

  const pickupAddress = [address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(", ") || address.line1;
  const nextSlot = await nextOpenBatchSlot(DeliveryType.PICKUP);
  const deliveryRequest = await DeliveryRequestModel.create({
    orderId: order.id,
    tailorId: undefined,
    customerId,
    type: "customer_to_tailor",
    deliveryType: DeliveryType.PICKUP,
    serviceLevel: "STANDARD",
    deliveryRound: nextSlot.deliveryRound,
    roundAt: nextSlot.roundAt,
    assignedArea: "unassigned",
    taskStatus: "pending",
    shift: nextSlot.deliveryRound === "ONE_PM" ? "morning" : "evening",
    estimatedEarnings: 8,
    pickupAddress,
    dropAddress: "Tailor address pending",
    customerName: customer?.name ?? address.name,
    customerPhone: customer?.phone ?? address.phone,
    clothType: input.items.length === 1 ? "Standard order" : `${input.items.length} items`,
    workType: "Order pickup",
    itemCount: input.items.length,
    paymentMethod: input.paymentMethod,
    paymentStatus: "PENDING",
    totalAmount,
    cashCollectionRequired: input.paymentMethod === "COD",
    cashCollected: false,
    sampleProvided: false,
    sampleMedia: []
  });

  const scheduledBatch = await addTaskToSilentBatch(deliveryRequest, "STANDARD");
  const scheduledTask = await DeliveryRequestModel.findById(deliveryRequest.id);
  await OrderModel.findByIdAndUpdate(order.id, {
    deliveryType: DeliveryType.PICKUP,
    deliveryRound: scheduledTask?.deliveryRound ?? nextSlot.deliveryRound,
    batchId: scheduledBatch.batchId
  });

  await notifyUser({
    userId: customerId,
    orderId: order.id,
    title: "Order placed",
    body: "Your Darji pickup request has been created."
  });

  const updatedOrder = await OrderModel.findById(order.id);
  return updatedOrder ? hydrateOrder(updatedOrder) : hydrateOrder(order);
}

export async function listOrders(user: { id: string; role: string }, query: Record<string, unknown>) {
  const status = typeof query.status === "string" ? query.status : undefined;
  const where: Record<string, unknown> = status ? { status } : {};

  if (user.role === "CUSTOMER") {
    where.customerId = user.id;
  } else if (user.role === "TAILOR") {
    const tailor = await TailorModel.findOne({ userId: user.id });
    where.tailorId = tailor?.id ?? "__none__";
  } else if (user.role === "DELIVERY_PARTNER") {
    const partner = await DeliveryPartnerModel.findOne({ userId: user.id });
    where.$or = [{ pickupPartnerId: partner?.id ?? "__none__" }, { deliveryPartnerId: partner?.id ?? "__none__" }];
  }

  const requestedLimit = Number(query.limit);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(Math.floor(requestedLimit), 5000)
    : user.role === "ADMIN" || user.role === "SUPER_ADMIN"
      ? 1000
      : 100;
  const orders = await OrderModel.find(where).sort({ createdAt: -1 }).limit(limit);
  return hydrateOrders(orders);
}

type OrderActor = { id: string; role: string };

async function assertOrderAccess(
  order: { customerId?: unknown; tailorId?: unknown; pickupPartnerId?: unknown; deliveryPartnerId?: unknown; id?: unknown; _id?: unknown },
  actor: OrderActor,
  action: "read" | "status"
) {
  if (actor.role === "ADMIN" || actor.role === "SUPER_ADMIN") return;

  if (actor.role === "CUSTOMER") {
    if (action === "read" && String(order.customerId ?? "") === actor.id) return;
    throw new AppError(403, action === "read" ? "You can only view your own orders" : "Customers cannot update order status");
  }

  if (actor.role === "TAILOR") {
    const tailor = await TailorModel.findOne({ userId: actor.id }).select("_id").lean();
    if (tailor && String(order.tailorId ?? "") === String(tailor._id)) return;
    throw new AppError(403, "This order is not assigned to your tailor account");
  }

  if (actor.role === "DELIVERY_PARTNER") {
    const partner = await DeliveryPartnerModel.findOne({ userId: actor.id }).select("_id").lean();
    const partnerId = partner ? String(partner._id) : "";
    const directlyAssigned = partnerId && [order.pickupPartnerId, order.deliveryPartnerId].some((id) => String(id ?? "") === partnerId);
    const orderId = String(order.id ?? order._id ?? "");
    const taskAssigned = partnerId && orderId
      ? Boolean(await DeliveryRequestModel.exists({ orderId, assignedDeliveryPartnerId: partnerId, taskStatus: { $ne: "cancelled" } }))
      : false;
    if (directlyAssigned || taskAssigned) return;
    throw new AppError(403, "This order is not assigned to your delivery account");
  }

  throw new AppError(403, "You do not have access to this order");
}

export async function getOrder(orderId: string, actor: OrderActor) {
  const order = await OrderModel.findById(orderId);
  if (order) await assertOrderAccess(order, actor, "read");
  return order ? hydrateOrder(order) : null;
}

export async function updateOrderStatus(orderId: string, payload: unknown, actor: OrderActor) {
  const rawPayload = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  // The legacy tailor app calls the visible state "WORKING". Persist the
  // canonical order status used by the backend and every other consumer.
  const input = updateOrderStatusSchema.parse({
    ...rawPayload,
    status: rawPayload.status === "WORKING" ? "STITCHING_STARTED" : rawPayload.status
  });
  const order = await OrderModel.findById(orderId);
  if (!order) {
    throw new AppError(404, "Order not found");
  }

  await assertOrderAccess(order, actor, "status");

  const currentStatus = String(order.status);
  if (input.status !== currentStatus && !allowedOrderStatusTransitions(currentStatus).includes(input.status)) {
    throw new AppError(409, `Order cannot move from ${currentStatus} to ${input.status}`);
  }

  const roleAllowedStatuses: Record<string, readonly string[]> = {
    TAILOR: ["CUTTING", "STITCHING_STARTED", "FINISHING", "STITCHING_COMPLETED", "READY"],
    DELIVERY_PARTNER: ["CLOTH_PICKED", "AT_TAILOR", "OUT_FOR_DELIVERY", "DELIVERED"]
  };
  const allowedForRole = roleAllowedStatuses[actor.role];
  if (allowedForRole && !allowedForRole.includes(input.status)) {
    throw new AppError(403, `${actor.role === "TAILOR" ? "Tailors" : "Delivery partners"} cannot set ${input.status}`);
  }

  const data: Record<string, unknown> = { status: input.status };
  if (input.status === "CLOTH_PICKED" && input.imageUrl) data.pickupImageUrl = input.imageUrl;
  if (input.status === "READY" && input.imageUrl) data.finalImageUrl = input.imageUrl;
  if (input.status === "DELIVERED" && input.imageUrl) data.deliveryProofUrl = input.imageUrl;

  const timelineEvent = {
    status: input.status,
    description: input.note?.trim().slice(0, 500) || `Order status changed to ${input.status}`,
    timestamp: new Date(),
    userId: actor.id,
    userName: actor.role // Assuming role is available, otherwise could fetch name
  };

  const updated = await OrderModel.findByIdAndUpdate(orderId, { ...data, $push: { timelineEvents: timelineEvent } }, { returnDocument: "after" });
  if (!updated) {
    throw new AppError(404, "Order not found");
  }

  await notifyUser({
    userId: updated.customerId,
    orderId,
    title: "Order update",
    body: orderStatusMessage(input.status)
  });

  if (actor.role === "TAILOR" && input.status === "READY" && updated.tailorId) {
    const tailor = await TailorModel.findById(updated.tailorId).select("userId");
    const amount = Number(updated.totalAmount) * 0.45;
    if (tailor?.userId && amount > 0) {
      await creditOrderEarning({
        userId: tailor.userId,
        userType: "TAILOR",
        orderId: updated.id,
        amount,
        remarks: `Tailor earning for order ${updated.orderNumber}`,
        createdBy: "system"
      });
      await TailorModel.findByIdAndUpdate(updated.tailorId, { earnings: Number(updated.totalAmount) * 0.45 });
    }
  }

  return hydrateOrder(updated);
}

export async function assignOrder(orderId: string, input: { tailorId?: string; deliveryPartnerId?: string; pickupPartnerId?: string; mode?: "pickup" | "delivery" }, actor: OrderActor) {
  const data: Record<string, string> = {};
  if (input.tailorId) {
    const tailor = await TailorModel.findOne({ _id: input.tailorId, verificationStatus: "VERIFIED" }).select("_id").lean();
    if (!tailor) throw new AppError(400, "Select a verified tailor");
    data.tailorId = input.tailorId;
  }
  
  if (input.deliveryPartnerId && input.mode === "delivery") data.deliveryPartnerId = input.deliveryPartnerId;
  else if (input.deliveryPartnerId && input.mode !== "delivery") data.pickupPartnerId = input.deliveryPartnerId;
  else if (input.pickupPartnerId) data.pickupPartnerId = input.pickupPartnerId;

  if (Object.keys(data).length === 0) {
    throw new AppError(400, "Nothing to assign");
  }

  const assignedPartnerId = data.deliveryPartnerId ?? data.pickupPartnerId;
  if (assignedPartnerId) {
    const expectedType = data.deliveryPartnerId ? DeliveryType.DROP : DeliveryType.PICKUP;
    const partner = await DeliveryPartnerModel.findOne({ _id: assignedPartnerId, verificationStatus: "VERIFIED", deliveryType: expectedType }).select("_id").lean();
    if (!partner) throw new AppError(400, `Select a verified ${expectedType.toLowerCase()} partner`);
  }

  const existingOrder = await OrderModel.findById(orderId).select("status customerId");
  if (existingOrder && assignedPartnerId) {
    const proposedStatus = data.deliveryPartnerId ? "OUT_FOR_DELIVERY" : "PICKUP_ASSIGNED";
    if (allowedOrderStatusTransitions(String(existingOrder.status)).includes(proposedStatus)) data.status = proposedStatus;
  }

  const timelineEvent = {
    status: data.status || String(existingOrder?.status ?? "ASSIGNED"),
    description: input.tailorId ? "Tailor assigned" : "Delivery partner assigned",
    timestamp: new Date(),
    userId: actor.id,
    userName: actor.role
  };

  const order = existingOrder
    ? await OrderModel.findByIdAndUpdate(orderId, { ...data, $push: { timelineEvents: timelineEvent } }, { returnDocument: "after" })
    : null;
  
  if (!order) {
    // Fallback to TailoringRequest
    const trData: Record<string, string> = {};
    if (input.tailorId) trData.assignedTailorId = input.tailorId;
    if (data.pickupPartnerId) trData.pickupPartnerId = data.pickupPartnerId;
    if (data.deliveryPartnerId) trData.deliveryPartnerId = data.deliveryPartnerId;
    if (data.pickupPartnerId) trData.assignedDeliveryBoyId = data.pickupPartnerId;
    if (data.deliveryPartnerId) trData.assignedDeliveryBoyId = data.deliveryPartnerId;
    const existingRequest = await TailoringRequestModel.findById(orderId).select("orderStatus customerId");
    if (data.pickupPartnerId && existingRequest?.orderStatus === "tailor_accepted") trData.orderStatus = "pickup_started";
    if (data.deliveryPartnerId && existingRequest?.orderStatus === "ready_for_delivery") trData.orderStatus = "out_for_delivery";

    const tr = existingRequest
      ? await TailoringRequestModel.findByIdAndUpdate(orderId, { ...trData, $push: { timelineEvents: { ...timelineEvent, status: trData.orderStatus || String(existingRequest.orderStatus ?? "ASSIGNED") } } }, { returnDocument: "after" })
      : null;
    if (!tr) {
      throw new AppError(404, "Order or Request not found");
    }
    await assignExistingDeliveryTask(orderId, assignedPartnerId, input.mode);
    
    await notifyUser({
      userId: tr.customerId,
      orderId,
      title: "Request assigned",
      body: input.tailorId ? "A tailor has been assigned to your request." : "A delivery partner has been assigned to your request."
    });
    return tr;
  }

  await assignExistingDeliveryTask(orderId, assignedPartnerId, input.mode);

  await notifyUser({
    userId: order.customerId,
    orderId,
    title: "Order assigned",
    body: input.tailorId ? "A tailor has been assigned to your order." : "A delivery partner has been assigned to your order."
  });

  return hydrateOrder(order);
}


