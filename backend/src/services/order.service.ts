import { createOrderSchema, updateOrderStatusSchema } from "@darzi/shared";
import { prisma } from "../prisma.js";
import { AppError } from "../middleware/error.js";
import { notifyUser, orderStatusMessage } from "./notification.service.js";

function generateOrderNumber() {
  return `DRZ-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function createOrder(customerId: string, payload: unknown) {
  const input = createOrderSchema.parse(payload);
  const address = await prisma.address.findFirst({ where: { id: input.addressId, userId: customerId } });
  if (!address) {
    throw new AppError(404, "Address not found");
  }

  const services = await prisma.service.findMany({
    where: { id: { in: input.items.map((item) => item.serviceId) }, isActive: true }
  });
  const serviceMap = new Map(services.map((service) => [service.id, service]));

  const subtotal = input.items.reduce((sum, item) => {
    const service = serviceMap.get(item.serviceId);
    if (!service) {
      throw new AppError(400, `Invalid service: ${item.serviceId}`);
    }
    return sum + Number(service.price) * item.quantity;
  }, 0);

  let discount = 0;
  if (input.couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: input.couponCode.toUpperCase() } });
    if (coupon?.isActive && (!coupon.expiresAt || coupon.expiresAt > new Date()) && subtotal >= Number(coupon.minOrderValue)) {
      discount =
        coupon.discountType === "FLAT"
          ? Number(coupon.discountValue)
          : Math.min((subtotal * Number(coupon.discountValue)) / 100, Number(coupon.maxDiscount ?? subtotal));
    }
  }

  const totalAmount = Math.max(subtotal - discount, 0);

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId,
      addressId: input.addressId,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === "COD" ? "PENDING" : "PENDING",
      subtotal,
      discount,
      totalAmount,
      pickupScheduledAt: new Date(input.pickupScheduledAt),
      instructions: input.instructions,
      items: {
        create: input.items.map((item) => {
          const service = serviceMap.get(item.serviceId)!;
          return {
            serviceId: service.id,
            quantity: item.quantity,
            price: service.price,
            referenceImageUrl: item.referenceImageUrl,
            instructions: item.instructions,
            measurement: item.measurement
              ? {
                  create: {
                    label: item.measurement.label,
                    fields: item.measurement.fields,
                    imageUrl: item.measurement.imageUrl
                  }
                }
              : undefined
          };
        })
      },
      payments: {
        create: {
          method: input.paymentMethod,
          amount: totalAmount,
          status: input.paymentMethod === "COD" ? "PENDING" : "PENDING"
        }
      }
    },
    include: orderInclude
  });

  await notifyUser({
    userId: customerId,
    orderId: order.id,
    title: "Order placed",
    body: "Your Darzi pickup request has been created."
  });

  return order;
}

export const orderInclude = {
  address: true,
  customer: { select: { id: true, name: true, phone: true } },
  tailor: { include: { user: { select: { id: true, name: true, phone: true } } } },
  pickupPartner: { include: { user: { select: { id: true, name: true, phone: true } } } },
  deliveryPartner: { include: { user: { select: { id: true, name: true, phone: true } } } },
  items: { include: { service: { include: { category: true } }, measurement: true } },
  payments: true
} as const;

export async function listOrders(user: { id: string; role: string }, query: Record<string, unknown>) {
  const status = typeof query.status === "string" ? query.status : undefined;
  const where: Record<string, unknown> = status ? { status } : {};

  if (user.role === "CUSTOMER") {
    where.customerId = user.id;
  } else if (user.role === "TAILOR") {
    const tailor = await prisma.tailor.findUnique({ where: { userId: user.id } });
    where.tailorId = tailor?.id ?? "__none__";
  } else if (user.role === "DELIVERY_PARTNER") {
    const partner = await prisma.deliveryPartner.findUnique({ where: { userId: user.id } });
    where.OR = [{ pickupPartnerId: partner?.id ?? "__none__" }, { deliveryPartnerId: partner?.id ?? "__none__" }];
  }

  return prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function updateOrderStatus(orderId: string, payload: unknown, actor: { id: string; role: string }) {
  const input = updateOrderStatusSchema.parse(payload);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new AppError(404, "Order not found");
  }

  const data: Record<string, unknown> = { status: input.status };
  if (input.status === "CLOTH_PICKED" && input.imageUrl) data.pickupImageUrl = input.imageUrl;
  if (input.status === "READY" && input.imageUrl) data.finalImageUrl = input.imageUrl;
  if (input.status === "DELIVERED" && input.imageUrl) data.deliveryProofUrl = input.imageUrl;

  const updated = await prisma.order.update({ where: { id: orderId }, data, include: orderInclude });
  await notifyUser({
    userId: updated.customerId,
    orderId,
    title: "Order update",
    body: orderStatusMessage(input.status)
  });

  if (actor.role === "TAILOR" && input.status === "READY" && updated.tailorId) {
    await prisma.tailor.update({ where: { id: updated.tailorId }, data: { earnings: { increment: Number(updated.totalAmount) * 0.45 } } });
  }

  return updated;
}

export async function assignOrder(orderId: string, input: { tailorId?: string; deliveryPartnerId?: string; mode?: "pickup" | "delivery" }) {
  const data: Record<string, string> = {};
  if (input.tailorId) data.tailorId = input.tailorId;
  if (input.deliveryPartnerId && input.mode === "delivery") data.deliveryPartnerId = input.deliveryPartnerId;
  if (input.deliveryPartnerId && input.mode !== "delivery") data.pickupPartnerId = input.deliveryPartnerId;

  if (Object.keys(data).length === 0) {
    throw new AppError(400, "Nothing to assign");
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      ...data,
      status: input.deliveryPartnerId && input.mode !== "delivery" ? "PICKUP_ASSIGNED" : undefined
    },
    include: orderInclude
  });

  await notifyUser({
    userId: order.customerId,
    orderId,
    title: "Order assigned",
    body: input.tailorId ? "A tailor has been assigned to your order." : "A delivery partner has been assigned to your order."
  });

  return order;
}
