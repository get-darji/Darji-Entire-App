import type { Request, Response } from "express";
import { addressSchema, couponSchema, serviceCatalog, supportTicketSchema } from "@darzi/shared";
import { prisma } from "../prisma.js";
import { AppError } from "../middleware/error.js";
import { assignOrder, createOrder, listOrders, orderInclude, updateOrderStatus } from "../services/order.service.js";

export async function catalogController(_req: Request, res: Response) {
  const services = await prisma.service.findMany({ where: { isActive: true }, include: { category: true }, orderBy: { name: "asc" } });
  if (services.length > 0) {
    return res.json({ data: services });
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
    await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
  }
  const address = await prisma.address.create({ data: { ...input, userId: req.user!.id } });
  res.status(201).json({ data: address });
}

export async function listAddressesController(req: Request, res: Response) {
  const addresses = await prisma.address.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" } });
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
  const order = await prisma.order.findUnique({ where: { id: String(req.params.id) }, include: orderInclude });
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
  const tailors = await prisma.tailor.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } });
  res.json({ data: tailors });
}

export async function updateTailorAvailabilityController(req: Request, res: Response) {
  const tailor = await prisma.tailor.findUnique({ where: { userId: req.user!.id } });
  if (!tailor) throw new AppError(404, "Tailor profile not found");
  const updated = await prisma.tailor.update({ where: { id: tailor.id }, data: { isAvailable: Boolean(req.body.isAvailable) } });
  res.json({ data: updated });
}

export async function listDeliveryPartnersController(_req: Request, res: Response) {
  const partners = await prisma.deliveryPartner.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } });
  res.json({ data: partners });
}

export async function updateDeliveryAvailabilityController(req: Request, res: Response) {
  const partner = await prisma.deliveryPartner.findUnique({ where: { userId: req.user!.id } });
  if (!partner) throw new AppError(404, "Delivery profile not found");
  const updated = await prisma.deliveryPartner.update({ where: { id: partner.id }, data: { isAvailable: Boolean(req.body.isAvailable) } });
  res.json({ data: updated });
}

export async function walletController(req: Request, res: Response) {
  const wallet = await prisma.wallet.upsert({
    where: { userId: req.user!.id },
    update: {},
    create: { userId: req.user!.id, balance: 0 }
  });
  res.json({ data: wallet });
}

export async function transactionsController(req: Request, res: Response) {
  const transactions = await prisma.transaction.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" } });
  res.json({ data: transactions });
}

export async function listNotificationsController(req: Request, res: Response) {
  const notifications = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" } });
  res.json({ data: notifications });
}

export async function createReviewController(req: Request, res: Response) {
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new AppError(400, "Rating must be 1-5");
  const review = await prisma.review.create({
    data: { userId: req.user!.id, orderId: String(req.body.orderId), rating, comment: req.body.comment }
  });
  res.status(201).json({ data: review });
}

export async function createSupportTicketController(req: Request, res: Response) {
  const input = supportTicketSchema.parse(req.body);
  const ticket = await prisma.supportTicket.create({ data: { ...input, userId: req.user!.id } });
  res.status(201).json({ data: ticket });
}

export async function listSupportTicketsController(req: Request, res: Response) {
  const where = req.user!.role === "ADMIN" ? {} : { userId: req.user!.id };
  const tickets = await prisma.supportTicket.findMany({ where, include: { user: true, order: true }, orderBy: { createdAt: "desc" } });
  res.json({ data: tickets });
}

export async function listCouponsController(_req: Request, res: Response) {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ data: coupons });
}

export async function createCouponController(req: Request, res: Response) {
  const input = couponSchema.parse(req.body);
  const coupon = await prisma.coupon.create({ data: { ...input, code: input.code.toUpperCase(), expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } });
  res.status(201).json({ data: coupon });
}

export async function paymentsController(req: Request, res: Response) {
  const where = req.user!.role === "ADMIN" ? {} : { order: { customerId: req.user!.id } };
  const payments = await prisma.payment.findMany({ where, include: { order: true }, orderBy: { createdAt: "desc" } });
  res.json({ data: payments });
}

export async function analyticsController(_req: Request, res: Response) {
  const [revenue, customers, tailors, deliveryPartners, orders, openTickets] = await Promise.all([
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.tailor.count({ where: { isAvailable: true } }),
    prisma.deliveryPartner.count({ where: { isAvailable: true } }),
    prisma.order.count(),
    prisma.supportTicket.count({ where: { status: "OPEN" } })
  ]);
  res.json({
    data: {
      revenue: revenue._sum.amount ?? 0,
      customers,
      activeTailors: tailors,
      activeDeliveryPartners: deliveryPartners,
      orders,
      openTickets
    }
  });
}

export async function settingsController(_req: Request, res: Response) {
  const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });
  res.json({ data: settings });
}

export async function updateSettingController(req: Request, res: Response) {
  const key = String(req.params.key);
  const setting = await prisma.setting.upsert({ where: { key }, update: { value: req.body.value }, create: { key, value: req.body.value } });
  res.json({ data: setting });
}
