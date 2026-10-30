import { MeasurementVisitModel, OrderModel, TailorModel, TailorQuoteModel, TailoringRequestModel, UserModel, WalletModel, WalletTransactionModel } from "../models.js";
import { AppError } from "../middleware/error.js";

const money = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
const date = (value: unknown) => value ? new Date(String(value)).toISOString() : null;
const displayId = (record: { _id: unknown; darjiId?: string }) => record.darjiId || String(record._id);
type ActivityLink = { id: string; source: "ORDER" | "TAILORING_REQUEST" | "MEASUREMENT" };

export async function getTailorActivity(tailorId: string) {
  const tailor = await TailorModel.findById(tailorId).select("userId darjiTailorId").lean();
  if (!tailor) throw new AppError(404, "Tailor profile not found");
  const refs = [tailorId, String(tailor.userId), tailor.darjiTailorId].filter((value): value is string => Boolean(value));
  const quotes = await TailorQuoteModel.find({ tailorId: { $in: refs } }).select("_id").lean();
  const [legacyOrders, requests, visits, transactions, wallet] = await Promise.all([
    OrderModel.find({ tailorId: { $in: refs } }).select("_id darjiId orderNumber status customerId totalAmount createdAt").lean(),
    TailoringRequestModel.find({ $or: [
      { assignedTailorId: { $in: refs } },
      { assignedTailorId: { $in: [null, ""] }, selectedQuoteId: { $in: quotes.map((quote) => quote._id) } }
    ] }).select("_id darjiId status orderStatus customerId totalAmount createdAt").lean(),
    // An offer or being the stitching tailor does not mean this partner made
    // the visit. Only persisted measurement assignments belong to their work.
    MeasurementVisitModel.find({ assignedTailorId: { $in: refs } }).select("_id darjiId requestId customerId customerName status scheduledAt submittedAt visitPayout createdAt").lean(),
    WalletTransactionModel.find({ userId: String(tailor.userId), userType: "TAILOR" }).sort({ createdAt: -1, _id: -1 }).lean(),
    WalletModel.findOne({ userId: String(tailor.userId), userType: "TAILOR" }).select("balance").lean()
  ]);
  const customerIds = [...new Set([...legacyOrders, ...requests, ...visits].map((row) => row.customerId).filter(Boolean).map(String))];
  const earningSourceIds = [...new Set(transactions.map((row) => row.orderId).filter((value): value is string => Boolean(value)))];
  const [customers, linkedOrders, linkedRequests, linkedVisits] = await Promise.all([
    UserModel.find({ _id: { $in: customerIds } }).select("_id name phone").lean(),
    OrderModel.find({ _id: { $in: earningSourceIds } }).select("_id").lean(),
    TailoringRequestModel.find({ _id: { $in: earningSourceIds } }).select("_id").lean(),
    MeasurementVisitModel.find({ _id: { $in: earningSourceIds } }).select("_id").lean()
  ]);
  const customerById = new Map(customers.map((customer) => [String(customer._id), customer]));
  const orderIds = new Set(linkedOrders.map((row) => String(row._id)));
  const requestIds = new Set(linkedRequests.map((row) => String(row._id)));
  const visitIds = new Set(linkedVisits.map((row) => String(row._id)));
  const orderMap = new Map<string, { id: string; source: "ORDER" | "TAILORING_REQUEST"; number: string; status: string; customerName: string; customerPhone: string | null; amount: number; createdAt: string | null }>();
  for (const order of legacyOrders) {
    const customer = customerById.get(String(order.customerId));
    orderMap.set(String(order._id), { id: String(order._id), source: "ORDER", number: order.orderNumber || displayId(order), status: order.status, customerName: customer?.name || "Customer", customerPhone: customer?.phone ?? null, amount: Number(order.totalAmount ?? 0), createdAt: date(order.createdAt) });
  }
  for (const request of requests) {
    if (orderMap.has(String(request._id))) continue;
    const customer = customerById.get(String(request.customerId));
    orderMap.set(String(request._id), { id: String(request._id), source: "TAILORING_REQUEST", number: displayId(request), status: request.orderStatus || request.status, customerName: customer?.name || "Customer", customerPhone: customer?.phone ?? null, amount: Number(request.totalAmount ?? 0), createdAt: date(request.createdAt) });
  }
  const orders = [...orderMap.values()].sort((a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? ""));
  const completedOrders = orders.filter((order) => ["delivered", "completed"].includes(order.status.toLowerCase())).length;
  const cancelledOrders = orders.filter((order) => order.status.toLowerCase() === "cancelled").length;
  const measurementVisits = visits.map((visit) => ({ id: String(visit._id), number: visit.darjiId || String(visit._id), requestId: visit.requestId, customerName: visit.customerName || customerById.get(String(visit.customerId))?.name || "Customer", status: visit.status, scheduledAt: date(visit.scheduledAt), submittedAt: date(visit.submittedAt), payout: Number(visit.visitPayout ?? 0) })).sort((a, b) => Date.parse(b.scheduledAt ?? "") - Date.parse(a.scheduledAt ?? ""));
  const earnings = transactions.map((transaction) => {
    const sourceId = transaction.orderId;
    const link: ActivityLink | null = sourceId && visitIds.has(sourceId) ? { id: sourceId, source: "MEASUREMENT" }
      : sourceId && orderIds.has(sourceId) ? { id: sourceId, source: "ORDER" }
        : sourceId && requestIds.has(sourceId) ? { id: sourceId, source: "TAILORING_REQUEST" } : null;
    return { id: String(transaction._id), category: transaction.category, direction: transaction.transactionType, amount: Number(transaction.amount), remarks: transaction.remarks ?? null, createdAt: date(transaction.createdAt), link };
  });
  return {
    checkedAt: new Date().toISOString(),
    summary: {
      orders: orders.length, completedOrders, activeOrders: orders.length - completedOrders - cancelledOrders, cancelledOrders,
      measurementAssignments: visits.length, completedMeasurements: visits.filter((visit) => visit.status === "SUBMITTED").length,
      recordedEarnings: money(transactions.filter((row) => row.transactionType === "CREDIT" && ["ORDER_EARNING", "BONUS", "ADJUSTMENT"].includes(row.category)).reduce((sum, row) => sum + Number(row.amount), 0)),
      paidOut: money(transactions.filter((row) => row.transactionType === "DEBIT" && row.category === "WEEKLY_PAYOUT").reduce((sum, row) => sum + Number(row.amount), 0)),
      walletBalance: money(Number(wallet?.balance ?? 0))
    }, orders, measurementVisits, earnings
  };
}
