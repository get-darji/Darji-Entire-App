import {
  DeliveryRequestModel,
  OperationalAlertModel,
  OrderModel,
  PaymentModel,
  SupportTicketModel,
  TailoringRequestModel
} from "../models.js";
import { operationalAlertCategory, sendOperationalAlertEmails, type LiveAlertEmailInput } from "./email-alert.service.js";

const ACTIVE_DELIVERY_STATUSES = ["delivered", "completed", "cancelled", "CANCELLED"];
const LIVE_ORDER_STATUSES = ["ORDER_PLACED", "CONFIRMED", "AT_TAILOR", "STITCHING_STARTED"];
const UNRESOLVED_TICKET_STATUSES = ["RESOLVED", "CLOSED"];

function asDate(value: unknown) {
  if (!value) return undefined;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function dateFilterBefore(cutoff: Date) {
  return { $lte: cutoff };
}

function isOpenDeliveryFilter() {
  return { taskStatus: { $nin: ACTIVE_DELIVERY_STATUSES } };
}

function alert(input: Omit<LiveAlertEmailInput, "category" | "source"> & { categoryInput?: string }) {
  const { categoryInput, ...details } = input;
  return {
    ...details,
    category: operationalAlertCategory(categoryInput ?? details.title, details.title),
    source: "Admin Live Alerts"
  } satisfies LiveAlertEmailInput;
}

function formatCurrency(amount: unknown) {
  const value = Number(amount);
  return `₹${Number.isFinite(value) ? value.toLocaleString("en-IN") : "0"}`;
}

/**
 * Recreates the Admin Live Alerts conditions on the server, so alert emails
 * continue to be generated when no administrator has the panel open.
 */
export async function monitorAdminLiveAlerts(now = new Date()) {
  const minutes = (value: number) => new Date(now.getTime() - value * 60_000);
  const hours = (value: number) => new Date(now.getTime() - value * 60 * 60_000);
  const days = (value: number) => new Date(now.getTime() - value * 24 * 60 * 60_000);
  const [operationalAlerts, quotePending, unassignedDeliveries, delayedDeliveries, failedDeliveries, failedPayments, pendingPayments, quotesAwaitingConfirmation, quotePaymentsOverdue, stalledOrders, priorityTickets] = await Promise.all([
    OperationalAlertModel.find({ status: "OPEN" }).select("_id type severity title message createdAt").lean(),
    TailoringRequestModel.find({ status: "QUOTE_REQUESTED", createdAt: dateFilterBefore(minutes(1.5)) }).select("_id darjiId createdAt").lean(),
    DeliveryRequestModel.find({ ...isOpenDeliveryFilter(), assignedDeliveryPartnerId: { $in: [null, ""] }, createdAt: dateFilterBefore(minutes(10)) }).select("_id taskId createdAt").lean(),
    DeliveryRequestModel.find({ ...isOpenDeliveryFilter(), deadlineAt: { $lt: now, $exists: true } }).select("_id taskId type deadlineAt createdAt").lean(),
    DeliveryRequestModel.find({ ...isOpenDeliveryFilter(), lastFailureReason: { $exists: true, $nin: [null, ""] } }).select("_id taskId lastFailureReason updatedAt createdAt").lean(),
    PaymentModel.find({ status: "FAILED" }).select("_id darjiId orderId status amount createdAt").lean(),
    PaymentModel.find({ status: "PENDING", createdAt: dateFilterBefore(minutes(15)) }).select("_id darjiId orderId status amount createdAt").lean(),
    TailoringRequestModel.find({ status: "QUOTE_REQUESTED", lastQuoteSentAt: dateFilterBefore(hours(2)) }).select("_id darjiId lastQuoteSentAt updatedAt").lean(),
    TailoringRequestModel.find({ status: "PAYMENT_PENDING", paymentStatus: { $ne: "PAID" }, $or: [
      { paymentPendingAt: dateFilterBefore(hours(2)) },
      { paymentPendingAt: { $exists: false }, updatedAt: dateFilterBefore(hours(2)) },
      { paymentPendingAt: { $exists: false }, updatedAt: { $exists: false }, createdAt: dateFilterBefore(hours(2)) }
    ] }).select("_id darjiId paymentPendingAt updatedAt createdAt").lean(),
    OrderModel.find({ status: { $in: LIVE_ORDER_STATUSES }, $or: [
      { updatedAt: dateFilterBefore(days(1)) },
      { updatedAt: { $exists: false }, createdAt: dateFilterBefore(days(1)) }
    ] }).select("_id darjiId orderNumber status createdAt updatedAt").lean(),
    SupportTicketModel.find({ priority: { $in: ["HIGH", "URGENT"] }, status: { $nin: UNRESOLVED_TICKET_STATUSES } }).select("_id subject userId priority status createdAt").lean()
  ]);

  const alerts: LiveAlertEmailInput[] = [];
  const add = (input: Omit<LiveAlertEmailInput, "category" | "source"> & { categoryInput?: string }) => alerts.push(alert(input));

  for (const item of operationalAlerts) {
    add({
      incidentKey: `operational-${String(item._id)}`,
      categoryInput: item.type,
      title: item.title,
      description: item.message,
      severity: item.severity === "CRITICAL" ? "critical" : item.severity === "INFO" ? "info" : "warning",
      detectedAt: asDate(item.createdAt)?.toISOString()
    });
  }

  for (const item of quotePending) {
    const id = String(item._id);
    add({ incidentKey: `tailoring-wait-${id}`, categoryInput: "tailoring", title: "Quote pending", description: `${item.darjiId ?? `REQ-${id.slice(0, 8).toUpperCase()}`} has been waiting for tailor quotes.`, severity: "warning", detectedAt: asDate(item.createdAt)?.toISOString() });
  }

  for (const item of unassignedDeliveries) {
    add({ incidentKey: `delivery-unassigned-${String(item._id)}`, categoryInput: "delivery", title: "Delivery unassigned", description: `${item.taskId} has no delivery partner assigned.`, severity: "warning", detectedAt: asDate(item.createdAt)?.toISOString() });
  }

  for (const item of delayedDeliveries) {
    add({ incidentKey: `delivery-delay-${String(item._id)}`, categoryInput: "delivery", title: item.type === "customer_to_tailor" ? "Pickup delayed" : "Drop delayed", description: `${item.taskId} has passed its delivery ETA.`, severity: "warning", detectedAt: asDate(item.deadlineAt ?? item.createdAt)?.toISOString() });
  }

  for (const item of failedDeliveries) {
    add({ incidentKey: `delivery-failure-${String(item._id)}`, categoryInput: "delivery", title: "Delivery exception", description: `${item.taskId}: ${item.lastFailureReason}`, severity: "warning", detectedAt: asDate(item.updatedAt ?? item.createdAt)?.toISOString() });
  }

  for (const item of failedPayments) {
    add({ incidentKey: `payment-failed-${String(item._id)}`, categoryInput: "payment", title: "Payment failed", description: `${item.darjiId ?? item.orderId} failed for ${formatCurrency(item.amount)}.`, severity: "warning", detectedAt: asDate(item.createdAt)?.toISOString() });
  }

  for (const item of pendingPayments) {
    add({ incidentKey: `payment-pending-${String(item._id)}`, categoryInput: "payment", title: "Payment pending", description: `${item.darjiId ?? item.orderId} is still awaiting ${formatCurrency(item.amount)}.`, severity: "warning", detectedAt: asDate(item.createdAt)?.toISOString() });
  }

  for (const item of quotesAwaitingConfirmation) {
    add({ incidentKey: `quote-awaiting-confirmation-${String(item._id)}`, categoryInput: "tailoring", title: "Quote awaiting confirmation", description: `${item.darjiId ?? `TRQ-${String(item._id).slice(0, 8).toUpperCase()}`} has a tailor quote awaiting customer confirmation for over 2 hours.`, severity: "warning", detectedAt: asDate(item.lastQuoteSentAt ?? item.updatedAt)?.toISOString() });
  }

  for (const item of quotePaymentsOverdue) {
    add({ incidentKey: `quote-payment-overdue-${String(item._id)}`, categoryInput: "tailoring", title: "Quote awaiting payment", description: `${item.darjiId ?? `TRQ-${String(item._id).slice(0, 8).toUpperCase()}`} has a selected tailor quote awaiting customer payment for over 2 hours.`, severity: "warning", detectedAt: asDate(item.paymentPendingAt ?? item.updatedAt ?? item.createdAt)?.toISOString() });
  }

  for (const item of stalledOrders) {
    const title = ["AT_TAILOR", "STITCHING_STARTED"].includes(String(item.status).toUpperCase()) ? "Tailor delay" : "Order delayed";
    const identifier = item.orderNumber ?? item.darjiId ?? String(item._id);
    add({ incidentKey: `order-stalled-${String(item._id)}`, categoryInput: title, title, description: `${identifier} has not moved for more than 24 hours.`, severity: "warning", detectedAt: asDate(item.updatedAt ?? item.createdAt)?.toISOString() });
  }

  for (const item of priorityTickets) {
    add({ incidentKey: `support-priority-${String(item._id)}`, categoryInput: "support", title: "Priority support", description: `${item.subject} has ${String(item.priority).toLowerCase()} priority and needs review.`, severity: "warning", detectedAt: asDate(item.createdAt)?.toISOString() });
  }

  const result = await sendOperationalAlertEmails(alerts);
  if (result.sent || result.failed) console.info(`[alerts] Admin Live Alerts email scan: ${alerts.length} incidents, ${result.sent} sent, ${result.failed} failed`);
  return { ...result, alerts: alerts.length };
}
